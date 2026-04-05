# Manager Role & Schedule Data Loss Fix — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only `gerente` role with an overview of all departments, and fix a race condition that causes concurrent saves to wipe historical schedule data.

**Architecture:** The bug fix extracts a pure `mergeSchedule` function (TDD), adds `dirtyEntries` tracking to the Zustand store, and replaces the full-overwrite save with a read-merge-write. The manager role adds an `isManager` flag that propagates as a `readOnly` prop through the component tree, blocking all edit paths.

**Tech Stack:** React 18, Zustand 4, Supabase JS v2, Vite 5, Vitest 1, Tailwind CSS 3. Tests run with `cd frontend && npm run test`. No TypeScript.

**Spec:** `docs/superpowers/specs/2026-04-05-manager-role-and-data-loss-fix-design.md`

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| **Create** | `frontend/src/lib/mergeSchedule.js` | Pure merge function: DB base + dirty patch → merged schedule |
| **Create** | `frontend/src/lib/__tests__/mergeSchedule.test.js` | Unit tests for merge logic |
| **Modify** | `frontend/src/store/scheduleStore.js` | Add `dirtyEntries` state; mark dirty in `setShift`, `deleteShift`, `moveShift`, `undoLastAction`; update `_flushSave` and `loadDepartment` |
| **Modify** | `frontend/src/components/layout/AppShell.jsx` | Add `isManager` detection; pass `readOnly`, `isManager` props |
| **Modify** | `frontend/src/components/layout/Navbar.jsx` | Handle `isManager`: static dept label, hide Config/Depts/Undo |
| **Modify** | `frontend/src/components/schedule/ScheduleTable.jsx` | Accept `readOnly` prop; block editing paths |
| **Modify** | `frontend/src/components/schedule/ShiftCell.jsx` | Accept `readOnly` prop; disable drag, click, keyboard handlers |

---

## Chunk 1: Bug Fix — mergeSchedule + Store Changes

### Task 1: Create pure `mergeSchedule` function (TDD)

**Files:**
- Create: `frontend/src/lib/mergeSchedule.js`
- Create: `frontend/src/lib/__tests__/mergeSchedule.test.js`

- [ ] **Step 1.1: Write the failing tests**

Create `frontend/src/lib/__tests__/mergeSchedule.test.js`:

```js
import { describe, test, expect } from 'vitest'
import { mergeSchedule } from '../mergeSchedule.js'

describe('mergeSchedule', () => {
  test('returns db state unchanged when dirtyEntries is empty', () => {
    const db = { Juan: { '2025-01-01': { duration: '8' } } }
    expect(mergeSchedule(db, {}, {})).toEqual(db)
  })

  test('adds a new entry from local when marked dirty', () => {
    const local = { Juan: { '2025-04-01': { duration: '8', startTime: '07:00' } } }
    const dirty = { Juan: { '2025-04-01': true } }
    const result = mergeSchedule({}, local, dirty)
    expect(result.Juan['2025-04-01']).toEqual({ duration: '8', startTime: '07:00' })
  })

  test('overwrites db entry with local when marked dirty', () => {
    const db    = { Juan: { '2025-04-01': { duration: '6' } } }
    const local = { Juan: { '2025-04-01': { duration: '8' } } }
    const dirty = { Juan: { '2025-04-01': true } }
    expect(mergeSchedule(db, local, dirty).Juan['2025-04-01']).toEqual({ duration: '8' })
  })

  test('deletes db entry when dirty and absent in local', () => {
    const db    = { Juan: { '2025-04-01': { duration: '8' } } }
    const local = { Juan: {} }
    const dirty = { Juan: { '2025-04-01': true } }
    const result = mergeSchedule(db, local, dirty)
    expect(result.Juan['2025-04-01']).toBeUndefined()
  })

  test('preserves non-dirty historical db entries', () => {
    const db    = { Juan: { '2025-01-01': { duration: '6' }, '2025-04-01': { duration: '6' } } }
    const local = { Juan: { '2025-04-01': { duration: '8' } } }
    const dirty = { Juan: { '2025-04-01': true } }
    const result = mergeSchedule(db, local, dirty)
    expect(result.Juan['2025-01-01']).toEqual({ duration: '6' }) // preserved from DB
    expect(result.Juan['2025-04-01']).toEqual({ duration: '8' }) // patched from local
  })

  test('handles multiple employees independently', () => {
    const db    = { Juan: { '2025-01-01': { duration: '6' } }, Maria: { '2025-01-01': { duration: '8' } } }
    const local = { Juan: { '2025-01-01': { duration: '8' } }, Maria: { '2025-01-01': { duration: '8' } } }
    const dirty = { Juan: { '2025-01-01': true } }
    const result = mergeSchedule(db, local, dirty)
    expect(result.Juan['2025-01-01']).toEqual({ duration: '8' })  // dirty → patched
    expect(result.Maria['2025-01-01']).toEqual({ duration: '8' }) // not dirty → from DB
  })

  test('handles empty db gracefully (first save)', () => {
    const local = { Juan: { '2025-04-01': { duration: '8' } } }
    const dirty = { Juan: { '2025-04-01': true } }
    expect(mergeSchedule(null, local, dirty)).toEqual(local)
  })

  test('handles entry with empty object as deletion', () => {
    const db    = { Juan: { '2025-04-01': { duration: '8' } } }
    const local = { Juan: { '2025-04-01': {} } }
    const dirty = { Juan: { '2025-04-01': true } }
    const result = mergeSchedule(db, local, dirty)
    expect(result.Juan['2025-04-01']).toBeUndefined()
  })
})
```

