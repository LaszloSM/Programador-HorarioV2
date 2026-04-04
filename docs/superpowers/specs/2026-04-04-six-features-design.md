# Design Spec: Six Feature Improvements — Programador Horarios V2

**Date:** 2026-04-04  
**Status:** Approved  
**Project:** `programador-horarioV2/frontend`  
**Legacy reference:** `app.html` (monolithic vanilla JS, ~6600 lines)

---

## Context

The new React + Supabase project (`programador-horarioV2`) is a migration of the legacy `app.html`. Six improvements are required: two new features, one critical bug fix, and three UX upgrades. The legacy app is the source of truth for business logic and expected UI behavior.

---

## Requirement 1 + 2: Monthly Summary Tables + Excel Export

### Goal
Replace the current minimal `MonthlySummary.jsx` (shows only hours + poliv per employee) with the full legacy monthly view: a shared month picker controlling two tables stacked vertically, plus an "Exportar Excel" button.

### Layout
```
[ ‹ ] [ Abril 2026 ] [ › ]                    [Exportar Excel]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TABLA 1 — Cuadrícula mensual completa
┌──────────┬──────┬──────┬──(días 01..31)──┬──────────────┐
│ Nombre   │Poliv.│Pend. │ 01 Lu │ 02 Ma…  │ Comp. Cierre │
│ Empleado │  82% │  2   │  AM   │   D  …  │      3       │
│ TOTAL    │      │      │   5   │   2  …  │              │
└──────────┴──────┴──────┴───────┴──────────┴──────────────┘

TABLA 2 — Compensatorios formato empresa
┌──────────┬───────┬────────────┬──────────────┬────────────┬──────────────┬────────────┐
│ NOMBRE   │ SALDO │ # CAUSADOS │FECHAS CAUSADAS│ # PAGADOS  │FECHAS PAGADAS│ # PENDIENTE│
│ Empleado │   2   │     1      │  15/04/2026   │     0      │              │     3      │
│ TOTAL    │       │            │               │            │              │     8      │
└──────────┴───────┴────────────┴──────────────┴────────────┴──────────────┴────────────┘
```

### Core computation function: `computeMonthlySummaryData(year, month, globalSchedule, config, baseMonth)`

Returns `{ rows, dayCounts, totalPend, totalClosure, totalCaused, totalPaid, daysInMonth }`.

Pre-compute `taskGroupMap` from `config.tasks`: `const taskGroupMap = {}; config.tasks.forEach(t => { taskGroupMap[t.name] = t.group })`.

For each employee × each day:
- Parse `entry.duration`:
  - Numeric + not absence → working day. Categorize by `entry.startTime`:
    - `< 10:00` → `"AM"`, `10:00–11:59` → `"INT"`, `≥ 12:00` → `"PM"`, no startTime → `"0"`
  - Numeric + absence OR string absence → use `absenceCodeToAbbr[dur] ?? dur`
  - No entry → `"0"` (empty)
- Count: `causeCount` = working days on holidays, `paidCount` = entries with abbr `"C"`
- `cajasCount` = days where `entry.task` is set and `taskGroupMap[entry.task] === 'CAJAS'`
- `pendStart` calculation (per employee):
  - If `monthKey === baseMonth` → `pendStart = config.initialPending?.[empName] ?? 0`
  - Else if `previousMonthKey(monthKey) < baseMonth` → `pendStart = 0`
  - Else → recurse `computeMonthlySummaryData` for previous month; `pendStart = prevResult.rows.find(r => r.emp === empName)?.closure ?? 0`
- `closure = pendStart + causeCount - paidCount`
- `poliv = min((cajasCount / 11) * 100, 100)`

For Tabla 2, additionally collect:
- `causedDates[]` = day numbers where employee worked on a holiday
- `paidDates[]` = day numbers where entry duration === `"C"`
- Format date strings as comma-separated: `"dd,dd,dd/MM/YYYY"` (e.g. `"05,12,19/04/2026"`). If empty, show blank cell.

### Excel Export

Uses `xlsx` library (already installed). Function `exportToExcel(year, month, summaryData, globalSchedule, config)`:

- Creates workbook with 2 sheets:
  - Sheet `"Malla_Mensual"`: mirrors Tabla 1 (header row + employee rows + TOTAL row)
  - Sheet `"Compensatorios"`: mirrors Tabla 2 (header row + employee rows + TOTAL row)
