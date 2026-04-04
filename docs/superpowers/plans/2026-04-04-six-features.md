# Six Feature Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 6 improvements to `programador-horarioV2`: full monthly summary tables (with Excel export), bug fix for white screen on empty cell click, right-click context menu, DnD visual polish, and initial compensatory balance configuration.

**Architecture:** All changes are client-side only. Pure computation functions are extracted for testability. Component changes follow existing Tailwind + Zustand patterns. No new dependencies needed (xlsx and @dnd-kit already installed).

**Tech Stack:** React 19, Tailwind CSS 4, Zustand 5, @dnd-kit/core 6, xlsx 0.18, Vitest

**Spec:** `docs/superpowers/specs/2026-04-04-six-features-design.md`

**Working directory for all commands:** `programador-horarioV2/frontend/`

---

## Chunk 1: Bug Fixes

### Task 1: Fix CompensatoriosPanel — initialPending access bug

**Files:**
- Modify: `src/components/summary/CompensatoriosPanel.jsx:11-26`

**Context:** `config.initialPending` is `{ [empName]: number }` (flat). The current code incorrectly reads it as a nested object with month keys, causing `pendStart` to always be 0 for the base month.

- [ ] **Step 1: Open and read the broken code**

  Open `src/components/summary/CompensatoriosPanel.jsx`. Locate `function computeCompensatorios` (lines 11-56). The bug is at lines 14-18:
  ```js
  const initialPending = config.initialPending?.[empName] ?? {}
  let pendStart = 0
  if (monthKey === baseMonth) {
    pendStart = initialPending[monthKey] ?? 0  // ← BUG: accesses number as object
  ```

- [ ] **Step 2: Apply the fix**

  Replace lines 14-18 (the broken block inside `computeCompensatorios`) with:
  ```js
  let pendStart = 0
  if (monthKey === baseMonth) {
    pendStart = config.initialPending?.[empName] ?? 0
  } else {
  ```
  
  The full corrected block for the `pendStart` section (replacing lines 13-27):
  ```js
  let pendStart = 0
  if (monthKey === baseMonth) {
    pendStart = config.initialPending?.[empName] ?? 0
  } else {
    const prevKey = previousMonthKey(monthKey)
    if (prevKey < baseMonth) {
      pendStart = 0
    } else {
      computeCompensatorios(empName, prevKey, globalSchedule, config, baseMonth, cache)
      pendStart = cache[`${empName}__${prevKey}`]?.closure ?? 0
    }
  }
  ```

- [ ] **Step 3: Manual verify**

  Open the app, go to tab "Compensatorios". If you have `initialPending` set for any employee (via the store or Supabase), verify the "Inicial" column now shows the correct value instead of 0.

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/summary/CompensatoriosPanel.jsx
  git commit -m "fix: correct initialPending access in CompensatoriosPanel (flat number, not nested object)"
  ```

---

### Task 2: Fix ShiftCell — white screen crash on empty cell click

**Files:**
- Modify: `src/components/schedule/ShiftCell.jsx:12-15, 58-69`

**Context:** Empty cells register as both draggable AND droppable but only spread `ref`, not `listeners`. This creates an inconsistent DnD state that can intercept pointer events. Fix: disable dragging on empty cells via the `disabled` prop (idiomatic @dnd-kit approach). Also add `stopPropagation` on the empty cell click.

- [ ] **Step 1: Add `hasEntry` constant and `disabled` prop**

  In `src/components/schedule/ShiftCell.jsx`, after line 11 (the last `useScheduleStore` call) and before line 12 (the `useDraggable` call), add:
  ```js
  const hasEntry = !(!entry || (!entry.duration && !entry.startTime && !entry.code))
  ```

  Then on the `useDraggable` call (lines 12-15), add `disabled: !hasEntry`:
  ```js
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `${empName}__${dateKey}`,
    data: { empName, dateKey },
    disabled: !hasEntry,
  })
  ```

- [ ] **Step 2: Add stopPropagation to empty cell onClick**

  Find the empty cell return block (around line 58-69). Change `onClick={onClick}` to:
  ```jsx
  onClick={e => { e.stopPropagation(); onClick?.() }}
  ```

  Full corrected empty cell return:
  ```jsx
  if (!hasEntry) {
    return (
      <div
        ref={setDropRef}
        onClick={e => { e.stopPropagation(); onClick?.() }}
        className={`h-16 border border-borde rounded-lg cursor-pointer hover:bg-azul-50 transition-colors flex items-center justify-center ${isOver ? 'bg-azul-100 border-azul' : 'bg-white'}`}
      >
        <span className="text-muted text-xs">+</span>
      </div>
    )
  }
  ```

  Note: replace `ref={setRef}` with `ref={setDropRef}` for the empty cell — it only needs to be a drop target, not a drag source. The filled cell below still uses `ref={setRef}` (both drag + drop).

- [ ] **Step 3: Remove the old empty check line**

  The old check `if (!entry || (!entry.duration && !entry.startTime && !entry.code))` can now be replaced with `if (!hasEntry)` since `hasEntry` captures the same logic.

- [ ] **Step 4: Manual verify**

  Run `npm run dev`. Open app → go to Horarios tab → click the `+` on any empty cell. The EditShiftModal should open correctly without white screen.

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/schedule/ShiftCell.jsx
  git commit -m "fix: prevent white screen crash on empty shift cell click by disabling useDraggable and adding stopPropagation"
  ```