- [ ] **Step 1.2: Run tests to confirm they fail**

```bash
cd frontend && npm run test -- mergeSchedule
```

Expected: `Cannot find module '../mergeSchedule.js'`

- [ ] **Step 1.3: Implement `mergeSchedule`**

Create `frontend/src/lib/mergeSchedule.js`:

```js
/**
 * Merge a DB schedule snapshot with local dirty changes.
 *
 * @param {Object|null} dbSchedule  - { [empName]: { [dateKey]: entry } } from DB
 * @param {Object}      localSchedule - current in-memory globalSchedule
 * @param {Object}      dirtyEntries  - { [empName]: { [dateKey]: true } }
 * @returns {Object} merged schedule
 */
export function mergeSchedule(dbSchedule, localSchedule, dirtyEntries) {
  const base = dbSchedule ? { ...dbSchedule } : {}

  for (const empName of Object.keys(dirtyEntries)) {
    if (!base[empName]) base[empName] = {}

    for (const dateKey of Object.keys(dirtyEntries[empName])) {
      const localEntry = localSchedule[empName]?.[dateKey]

      // Empty object or missing → treat as deletion
      if (!localEntry || Object.keys(localEntry).length === 0) {
        delete base[empName][dateKey]
      } else {
        base[empName][dateKey] = localEntry
      }
    }
  }

  return base
}
```

- [ ] **Step 1.4: Run tests — all 8 must pass**

```bash
cd frontend && npm run test -- mergeSchedule
```

Expected: `8 passed`

- [ ] **Step 1.5: Commit**

```bash
cd frontend && git add src/lib/mergeSchedule.js src/lib/__tests__/mergeSchedule.test.js
git commit -m "feat: add mergeSchedule pure function with full test coverage"
```

---

### Task 2: Add `dirtyEntries` to Zustand store + mark dirty in actions

**Files:**
- Modify: `frontend/src/store/scheduleStore.js`