- File name: `Resumen_YYYY-MM.xlsx`
- Uses `XLSX.utils.aoa_to_sheet` (array of arrays) for simplicity and format preservation

### Files changed
- `src/components/summary/MonthlySummary.jsx` — full rewrite

---

## Requirement 3: Bug Fix — White Screen on Empty Cell Click

### Symptom
Clicking the `+` button on an empty `ShiftCell` crashes the app (React unmounts entire tree → white screen).

### Root cause
`ShiftCell` calls both `useDraggable` and `useDroppable` unconditionally, then uses a combined `setRef` that registers the DOM node with both. For **empty cells**, the `listeners` from `useDraggable` are not spread on the DOM node, but the node is still registered as a draggable with the `DndContext`. This creates an inconsistent DnD state that can intercept pointer events on click and trigger an unhandled error path.

### Fix
Restructure `ShiftCell` to conditionally apply DnD hooks:

```jsx
// Always register as droppable (any cell can receive a drop)
const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `drop__${empName}__${dateKey}`, data: { empName, dateKey } })

// Only register as draggable when the cell has content
const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
  id: `${empName}__${dateKey}`,
  data: { empName, dateKey },
  disabled: !hasEntry,   // ← key: disabled for empty cells
})
```

Using the `disabled` prop on `useDraggable` is the idiomatic `@dnd-kit` approach — it keeps the hook call unconditional (no Hook rule violation) while preventing drag registration for empty cells.

Additionally: the empty cell must wrap `onClick` to call `e.stopPropagation()` before invoking the handler:
```jsx
onClick={e => { e.stopPropagation(); onClick() }}
```

`hasEntry` is defined as: `const hasEntry = !(!entry || (!entry.duration && !entry.startTime && !entry.code))`

### Files changed
- `src/components/schedule/ShiftCell.jsx` — add `disabled: !hasEntry` to useDraggable, update empty cell onClick to stopPropagation

---

## Requirement 4: Context Menu (Right-click) + Ctrl+Z Undo

### Ctrl+Z
Already implemented: `AppShell.jsx` captures `Ctrl+Z` → calls `undoLastAction()` from the Zustand store. The store maintains a `historyStack` of up to 300 operations. No changes needed.

### Context Menu

**New component:** `src/components/schedule/ContextMenu.jsx`

Props: `{ x, y, empName, dateKey, onCopy, onPaste, onDelete, onClose, canPaste }`

Behavior:
- Positioned `fixed` at `(x, y)` coordinates from the contextmenu event
- Three menu items:
  1. **Copiar turno** — always enabled, calls `onCopy()`
  2. **Pegar turno** — disabled (greyed out) when `!canPaste`, calls `onPaste()`
  3. **Eliminar turno** — always enabled, calls `onDelete()`
- Closes on: click outside (useEffect with document click listener), Escape key, or after any action
- Viewport clamping: before rendering, adjust `x` and `y` so the menu doesn't exceed `window.innerWidth` or `window.innerHeight`. Menu estimated size: 160px wide × 110px tall.

**Modified:** `src/components/schedule/ScheduleTable.jsx`

Add state: `const [contextMenu, setContextMenu] = useState(null)` where value is `{ x, y, empName, dateKey } | null`.

Pass `onContextMenu` callback to `ShiftCell`. Render `<ContextMenu>` conditionally.

**Modified:** `src/components/schedule/ShiftCell.jsx`

On filled cells: `onContextMenu={e => { e.preventDefault(); onContextMenu(e.clientX, e.clientY, empName, dateKey) }}`
Empty cells: no context menu (nothing to copy/delete).

### Files changed
- `src/components/schedule/ContextMenu.jsx` — new file
- `src/components/schedule/ScheduleTable.jsx` — add contextMenu state + render ContextMenu
- `src/components/schedule/ShiftCell.jsx` — add onContextMenu prop + handler on filled cell

---

## Requirement 5: Drag & Drop Visual Polish

### Status
Core DnD logic is already implemented:
- `DndContext` + `PointerSensor` (distance: 5) in `ScheduleTable`
- `useDraggable` + `useDroppable` per cell in `ShiftCell`
- `moveShift` (swap semantics) in the store
- `handleDragEnd` wires active→over to `moveShift`

### Missing pieces

**Cursor feedback:**
- Filled cell (has content): `style={{ cursor: isDragging ? 'grabbing' : 'grab' }}`
- Empty cell: default cursor

