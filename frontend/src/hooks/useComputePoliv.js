import { useScheduleStore } from '../store/scheduleStore'
import { SHIFT_CODE_INFO, absenceCodes } from '../lib/shiftCodes'

export function useComputePoliv() {
  const globalSchedule = useScheduleStore(s => s.globalSchedule)
  const config = useScheduleStore(s => s.config)

  const getTaskGroupMap = () => {
    const map = {}
    config.tasks.forEach(t => { map[t.name] = t.group })
    return map
  }

  /**
   * Weekly polivalencia: % hours on CAJAS tasks vs total hours
   * Identical to computeWeeklyPoliv in app.html lines 2418-2441
   */
  const computeWeeklyPoliv = (empName, startDate, endDate) => {
    const taskGroupMap = getTaskGroupMap()
    const empSchedule = globalSchedule[empName] ?? {}
    const entries = []
    const cur = new Date(startDate)
    while (cur <= endDate) {
      const dateKey = cur.toISOString().slice(0, 10)
      entries.push(empSchedule[dateKey] ?? null)
      cur.setDate(cur.getDate() + 1)
    }

    let totalHours = 0, cajasHours = 0
    for (const en of entries) {
      if (!en) continue
      let h = 0
      if (en.code && SHIFT_CODE_INFO[en.code]) {
        h = SHIFT_CODE_INFO[en.code].hours
      } else {
        const n = parseInt(en.duration)
        if (!Number.isNaN(n) && !absenceCodes.includes(en.duration)) h = n
      }
      if (h > 0) {
        totalHours += h
        if (en.task && taskGroupMap[en.task] === 'CAJAS') cajasHours += h
      }
    }
    if (totalHours === 0) return 0
    return Math.round((cajasHours / totalHours) * 100)
  }

  /**
   * Monthly polivalencia: days with CAJAS task / 11 * 100 (capped 100%)
   * Identical to computeMonthlyPoliv in app.html lines 2454-2470
   */
  const computeMonthlyPoliv = (empName, year, month) => {
    const taskGroupMap = getTaskGroupMap()
    const empSchedule = globalSchedule[empName] ?? {}
    const daysInMonth = new Date(year, month, 0).getDate()
    let cajasCount = 0
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const entry = empSchedule[ds]
      if (entry?.task && taskGroupMap[entry.task] === 'CAJAS') cajasCount++
    }
    if (cajasCount > 0) return Math.round(Math.min((cajasCount / 11) * 100, 100))
    return 0
  }

  return { computeWeeklyPoliv, computeMonthlyPoliv }
}