This task adds `dirtyEntries` to state and marks entries dirty in `setShift`, `deleteShift`, `moveShift`, and `undoLastAction`. No change to `_flushSave` yet (that's Task 3).

- [ ] **Step 2.1: Add `dirtyEntries: {}` to the initial state**

In `scheduleStore.js`, find the state block (around line 40) and add `dirtyEntries: {}` alongside `isDirty`:

```js
// ─── State ─────────────────────────────────────────────
globalSchedule: {},
config: { ... },
historyStack: [],
currentDeptId: null,
currentStartDate: null,
currentEndDate: null,
baseMonth: '2025-08',
isDirty: false,
isSaving: false,
saveError: null,
clipboardEntry: null,
dirtyEntries: {},   // { [empName]: { [dateKey]: true } }  ← ADD THIS
```

- [ ] **Step 2.2: Mark dirty in `setShift`**

Inside the `set(state => {...})` return of `setShift`, add `dirtyEntries` to the returned object:

```js
return {
  globalSchedule: newSchedule,
  historyStack: newHistory,
  isDirty: true,
  dirtyEntries: {
    ...state.dirtyEntries,
    [empName]: { ...(state.dirtyEntries[empName] ?? {}), [dateKey]: true },
  },
}
```

- [ ] **Step 2.3: Mark dirty in `deleteShift`**

Same pattern in `deleteShift`'s `set(state => {...})` return:

```js
return {
  globalSchedule: newSchedule,
  historyStack: newHistory,
  isDirty: true,
  dirtyEntries: {
    ...state.dirtyEntries,
    [empName]: { ...(state.dirtyEntries[empName] ?? {}), [dateKey]: true },
  },
}
```

- [ ] **Step 2.4: Mark dirty in `moveShift`**

In `moveShift`'s return, mark both source and destination cells:

```js
return {
  globalSchedule: newSchedule,
  historyStack: newHistory,
  isDirty: true,
  dirtyEntries: {
    ...state.dirtyEntries,
    [srcEmp]: { ...(state.dirtyEntries[srcEmp] ?? {}), [srcDateKey]: true },
    [dstEmp]: { ...(state.dirtyEntries[dstEmp] ?? {}), [dstDateKey]: true },
  },
}
```

- [ ] **Step 2.5: Mark dirty in `undoLastAction`**

**Important:** Only the return object inside the `set(state => {...})` callback changes. The `debouncedSave()` call that comes immediately after `set(...)` in the existing function (store line 163) must remain in place — do not remove it.

Replace only the body of `set(state => {...})` in `undoLastAction`:

```js
// Inside undoLastAction — the set(state => {...}) return only:
const stack = [...state.historyStack]
const last = stack.pop()
if (!last) return { historyStack: stack }

const newSchedule = { ...state.globalSchedule }
let newDirty = { ...state.dirtyEntries }

if (last.type === 'move') {
  newSchedule[last.srcEmp] = { ...(newSchedule[last.srcEmp] ?? {}), [last.srcDateKey]: last.srcPrev }
  newSchedule[last.dstEmp] = { ...(newSchedule[last.dstEmp] ?? {}), [last.dstDateKey]: last.dstPrev }
  newDirty = {
    ...newDirty,
    [last.srcEmp]: { ...(newDirty[last.srcEmp] ?? {}), [last.srcDateKey]: true },
    [last.dstEmp]: { ...(newDirty[last.dstEmp] ?? {}), [last.dstDateKey]: true },
  }
} else {
  newSchedule[last.empName] = { ...(newSchedule[last.empName] ?? {}), [last.dateKey]: last.prev }
  newDirty = {
    ...newDirty,
    [last.empName]: { ...(newDirty[last.empName] ?? {}), [last.dateKey]: true },
  }
}

return { globalSchedule: newSchedule, historyStack: stack, isDirty: true, dirtyEntries: newDirty }
// ↑ only this return changes; debouncedSave() below the set() stays untouched
```

- [ ] **Step 2.6: Reset `dirtyEntries` in `loadDepartment` success path**

In `loadDepartment`, add `dirtyEntries: {}` to the final `set({...})` call (around line 282):

```js
set({
  globalSchedule: rawSchedule,
  config: { employees, groups, tasks, groupColors, initialPending, employeeMaxHours },
  isDirty: false,
  historyStack: [],
  dirtyEntries: {},   // ← ADD THIS
})
```

- [ ] **Step 2.7: Verify the app still runs (no runtime errors)**

```bash
cd frontend && npm run dev
```

Open browser, load a department, edit a cell. No console errors. Close dev server.

- [ ] **Step 2.8: Commit**

```bash
cd frontend && git add src/store/scheduleStore.js
git commit -m "feat: add dirtyEntries tracking to schedule store for merge-before-save"
```

---

### Task 3: Update `_flushSave` to merge-before-save

**Files:**
- Modify: `frontend/src/store/scheduleStore.js`

- [ ] **Step 3.1: Add `mergeSchedule` import at top of `scheduleStore.js`**

```js
import { mergeSchedule } from '../lib/mergeSchedule.js'
```

- [ ] **Step 3.2: Replace `_flushSave` body**

Find the `_flushSave` function (around line 325) and replace it entirely:

```js
_flushSave: async () => {
  const { globalSchedule, currentDeptId, dirtyEntries } = get()
  if (!currentDeptId) return

  // Nothing to flush if no entries were modified
  if (Object.keys(dirtyEntries).length === 0) return

  set({ isSaving: true, saveError: null })

  try {
    // 1. Fetch current DB state to avoid overwriting concurrent changes
    const { data: row } = await supabase
      .from(APP_STATE_TABLE)
      .select('value')
      .eq('key', SCHEDULE_KEY)
      .eq('department_id', currentDeptId)
      .maybeSingle()

    const dbSchedule = row?.value ?? {}

    // 2. Apply only dirty entries as a patch on top of DB state
    const merged = mergeSchedule(dbSchedule, globalSchedule, dirtyEntries)

    // 3. Persist merged result
    await _kvSet(SCHEDULE_KEY, merged, currentDeptId)

    // 4. Update local state with merged result; clear dirty tracking
    set({
      globalSchedule: merged,
      dirtyEntries: {},
      isDirty: false,
      isSaving: false,
      saveError: null,
    })
  } catch (err) {
    // dirtyEntries is intentionally NOT cleared so next retry retries the full set
    set({ isSaving: false, saveError: err.message ?? 'Error al guardar' })
  }
},
```

- [ ] **Step 3.3: Run all existing tests to confirm no regressions**

```bash
cd frontend && npm run test
```

Expected: all tests pass (shiftCodes, monthlySummary, mergeSchedule).

- [ ] **Step 3.4: Manual smoke test**

```bash
cd frontend && npm run dev
```

1. Open browser at `http://localhost:5173`
2. Log in and load a department
3. Edit a cell → "Pendiente" indicator appears in navbar
4. Wait 1 second → save completes (indicator disappears)
5. Refresh page → edit is persisted
6. No console errors

- [ ] **Step 3.5: Commit**

```bash
cd frontend && git add src/store/scheduleStore.js
git commit -m "fix: merge-before-save to prevent concurrent sessions from wiping schedule data"
```

---

## Chunk 2: Manager Role (`gerente`)

### Task 4: AppShell — `isManager` detection and prop passing

**Files:**
- Modify: `frontend/src/components/layout/AppShell.jsx`

- [ ] **Step 4.1: Add `isManager` state**

After the `isAdmin` state line, add:

```js
const [isAdmin, setIsAdmin] = useState(false)
const [isManager, setIsManager] = useState(false)   // ← ADD
```

- [ ] **Step 4.2: Detect `gerente` role in `init()`**

In the `init()` async function, after setting `isAdmin`, add:

```js
const admin = profile?.role === 'admin' || session.user.app_metadata?.role === 'admin'
setIsAdmin(admin)
const manager = profile?.role === 'gerente'   // ← ADD
setIsManager(manager)                          // ← ADD

const deptId = (admin || manager) ? null : (profile?.department_id ?? depts?.[0]?.id)
```

- [ ] **Step 4.3: Guard Ctrl+Z keyboard shortcut for read-only users**

The existing `keydown` useEffect calls `undoLastAction()` for Ctrl+Z. Wrap it with `isManager` check. Because `isManager` is state and the effect captures it in a closure, pass it as a dependency:

```js
useEffect(() => {
  const handleKey = (e) => {
    if (isManager) return   // ← ADD: no undo for read-only managers
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault()
      useScheduleStore.getState().undoLastAction()
    }
  }
  window.addEventListener('keydown', handleKey)
  return () => window.removeEventListener('keydown', handleKey)
}, [isManager])   // ← ADD isManager to deps
```

- [ ] **Step 4.4: Pass `isManager` to Navbar and `readOnly` to ScheduleTable**

In the JSX, update the `<Navbar>` and `<ScheduleTable>` usages:

```jsx
<Navbar
  ...existing props...
  isAdmin={isAdmin}
  isManager={isManager}   // ← ADD
  ...
/>
```

```jsx
{activeTab === 'Horarios' && <ScheduleTable readOnly={isManager} />}
```

- [ ] **Step 4.5: Commit**

```bash
cd frontend && git add src/components/layout/AppShell.jsx
git commit -m "feat: add isManager role detection and readOnly prop threading in AppShell"
```

---

### Task 5: Navbar — handle `isManager` prop

**Files:**
- Modify: `frontend/src/components/layout/Navbar.jsx`

- [ ] **Step 5.1: Accept `isManager` in Navbar props**

Update the function signature:

```js
export default function Navbar({
  session, departments, currentDeptId, onDeptChange, onLogout,
  isDirty, isSaving, saveError, onClearError, isAdmin,
  isManager,   // ← ADD
  activeTab, tabs, onTabChange, onOpenConfig, onOpenDepts
})
```

- [ ] **Step 5.2: Replace department display logic**

Find the two existing department branches (admin dropdown and non-admin label, around lines 24–41) and replace with three branches:

```jsx
{/* Department selector — admin only */}
{isAdmin && departments.length > 0 && (
  <select
    value={currentDeptId ?? ''}
    onChange={e => onDeptChange(e.target.value === '' ? null : e.target.value)}
    className="bg-white/10 backdrop-blur-md text-white border border-white/20 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all cursor-pointer"
  >
    <option value="" className="text-slate-900">Todos los departamentos</option>
    {departments.map(d => (
      <option key={d.id} value={d.id} className="text-slate-900">{d.name}</option>
    ))}
  </select>
)}
{/* Static label for manager — always shows all departments */}
{isManager && (
  <span className="bg-white/10 text-white border border-white/20 text-xs rounded-lg px-3 py-1.5">
    Todos los departamentos
  </span>
)}
{/* Static label for regular user — shows their assigned department */}
{!isAdmin && !isManager && currentDeptId && departments.length > 0 && (
  <span className="bg-white/10 text-white border border-white/20 text-xs rounded-lg px-3 py-1.5">
    {departments.find(d => d.id === currentDeptId)?.name ?? ''}
  </span>
)}
```

- [ ] **Step 5.3: Hide Undo, Config, and Depts buttons for manager**

The Undo button (around line 69), Config button (around line 79), and Depts button (around line 89) must be hidden for `isManager`. Add `!isManager &&` to each:

```jsx
{/* Undo — hidden for manager */}
{!isManager && (
  <button
    onClick={undoLastAction}
    disabled={historyStack.length === 0}
    title="Deshacer (Ctrl+Z)"
    className="..."
  >
    ↩ <span className="hidden sm:inline">Deshacer</span>
  </button>
)}

{/* Configuración — admin only (unchanged, but confirm it's gated on isAdmin not just !isManager) */}
{isAdmin && (
  <button onClick={onOpenConfig} ...>⚙ Config</button>
)}

{/* Departamentos — admin only */}
{isAdmin && (
  <button onClick={onOpenDepts} ...>Depts</button>
)}
```

- [ ] **Step 5.4: Commit**

```bash
cd frontend && git add src/components/layout/Navbar.jsx
git commit -m "feat: add isManager support to Navbar — static dept label, hide edit buttons"
```

---

### Task 6: ScheduleTable — `readOnly` prop

**Files:**
- Modify: `frontend/src/components/schedule/ScheduleTable.jsx`

- [ ] **Step 6.1: Accept `readOnly` prop**

Update the function signature:

```js
export default function ScheduleTable({ readOnly = false }) {
```

- [ ] **Step 6.2: Guard `handleDragEnd`**

At the very start of `handleDragEnd`:

```js
const handleDragEnd = ({ active, over }) => {
  setActiveId(null)
  if (readOnly) return   // ← ADD
  if (!over || active.id === over.id) return
  const src = active.data.current
  const dst = over.data.current
  if (src && dst) moveShift(src.empName, src.dateKey, dst.empName, dst.dateKey)
}
```

- [ ] **Step 6.3: Pass `readOnly` to `ShiftCell` and conditionally pass callbacks**

In the `{dates.map(...)}` render (around line 228), update the `<ShiftCell>` usage:

```jsx
<ShiftCell
  empName={emp.name}
  dateKey={dateKey}
  readOnly={readOnly}
  onClick={readOnly ? undefined : () => setEditModal({ empName: emp.name, dateKey })}
  onContextMenu={readOnly ? undefined : handleContextMenu}
/>
```

- [ ] **Step 6.4: Commit**

```bash
cd frontend && git add src/components/schedule/ScheduleTable.jsx
git commit -m "feat: add readOnly prop to ScheduleTable — blocks editing for manager role"
```

---

### Task 7: ShiftCell — `readOnly` prop

**Files:**
- Modify: `frontend/src/components/schedule/ShiftCell.jsx`

- [ ] **Step 7.1: Accept `readOnly` prop**

Update the function signature:

```js
export default function ShiftCell({ empName, dateKey, onClick, onContextMenu, readOnly = false }) {
```

- [ ] **Step 7.2: Disable draggable when `readOnly`**

The `useDraggable` call (around line 14) already accepts a `disabled` option. Update it:

```js
const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
  id: `${empName}__${dateKey}`,
  data: { empName, dateKey },
  disabled: !hasEntry || readOnly,   // ← add `|| readOnly`
})
```

- [ ] **Step 7.3: Suppress keyboard handler when `readOnly`**

The `handleKeyDown` function (around line 50) handles Ctrl+C/V. Guard it:

```js
const handleKeyDown = (e) => {
  if (readOnly) return   // ← ADD
  if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
    e.preventDefault()
    copyShift(empName, dateKey)
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
    e.preventDefault()
    pasteShift(empName, dateKey)
  }
}
```

> Note: `onClick` and `onContextMenu` are already passed as `undefined` from `ScheduleTable` when `readOnly`, so the cell's `onClick={onClick}` and `onContextMenu` optional-chain calls (`onClick?.()`, `onContextMenu?.(...)`) will be no-ops. The `readOnly` prop in ShiftCell is only needed for `useDraggable` and `handleKeyDown`.

- [ ] **Step 7.4: Commit**

```bash
cd frontend && git add src/components/schedule/ShiftCell.jsx
git commit -m "feat: add readOnly prop to ShiftCell — disable drag and keyboard handlers"
```

---

### Task 8: End-to-end verification

- [ ] **Step 8.1: Run all tests**

```bash
cd frontend && npm run test
```

Expected: all tests pass.

- [ ] **Step 8.2: Production build**

```bash
cd frontend && npm run build
```

Expected: build completes with no errors.

- [ ] **Step 8.3: Manual verification — manager role**

To test locally without a real `gerente` user in the DB, temporarily change the role detection in `AppShell.jsx` to force `isManager = true`:

```js
// TEMP: force manager mode for testing
const manager = true // profile?.role === 'gerente'
```

Verify:
- [ ] All departments' schedules are visible and merged
- [ ] Clicking a cell does nothing (no modal)
- [ ] Right-clicking a cell does nothing (no context menu)
- [ ] Drag-and-drop does nothing
- [ ] Ctrl+Z and Ctrl+C/V do nothing
- [ ] Undo, Config, and Depts buttons are absent from navbar
- [ ] "Todos los departamentos" static label is visible in navbar
- [ ] All tabs (Cobertura, Resumen Mensual, etc.) are accessible

Revert the temporary change after testing:

```js
const manager = profile?.role === 'gerente'
```

- [ ] **Step 8.4: Manual verification — bug fix**

1. Open the app in two browser windows with the same department
2. Window A: edit a cell for the current week → wait for save
3. Window B (which loaded before step 2): edit a different cell → wait for save
4. Refresh both windows
5. Both edits should be present — neither overwrote the other

- [ ] **Step 8.5: Final commit (build artifacts if needed)**

```bash
cd frontend && git add -p   # review any uncommitted changes
git commit -m "chore: final cleanup and build verification"
```
