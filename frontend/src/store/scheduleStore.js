import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const HISTORY_MAX = 300
const APP_STATE_TABLE = 'app_state'
const CONFIG_KEY = 'plannerConfigV1'
const SCHEDULE_KEY = 'globalSchedule'

const DEFAULT_CONFIG = {
  employees: [],
  initialPending: {},
  groups: ['CAJAS', 'GESTION', 'PGC', 'OTROS', 'AUSENTE'],
  tasks: [
    { name: "Devoluciones", group: "GESTION" }, { name: "Inventarios", group: "GESTION" }, { name: "Precios", group: "GESTION" }, { name: "Vencimientos", group: "GESTION" },
    { name: "Linea de cajas", group: "CAJAS" }, { name: "Platos preparados", group: "CAJAS" },
    { name: "PGC", group: "PGC" },
    { name: "PLS", group: "OTROS" }, { name: "Capacitación", group: "OTROS" }, { name: "Cencopaseo", group: "OTROS" }, { name: "Supervisor", group: "OTROS" },
    { name: "Ausente", group: "AUSENTE" }
  ],
  groupColors: { "AUSENTE": "#EAEAEA", "": "#FFFFFF" }
}

// Debounce helper
function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export const useScheduleStore = create((set, get) => {
  // Debounced save — 800ms delay like app.html
  const debouncedSave = debounce(async () => {
    await get()._flushSave()
  }, 800)

  return {
    // ─── State ─────────────────────────────────────────────
    globalSchedule: {},   // { [empName]: { [dateKey]: ShiftEntry } }
    config: {
      employees: [],         // [{ name, maxHours, jefatura }]
      groups: [],            // ['CAJAS', ...]
      tasks: [],             // [{ name, group }]
      groupColors: {},       // { groupName: colorHex }
      initialPending: {},    // { empName: { 'YYYY-MM': number } }
      employeeMaxHours: {},  // { empName: number } — compat with app.html
    },
    historyStack: [],
    currentDeptId: null,
    currentStartDate: null,
    currentEndDate: null,
    baseMonth: '2025-08',
    isDirty: false,
    isSaving: false,
    isLoading: false,
    saveError: null,
    clipboardEntry: null,   // { entry, empName } for copy-paste

    // ─── Computed helpers (not state, just getters) ─────────
    getEmployeeMaxHours: () => {
      const { config } = get()
      const map = {}
      config.employees.forEach(e => { map[e.name] = e.maxHours })
      return map
    },
    getEmployeeJefatura: () => {
      const { config } = get()
      const map = {}
      config.employees.forEach(e => { map[e.name] = !!e.jefatura })
      return map
    },
    getTaskGroupMap: () => {
      const { config } = get()
      const map = {}
      config.tasks.forEach(t => { map[t.name] = t.group })
      return map
    },

    // ─── Actions ────────────────────────────────────────────

    setShift: (empName, dateKey, entry) => {
      if (get().isLoading) return;
      set(state => {
        if (state.isLoading) return state;
        const prev = state.globalSchedule[empName]?.[dateKey] ?? {}
        const newSchedule = {
          ...state.globalSchedule,
          [empName]: {
            ...(state.globalSchedule[empName] ?? {}),
            [dateKey]: { ...entry },
          },
        }
        // Push to history
        const newHistory = [
          ...state.historyStack,
          { empName, dateKey, prev: { ...prev }, next: { ...entry } },
        ]
        if (newHistory.length > HISTORY_MAX) newHistory.shift()
        return { globalSchedule: newSchedule, historyStack: newHistory, isDirty: true }
      })
      debouncedSave()
    },

    deleteShift: (empName, dateKey) => {
      if (get().isLoading) return;
      set(state => {
        if (state.isLoading) return state;
        const prev = state.globalSchedule[empName]?.[dateKey] ?? {}
        const empSchedule = { ...(state.globalSchedule[empName] ?? {}) }
        delete empSchedule[dateKey]
        const newSchedule = { ...state.globalSchedule, [empName]: empSchedule }
        const newHistory = [
          ...state.historyStack,
          { empName, dateKey, prev: { ...prev }, next: {} },
        ]
        if (newHistory.length > HISTORY_MAX) newHistory.shift()
        return { globalSchedule: newSchedule, historyStack: newHistory, isDirty: true }
      })
      debouncedSave()
    },

    copyShift: (empName, dateKey) => {
      const entry = get().globalSchedule[empName]?.[dateKey]
      if (entry) set({ clipboardEntry: { ...entry } })
    },

    pasteShift: (empName, dateKey) => {
      if (get().isLoading) return;
      const { clipboardEntry } = get()
      if (clipboardEntry) get().setShift(empName, dateKey, { ...clipboardEntry })
    },

    moveShift: (srcEmp, srcDateKey, dstEmp, dstDateKey) => {
      if (get().isLoading) return;
      set(state => {
        if (state.isLoading) return state;
        const srcEntry = state.globalSchedule[srcEmp]?.[srcDateKey] ?? {}
        const dstEntry = state.globalSchedule[dstEmp]?.[dstDateKey] ?? {}
        const newSchedule = {
          ...state.globalSchedule,
          [srcEmp]: { ...(state.globalSchedule[srcEmp] ?? {}), [srcDateKey]: { ...dstEntry } },
          [dstEmp]: { ...(state.globalSchedule[dstEmp] ?? {}), [dstDateKey]: { ...srcEntry } },
        }
        const newHistory = [
          ...state.historyStack,
          {
            type: 'move', srcEmp, srcDateKey, dstEmp, dstDateKey,
            srcPrev: { ...srcEntry }, dstPrev: { ...dstEntry }
          },
        ]
        if (newHistory.length > HISTORY_MAX) newHistory.shift()
        return { globalSchedule: newSchedule, historyStack: newHistory, isDirty: true }
      })
      debouncedSave()
    },

    undoLastAction: () => {
      set(state => {
        const stack = [...state.historyStack]
        const last = stack.pop()
        if (!last) return { historyStack: stack }
        const newSchedule = { ...state.globalSchedule }
        if (last.type === 'move') {
          newSchedule[last.srcEmp] = { ...(newSchedule[last.srcEmp] ?? {}), [last.srcDateKey]: last.srcPrev }
          newSchedule[last.dstEmp] = { ...(newSchedule[last.dstEmp] ?? {}), [last.dstDateKey]: last.dstPrev }
        } else {
          newSchedule[last.empName] = { ...(newSchedule[last.empName] ?? {}), [last.dateKey]: last.prev }
        }
        return { globalSchedule: newSchedule, historyStack: stack, isDirty: true }
      })
      debouncedSave()
    },

    setDateRange: (start, end) => set({ currentStartDate: start, currentEndDate: end }),

    // ─── Load department from app_state (same as app.html) ──
    loadDepartment: async (deptId) => {
      const { isDirty, currentDeptId: prevDeptId, isLoading } = get()
      // If there are unsaved changes, flush them before loading (prevents data loss on token refresh)
      if (isDirty && !isLoading) {
        await get()._flushSave()
      }
      set({ currentDeptId: deptId, globalSchedule: {}, historyStack: [], isLoading: true })

      try {
        let query = supabase
          .from(APP_STATE_TABLE)
          .select('key, value, department_id')
          .in('key', [CONFIG_KEY, SCHEDULE_KEY])

        if (deptId !== null) {
          query = query.eq('department_id', deptId)
        }

        const { data, error } = await query

        if (error) {
          console.error('Error loading department:', error)
          set({ isLoading: false })
          return
        }

        const rawSchedule = {}
        const mergedConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG))
        mergedConfig.employees = []
        mergedConfig.tasks = []

        if (deptId === null) {
          // If all departments, merge everything together
          const deptsMap = {}
            ; (data || []).forEach(row => {
              if (!deptsMap[row.department_id]) deptsMap[row.department_id] = {}
              deptsMap[row.department_id][row.key] = row.value
            })

          for (const dId in deptsMap) {
            const map = deptsMap[dId]
            const cfg = map[CONFIG_KEY] || DEFAULT_CONFIG
            const sched = map[SCHEDULE_KEY] || {}

            // Merge employees
            ; (cfg.employees || []).forEach(emp => {
              const name = emp.name || emp
              if (!mergedConfig.employees.some(e => (e.name || e) === name)) {
                mergedConfig.employees.push(emp)
              }
            })
            // Merge initial pending
            mergedConfig.initialPending = {
              ...mergedConfig.initialPending,
              ...(cfg.initialPending || {})
            }
            // Merge employee max hours 
            mergedConfig.employeeMaxHours = {
              ...mergedConfig.employeeMaxHours,
              ...(cfg.employeeMaxHours || {})
            }
            // Merge tasks
            ; (cfg.tasks || []).forEach(t => {
              if (!mergedConfig.tasks.some(tt => tt.name === t.name)) {
                mergedConfig.tasks.push(t)
              }
            })
            // Merge colors
            mergedConfig.groupColors = {
              ...mergedConfig.groupColors,
              ...(cfg.groupColors || {})
            }
            // Merge groups
            if (cfg.groups) {
              cfg.groups.forEach(g => {
                if (!mergedConfig.groups.includes(g)) mergedConfig.groups.push(g)
              })
            }
            // Merge schedule
            for (const [empName, daysMap] of Object.entries(sched)) {
              if (!rawSchedule[empName]) rawSchedule[empName] = {}
              Object.assign(rawSchedule[empName], daysMap)
            }
          }
        } else {
          // Specific department
          const map = {}
            ; (data || []).forEach(row => { map[row.key] = row.value })
          Object.assign(mergedConfig, map[CONFIG_KEY] || DEFAULT_CONFIG)
          Object.assign(rawSchedule, map[SCHEDULE_KEY] || {})
        }

        // Build config in the shape the components expect
        const employees = (mergedConfig.employees || []).map(e => {
          const eName = e.name || e
          const eMaxH = mergedConfig.employeeMaxHours?.[eName] || (e.maxHours === 36 ? 36 : e.maxHours === 42 ? 42 : 44)
          return {
            name: eName,
            maxHours: eMaxH,
            jefatura: !!e.jefatura,
          }
        })

        const tasks = (mergedConfig.tasks || []).map(t => ({
          name: t.name,
          group: t.group,
        }))

        const groupColors = mergedConfig.groupColors || {}
        const initialPending = mergedConfig.initialPending || {}
        let groups = mergedConfig.groups || []
        if (groups.length === 0) {
          // Backward compatibility: derive from tasks
          groups = Array.from(new Set(tasks.map(t => t.group).filter(Boolean)))
        }

        // Build employeeMaxHours map for compat
        const employeeMaxHours = {}
        employees.forEach(e => { employeeMaxHours[e.name] = e.maxHours })

        set({
          globalSchedule: rawSchedule,
          config: { employees, groups, tasks, groupColors, initialPending, employeeMaxHours },
          isDirty: false,
          historyStack: [],
          isLoading: false
        })
      } catch (err) {
        console.error('loadDepartment error:', err)
        set({ isLoading: false })
      }
    },

    // ─── Apply config and save to app_state ─────────────────
    applyConfig: async (newConfig) => {
      const { currentDeptId } = get()
      set({ config: newConfig })

      // Build the plannerConfigV1 object in the same shape as app.html
      const configToSave = {
        employees: newConfig.employees.map(e => ({
          name: e.name,
          maxHours: e.maxHours,
          jefatura: e.jefatura,
        })),
        groups: newConfig.groups || [],
        tasks: newConfig.tasks.map(t => ({
          name: t.name,
          group: t.group,
        })),
        groupColors: newConfig.groupColors || {},
        initialPending: newConfig.initialPending || {},
        employeeMaxHours: {},
      }
      newConfig.employees.forEach(e => {
        configToSave.employeeMaxHours[e.name] = e.maxHours
      })

      if (currentDeptId) {
        // Normal case: save to the current department
        await _kvSet(CONFIG_KEY, configToSave, currentDeptId)
      } else {
        // Admin "all departments" view: update ONLY shared settings (groups, tasks, groupColors)
        // per department, preserving each dept's own employees and initialPending.
        const { data: depts } = await supabase.from('departments').select('id')
        if (depts && depts.length > 0) {
          await Promise.all(depts.map(async d => {
            // Read current dept config to preserve its employees
            const { data: rows } = await supabase
              .from(APP_STATE_TABLE)
              .select('value')
              .eq('key', CONFIG_KEY)
              .eq('department_id', d.id)
              .maybeSingle()
            const existing = rows?.value || {}
            const deptConfig = {
              ...existing,
              groups: configToSave.groups,
              tasks: configToSave.tasks,
              groupColors: configToSave.groupColors,
              // preserve dept-specific fields
              employees: existing.employees || [],
              initialPending: existing.initialPending || {},
              employeeMaxHours: existing.employeeMaxHours || {},
            }
            await _kvSet(CONFIG_KEY, deptConfig, d.id)
          }))
        }
      }
    },

    // ─── Internal: flush debounced saves to app_state ──────
    _flushSave: async () => {
      if (get().isLoading) return
      const { globalSchedule, currentDeptId } = get()
      if (!currentDeptId) return

      // Avoid saving empty schedule
      if (!globalSchedule || Object.keys(globalSchedule).length === 0) {
        return
      }

      set({ isSaving: true, saveError: null })

      try {
        await _kvSet(SCHEDULE_KEY, globalSchedule, currentDeptId)
        set({ isDirty: false, isSaving: false, saveError: null })
      } catch (err) {
        set({ isSaving: false, saveError: err.message ?? 'Error al guardar' })
      }
    },

    clearSaveError: () => set({ saveError: null }),
  }
})

// ─── Helper: kvSet identical to app.html ─────────────────────
async function _kvSet(key, value, departmentId) {
  const nowIso = new Date().toISOString()
  const dept = departmentId ?? null

  // 1) Try UPDATE first
  let updateQuery = supabase
    .from(APP_STATE_TABLE)
    .update({ value, updated_at: nowIso })
    .eq('key', key)

  if (dept === null) {
    updateQuery = updateQuery.is('department_id', null)
  } else {
    updateQuery = updateQuery.eq('department_id', dept)
  }

  const { data: updData, error: updErr } = await updateQuery.select('key')

  if (updErr) {
    console.error('kvSet update error', key, updErr)
    throw updErr
  }
  if (Array.isArray(updData) && updData.length > 0) {
    return // updated OK
  }

  // 2) If no row existed, INSERT
  const row = { key, value, updated_at: nowIso, department_id: dept }
  const { error: insErr } = await supabase
    .from(APP_STATE_TABLE)
    .insert(row)

  if (insErr) {
    console.error('kvSet insert error', key, insErr)
    throw insErr
  }
}