**DragOverlay:**
In `ScheduleTable`, add `activeId` state (set in `onDragStart`, cleared in `onDragEnd`). Render `<DragOverlay>` with a mini card showing the shift code/duration of the dragged cell. The overlay follows the pointer and gives visual confirmation of what's being dragged.

```jsx
<DragOverlay>
  {activeId ? <DragPreviewCard empName={srcEmp} dateKey={srcDate} /> : null}
</DragOverlay>
```

`DragPreviewCard` is a small inline component (defined in same file) that reads the entry from the store and renders a simplified version of the cell.

### Files changed
- `src/components/schedule/ShiftCell.jsx` — add cursor styles
- `src/components/schedule/ScheduleTable.jsx` — add DragOverlay + onDragStart handler

---

## Requirement 6: Initial Compensatory Balance in ConfigModal

### Goal
The `ConfigModal` is missing the "Compensatorios iniciales" section. The store already stores `config.initialPending: { [empName]: number }` and `CompensatoriosPanel` already uses it as the base for recursive chain calculations. The config is already persisted to Supabase via `applyConfig`. The only gap is the UI for editing.

### Change to ConfigModal

Add section tab: `{ id: 'compensatorios', label: 'Comp. Iniciales' }`.

Add local state: `const [initialPending, setInitialPending] = useState({ ...config.initialPending })`.

Section render: one row per employee (from local `employees` state) with:
- Employee name (read-only label)
- `<input type="number" min="0" step="1" value={initialPending[emp.name] ?? 0} onChange=... />`
- A help text: "Saldo inicial de compensatorios al inicio del mes base"

On `handleSave`: include `initialPending` in the `applyConfig` call (already accepted by the store's `applyConfig` → persisted to Supabase).

Reactive to employee list: the section auto-shows/hides rows as employees are added/removed in the "Empleados" section. Since both are in local state, a `useMemo` can derive the pending rows from `employees`.

### Files changed
- `src/components/admin/ConfigModal.jsx` — add Comp. Iniciales section

---

## Bug Fix: CompensatoriosPanel.jsx — initialPending access error

**Existing bug (unrelated to Req 6 but must be fixed alongside it):**

`CompensatoriosPanel.jsx` lines 14-18 incorrectly access `initialPending` as a nested object:

```js
// CURRENT (broken):
const initialPending = config.initialPending?.[empName] ?? {}
pendStart = initialPending[monthKey] ?? 0  // treats number as object → always 0
```

The store stores `config.initialPending` as `{ [empName]: number }` — a simple number per employee, not a nested month map. The correct access is:

```js
// FIXED:
if (monthKey === baseMonth) {
  pendStart = config.initialPending?.[empName] ?? 0
}
```

**File changed:** `src/components/summary/CompensatoriosPanel.jsx` — fix lines 14-18

---

## Architecture Notes

- All business logic stays client-side (no new SQL functions needed)
- No new dependencies (xlsx already in package.json, @dnd-kit already installed)
- No changes to the Zustand store (all required actions already exist)
- No changes to backend SQL
- `CompensatoriosPanel.jsx` requires a **prerequisite bug fix** (see above) that must be applied before Req 6 work begins, as both share the same `initialPending` access pattern

## Complete Files Changed Summary

| File | Change type | Requirement |
|---|---|---|
| `src/components/summary/MonthlySummary.jsx` | Full rewrite | Req 1 + 2 |
| `src/components/summary/CompensatoriosPanel.jsx` | Bug fix (lines 14-18) | Prerequisite |
| `src/components/schedule/ShiftCell.jsx` | Modify: disabled DnD, cursor, onContextMenu, onClick | Req 3 + 4 + 5 |
| `src/components/schedule/ScheduleTable.jsx` | Modify: add DragOverlay, ContextMenu state | Req 4 + 5 |
| `src/components/schedule/ContextMenu.jsx` | New file | Req 4 |
| `src/components/admin/ConfigModal.jsx` | Add Comp. Iniciales section | Req 6 |
| `src/components/layout/AppShell.jsx` | No changes (Ctrl+Z already works) | — |

---

## Risk Table

| Risk | Mitigation |
|---|---|
| `computeMonthlySummaryData` diverges from legacy logic | Validate output against legacy for same month/data before shipping |
| DragOverlay causes layout shift | Use `dropAnimation={null}` on DragOverlay to disable snap-back animation |
| ContextMenu goes off-screen on edge clicks | Clamp `(x, y)` to viewport bounds before positioning |
| `initialPending` rows out of sync with employees | Derive pending rows via `useMemo` from `employees` local state |