---

## Chunk 2: Drag & Drop Visual + Context Menu

### Task 3: DnD cursor feedback + DragOverlay

**Files:**
- Modify: `src/components/schedule/ShiftCell.jsx` (cursor styles)
- Modify: `src/components/schedule/ScheduleTable.jsx` (DragOverlay + onDragStart)

**Context:** The DnD swap behavior already works. Missing: visual cursor feedback (`grab`/`grabbing`) and a `DragOverlay` that follows the mouse showing what's being dragged.

- [ ] **Step 1: Add cursor styles to ShiftCell filled cell**

  In `src/components/schedule/ShiftCell.jsx`, find the filled cell's outer `<div>` (around line 71-82). It currently has a `className` string and possibly a `style` prop. Add/update the `style` prop to include cursor:
  ```jsx
  style={{
    backgroundColor: isAbsence ? '#EAEAEA' : (taskColor ?? '#E0E7FF'),
    cursor: isDragging ? 'grabbing' : 'grab',
  }}
  ```
  Remove `cursor-pointer` from the `className` if present on the filled cell (it conflicts with cursor:grab).

- [ ] **Step 2: Add `activeId` state and `onDragStart` to ScheduleTable**

  In `src/components/schedule/ScheduleTable.jsx`, add state after the existing `useState` calls:
  ```js
  const [activeId, setActiveId] = useState(null)
  ```

  Update the `handleDragEnd` to clear `activeId`:
  ```js
  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over || active.id === over.id) return
    const src = active.data.current
    const dst = over.data.current
    if (src && dst) moveShift(src.empName, src.dateKey, dst.empName, dst.dateKey)
  }
  ```

  Add `onDragStart` handler:
  ```js
  const handleDragStart = ({ active }) => {
    setActiveId(active.id)
  }
  ```

- [ ] **Step 3: Add DragOverlay to ScheduleTable**

  First, create a small inline `DragPreviewCard` component inside `ScheduleTable.jsx` (above the main export):
  ```jsx
  function DragPreviewCard({ empName, dateKey }) {
    const entry = useScheduleStore(s => s.globalSchedule[empName]?.[dateKey])
    if (!entry) return null
    const label = entry.code || entry.duration || '?'
    return (
      <div className="h-16 w-24 rounded-lg bg-azul text-white flex items-center justify-center shadow-xl opacity-90 text-sm font-bold">
        {label}
      </div>
    )
  }
  ```

  Then in the `DndContext` JSX, add `onDragStart` and render `<DragOverlay>`:
  ```jsx
  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
  >
    {/* ... existing table ... */}

    <DragOverlay dropAnimation={null}>
      {activeId ? (() => {
        const [empName, dateKey] = activeId.split('__')
        return <DragPreviewCard empName={empName} dateKey={dateKey} />
      })() : null}
    </DragOverlay>
  </DndContext>
  ```

