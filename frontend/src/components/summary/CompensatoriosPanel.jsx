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
  const causeDates = [], paidDates = []
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`
    const entry = globalSchedule[empName]?.[ds]
    if (!entry) continue

    const dur = entry.duration
    const isAbs = absenceCodes.includes(dur)

    if (!isAbs && dur) {
      // Worked day on holiday → caused
      if (isHoliday(ds)) { causeCount++; causeDates.push(ds) }
    } else if (isAbs) {
      // Absence: check if it's C (compensatorio pagado)
      const abbr = absenceCodeToAbbr[dur] ?? dur
      if (abbr === 'C') { paidCount++; paidDates.push(ds) }
    }
  }

  const closure = pendStart + causeCount - paidCount
  const result = { pendStart, causeCount, paidCount, causeDates, paidDates, closure }
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
              <div key={row.empName} className="bg-nm-surface-high rounded-2xl border border-nm-outline-variant/40 overflow-hidden shadow-sm active:scale-[0.99] transition-all">
                {/* Card header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-nm-outline-variant/30">
                   <div className="w-9 h-9 rounded-xl bg-nm-primary/15 text-nm-primary font-black flex items-center justify-center text-base border border-nm-primary/25 flex-shrink-0">
                     {row.empName.charAt(0)}
                   </div>
                   <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-nm-on-surface truncate text-sm">{row.empName}</h4>
                   </div>
                   <div className={`flex-shrink-0 px-3 py-1 rounded-lg text-sm font-black border ${
                     row.closure < 0
                       ? 'bg-red-500/15 text-red-400 border-red-500/30'
                       : 'bg-nm-primary/15 text-nm-primary border-nm-primary/30'
                   }`}>
                      {row.closure}
                   </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 divide-x divide-nm-outline-variant/20">
                   <div className="p-3 text-center">
                      <p className="text-[9px] text-nm-on-surface-variant uppercase font-bold mb-1 tracking-wide">Saldo</p>
                      <p className="font-bold text-nm-on-surface text-sm">{row.pendStart}</p>
                   </div>
                   <div className="p-3 text-center bg-emerald-500/5">
                      <p className="text-[9px] text-emerald-500 uppercase font-bold mb-1 tracking-wide">Causados</p>
                      <p className="font-black text-emerald-400 text-sm">+{row.causeCount}</p>
                      {row.causeDates.length > 0 && (
                        <p className="text-[8px] text-emerald-600/80 mt-0.5 leading-tight">
                          {row.causeDates.map(d => d.slice(8)).join(', ')}
                        </p>
                      )}
                   </div>
                   <div className="p-3 text-center bg-red-500/5">
                      <p className="text-[9px] text-red-400 uppercase font-bold mb-1 tracking-wide">Pagados</p>
                      <p className="font-black text-red-400 text-sm">-{row.paidCount}</p>
                      {row.paidDates.length > 0 && (
                        <p className="text-[8px] text-red-600/80 mt-0.5 leading-tight">
                          {row.paidDates.map(d => d.slice(8)).join(', ')}
                        </p>
                      )}
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
            <h3 className="text-azul font-black text-sm uppercase tracking-widest">Resumen de Compensatorios</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-azul/90 text-white">
                  <th className="text-left font-black px-5 py-3 uppercase tracking-wider whitespace-nowrap">Nombre</th>
                  <th className="text-center font-black px-4 py-3 uppercase tracking-wider whitespace-nowrap">Saldo</th>
                  <th className="text-center font-black px-4 py-3 uppercase tracking-wider whitespace-nowrap bg-emerald-700/40"># Días Causados</th>
                  <th className="text-center font-black px-4 py-3 uppercase tracking-wider whitespace-nowrap bg-emerald-700/40">Fechas Causadas</th>
                  <th className="text-center font-black px-4 py-3 uppercase tracking-wider whitespace-nowrap bg-red-700/30"># Días Pagados</th>
                  <th className="text-center font-black px-4 py-3 uppercase tracking-wider whitespace-nowrap bg-red-700/30">Fechas Pagadas</th>
                  <th className="text-center font-black px-5 py-3 uppercase tracking-wider whitespace-nowrap"># Días Pend.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde/50">
                {config.employees.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center font-bold text-muted uppercase tracking-widest">Sin empleados configurados</td></tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={row.empName} className={`hover:bg-azul-50/60 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-azul-50/30'}`}>
                      <td className="px-5 py-3 font-bold text-azul whitespace-nowrap">{row.empName}</td>
                      <td className="text-center px-4 py-3 font-bold text-slate-700">{row.pendStart}</td>
                      <td className="text-center px-4 py-3 font-black text-emerald-700 bg-emerald-50/50">
                        {row.causeCount > 0 ? `+${row.causeCount}` : <span className="text-slate-400 font-normal">0</span>}
                      </td>
                      <td className="text-center px-4 py-3 text-emerald-700 bg-emerald-50/50">
                        {row.causeDates.length > 0
                          ? row.causeDates.map(d => {
                              const [y, m, dd] = d.split('-')
                              return `${dd}/${m}/${y}`
                            }).join(', ')
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="text-center px-4 py-3 bg-red-50/50">
                        {row.paidCount > 0
                          ? <span className="font-black text-red-600">-{row.paidCount}</span>
                          : <span className="text-slate-400 font-normal">0</span>}
                      </td>
                      <td className="text-center px-4 py-3 text-red-600 bg-red-50/50">
                        {row.paidDates.length > 0
                          ? row.paidDates.map(d => {
                              const [y, m, dd] = d.split('-')
                              return `${dd}/${m}/${y}`
                            }).join(', ')
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="text-center px-5 py-3">
                        <span className={`inline-flex items-center justify-center min-w-[2.25rem] px-3 py-1 rounded-lg font-black text-sm ${
                          row.closure < 0
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : row.closure === 0
                              ? 'bg-slate-100 text-slate-500 border border-slate-200'
                              : 'bg-sky-100 text-sky-700 border border-sky-200'
                        }`}>
                          {row.closure}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-azul/10 border-t-2 border-azul/20">
                  <td colSpan={7} className="px-5 py-2 text-right font-black text-azul text-xs uppercase tracking-wider">
                    Total Compensatorios: {rows.reduce((s, r) => s + r.closure, 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
