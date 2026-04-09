import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useScheduleStore } from '../store/scheduleStore'

const CONFIG_KEY = 'plannerConfigV1'
const SCHEDULE_KEY = 'globalSchedule'

/**
 * Sets up Supabase realtime subscription for app_state changes.
 * When another user changes the schedule or config, updates local state.
 * Mirrors the initRealtimeOnce() logic in app.html lines 1863-1910.
 */
export function useScheduleSync() {
  const currentDeptId = useScheduleStore(s => s.currentDeptId)

  useEffect(() => {
    if (!currentDeptId) return

    const channel = supabase
      .channel('app-state-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'app_state',
      }, (payload) => {
        const row = payload.new || payload.old
        if (!row) return

        // Only process changes for our department
        if (row.department_id !== currentDeptId) return

        const key = row.key
        const val = row.value

        if (key === SCHEDULE_KEY) {
          if (!val || (typeof val === 'object' && Object.keys(val).length === 0)) return
          const state = useScheduleStore.getState()
          // Never overwrite unsaved local edits with server data
          if (state.isDirty) return
          if (JSON.stringify(val) === JSON.stringify(state.globalSchedule)) return
          useScheduleStore.setState({
            globalSchedule: val,
            isDirty: false,
          })
          return
        }

        if (key === CONFIG_KEY) {
          const currentConfig = useScheduleStore.getState().config
          const rawConfig = val || {}

          // Build config in the same shape
          const employees = (rawConfig.employees || []).map(e => ({
            name: e.name,
            maxHours: e.maxHours === 36 ? 36 : e.maxHours === 42 ? 42 : 44,
            jefatura: !!e.jefatura,
          }))
          const tasks = (rawConfig.tasks || []).map(t => ({
            name: t.name,
            group: t.group,
          }))
          const groupColors = rawConfig.groupColors || {}
          const initialPending = rawConfig.initialPending || {}
          const employeeMaxHours = {}
          employees.forEach(e => { employeeMaxHours[e.name] = e.maxHours })

          const newConfig = { employees, tasks, groupColors, initialPending, employeeMaxHours }

          // Only update if actually changed
          if (JSON.stringify(newConfig) === JSON.stringify(currentConfig)) return

          useScheduleStore.setState({ config: newConfig })
          return
        }
      })
      .subscribe((status) => console.log('Realtime status:', status))

    return () => { supabase.removeChannel(channel) }
  }, [currentDeptId])
}
