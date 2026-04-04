import { useState, useMemo } from 'react'
import { useScheduleStore } from '../../store/scheduleStore'
import { isHoliday } from '../../lib/shiftCodes'
import { computeMonthlySummaryData, exportToExcel } from '../../lib/monthlySummary'

const ABSENCE_CODES = new Set(['C','D','I','S','V','DF','LC','F','B'])

export default function MonthlySummary() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

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

  const handleExport = () => exportToExcel(year, month, summary)

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

  const th = 'text-center text-[10px] font-semibold px-1 py-1'
  const td = 'text-center text-[10px] px-1 py-1 border-b border-borde/50'

  return (
    <div className="space-y-6">
      {/* ── Header bar ────────────────────────── */}
      <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-borde px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="text-azul hover:bg-azul-50 px-2 py-1 rounded text-sm">‹</button>
          <span className="text-azul font-semibold text-sm capitalize">{monthLabel}</span>
          <button onClick={nextMonth} className="text-azul hover:bg-azul-50 px-2 py-1 rounded text-sm">›</button>
        </div>
        <button
          onClick={handleExport}
          className="bg-azul text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors"
        >
          Exportar Excel
        </button>
      </div>

      {/* ── TABLA 1: Cuadrícula mensual ────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-borde overflow-hidden">
        <div className="px-4 py-2 border-b border-borde bg-azul-50">
          <h3 className="text-azul font-semibold text-sm">Programación mensual</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="border-collapse" style={{ fontSize: '10px', minWidth: `${200 + summary.daysInMonth * 28}px` }}>
            <thead>
              <tr className="bg-azul-50">
                <th className={`${th} text-left px-3 sticky left-0 bg-azul-50 z-10 w-32`}>Nombre</th>
                <th className={`${th} w-12`}>Poliv.</th>
                <th className={`${th} w-10`}>Pend.</th>
                {dayHeaders.map(({ d, fest, weekday }) => (
                  <th
                    key={d}
                    className={`${th} w-7 ${fest ? 'text-danger bg-red-50' : 'text-muted'}`}
                  >
                    <div>{weekday}</div>
                    <div className={`font-bold ${fest ? 'text-danger' : 'text-azul'}`}>{String(d).padStart(2,'0')}</div>
                  </th>
                ))}
                <th className={`${th} w-16 bg-azul-50`}>Comp.<br/>Cierre</th>
              </tr>
            </thead>
            <tbody>
              {config.employees.length === 0 ? (
                <tr><td colSpan={summary.daysInMonth + 4} className="text-center text-muted text-sm py-8">No hay empleados.</td></tr>
              ) : (
                <>
                  {summary.rows.map(row => (
                    <tr key={row.emp} className="hover:bg-azul-50/20">
                      <td className={`${td} text-left px-3 font-medium text-azul sticky left-0 bg-white z-10 max-w-[8rem] truncate`} title={row.emp}>{row.emp}</td>
                      <td className={td}>{row.poliv}%</td>
                      <td className={td}>{row.pend}</td>
                      {row.codes.map((code, i) => (
                        <td
                          key={i}
                          className={`${td} ${ABSENCE_CODES.has(code) ? 'text-danger font-bold' : code !== '0' ? 'text-azul' : 'text-borde'}`}
                        >
                          {code === '0' ? '' : code}
                        </td>
                      ))}
                      <td className={`${td} font-bold ${row.closure < 0 ? 'text-danger' : 'text-azul'}`}>{row.closure}</td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="bg-[#C2DDF2] font-bold">
                    <td className={`${td} text-left px-3 sticky left-0 bg-[#C2DDF2] z-10`}>TOTAL</td>
                    <td className={td}></td>
                    <td className={td}>{summary.totalPend}</td>
                    {summary.dayCounts.map((count, i) => (
                      <td key={i} className={td}>{count || ''}</td>
                    ))}
                    <td className={td}>{summary.totalClosure}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TABLA 2: Compensatorios formato empresa ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-borde overflow-hidden">
        <div className="px-4 py-2 border-b border-borde bg-azul-50">
          <h3 className="text-azul font-semibold text-sm">Compensatorios — {monthLabel}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ fontSize: '11px' }}>
            <thead>
              <tr className="bg-azul-50 border-b border-borde">
                <th className={`${th} text-left px-3`}>NOMBRE</th>
                <th className={th}>SALDO</th>
                <th className={th}># CAUSADOS</th>
                <th className={th}>FECHAS CAUSADAS</th>
                <th className={th}># PAGADOS</th>
                <th className={th}>FECHAS PAGADAS</th>
                <th className={th}># PENDIENTE</th>
              </tr>
            </thead>
            <tbody>
              {config.employees.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted py-8">No hay empleados.</td></tr>
              ) : (
                <>
                  {summary.rows.map(row => (
                    <tr key={row.emp} className="border-b border-borde/50 hover:bg-azul-50/20">
                      <td className={`${td} text-left px-3 font-medium text-azul`}>{row.emp}</td>
                      <td className={td}>{row.pend}</td>
                      <td className={`${td} text-azul font-medium`}>{row.caused}</td>
                      <td className={`${td} text-xs`}>{row.causedStr || '—'}</td>
                      <td className={`${td} text-danger font-medium`}>{row.paid}</td>
                      <td className={`${td} text-xs`}>{row.paidStr || '—'}</td>
                      <td className={`${td} font-bold ${row.closure < 0 ? 'text-danger' : 'text-azul'}`}>{row.closure}</td>
                    </tr>
                  ))}
                  {/* Total */}
                  <tr className="bg-[#C2DDF2] font-bold border-t border-borde">
                    <td className={`${td} text-left px-3`} colSpan={6}>TOTAL COMPENSATORIOS</td>
                    <td className={td}>{summary.totalClosure}</td>
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
