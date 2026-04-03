import { useState } from 'react'
import { useScheduleStore } from '../../store/scheduleStore'
import { useComputePoliv } from '../../hooks/useComputePoliv'
import { SHIFT_CODE_INFO, absenceCodes } from '../../lib/shiftCodes'

function getMonthHours(empName, year, month, globalSchedule, config) {
  const emp = config.employees.find(e => e.name === empName)
  const maxH = emp?.maxHours ?? 44
  const absenceHourByTarget = { 36: 6, 42: 7, 44: 8 }
  const absHour = absenceHourByTarget[maxH] ?? 8
  const daysInMonth = new Date(year, month, 0).getDate()
  let sum = 0, absences = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    const entry = globalSchedule[empName]?.[ds]
    if (!entry) continue
    if (entry.code && SHIFT_CODE_INFO[entry.code]) {
      sum += SHIFT_CODE_INFO[entry.code].hours
    } else {
      const n = parseInt(entry.duration)
      if (!isNaN(n) && !absenceCodes.includes(entry.duration)) sum += n
      else if (absenceCodes.includes(entry.duration)) absences++
    }
  }
  return sum + Math.max(absences - 1, 0) * absHour
}

export default function MonthlySummary() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const globalSchedule = useScheduleStore(s => s.globalSchedule)
  const config = useScheduleStore(s => s.config)
  const { computeMonthlyPoliv } = useComputePoliv()

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-borde overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-borde bg-azul-50">
        <h2 className="text-azul font-semibold text-base capitalize">{monthLabel}</h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="text-azul hover:bg-azul-100 px-2 py-1 rounded text-sm">‹</button>
          <button onClick={nextMonth} className="text-azul hover:bg-azul-100 px-2 py-1 rounded text-sm">›</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-azul-50 border-b border-borde">
              <th className="text-left text-xs font-semibold text-muted px-4 py-2">Empleado</th>
              <th className="text-center text-xs font-semibold text-muted px-3 py-2">Horas</th>
              <th className="text-center text-xs font-semibold text-muted px-3 py-2">Meta</th>
              <th className="text-center text-xs font-semibold text-muted px-3 py-2">Polivalencia</th>
            </tr>
          </thead>
          <tbody>
            {config.employees.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-muted text-sm py-10">
                  No hay empleados configurados.
                </td>
              </tr>
            ) : (
              config.employees.map(emp => {
                const hours = getMonthHours(emp.name, year, month, globalSchedule, config)
                const monthKey = `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}`
                const targetH = emp.maxHours * 4 // approx monthly
                const poliv = computeMonthlyPoliv(emp.name, year, month)

                return (
                  <tr key={emp.name} className="border-b border-borde hover:bg-azul-50/30">
                    <td className="px-4 py-2">
                      <div className="text-sm font-medium text-azul">{emp.name}</div>
                      <div className="text-xs text-muted">{emp.maxHours}h/sem{emp.jefatura ? ' · Jefatura' : ''}</div>
                    </td>
                    <td className="text-center px-3 py-2">
                      <span className="text-sm font-bold text-azul">{hours}</span>
                    </td>
                    <td className="text-center px-3 py-2">
                      <span className="text-xs text-muted">{emp.maxHours}h/sem</span>
                    </td>
                    <td className="text-center px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-12 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${poliv}%`,
                              backgroundColor: poliv >= 50 ? '#0E3B75' : '#E31C1B'
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-azul">{poliv}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
