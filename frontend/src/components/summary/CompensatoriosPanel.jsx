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
    <div className="bg-white rounded-3xl shadow-premium border border-borde/50 overflow-hidden backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 py-5 border-b border-borde/50 bg-gradient-to-r from-azul-50 to-white">
        <h2 className="text-slate-800 font-bold text-lg capitalize font-display tracking-tight flex items-center gap-3">
          <span className="w-2.5 h-6 bg-gradient-to-b from-sky-400 to-blue-600 rounded-full inline-block shadow-sm"></span>
          {monthLabel}
        </h2>
        <div className="flex gap-1 bg-white border border-borde rounded-xl p-1 shadow-sm">
          <button onClick={prevMonth} className="text-slate-600 hover:text-sky-600 hover:bg-sky-50 px-4 py-1.5 rounded-lg transition-colors font-semibold text-sm">Anterior</button>
          <div className="w-px bg-borde/60 mx-1"></div>
          <button onClick={nextMonth} className="text-slate-600 hover:text-sky-600 hover:bg-sky-50 px-4 py-1.5 rounded-lg transition-colors font-semibold text-sm">Siguiente</button>
        </div>
      </div>

      <div className="overflow-x-auto p-0">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-borde/50 text-slate-500 uppercase tracking-wider">
              <th className="text-left text-xs font-extrabold px-6 py-4">Empleado</th>
              <th className="text-center text-xs font-extrabold px-4 py-4" title="Saldo inicial">Inicial</th>
              <th className="text-center text-xs font-extrabold px-4 py-4" title="Días causados en festivos">Causados</th>
              <th className="text-center text-xs font-extrabold px-4 py-4" title="Compensatorios pagados (código C)">Pagados</th>
              <th className="text-center text-xs font-extrabold px-6 py-4" title="Saldo final = Inicial + Causados - Pagados">Saldo Final</th>
            </tr>
          </thead>
          <tbody>
            {config.employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-slate-400 font-medium text-sm py-16 bg-slate-50/30">
                  No hay empleados configurados.
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.empName} className="border-b border-borde/30 hover:bg-sky-50/40 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-100 to-blue-100 text-sky-700 flex items-center justify-center font-bold text-sm ring-2 ring-white shadow-sm">
                        {row.empName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">{row.empName}</span>
                    </div>
                  </td>
                  <td className="text-center px-4 py-4">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-slate-100 text-slate-600 font-semibold text-xs border border-slate-200/60">
                      {row.pendStart}
                    </span>
                  </td>
                  <td className="text-center px-4 py-4">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-emerald-50 text-emerald-600 font-bold text-xs border border-emerald-200/60 shadow-sm">
                      +{row.causeCount}
                    </span>
                  </td>
                  <td className="text-center px-4 py-4">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-rose-50 text-rose-600 font-bold text-xs border border-rose-200/60 shadow-sm">
                      -{row.paidCount}
                    </span>
                  </td>
                  <td className="text-center px-6 py-4">
                    <span className={`inline-flex items-center justify-center min-w-[3rem] px-4 py-1.5 rounded-full font-bold text-sm shadow-sm border ${
                      row.closure < 0 
                      ? 'bg-gradient-to-r from-red-50 to-rose-50 text-red-600 border-red-200' 
                      : 'bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700 border-sky-200'
                    }`}>
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
