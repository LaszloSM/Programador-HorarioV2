import { useState, useMemo } from 'react'
import { useScheduleStore } from '../../store/scheduleStore'
import { absenceCodes, absenceCodeToAbbr, isHoliday } from '../../lib/shiftCodes'

function previousMonthKey(key) {
  const [y, m] = key.split('-').map(Number)
  if (m === 1) return `${y - 1}-12`
  return `${y}-${String(m - 1).padStart(2, '0')}`
}

function computeCompensatorios(empName, monthKey, globalSchedule, config, baseMonth, cache = {}) {
  if (cache[`${empName}__${monthKey}`] !== undefined) return cache[`${empName}__${monthKey}`]

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

  const [yearStr, monthStr] = monthKey.split('-')
  const year = parseInt(yearStr), month = parseInt(monthStr)
  const daysInMonth = new Date(year, month, 0).getDate()

  let causeCount = 0, paidCount = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`
    const entry = globalSchedule[empName]?.[ds]
    if (!entry) continue

    const dur = entry.duration
    const isAbs = absenceCodes.includes(dur)

    if (!isAbs && dur) {
      // Worked day on holiday → caused
      if (isHoliday(ds)) causeCount++
    } else if (isAbs) {
      // Absence: check if it's C (compensatorio pagado)
      const abbr = absenceCodeToAbbr[dur] ?? dur
      if (abbr === 'C') paidCount++
    }
  }

  const closure = pendStart + causeCount - paidCount
  const result = { pendStart, causeCount, paidCount, closure }
  cache[`${empName}__${monthKey}`] = result
  return result
}

export default function CompensatoriosPanel() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const globalSchedule = useScheduleStore(s => s.globalSchedule)
  const config = useScheduleStore(s => s.config)
  const baseMonth = useScheduleStore(s => s.baseMonth)

  const monthKey = `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}`
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  // Compute for all employees with shared cache
  const rows = useMemo(() => {
    const cache = {}
    return config.employees.map(emp => {
      const result = computeCompensatorios(emp.name, monthKey, globalSchedule, config, baseMonth, cache)
      return { empName: emp.name, ...result }
    })
  }, [config.employees, monthKey, globalSchedule, config, baseMonth])

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
              <th className="text-center text-xs font-semibold text-muted px-3 py-2" title="Saldo inicial">Inicial</th>
              <th className="text-center text-xs font-semibold text-muted px-3 py-2" title="Días causados en festivos">Causados</th>
              <th className="text-center text-xs font-semibold text-muted px-3 py-2" title="Compensatorios pagados (código C)">Pagados</th>
              <th className="text-center text-xs font-semibold text-muted px-3 py-2" title="Saldo final = Inicial + Causados - Pagados">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {config.employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-muted text-sm py-10">
                  No hay empleados configurados.
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.empName} className="border-b border-borde hover:bg-azul-50/30">
                  <td className="px-4 py-2">
                    <span className="text-sm font-medium text-azul">{row.empName}</span>
                  </td>
                  <td className="text-center px-3 py-2 text-sm text-muted">{row.pendStart}</td>
                  <td className="text-center px-3 py-2 text-sm text-azul font-medium">+{row.causeCount}</td>
                  <td className="text-center px-3 py-2 text-sm text-danger">-{row.paidCount}</td>
                  <td className="text-center px-3 py-2">
                    <span className={`text-sm font-bold ${row.closure < 0 ? 'text-danger' : 'text-azul'}`}>
                      {row.closure}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
