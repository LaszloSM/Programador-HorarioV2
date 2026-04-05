import { useState, useMemo, useEffect } from 'react'
import { useScheduleStore } from '../../store/scheduleStore'
import { isHoliday } from '../../lib/shiftCodes'
import { computeMonthlySummaryData, exportToExcel } from '../../lib/monthlySummary'

const ABSENCE_CODES = new Set(['C','D','I','S','V','DF','LC','F','B'])

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

export default function MonthlySummary() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const isMobile = useIsMobile()

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

  const handleExport = () => exportToExcel(year, month, summary, globalSchedule, config)

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

  const th = 'text-center text-[10px] font-black px-1 py-2 uppercase tracking-tighter'
  const td = 'text-center text-[10px] px-1 py-1.5 border-b border-nm-outline-variant/10'

  return (
    <div className={`p-0 ${isMobile ? 'space-y-0' : 'space-y-8'}`}>
      {/* ── Custom Header ────────────────────────── */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isMobile ? 'p-4 bg-nm-surface-low border-b border-nm-outline-variant' : ''}`}>
        <div className="flex items-center gap-2">
            <button
               onClick={prevMonth}
               className="w-10 h-10 flex items-center justify-center rounded-xl bg-nm-surface-high text-nm-primary border border-nm-outline-variant active:scale-95 transition-all"
            >
              ‹
            </button>
            <div className="flex-1 min-w-[140px] px-4 py-2 rounded-xl bg-nm-surface-high border border-nm-outline-variant flex items-center justify-center">
               <span className="text-sm font-black text-nm-on-surface tracking-tight">
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
        
        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-2 bg-nm-primary text-white text-xs font-bold px-6 py-3 rounded-xl hover:shadow-lg active:scale-[0.98] transition-all shadow-md overflow-hidden relative group"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Exportar Excel
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
        </button>
      </div>

      {/* ── Table 1 Container ────────────────────────── */}
      <div className={`bg-transparent md:bg-white md:rounded-3xl shadow-premium border-b md:border border-borde/50 overflow-hidden ${isMobile ? '' : 'backdrop-blur-xl'}`}>
        {!isMobile && (
          <div className="bg-azul-50/30 border-b border-borde/50 px-6 py-4">
            <h3 className="text-azul font-black text-sm uppercase tracking-widest">Cuadrícula de Programación</h3>
          </div>
        )}

        <div className={`overflow-x-auto scrollbar-hide ${isMobile ? 'pb-4' : ''}`}>
          <table className="border-collapse w-full" style={{ fontSize: '10px', minWidth: `${200 + summary.daysInMonth * 28}px` }}>
            <thead>
              <tr className="bg-nm-surface-container">
                <th className={`${th} text-left px-4 sticky left-0 bg-nm-surface-container z-40 w-32 border-r border-nm-outline-variant/30 text-nm-primary`}>Nombre</th>
                <th className={`${th} w-10 border-r border-nm-outline-variant/30 text-nm-on-surface-variant`}>Pol.</th>
                <th className={`${th} w-8 border-r border-nm-outline-variant/30 text-nm-on-surface-variant`}>Pend.</th>
                {dayHeaders.map(({ d, fest, weekday }) => (
                  <th
                    key={d}
                    className={`${th} w-7 font-black ${fest ? 'text-red-500 bg-red-500/5' : 'text-nm-on-surface-variant'}`}
                  >
                    <div className="text-[8px] opacity-70">{weekday}</div>
                    <div className={fest ? 'scale-110' : ''}>{String(d).padStart(2,'0')}</div>
                  </th>
                ))}
                <th className={`${th} w-12 bg-nm-surface-container sticky right-0 z-30 border-l border-nm-outline-variant/30 text-nm-primary`}>Saldo</th>
              </tr>
            </thead>
            <tbody className="bg-nm-surface-low">
              {config.employees.length === 0 ? (
                <tr><td colSpan={summary.daysInMonth + 4} className="text-center text-nm-on-surface-variant text-sm py-20 font-bold uppercase tracking-widest">No hay personal configurado.</td></tr>
              ) : (
                <>
                  {summary.rows.map(row => (
                    <tr key={row.emp} className="hover:bg-nm-surface-high group/row transition-colors">
                      <td className={`${td} text-left px-4 font-black text-nm-on-surface sticky left-0 bg-nm-surface-low z-40 group-hover/row:bg-nm-surface-high border-r border-nm-outline-variant/30 truncate max-w-[8rem]`} title={row.emp}>{row.emp}</td>
                      <td className={`${td} border-r border-nm-outline-variant/30 font-bold text-nm-on-surface-variant`}>{row.poliv}%</td>
                      <td className={`${td} border-r border-nm-outline-variant/30 font-bold text-nm-on-surface-variant`}>{row.pend}</td>
                      {row.codes.map((code, i) => (
                        <td
                          key={i}
                          className={`${td} font-black ${ABSENCE_CODES.has(code) ? 'text-red-500' : code !== '0' ? 'text-nm-primary' : 'text-nm-on-surface-variant/20'}`}
                        >
                          {code === '0' ? '·' : code}
                        </td>
                      ))}
                      <td className={`${td} font-black sticky right-0 z-30 bg-nm-surface-low group-hover/row:bg-nm-surface-high border-l border-nm-outline-variant/30 ${row.closure < 0 ? 'text-red-500' : 'text-nm-primary'}`}>
                        {row.closure}
                      </td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="bg-nm-surface-container font-black">
                    <td className={`${td} text-left px-4 sticky left-0 bg-nm-surface-container z-40 border-r border-nm-outline-variant/30 text-nm-primary`} colSpan={1}>TOTALES</td>
                    <td className={`${td} border-r border-nm-outline-variant/30`}></td>
                    <td className={`${td} border-r border-nm-outline-variant/30 text-nm-on-surface`}>{summary.totalPend}</td>
                    {summary.dayCounts.map((count, i) => (
                      <td key={i} className={td}>{count || '·'}</td>
                    ))}
                    <td className={`${td} sticky right-0 z-30 bg-nm-surface-container border-l border-nm-outline-variant/30 text-nm-on-surface`}>{summary.totalClosure}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Table 2: Compensatorios Format ────────────────────────── */}
      <div className={`bg-transparent md:bg-white md:rounded-3xl shadow-premium border-b md:border border-borde/50 overflow-hidden ${isMobile ? 'mt-4 pb-20' : 'backdrop-blur-xl'}`}>
        {!isMobile && (
          <div className="bg-emerald-50/30 border-b border-emerald-100 px-6 py-4">
            <h3 className="text-emerald-800 font-black text-sm uppercase tracking-widest">Resumen de Compensatorios</h3>
          </div>
        )}
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full border-collapse" style={{ fontSize: '11px', minWidth: isMobile ? '700px' : 'auto' }}>
            <thead>
              <tr className="bg-nm-surface-container/50 border-b border-nm-outline-variant/20">
                <th className="text-left text-[10px] font-black px-6 py-4 text-nm-on-surface-variant uppercase">Nombre</th>
                <th className="text-center text-[10px] font-black px-4 py-4 text-nm-on-surface-variant uppercase">Saldo</th>
                <th className="text-center text-[10px] font-black px-4 py-4 text-nm-on-surface-variant uppercase">Causados</th>
                <th className="text-left text-[10px] font-black px-4 py-4 text-nm-on-surface-variant uppercase">Detalle</th>
                <th className="text-center text-[10px] font-black px-4 py-4 text-nm-on-surface-variant uppercase">Pagados</th>
                <th className="text-center text-[10px] font-black px-4 py-4 text-nm-on-surface-variant uppercase">Final</th>
              </tr>
            </thead>
            <tbody>
              {config.employees.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-nm-on-surface-variant py-8">N/A</td></tr>
              ) : (
                <>
                  {summary.rows.map(row => (
                    <tr key={row.emp} className="border-b border-nm-outline-variant/10 hover:bg-nm-surface-high transition-colors group/sec">
                      <td className="px-6 py-3.5 font-black text-nm-on-surface">{row.emp}</td>
                      <td className="text-center font-bold text-nm-on-surface-variant px-4">{row.pend}</td>
                      <td className="text-center font-black text-nm-primary px-4 bg-nm-primary/5">+{row.caused}</td>
                      <td className="px-4 text-[9px] text-nm-on-surface-variant max-w-[150px] truncate" title={row.causedStr}>{row.causedStr || '—'}</td>
                      <td className="text-center font-black text-red-500 px-4 bg-red-500/5">-{row.paid}</td>
                      <td className={`text-center font-black px-4 ${row.closure < 0 ? 'text-red-500' : 'text-nm-primary'}`}>{row.closure}</td>
                    </tr>
                  ))}
                  <tr className="bg-nm-surface-container/30 font-black">
                    <td className="px-6 py-4 text-nm-primary" colSpan={5}>TOTAL CIERRE MES</td>
                    <td className={`text-center px-4 ${summary.totalClosure < 0 ? 'text-red-500' : 'text-nm-primary'}`}>{summary.totalClosure}</td>
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
