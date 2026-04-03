import { useScheduleStore } from '../store/scheduleStore'
import { SHIFT_CODE_INFO, absenceCodes } from '../lib/shiftCodes'

/**
 * Returns a function that computes weekly hours for an employee
 * for a given date range.
 * Logic is identical to computeWeeklyHours in app.html lines 2377-2408.
 */
export function useComputeHours() {
  const globalSchedule = useScheduleStore(s => s.globalSchedule)
  const config = useScheduleStore(s => s.config)

  const computeWeeklyHours = (empName, startDate, endDate) => {
    // Get entries for the date range from globalSchedule
    const empSchedule = globalSchedule[empName] ?? {}
    const entries = []
    const cur = new Date(startDate)
    while (cur <= endDate) {
      const dateKey = cur.toISOString().slice(0, 10)
      entries.push(empSchedule[dateKey] ?? null)
      cur.setDate(cur.getDate() + 1)
    }

    const days = entries.length
    let sumNumeric = 0, absences = 0

    for (const en of entries) {
      if (!en) continue
      if (en.code && SHIFT_CODE_INFO[en.code]) {
        const h = SHIFT_CODE_INFO[en.code].hours
        if (!isNaN(h)) sumNumeric += h
      } else {
        const n = parseInt(en.duration)
        if (!Number.isNaN(n) && !absenceCodes.includes(en.duration)) {
          sumNumeric += n
        } else {
          if (absenceCodes.includes(en.duration) || (en.code && absenceCodes.includes(en.code))) {
            absences++
          }
        }
      }
    }

    if (days === 7) {
      const emp = config.employees.find(e => e.name === empName)
      const maxH = emp?.maxHours ?? 44
      const target = maxH === 36 ? 36 : maxH === 42 ? 42 : 44
      const absenceHourByTarget = { 36: 6, 42: 7, 44: 8 }
      const absenceHour = absenceHourByTarget[target] ?? 8
      return sumNumeric + Math.max(absences - 1, 0) * absenceHour
    }
    return sumNumeric
  }

  return { computeWeeklyHours }
}
