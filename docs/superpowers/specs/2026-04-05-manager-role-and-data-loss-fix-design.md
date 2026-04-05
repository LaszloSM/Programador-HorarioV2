# Design Spec: Manager Role & Schedule Data Loss Fix

**Date:** 2026-04-05  
**Project:** Programador Metro — programador-horarioV2  
**Status:** Approved

---

## Overview

Two independent changes:
1. Add a read-only `gerente` (manager) role that sees all departments merged, without any config access or editing capability.
2. Fix a race condition that causes historical schedule data to be wiped when concurrent sessions save over each other.

---

## Feature 1: Manager Role (`gerente`)

### Context

Currently only two role paths exist:
- `admin` (`profile.role === 'admin'` or `app_metadata.role === 'admin'`): sees all departments, can edit config and manage departments.
- Everyone else: sees only their assigned department, can edit schedules.

A new `gerente` role is needed for supervisors who need a read-only overview of all departments with no ability to modify any data.

### Behavior

- Manager loads with `deptId = null` (same as admin's "all departments" merged view).
- The view is **strictly read-only**: no cell editing, no drag-and-drop, no context menu, no keyboard copy-paste, no undo.
- Saves are inherently blocked: `_flushSave` already returns early when `currentDeptId === null`.
- The manager view is a **snapshot**: `useScheduleSync` already returns early when `currentDeptId === null` (line 17), so realtime updates are not received. This is intentional and acceptable — the manager sees a static overview loaded at login.
- Navbar shows a static label "Todos los departamentos" instead of a dropdown.
- Config button, Depts button, and **Undo button** are hidden for manager (Undo would still mutate in-memory state even though saves are blocked, creating an inconsistent local state).

### Role Detection Logic

```js
// AppShell.jsx
const isAdmin = profile?.role === 'admin' || session.user.app_metadata?.role === 'admin'
const isManager = profile?.role === 'gerente'
const deptId = (isAdmin || isManager) ? null : (profile?.department_id ?? depts?.[0]?.id)
```

No database schema changes required. The `profiles.role` column already supports arbitrary text values.

### Files Changed

| File | Change |
|---|---|
| `AppShell.jsx` | Add `isManager` state; detect `profile.role === 'gerente'`; load `deptId = null` for manager; pass `readOnly={isManager}` to `ScheduleTable`; pass `isManager` to `Navbar`. Guard the existing `window.addEventListener('keydown', handleKey)` Ctrl+Z handler with `if (!isManager)` to prevent `undoLastAction` from mutating in-memory state for read-only users. |
| `Navbar.jsx` | Accept `isManager` prop. Show static "Todos los departamentos" label when `isManager && !currentDeptId` (new branch — current non-admin branch only renders when `currentDeptId` is truthy, so this case produces nothing today). Hide Config, Depts, **and Undo** buttons when `isManager`. |
| `ScheduleTable.jsx` | Accept `readOnly` prop. When `readOnly=true`: skip `setEditModal` on cell click (pass `onClick={undefined}`); skip `setContextMenu` on right-click (pass `onContextMenu={undefined}`); also skip `handleDragEnd` calling `moveShift` (guard at start of `handleDragEnd`). Thread `readOnly` down to each `ShiftCell` render. |
| `ShiftCell.jsx` | Accept `readOnly` prop. When `readOnly=true`: set `disabled: true` on `useDraggable`; skip `onClick` and `onContextMenu` callbacks. Suppress `onKeyDown` handler (which handles `Ctrl+C`/`Ctrl+V` and calls `copyShift`/`pasteShift`) when `readOnly`. |

### Prop Threading Detail

`ScheduleTable` is rendered as `<ScheduleTable readOnly={isManager} />` in `AppShell`.

Inside `ScheduleTable`, every `<ShiftCell>` render passes:
```jsx
<ShiftCell
  empName={emp.name}
  dateKey={dk}
  readOnly={readOnly}
  onClick={readOnly ? undefined : () => setEditModal({ empName: emp.name, dateKey: dk })}
  onContextMenu={readOnly ? undefined : (x, y) => handleContextMenu(x, y, emp.name, dk)}
/>
```

`handleDragEnd` is guarded:
```js
const handleDragEnd = ({ active, over }) => {
  setActiveId(null)
  if (readOnly) return   // ← guard
  if (!over || active.id === over.id) return
  // ...
}
```

---

## Feature 2: Schedule Data Loss Fix (Merge-Before-Save)

### Root Cause

The schedule for a department is stored as a single JSON blob in `app_state`:
```
{ key: 'globalSchedule', department_id: <uuid>, value: { empName: { dateKey: entry } } }
```

`_flushSave` replaces the entire blob with `globalSchedule` from memory. If two sessions are open:

1. Session A and B both load schedule at T=0 (Jan–Mar data).
2. Session A adds April data, saves → DB has Jan–Apr.
3. Session B adds a March entry, saves → DB gets Jan–Mar only (**April wiped**).

### Solution: `dirtyEntries` + Merge-Before-Save

Track which entries were modified since the last load. On save: fetch DB state, apply dirty entries as a patch, save merged result.

#### New Store State

Add `dirtyEntries: {}` to the Zustand initial state object alongside the existing `isDirty`, `isSaving`, `saveError` fields:

```js
dirtyEntries: {},   // { [empName]: { [dateKey]: true } }
```

If this field is not declared in the initial state, `...state.dirtyEntries` spreads in `setShift`/`deleteShift`/`moveShift` will throw at runtime.

#### Actions That Mark Dirty

**`setShift(empName, dateKey, entry)`:**
```js
dirtyEntries: {
  ...state.dirtyEntries,
  [empName]: { ...(state.dirtyEntries[empName] ?? {}), [dateKey]: true }
}
```

**`deleteShift(empName, dateKey)`:** same pattern as `setShift`.

**`moveShift(srcEmp, srcDateKey, dstEmp, dstDateKey)`:** marks both affected cells dirty:
```js
dirtyEntries: {
  ...state.dirtyEntries,
  [srcEmp]: { ...(state.dirtyEntries[srcEmp] ?? {}), [srcDateKey]: true },
  [dstEmp]: { ...(state.dirtyEntries[dstEmp] ?? {}), [dstDateKey]: true },
}
```

**`undoLastAction()`:** an undo reverses a prior change — the cell is in a new state that must also be flushed. Mark the affected cell(s) dirty after applying the undo:
- Single entry: mark `last.empName / last.dateKey`
- Move undo: mark both `last.srcEmp/last.srcDateKey` and `last.dstEmp/last.dstDateKey`

#### Reset Points

- `loadDepartment` completion (success) → include `dirtyEntries: {}` in the success `set()` call alongside `globalSchedule`, `isDirty: false`, `historyStack: []`.
- Successful `_flushSave` → `dirtyEntries: {}` (inside the try block, step 5 only).
- **Failed save**: `dirtyEntries` is **NOT** reset, so the next debounced retry includes the full dirty set.
- `undoLastAction` called with empty history stack → early return, `dirtyEntries` unchanged (correct by default).

#### Updated `_flushSave` Logic

**Early-exit guard** (replaces current empty-`globalSchedule` check):
```js
if (Object.keys(dirtyEntries).length === 0) return
```
(When there are no dirty entries, there is nothing to flush regardless of `globalSchedule` contents.)

**Merge logic:**
```
1. Fetch current DB value: SELECT value FROM app_state WHERE key=SCHEDULE_KEY AND department_id=currentDeptId
2. base = dbRow?.value || {}
3. For each empName in dirtyEntries:
     if base[empName] is undefined, initialize base[empName] = {}
     For each dateKey in dirtyEntries[empName]:
       if globalSchedule[empName]?.[dateKey] exists → base[empName][dateKey] = local value  (add/update)
       else → delete base[empName][dateKey]                                                   (delete)
4. await _kvSet(SCHEDULE_KEY, base, currentDeptId)   ← existing upsert helper, unchanged
5. set({ globalSchedule: base, dirtyEntries: {}, isDirty: false, isSaving: false, saveError: null })
```

Step 5 only runs on success. On error, `dirtyEntries` is preserved and `saveError` is set as before.

#### First-Save Behavior

If the DB row does not yet exist (new department), step 1 returns null, `base = {}`. The dirty patch is applied on top of empty, producing the local entries. `_kvSet` falls through to INSERT. This is correct and identical in outcome to the previous behavior.

#### Residual Race Window

The read-modify-write (steps 1–4) is not atomic. If Session A and Session B both enter `_flushSave` concurrently:

- Both fetch the same DB snapshot.
- Both apply their respective dirty patches.
- The second write overwrites the first.

This residual window is **acceptably narrow** for this use case:
- The debounce delay is 800ms; two users would need to save within the same 800ms window.
- In practice this app has one or two editors per department.
- The primary scenario being fixed (one session overwrites months of data from a stale snapshot) is fully prevented.

An atomic server-side merge (Postgres function) would eliminate this window entirely and is noted in "Out of Scope" as a future improvement.

#### `useScheduleSync` Interaction

`useScheduleSync` may set `globalSchedule` from a realtime event between step 4 (write) and step 5 (local state update). If this happens, step 5 immediately overwrites the realtime value with `base`. This is a narrow window and does not cause data loss (the DB already has the merged result from step 4). The next realtime event will re-sync to the latest DB state.

---

## Out of Scope

- Atomic server-side merge via Postgres function (eliminates residual race window; recommended future improvement that also removes the extra DB read per save cycle).
- Adding a `UNIQUE(key, department_id)` constraint to `app_state` (recommended DB hardening, separate task).
- Migrating from `app_state` blob storage to normalized `schedule_entries` rows.
- Conflict-resolution UI for simultaneous edits.
