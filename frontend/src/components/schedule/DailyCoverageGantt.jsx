import { useState, useMemo, useEffect } from 'react'
import { useScheduleStore } from '../../store/scheduleStore'
import { SHIFT_CODE_INFO, absenceCodes, computeEndTimeWithMargin } from '../../lib/shiftCodes'

function timeToMinutes(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const START_HOUR = 6
const END_HOUR = 22 // up to 22:30
const TOTAL_SLOTS = (END_HOUR - START_HOUR + 1) * 2

const slots = []
for (let h = START_HOUR; h <= END_HOUR; h++) {
  slots.push(`${String(h).padStart(2, '0')}:00`)
  slots.push(`${String(h).padStart(2, '0')}:30`)
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

export default function DailyCoverageGantt() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const config = useScheduleStore(s => s.config)
  const isMobile = useIsMobile()
  const [filterGroup, setFilterGroup] = useState(config.groups?.[0] || 'Todos')

  const globalSchedule = useScheduleStore(s => s.globalSchedule)

  // Process data for the selected day
  const data = useMemo(() => {
    const list = []
    const counts = new Array(TOTAL_SLOTS).fill(0)

    config.employees.forEach(emp => {
      const entry = globalSchedule[emp.name]?.[selectedDate]
      if (!entry || absenceCodes.includes(entry.duration)) return

      const taskObj = config.tasks.find(t => t.name === entry.task)
      const empGroup = taskObj ? taskObj.group : null

      // Filter by group if a group is selected
      if (filterGroup && filterGroup !== 'Todos' && empGroup !== filterGroup) return

      const hours = entry.code && SHIFT_CODE_INFO[entry.code]
        ? SHIFT_CODE_INFO[entry.code].hours
        : parseFloat(entry.duration) || 0

      if (!hours || !entry.startTime) return

      const startMin = timeToMinutes(entry.startTime)
      const endTime = computeEndTimeWithMargin(entry.startTime, hours, emp.jefatura ?? false)
      const endMin = timeToMinutes(endTime)

      if (startMin === null || endMin === null) return

      // Calculate grid placement
      const gridStartSlot = Math.max(0, Math.floor((startMin - START_HOUR * 60) / 30))
      const effectiveEndMin = endMin < startMin ? endMin + 24 * 60 : endMin
      const gridEndSlot = Math.min(TOTAL_SLOTS, Math.ceil((effectiveEndMin - START_HOUR * 60) / 30))
      const span = gridEndSlot - gridStartSlot

      if (span <= 0) return

      const color = empGroup && config.groupColors[empGroup] ? config.groupColors[empGroup] : '#CBD5E1'

      // Update total coverages for the top row
      for (let i = gridStartSlot; i < gridEndSlot; i++) {
        if (i >= 0 && i < TOTAL_SLOTS) {
          counts[i]++
        }
      }

      list.push({
        empName: emp.name,
        task: entry.task,
        startTime: entry.startTime,
        endTime,
        hours,
        gridStart: gridStartSlot + 2, // +2 because 1 is the explicit name column 
        span,
        color,
        empGroup
      })
    })

    // Sort alphabetically
    list.sort((a, b) => a.empName.localeCompare(b.empName))

    return { list, counts }
  }, [selectedDate, filterGroup, config, globalSchedule])

  const dateLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const prevDay = () => {
    const d = new Date(`${selectedDate}T12:00:00`)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  const nextDay = () => {
    const d = new Date(`${selectedDate}T12:00:00`)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div className={`p-0 ${isMobile ? 'space-y-0' : 'space-y-6'}`}>
      {/* ── Mobile/Desktop Header ────────────────────────── */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isMobile ? 'p-4 bg-nm-surface-low border-b border-nm-outline-variant' : ''}`}>
        <div className="flex flex-col gap-1.5 md:flex-row md:items-center">
           <div className="flex items-center gap-2">
            <button
               onClick={prevDay}
               className={`w-10 h-10 flex items-center justify-center rounded-xl active:scale-95 transition-all font-bold text-xl ${isMobile ? 'bg-nm-surface-high text-nm-primary border border-nm-outline-variant' : 'bg-white border border-borde text-azul hover:bg-azul-50 shadow-sm'}`}
               aria-label="Día anterior"
            >
              ‹
            </button>
            <div className={`flex-1 px-4 py-2 rounded-xl flex items-center justify-center relative ${isMobile ? 'bg-nm-surface-high border border-nm-outline-variant' : 'bg-white border border-borde shadow-sm'}`}>
               <span className={`text-sm font-bold capitalize truncate ${isMobile ? 'text-nm-on-surface' : 'text-azul'}`}>
                 {isMobile ? selectedDate : dateLabel}
               </span>
               <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
              />
            </div>
            <button
               onClick={nextDay}
               className={`w-10 h-10 flex items-center justify-center rounded-xl active:scale-95 transition-all font-bold text-xl ${isMobile ? 'bg-nm-surface-high text-nm-primary border border-nm-outline-variant' : 'bg-white border border-borde text-azul hover:bg-azul-50 shadow-sm'}`}
               aria-label="Siguiente día"
            >
              ›
            </button>
           </div>
           {selectedDate !== todayStr && (
             <button
               onClick={() => setSelectedDate(todayStr)}
               className="text-xs font-bold text-nm-primary px-3 py-1.5 rounded-lg bg-nm-primary/10 self-center"
             >
               Ir a Hoy
             </button>
           )}
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex-1 md:flex-none flex items-center gap-2 px-3 py-2 rounded-xl ${isMobile ? 'bg-nm-surface-high border border-nm-outline-variant' : 'bg-white border border-borde shadow-sm'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={isMobile ? 'text-nm-on-surface-variant' : 'text-muted'}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <select
              value={filterGroup}
              onChange={e => setFilterGroup(e.target.value)}
              className={`bg-transparent text-sm font-bold focus:outline-none flex-1 md:min-w-[140px] ${isMobile ? 'text-nm-on-surface' : 'text-azul'}`}
            >
              <option value="Todos">Todos los grupos</option>
              {(config.groups || []).map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Gantt Chart ────────────────────────── */}
      <div className={`bg-transparent md:bg-white md:rounded-3xl shadow-premium border-b md:border border-borde/50 overflow-hidden ${isMobile ? '' : 'backdrop-blur-xl'}`}>
        {/* Desktop Title */}
        {!isMobile && (
          <div className="bg-azul-50/50 border-b border-borde/50 px-6 py-4">
            <h3 className="text-azul font-bold text-sm uppercase tracking-wider">Plan de Cobertura</h3>
          </div>
        )}

        <div className={`overflow-x-auto scrollbar-hide ${isMobile ? 'pb-24' : 'p-4'}`}>
          <div
            className="min-w-[1000px] border border-nm-outline-variant/30 relative text-[10px] isolate"
            style={{
              display: 'grid',
              gridTemplateColumns: `180px repeat(${TOTAL_SLOTS}, minmax(28px, 1fr))`,
              backgroundColor: isMobile ? 'var(--nm-surface-low)' : 'white'
            }}
          >
            {/* Row 1: TOTALS */}
            <div className="sticky left-0 bg-nm-surface-container border-b border-r border-nm-outline-variant flex items-center px-4 py-2 font-black text-nm-primary uppercase z-30">
              Personal Total
            </div>
            {data.counts.map((count, i) => (
              <div key={i} className="bg-nm-surface-container border-b border-r border-nm-outline-variant/30 flex items-center justify-center font-black text-nm-primary text-xs py-2">
                {count > 0 ? count : ''}
              </div>
            ))}

            {/* Row 2: TIME SLOTS */}
            <div className="sticky left-0 bg-nm-surface-high border-b border-r border-nm-outline-variant flex items-center px-4 py-1.5 font-bold text-nm-on-surface-variant uppercase z-30">
              Empleado
            </div>
            {slots.map((slot, i) => (
              <div key={i} className="bg-nm-surface-high border-b border-r border-nm-outline-variant/30 flex items-center justify-center font-bold text-nm-on-surface-variant py-1.5">
                {slot.split(':')[1] === '00' ? slot : ''}
              </div>
            ))}

            {/* Content rows */}
            {data.list.length === 0 ? (
              <div className="col-span-full text-center py-20 text-nm-on-surface-variant font-medium bg-nm-surface-low/50">
                No hay turnos registrados para este grupo.
              </div>
            ) : (
              data.list.map((row, i) => (
                <div key={i} className="contents relative z-10 group">
                  {/* Name cell (Sticky Column) */}
                  <div className="sticky left-0 border-b border-r border-nm-outline-variant/30 bg-nm-surface-low flex items-center px-4 py-2 z-20 group-hover:bg-nm-surface-high transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-nm-primary/10 text-nm-primary font-bold flex items-center justify-center mr-3 shrink-0 border border-nm-primary/20">
                      {row.empName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-nm-on-surface truncate leading-tight" title={row.empName}>{row.empName}</div>
                      <div className="text-[9px] text-nm-on-surface-variant uppercase tracking-widest mt-0.5" title={row.task}>{row.task}</div>
                    </div>
                  </div>

                  {/* Grid filler space */}
                  {slots.map((_, j) => (
                    <div key={j} className="border-b border-r border-nm-outline-variant/10 group-hover:bg-nm-surface-high/50 transition-colors">
                       {/* Vertical hour marker lines */}
                       {j % 2 === 0 && <div className="h-full border-l border-nm-outline-variant/5"></div>}
                    </div>
                  ))}

                  {/* Task Bar - ABSOLUTE PLACEMENT */}
                  {row.span > 0 && (
                    <div
                      className="absolute rounded-lg flex items-center px-3 transition-all hover:brightness-110 hover:z-40 cursor-pointer z-30"
                      style={{
                        gridColumnStart: row.gridStart,
                        gridColumnEnd: `span ${row.span}`,
                        gridRow: i + 3,
                        backgroundColor: row.color,
                        height: '28px',
                        top: '50%',
                        left: '3px',
                        right: '3px',
                        bottom: 'auto',
                        transform: 'translateY(-50%)',
                        boxShadow: `0 3px 10px ${row.color}55`,
                        border: '1px solid rgba(255,255,255,0.25)'
                      }}
                      title={`${row.task} (${row.startTime} - ${row.endTime})`}
                    >
                      <span className="text-white text-[9px] font-black uppercase drop-shadow-sm truncate leading-none">
                        {row.empGroup && <span className="opacity-80 mr-1">{row.empGroup}</span>}
                        {row.startTime} – {row.endTime}
                        <span className="opacity-70 ml-1">({row.hours}h)</span>
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