- [ ] **Step 4: Manual verify**

  Run `npm run dev`. Hover over a filled shift cell — cursor should show `grab`. Drag a cell — cursor shows `grabbing` and a blue preview card follows the mouse. Drop on another cell — both cells swap.

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/schedule/ShiftCell.jsx src/components/schedule/ScheduleTable.jsx
  git commit -m "feat: add grab cursor and DragOverlay preview for shift DnD"
  ```

---

### Task 4: Create ContextMenu component

**Files:**
- Create: `src/components/schedule/ContextMenu.jsx`

**Context:** A floating context menu that appears at mouse coordinates on right-click of a filled shift cell. Three options: Copiar, Pegar (disabled if no clipboard), Eliminar. Closes on click outside or Escape.

- [ ] **Step 1: Create `src/components/schedule/ContextMenu.jsx`**

  Full file content:
  ```jsx
  import { useEffect, useRef } from 'react'

  export default function ContextMenu({ x, y, empName, dateKey, onCopy, onPaste, onDelete, onClose, canPaste }) {
    const menuRef = useRef(null)

    // Clamp to viewport
    const menuW = 160, menuH = 110
    const left = Math.min(x, window.innerWidth - menuW - 8)
    const top = Math.min(y, window.innerHeight - menuH - 8)

    // Close on outside click
    useEffect(() => {
      const handle = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
      }
      const handleKey = (e) => { if (e.key === 'Escape') onClose() }
      document.addEventListener('mousedown', handle)
      document.addEventListener('keydown', handleKey)
      return () => {
        document.removeEventListener('mousedown', handle)
        document.removeEventListener('keydown', handleKey)
      }
    }, [onClose])

    const btn = 'w-full text-left px-4 py-2 text-sm hover:bg-azul-50 transition-colors'
    const btnDisabled = 'w-full text-left px-4 py-2 text-sm text-muted cursor-not-allowed'

    return (
      <div
        ref={menuRef}
        className="fixed z-[200] bg-white border border-borde rounded-xl shadow-xl overflow-hidden"
        style={{ left, top, width: menuW }}
      >
        <button
          className={btn}
          onClick={() => { onCopy(); onClose() }}
        >
          Copiar turno
        </button>
        <button
          className={canPaste ? btn : btnDisabled}
          disabled={!canPaste}
          onClick={() => { if (canPaste) { onPaste(); onClose() } }}
        >
          Pegar turno
        </button>
        <div className="border-t border-borde" />
        <button
          className={`${btn} text-danger hover:bg-red-50`}
          onClick={() => { onDelete(); onClose() }}
        >
          Eliminar turno
        </button>
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify file was created**

  ```bash
  ls src/components/schedule/
  ```
  Expected: `ContextMenu.jsx` appears in listing.

---

### Task 5: Wire ContextMenu into ScheduleTable and ShiftCell

**Files:**
- Modify: `src/components/schedule/ScheduleTable.jsx`
- Modify: `src/components/schedule/ShiftCell.jsx`

- [ ] **Step 1: Add ContextMenu import and state to ScheduleTable**

  In `src/components/schedule/ScheduleTable.jsx`:

  Add import at the top:
  ```js
  import ContextMenu from './ContextMenu'
  ```

  Add store actions (near other `useScheduleStore` calls):
  ```js
  const copyShift = useScheduleStore(s => s.copyShift)
  const pasteShift = useScheduleStore(s => s.pasteShift)
  const deleteShift = useScheduleStore(s => s.deleteShift)
  const clipboardEntry = useScheduleStore(s => s.clipboardEntry)
  ```

  Add state after existing `useState` calls:
  ```js
  const [contextMenu, setContextMenu] = useState(null) // { x, y, empName, dateKey } | null
  ```

  Add handler:
  ```js
  const handleContextMenu = (x, y, empName, dateKey) => {
    setContextMenu({ x, y, empName, dateKey })
  }
  ```

- [ ] **Step 2: Pass onContextMenu to ShiftCell in ScheduleTable**

  Find the `<ShiftCell>` render in ScheduleTable (inside the `dates.map`). Add the prop:
  ```jsx
  <ShiftCell
    empName={emp.name}
    dateKey={dateKey}
    onClick={() => setEditModal({ empName: emp.name, dateKey })}
    onContextMenu={handleContextMenu}
  />
  ```

- [ ] **Step 3: Render ContextMenu in ScheduleTable**

  Inside the `<DndContext>` but outside the table (after the `{editModal && ...}` block), add:
  ```jsx
  {contextMenu && (
    <ContextMenu
      x={contextMenu.x}
      y={contextMenu.y}
      empName={contextMenu.empName}
      dateKey={contextMenu.dateKey}
      canPaste={!!clipboardEntry}
      onCopy={() => copyShift(contextMenu.empName, contextMenu.dateKey)}
      onPaste={() => pasteShift(contextMenu.empName, contextMenu.dateKey)}
      onDelete={() => deleteShift(contextMenu.empName, contextMenu.dateKey)}
      onClose={() => setContextMenu(null)}
    />
  )}
  ```

- [ ] **Step 4: Add onContextMenu prop and handler to ShiftCell filled cell**

  In `src/components/schedule/ShiftCell.jsx`:

  Update the function signature to accept the new prop:
  ```js
  export default function ShiftCell({ empName, dateKey, onClick, onContextMenu }) {
  ```

  On the filled cell's outer div (the one with `{...listeners} {...attributes}`), add:
  ```jsx
  onContextMenu={e => { e.preventDefault(); onContextMenu?.(e.clientX, e.clientY, empName, dateKey) }}
  ```

  Do NOT add `onContextMenu` to the empty cell (no content to copy/delete on empty cells).

- [ ] **Step 5: Manual verify**

  Run `npm run dev`. Right-click on a filled shift cell → context menu appears with 3 options. Click "Copiar turno" → menu closes. Right-click another cell → "Pegar turno" should now be enabled. Click it → shift is pasted. Right-click a cell → "Eliminar turno" → cell becomes empty.

  Also verify Ctrl+Z: make a change, then Ctrl+Z → change is undone.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/schedule/ContextMenu.jsx src/components/schedule/ScheduleTable.jsx src/components/schedule/ShiftCell.jsx
  git commit -m "feat: add right-click context menu (copy/paste/delete) to shift cells"
  ```

---

## Chunk 3: ConfigModal — Compensatorios Iniciales

### Task 6: Add "Comp. Iniciales" section to ConfigModal

**Files:**
- Modify: `src/components/admin/ConfigModal.jsx`

**Context:** The store already handles `config.initialPending: { [empName]: number }`. The `applyConfig` action already accepts and persists it. Only the UI is missing.

- [ ] **Step 1: Add `initialPending` local state**

  In `src/components/admin/ConfigModal.jsx`, after the existing `useState` calls (around line 13), add:
  ```js
  const [initialPending, setInitialPending] = useState({ ...config.initialPending })
  ```

- [ ] **Step 2: Add the new section to the SECTIONS array**

  Find the `SECTIONS` constant (around line 46). Add the new entry:
  ```js
  const SECTIONS = [
    { id: 'employees', label: 'Empleados' },
    { id: 'tasks', label: 'Tareas' },
    { id: 'colors', label: 'Colores' },
    { id: 'compensatorios', label: 'Comp. Iniciales' },
  ]
  ```

- [ ] **Step 3: Add the section's render content**

  Inside the `{/* Content */}` div, after the `{activeSection === 'colors' && ...}` block, add:
  ```jsx
  {/* Compensatorios Iniciales */}
  {activeSection === 'compensatorios' && (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Saldo inicial de compensatorios al inicio del mes base. Si un empleado inicia con días a favor, introduce aquí su balance de partida.
      </p>
      {employees.filter(e => e.name.trim()).length === 0 ? (
        <p className="text-sm text-muted text-center py-4">
          Agrega empleados primero en la pestaña "Empleados".
        </p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-borde">
              <th className="text-left text-xs font-semibold text-muted pb-2">Empleado</th>
              <th className="text-center text-xs font-semibold text-muted pb-2">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {employees.filter(e => e.name.trim()).map((emp, i) => (
              <tr key={i} className="border-b border-borde/50">
                <td className="py-2 text-sm text-azul">{emp.name}</td>
                <td className="py-2 text-center">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={initialPending[emp.name] ?? 0}
                    onChange={e => setInitialPending(prev => ({
                      ...prev,
                      [emp.name]: parseInt(e.target.value) || 0
                    }))}
                    className="w-20 border border-borde rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-azul"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )}
  ```

- [ ] **Step 4: Include `initialPending` in handleSave**

  Find `handleSave` (around line 29). The current call to `applyConfig` passes `initialPending: config.initialPending`. Update it to use the local state:
  ```js
  await applyConfig({
    ...config,
    employees: filteredEmployees,
    tasks: tasks.filter(t => t.name.trim()),
    groupColors,
    initialPending,       // ← use local state, not config.initialPending
    employeeMaxHours,
  })
  ```

- [ ] **Step 5: Manual verify**

  Run `npm run dev`. Open Configuración → "Comp. Iniciales" tab. Each employee should have a number input. Set a value (e.g., 2 for an employee). Save. Open tab "Compensatorios" and verify that employee's "Inicial" column now shows `2`.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/admin/ConfigModal.jsx
  git commit -m "feat: add Comp. Iniciales tab to ConfigModal for setting initial compensatory day balances"
  ```

---

## Chunk 4: Monthly Summary Tables + Excel Export

### Task 7: Extract and test `computeMonthlySummaryData`

**Files:**
- Create: `src/lib/monthlySummary.js`
- Create: `src/lib/__tests__/monthlySummary.test.js`

**Context:** The computation logic is pure (no React, no hooks). Extracting it to `src/lib/monthlySummary.js` makes it testable with Vitest and reusable in `MonthlySummary.jsx`.

- [ ] **Step 1: Create `src/lib/monthlySummary.js`**

  ```js
  /**
   * monthlySummary.js
   * Pure computation for the monthly schedule summary.
   * Ported from app.html computeMonthlySummary (lines 4060-4136).
   */
  import { absenceCodes, absenceCodeToAbbr, isHoliday } from './shiftCodes'

  function previousMonthKey(key) {
    const [y, m] = key.split('-').map(Number)
    if (m === 1) return `${y - 1}-12`
    return `${y}-${String(m - 1).padStart(2, '0')}`
  }

  /**
   * Computes full monthly summary data for all employees.
   *
   * @param {number} year
   * @param {number} month  1-12
   * @param {object} globalSchedule  { [empName]: { [dateKey]: entry } }
   * @param {object} config  { employees, tasks, initialPending }
   * @param {string} baseMonth  'YYYY-MM'
   * @param {object} [cache]  internal memoization cache, pass {} on first call
   * @returns {{ rows, dayCounts, totalPend, totalClosure, totalCaused, totalPaid, daysInMonth }}
   */
  export function computeMonthlySummaryData(year, month, globalSchedule, config, baseMonth, cache = {}) {
    const yearStr = String(year).padStart(4, '0')
    const monthStr = String(month).padStart(2, '0')
    const monthKey = `${yearStr}-${monthStr}`

    if (cache[monthKey]) return cache[monthKey]

    // Build taskGroupMap
    const taskGroupMap = {}
    config.tasks.forEach(t => { taskGroupMap[t.name] = t.group })

    const daysInMonth = new Date(year, month, 0).getDate()

    // Resolve initialPendings for this month
    let initialPendings = {}
    if (monthKey === baseMonth) {
      config.employees.forEach(emp => {
        initialPendings[emp.name] = config.initialPending?.[emp.name] ?? 0
      })
    } else {
      const prevKey = previousMonthKey(monthKey)
      if (prevKey < baseMonth) {
        config.employees.forEach(emp => { initialPendings[emp.name] = 0 })
      } else {
        const [prevY, prevM] = prevKey.split('-').map(Number)
        const prevResult = computeMonthlySummaryData(prevY, prevM, globalSchedule, config, baseMonth, cache)
        prevResult.rows.forEach(r => { initialPendings[r.emp] = r.closure })
        // Fill any missing employees
        config.employees.forEach(emp => {
          if (!(emp.name in initialPendings)) initialPendings[emp.name] = 0
        })
      }
    }

    const rows = []
    const dayCounts = new Array(daysInMonth).fill(0)
    let totalPend = 0, totalClosure = 0, totalCaused = 0, totalPaid = 0

    config.employees.forEach(emp => {
      const pendStart = initialPendings[emp.name] ?? 0
      let causeCount = 0, paidCount = 0, cajasCount = 0
      const codes = []
      const causedDates = []
      const paidDates = []

      for (let d = 1; d <= daysInMonth; d++) {
        const ds = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`
        const entry = globalSchedule[emp.name]?.[ds]
        let code = '0'

        if (entry?.duration) {
          const durStr = entry.duration
          const num = parseInt(durStr)
          const isAbsCode = absenceCodes.includes(durStr)

          if (!Number.isNaN(num) && !isAbsCode) {
            // Working shift — categorize by start time
            if (entry.startTime) {
              const [hh, mm] = entry.startTime.split(':').map(Number)
              const minutes = hh * 60 + mm
              code = minutes < 600 ? 'AM' : minutes < 720 ? 'INT' : 'PM'
            } else {
              code = 'T' // turno sin hora
            }
            // Caused: working on a holiday
            if (isHoliday(ds)) {
              causeCount++
              causedDates.push(String(d).padStart(2, '0'))
            }
            // CAJAS polivalencia count
            if (entry.task && taskGroupMap[entry.task] === 'CAJAS') cajasCount++
            // Day coverage count
            dayCounts[d - 1]++
          } else {
            // Absence
            let abbr = durStr
            if (!Number.isNaN(num) && isAbsCode) {
              abbr = absenceCodeToAbbr[durStr] ?? durStr
            }
            code = abbr
            if (abbr === 'C') {
              paidCount++
              paidDates.push(String(d).padStart(2, '0'))
            }
          }
        }

        codes.push(code)
      }

      const closure = pendStart + causeCount - paidCount
      const polivPercent = cajasCount > 0 ? Math.min((cajasCount / 11) * 100, 100) : 0

      // Format date strings as "dd,dd/MM/YYYY"
      const causedStr = causedDates.length
        ? `${causedDates.join(',')}/${monthStr}/${yearStr}`
        : ''
      const paidStr = paidDates.length
        ? `${paidDates.join(',')}/${monthStr}/${yearStr}`
        : ''

      rows.push({ emp: emp.name, pend: pendStart, poliv: Math.round(polivPercent), codes, caused: causeCount, paid: paidCount, closure, causedStr, paidStr })
      totalPend += pendStart
      totalClosure += closure
      totalCaused += causeCount
      totalPaid += paidCount
    })

    const result = { rows, dayCounts, totalPend, totalClosure, totalCaused, totalPaid, daysInMonth, year, month }
    cache[monthKey] = result
    return result
  }

  /**
   * Exports monthly summary to Excel (.xlsx).
   * Sheet 1: "Malla_Mensual" — full month grid
   * Sheet 2: "Compensatorios" — compensation table
   *
   * @param {number} year
   * @param {number} month
   * @param {object} summaryData  output of computeMonthlySummaryData
   */
  export function exportToExcel(year, month, summaryData) {
    // Dynamic import to avoid SSR issues (xlsx is CJS)
    import('xlsx').then(XLSX => {
      const { rows, dayCounts, totalPend, totalClosure, totalCaused, totalPaid, daysInMonth } = summaryData
      const yearStr = String(year).padStart(4, '0')
      const monthStr = String(month).padStart(2, '0')
      const monthLabel = new Date(year, month - 1, 1)
        .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
        .toUpperCase()

      // ── Sheet 1: Malla Mensual ──────────────────────────────
      const dayHeaders = []
      for (let d = 1; d <= daysInMonth; d++) {
        dayHeaders.push(String(d).padStart(2, '0'))
      }

      const mallaRows = [
        // Title row
        [`MALLA MENSUAL — ${monthLabel}`],
        // Header
        ['Nombre', 'Poliv.', 'Pend.', ...dayHeaders, 'Comp. Cierre'],
        // Employee rows
        ...rows.map(r => [r.emp, `${r.poliv}%`, r.pend, ...r.codes, r.closure]),
        // Total row
        ['TOTAL', '', totalPend, ...dayCounts, totalClosure],
      ]

      // ── Sheet 2: Compensatorios ─────────────────────────────
      const compRows = [
        [`COMPENSATORIOS — ${monthLabel}`],
        ['NOMBRE', 'SALDO', '# DIAS CAUSADOS', 'FECHAS CAUSADAS', '# DIAS PAGADOS', 'FECHAS PAGADAS', '# DIAS PEND'],
        ...rows.map(r => [r.emp, r.pend, r.caused, r.causedStr, r.paid, r.paidStr, r.closure]),
        ['TOTAL COMPENSATORIOS', '', totalCaused, '', totalPaid, '', totalClosure],
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mallaRows), 'Malla_Mensual')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(compRows), 'Compensatorios')
      XLSX.writeFile(wb, `Resumen_${yearStr}-${monthStr}.xlsx`)
    })
  }
  ```

- [ ] **Step 2: Write failing tests in `src/lib/__tests__/monthlySummary.test.js`**

  ```js
  import { describe, it, expect } from 'vitest'
  import { computeMonthlySummaryData } from '../monthlySummary'

  const BASE_MONTH = '2025-08'

  const mockConfig = {
    employees: [{ name: 'Ana', maxHours: 44, jefatura: false }],
    tasks: [
      { name: 'Linea de cajas', group: 'CAJAS' },
      { name: 'Inventarios', group: 'GESTION' },
    ],
    initialPending: { Ana: 2 },
    groupColors: {},
    employeeMaxHours: { Ana: 44 },
  }

  describe('computeMonthlySummaryData', () => {
    it('returns correct structure with empty schedule', () => {
      const result = computeMonthlySummaryData(2025, 8, {}, mockConfig, BASE_MONTH)
      expect(result).toHaveProperty('rows')
      expect(result).toHaveProperty('dayCounts')
      expect(result.daysInMonth).toBe(31)
      expect(result.rows).toHaveLength(1)
    })

    it('uses initialPending for the baseMonth', () => {
      const result = computeMonthlySummaryData(2025, 8, {}, mockConfig, BASE_MONTH)
      expect(result.rows[0].pend).toBe(2)
    })

    it('initialPending is 0 for months before baseMonth', () => {
      const result = computeMonthlySummaryData(2025, 7, {}, mockConfig, BASE_MONTH)
      expect(result.rows[0].pend).toBe(0)
    })

    it('categorizes AM shift correctly (before 10:00)', () => {
      const sched = { Ana: { '2025-08-04': { duration: '8', startTime: '06:00', code: '', task: '' } } }
      const result = computeMonthlySummaryData(2025, 8, sched, mockConfig, BASE_MONTH)
      expect(result.rows[0].codes[3]).toBe('AM') // day 4 = index 3
    })

    it('categorizes PM shift correctly (12:00 or later)', () => {
      const sched = { Ana: { '2025-08-05': { duration: '8', startTime: '13:00', code: '', task: '' } } }
      const result = computeMonthlySummaryData(2025, 8, sched, mockConfig, BASE_MONTH)
      expect(result.rows[0].codes[4]).toBe('PM') // day 5 = index 4
    })

    it('categorizes INT shift correctly (10:00-11:59)', () => {
      const sched = { Ana: { '2025-08-06': { duration: '8', startTime: '10:00', code: '', task: '' } } }
      const result = computeMonthlySummaryData(2025, 8, sched, mockConfig, BASE_MONTH)
      expect(result.rows[0].codes[5]).toBe('INT')
    })

    it('records absence code C correctly and counts paidCount', () => {
      const sched = { Ana: { '2025-08-11': { duration: 'C', startTime: '', code: '', task: 'Ausente' } } }
      const result = computeMonthlySummaryData(2025, 8, sched, mockConfig, BASE_MONTH)
      expect(result.rows[0].paid).toBe(1)
      expect(result.rows[0].codes[10]).toBe('C')
    })

    it('counts CAJAS task days for polivalencia', () => {
      const sched = {
        Ana: {
          '2025-08-04': { duration: '8', startTime: '06:00', code: '', task: 'Linea de cajas' },
          '2025-08-05': { duration: '8', startTime: '06:00', code: '', task: 'Linea de cajas' },
        }
      }
      const result = computeMonthlySummaryData(2025, 8, sched, mockConfig, BASE_MONTH)
      // 2/11 * 100 = 18.18... → rounded to 18
      expect(result.rows[0].poliv).toBe(18)
    })

    it('caps polivalencia at 100%', () => {
      const sched = { Ana: {} }
      // 11+ cajas days
      for (let d = 1; d <= 12; d++) {
        sched.Ana[`2025-08-${String(d).padStart(2,'0')}`] = { duration: '8', startTime: '06:00', code: '', task: 'Linea de cajas' }
      }
      const result = computeMonthlySummaryData(2025, 8, sched, mockConfig, BASE_MONTH)
      expect(result.rows[0].poliv).toBe(100)
    })

    it('closure = pend + caused - paid', () => {
      // No holidays in data used here, so caused = 0
      const sched = { Ana: { '2025-08-11': { duration: 'C', startTime: '', code: '', task: 'Ausente' } } }
      const result = computeMonthlySummaryData(2025, 8, sched, mockConfig, BASE_MONTH)
      // pend=2, paid=1, caused=0 → closure=1
      expect(result.rows[0].closure).toBe(1)
    })

    it('prior month closure carries to next month as pendStart', () => {
      // Aug: pend=2, paid=1 → closure=1
      const sched = { Ana: { '2025-08-11': { duration: 'C', startTime: '', code: '', task: 'Ausente' } } }
      const cache = {}
      computeMonthlySummaryData(2025, 8, sched, mockConfig, BASE_MONTH, cache)
      const sep = computeMonthlySummaryData(2025, 9, sched, mockConfig, BASE_MONTH, cache)
      expect(sep.rows[0].pend).toBe(1)
    })
  })
  ```

- [ ] **Step 3: Run tests to verify they fail**

  ```bash
  npm run test -- src/lib/__tests__/monthlySummary.test.js
  ```
  Expected: Multiple `FAIL` — "Cannot find module '../monthlySummary'" or similar.

- [ ] **Step 4: Create the implementation file (already done in Step 1)**

  The file was created in Step 1. Now run tests again:

  ```bash
  npm run test -- src/lib/__tests__/monthlySummary.test.js
  ```
  Expected: All tests PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add src/lib/monthlySummary.js src/lib/__tests__/monthlySummary.test.js
  git commit -m "feat: extract computeMonthlySummaryData pure function with tests"
  ```

