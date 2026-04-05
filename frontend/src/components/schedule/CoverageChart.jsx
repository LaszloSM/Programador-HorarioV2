import { useState, useEffect } from 'react'
import { useScheduleStore } from '../../store/scheduleStore'
import { SHIFT_CODE_INFO, coverageTimes, absenceCodes, computeEndTimeWithMargin } from '../../lib/shiftCodes'

function timeToMinutes(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
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

export default function CoverageChart() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const isMobile = useIsMobile()
  const globalSchedule = useScheduleStore(s => s.globalSchedule)
  const config = useScheduleStore(s => s.config)

  const taskGroupMap = {}
  config.tasks.forEach(t => { taskGroupMap[t.name] = t.group })

  // Build coverage slots
  const slots = coverageTimes.map(slotTime => {
    const slotMinutes = timeToMinutes(slotTime)
    const workers = []

    config.employees.forEach(emp => {
      const entry = globalSchedule[emp.name]?.[selectedDate]
      if (!entry || absenceCodes.includes(entry.duration)) return

      const hours = entry.code && SHIFT_CODE_INFO[entry.code]
        ? SHIFT_CODE_INFO[entry.code].hours
        : parseInt(entry.duration) || 0
      if (!hours || !entry.startTime) return

      const startMin = timeToMinutes(entry.startTime)
      const endTime = computeEndTimeWithMargin(entry.startTime, hours, emp.jefatura ?? false)
      const endMin = timeToMinutes(endTime)

      if (startMin !== null && endMin !== null && slotMinutes >= startMin && slotMinutes < endMin) {
        workers.push({ name: emp.name, task: entry.task, group: taskGroupMap[entry.task] })
      }
    })

    return { slotTime, workers }
  })

  const maxWorkers = Math.max(...slots.map(s => s.workers.length), 1)

  return (
    <div className={`bg-white md:rounded-3xl shadow-premium border-b md:border border-borde/50 overflow-hidden ${isMobile ? '' : 'backdrop-blur-xl p-6'}`}>
      <div className={`flex items-center justify-between gap-4 mb-6 ${isMobile ? 'p-4 bg-nm-surface-low border-b border-nm-outline-variant' : ''}`}>
        <h2 className="text-nm-on-surface font-bold text-lg tracking-tight">Cobertura por Hora</h2>
        <div className="relative group/date">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-nm-surface-high border border-nm-outline-variant rounded-xl px-4 py-2 text-sm text-nm-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-nm-primary/20 transition-all cursor-pointer"
          />
        </div>
      </div>

      <div className={`overflow-x-auto scrollbar-hide ${isMobile ? 'px-4 pb-20' : ''}`}>
        <div className="space-y-1.5 min-w-[450px]">
          {slots.map(({ slotTime, workers }) => {
             const isMainHour = slotTime.endsWith(':00')
             return (
               <div key={slotTime} className={`flex items-center gap-3 group/row ${isMainHour ? 'pt-2' : ''}`}>
                 <span className={`text-[10px] w-12 text-right shrink-0 transition-colors ${isMainHour ? 'font-black text-nm-on-surface' : 'font-medium text-nm-on-surface-variant'}`}>
                   {slotTime}
                 </span>
                 <div className={`flex-1 flex gap-1 items-center h-8 px-1 rounded-lg transition-colors ${workers.length === 0 ? 'bg-nm-surface-low/30' : 'group-hover/row:bg-nm-primary/5'}`}>
                   {workers.length === 0 ? (
                     <div className="h-0.5 w-full bg-nm-outline-variant/20 rounded-full" />
                   ) : (
                     workers.map((w, i) => {
                       const color = w.group ? (config.groupColors[w.group] ?? '#CBD5E1') : '#CBD5E1'
                       return (
                         <div
                           key={i}
                           title={`${w.name} — ${w.task ?? ''}`}
                           className="h-full rounded-md text-[9px] text-white flex items-center justify-center overflow-hidden px-2 shadow-sm border border-white/10 active:scale-95 transition-transform"
                           style={{
                             backgroundColor: color,
                             width: `${(1 / maxWorkers) * 100}%`,
                             minWidth: '50px',
                             maxWidth: '120px'
                           }}
                         >
                           <span className="truncate font-black uppercase tracking-tighter">{w.name.split(' ')[0]}</span>
                         </div>
                       )
                     })
                   )}
                 </div>
                 <span className={`text-[10px] w-5 text-center shrink-0 font-black rounded-lg py-1 ${workers.length > 0 ? 'text-nm-primary bg-nm-primary/10' : 'text-nm-on-surface-variant'}`}>
                   {workers.length}
                 </span>
               </div>
             )
          })}
        </div>
      </div>
    </div>
  )
}
