import { useState, useMemo, useEffect } from 'react'
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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    const handler = (e) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return isMobile
}

export default function CompensatoriosPanel() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const isMobile = useIsMobile()

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
    <div className={`p-0 ${isMobile ? 'space-y-0' : 'space-y-8'}`}>
      {/* ── Custom Header ────────────────────────── */}
      <div className={`flex items-center justify-between gap-4 ${isMobile ? 'p-4 bg-nm-surface-low border-b border-nm-outline-variant' : ''}`}>
        <div className="flex items-center gap-2">
            <button
               onClick={prevMonth}
               className="w-10 h-10 flex items-center justify-center rounded-xl bg-nm-surface-high text-nm-primary border border-nm-outline-variant active:scale-95 transition-all"
            >
              ‹
            </button>
            <div className="flex-1 min-w-[140px] px-4 py-2 rounded-xl bg-nm-surface-high border border-nm-outline-variant flex items-center justify-center">
               <span className="text-sm font-black text-nm-on-surface tracking-tight capitalize">
                 {monthLabel}
               </span>
            </div>
            <button
               onClick={nextMonth}
               className="w-10 h-10 flex items-center justify-center rounded-xl bg-nm-surface-high text-nm-primary border border-nm-outline-variant active:scale-95 transition-all"
            >
              ›
            </button>
        </div>
      </div>

      {isMobile ? (
        /* ── Mobile Card List ────────────────────────── */
        <div className="p-4 space-y-4 pb-24">
          {config.employees.length === 0 ? (
            <div className="text-center py-20 text-nm-on-surface-variant font-bold uppercase tracking-widest bg-nm-surface-low rounded-3xl border border-nm-outline-variant/30">
              No hay personal configurado.
            </div>
          ) : (
            rows.map(row => (
              <div key={row.empName} className="bg-nm-surface-high rounded-3xl border border-nm-outline-variant/30 p-5 shadow-sm active:scale-[0.98] transition-all">
                <div className="flex items-center gap-4 mb-4">
                   <div className="w-12 h-12 rounded-2xl bg-nm-primary/10 text-nm-primary font-black flex items-center justify-center text-lg border border-nm-primary/20">
                     {row.empName.charAt(0)}
                   </div>
                   <div className="flex-1 min-w-0">
                      <h4 className="font-black text-nm-on-surface truncate tracking-tight">{row.empName}</h4>
                      <p className="text-[10px] text-nm-on-surface-variant uppercase tracking-widest font-bold">Resumen de Saldo</p>
                   </div>
                   <div className={`text-xl font-black ${row.closure < 0 ? 'text-red-500' : 'text-nm-primary'}`}>
                      {row.closure}
                   </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                   <div className="bg-nm-surface-low rounded-2xl p-3 border border-nm-outline-variant/10">
                      <p className="text-[8px] text-nm-on-surface-variant uppercase font-black mb-1">Inicial</p>
                      <p className="font-bold text-nm-on-surface">{row.pendStart}</p>
                   </div>
                   <div className="bg-emerald-500/5 rounded-2xl p-3 border border-emerald-500/10">
                      <p className="text-[8px] text-emerald-600 uppercase font-black mb-1">Causados</p>
                      <p className="font-black text-emerald-600">+{row.causeCount}</p>
                   </div>
                   <div className="bg-red-500/5 rounded-2xl p-3 border border-red-500/10">
                      <p className="text-[8px] text-red-600 uppercase font-black mb-1">Pagados</p>
                      <p className="font-black text-red-600">-{row.paidCount}</p>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ── Desktop Premium Table ────────────────────────── */
        <div className="bg-white rounded-3xl shadow-premium border border-borde/50 overflow-hidden backdrop-blur-xl">
          <div className="bg-azul-50/30 border-b border-borde/50 px-6 py-4">
            <h3 className="text-azul font-black text-sm uppercase tracking-widest">Panel de Seguimiento</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-nm-surface-container/50 border-b border-nm-outline-variant/20">
                  <th className="text-left text-[10px] font-black px-8 py-5 text-nm-on-surface-variant uppercase tracking-widest">Empleado</th>
                  <th className="text-center text-[10px] font-black px-6 py-5 text-nm-on-surface-variant uppercase tracking-widest">Inicial</th>
                  <th className="text-center text-[10px] font-black px-6 py-5 text-nm-on-surface-variant uppercase tracking-widest">Causados</th>
                  <th className="text-center text-[10px] font-black px-6 py-5 text-nm-on-surface-variant uppercase tracking-widest">Pagados</th>
                  <th className="text-center text-[10px] font-black px-8 py-5 text-nm-on-surface-variant uppercase tracking-widest">Saldo Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nm-outline-variant/10">
                {config.employees.length === 0 ? (
                  <tr><td colSpan={5} className="py-20 text-center font-bold text-nm-on-surface-variant uppercase tracking-widest">N/A</td></tr>
                ) : (
                  rows.map(row => (
                    <tr key={row.empName} className="hover:bg-nm-surface-high transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-nm-primary/10 text-nm-primary flex items-center justify-center font-black shadow-sm group-hover:scale-110 transition-transform">{row.empName.charAt(0)}</div>
                          <span className="font-black text-nm-on-surface">{row.empName}</span>
                        </div>
                      </td>
                      <td className="text-center px-6 py-5 font-bold text-nm-on-surface-variant">{row.pendStart}</td>
                      <td className="text-center px-6 py-5 font-black text-emerald-600 bg-emerald-500/5">+{row.causeCount}</td>
                      <td className="text-center px-6 py-5 font-black text-red-600 bg-red-500/5">-{row.paidCount}</td>
                      <td className="text-center px-8 py-5">
                         <span className={`inline-flex items-center justify-center min-w-[3rem] px-4 py-2 rounded-xl font-black text-sm shadow-sm ${
                           row.closure < 0 ? 'bg-red-500 text-white shadow-red-200' : 'bg-nm-primary text-white shadow-sky-200'
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
      )}
    </div>
  )
}