---

### Task 8: Rewrite MonthlySummary component

**Files:**
- Modify: `src/components/summary/MonthlySummary.jsx` (full rewrite)

**Context:** Replace the current minimal table (hours + poliv only) with two stacked tables matching the legacy app: full month grid + compensatorios format.

- [ ] **Step 1: Rewrite `src/components/summary/MonthlySummary.jsx`**

  Full file:
  ```jsx
  import { useState, useMemo } from 'react'
  import { useScheduleStore } from '../../store/scheduleStore'
  import { isHoliday } from '../../lib/shiftCodes'
  import { computeMonthlySummaryData, exportToExcel } from '../../lib/monthlySummary'

  const ABSENCE_CODES = new Set(['C','D','I','S','V','DF','LC','F','B'])

  export default function MonthlySummary() {
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)

    const globalSchedule = useScheduleStore(s => s.globalSchedule)
    const config = useScheduleStore(s => s.config)
    const baseMonth = useScheduleStore(s => s.baseMonth)

    const monthLabel = new Date(year, month - 1, 1)
      .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
      .toUpperCase()

    const summary = useMemo(
      () => computeMonthlySummaryData(year, month, globalSchedule, config, baseMonth),
      [year, month, globalSchedule, config, baseMonth]
    )

    const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
    const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

    const handleExport = () => exportToExcel(year, month, summary)

    // Day headers for table 1
    const dayHeaders = useMemo(() => {
      const headers = []
      for (let d = 1; d <= summary.daysInMonth; d++) {
        const ds = `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
        const fest = isHoliday(ds)
        const weekday = new Date(year, month - 1, d)
          .toLocaleDateString('es-CO', { weekday: 'short' })
          .slice(0, 2)
          .toUpperCase()
        headers.push({ d, ds, fest, weekday })
      }
      return headers
    }, [year, month, summary.daysInMonth])

    const th = 'text-center text-[10px] font-semibold px-1 py-1'
    const td = 'text-center text-[10px] px-1 py-1 border-b border-borde/50'

    return (
      <div className="space-y-6">
        {/* ── Header bar ────────────────────────── */}
        <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-borde px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="text-azul hover:bg-azul-50 px-2 py-1 rounded text-sm">‹</button>
            <span className="text-azul font-semibold text-sm capitalize">{monthLabel}</span>
            <button onClick={nextMonth} className="text-azul hover:bg-azul-50 px-2 py-1 rounded text-sm">›</button>
          </div>
          <button
            onClick={handleExport}
            className="bg-azul text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors"
          >
            Exportar Excel
          </button>
        </div>

        {/* ── TABLA 1: Cuadrícula mensual ────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-borde overflow-hidden">
          <div className="px-4 py-2 border-b border-borde bg-azul-50">
            <h3 className="text-azul font-semibold text-sm">Programación mensual</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="border-collapse" style={{ fontSize: '10px', minWidth: `${200 + summary.daysInMonth * 28}px` }}>
              <thead>
                <tr className="bg-azul-50">
                  <th className={`${th} text-left px-3 sticky left-0 bg-azul-50 z-10 w-32`}>Nombre</th>
                  <th className={`${th} w-12`}>Poliv.</th>
                  <th className={`${th} w-10`}>Pend.</th>
                  {dayHeaders.map(({ d, fest, weekday }) => (
                    <th
                      key={d}
                      className={`${th} w-7 ${fest ? 'text-danger bg-red-50' : 'text-muted'}`}
                    >
                      <div>{weekday}</div>
                      <div className={`font-bold ${fest ? 'text-danger' : 'text-azul'}`}>{String(d).padStart(2,'0')}</div>
                    </th>
                  ))}
                  <th className={`${th} w-16 bg-azul-50`}>Comp.<br/>Cierre</th>
                </tr>
              </thead>
              <tbody>
                {config.employees.length === 0 ? (
                  <tr><td colSpan={summary.daysInMonth + 4} className="text-center text-muted text-sm py-8">No hay empleados.</td></tr>
                ) : (
                  <>
                    {summary.rows.map(row => (
                      <tr key={row.emp} className="hover:bg-azul-50/20">
                        <td className={`${td} text-left px-3 font-medium text-azul sticky left-0 bg-white z-10 max-w-[8rem] truncate`} title={row.emp}>{row.emp}</td>
                        <td className={td}>{row.poliv}%</td>
                        <td className={td}>{row.pend}</td>
                        {row.codes.map((code, i) => (
                          <td
                            key={i}
                            className={`${td} ${ABSENCE_CODES.has(code) ? 'text-danger font-bold' : code !== '0' ? 'text-azul' : 'text-borde'}`}
                          >
                            {code === '0' ? '' : code}
                          </td>
                        ))}
                        <td className={`${td} font-bold ${row.closure < 0 ? 'text-danger' : 'text-azul'}`}>{row.closure}</td>
                      </tr>
                    ))}
                    {/* Total row */}
                    <tr className="bg-[#C2DDF2] font-bold">
                      <td className={`${td} text-left px-3 sticky left-0 bg-[#C2DDF2] z-10`}>TOTAL</td>
                      <td className={td}></td>
                      <td className={td}>{summary.totalPend}</td>
                      {summary.dayCounts.map((count, i) => (
                        <td key={i} className={td}>{count || ''}</td>
                      ))}
                      <td className={td}>{summary.totalClosure}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── TABLA 2: Compensatorios formato empresa ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-borde overflow-hidden">
          <div className="px-4 py-2 border-b border-borde bg-azul-50">
            <h3 className="text-azul font-semibold text-sm">Compensatorios — {monthLabel}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: '11px' }}>
              <thead>
                <tr className="bg-azul-50 border-b border-borde">
                  <th className={`${th} text-left px-3`}>NOMBRE</th>
                  <th className={th}>SALDO</th>
                  <th className={th}># CAUSADOS</th>
                  <th className={th}>FECHAS CAUSADAS</th>
                  <th className={th}># PAGADOS</th>
                  <th className={th}>FECHAS PAGADAS</th>
                  <th className={th}># PENDIENTE</th>
                </tr>
              </thead>
              <tbody>
                {config.employees.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-muted py-8">No hay empleados.</td></tr>
                ) : (
                  <>
                    {summary.rows.map(row => (
                      <tr key={row.emp} className="border-b border-borde/50 hover:bg-azul-50/20">
                        <td className={`${td} text-left px-3 font-medium text-azul`}>{row.emp}</td>
                        <td className={td}>{row.pend}</td>
                        <td className={`${td} text-azul font-medium`}>{row.caused}</td>
                        <td className={`${td} text-xs`}>{row.causedStr || '—'}</td>
                        <td className={`${td} text-danger font-medium`}>{row.paid}</td>
                        <td className={`${td} text-xs`}>{row.paidStr || '—'}</td>
                        <td className={`${td} font-bold ${row.closure < 0 ? 'text-danger' : 'text-azul'}`}>{row.closure}</td>
                      </tr>
                    ))}
                    {/* Total */}
                    <tr className="bg-[#C2DDF2] font-bold border-t border-borde">
                      <td className={`${td} text-left px-3`} colSpan={6}>TOTAL COMPENSATORIOS</td>
                      <td className={td}>{summary.totalClosure}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Manual verify**

  Run `npm run dev`. Navigate to tab "Resumen Mensual". Verify:
  - Month navigation works (‹ ›)
  - Tabla 1 shows all employees with shift codes (AM/PM/INT/absence codes) for each day
  - Holiday columns are highlighted red
  - Tabla 2 shows compensatorios with date strings
  - TOTAL rows appear in blue at the bottom of each table

- [ ] **Step 3: Build check**

  ```bash
  npm run build
  ```
  Expected: Build completes without errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/summary/MonthlySummary.jsx
  git commit -m "feat: rewrite MonthlySummary with full month grid and compensatorios tables matching legacy app"
  ```

---

### Task 9: Verify Excel export end-to-end

**Files:**
- No code changes — this task verifies Task 7's `exportToExcel` works in the browser.

- [ ] **Step 1: Manual test**

  Run `npm run dev`. Go to "Resumen Mensual" tab. Click "Exportar Excel". Verify:
  - Browser downloads `Resumen_YYYY-MM.xlsx`
  - Opening the file in Excel/LibreOffice shows two sheets: "Malla_Mensual" and "Compensatorios"
  - "Malla_Mensual" has employee names, day codes, and TOTAL row
  - "Compensatorios" has the 7-column format matching Tabla 2

- [ ] **Step 2: Run full test suite**

  ```bash
  npm run test
  ```
  Expected: All tests pass (shiftCodes suite + monthlySummary suite).

- [ ] **Step 3: Final build check**

  ```bash
  npm run build
  ```
  Expected: Build succeeds with no errors or warnings about unused imports.

- [ ] **Step 4: Final commit**

  ```bash
  git add .
  git commit -m "feat: all 6 improvements complete — monthly tables, excel export, DnD, context menu, compensatorios config"
  ```

---

## Summary of All Changes

| File | Change |
|---|---|
| `src/components/summary/CompensatoriosPanel.jsx` | Bug fix: initialPending access (Task 1) |
| `src/components/schedule/ShiftCell.jsx` | Bug fix + DnD disabled + cursor + onContextMenu (Tasks 2, 3, 5) |
| `src/components/schedule/ScheduleTable.jsx` | DragOverlay + ContextMenu state/render (Tasks 3, 5) |
| `src/components/schedule/ContextMenu.jsx` | New: right-click context menu (Task 4) |
| `src/components/admin/ConfigModal.jsx` | New section: Comp. Iniciales (Task 6) |
| `src/lib/monthlySummary.js` | New: pure computation + export (Task 7) |
| `src/lib/__tests__/monthlySummary.test.js` | New: Vitest tests for computation (Task 7) |
| `src/components/summary/MonthlySummary.jsx` | Full rewrite: two tables + export button (Tasks 8, 9) |
