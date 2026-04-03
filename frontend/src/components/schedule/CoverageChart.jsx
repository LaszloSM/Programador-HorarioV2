import { useState } from 'react'
import { useScheduleStore } from '../../store/scheduleStore'
import { SHIFT_CODE_INFO, coverageTimes, absenceCodes, computeEndTimeWithMargin } from '../../lib/shiftCodes'

function timeToMinutes(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export default function CoverageChart() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))

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
    <div className="bg-white rounded-2xl shadow-sm border border-borde p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-azul font-semibold text-base">Cobertura por hora</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="border border-borde rounded-lg px-3 py-1 text-sm text-azul focus:outline-none focus:ring-2 focus:ring-azul"
        />
      </div>

      <div className="overflow-x-auto">
        <div className="space-y-1 min-w-[500px]">
          {slots.map(({ slotTime, workers }) => (
            <div key={slotTime} className="flex items-center gap-2">
              <span className="text-xs text-muted w-12 text-right shrink-0">{slotTime}</span>
              <div className="flex-1 flex gap-1 items-center h-7">
                {workers.length === 0 ? (
                  <div className="h-full w-full bg-gray-50 rounded" />
                ) : (
                  workers.map((w, i) => {
                    const color = w.group ? (config.groupColors[w.group] ?? '#CBD5E1') : '#CBD5E1'
                    return (
                      <div
                        key={i}
                        title={`${w.name} — ${w.task ?? ''}`}
                        className="h-full rounded text-xs text-white flex items-center justify-center overflow-hidden px-1"
                        style={{
                          backgroundColor: color,
                          width: `${(1 / maxWorkers) * 100}%`,
                          minWidth: '2rem',
                        }}
                      >
                        <span className="truncate">{w.name.split(' ')[0]}</span>
                      </div>
                    )
                  })
                )}
              </div>
              <span className="text-xs text-muted w-4 text-right shrink-0">{workers.length}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
