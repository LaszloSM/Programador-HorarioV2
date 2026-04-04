import { useState, useMemo } from 'react'
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

export default function DailyCoverageGantt() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const config = useScheduleStore(s => s.config)
  const [filterGroup, setFilterGroup] = useState(config.groups?.[0] || '')

  const globalSchedule = useScheduleStore(s => s.globalSchedule)

  const taskGroupMap = useMemo(() => {
    const map = {}
    config.tasks.forEach(t => { map[t.name] = t.group })
    return map
  }, [config.tasks])

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
      // Handle shifts that cross midnight or end late
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

  return (
    <div className="space-y-4">
      {/* Controls Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center bg-azul rounded-full overflow-hidden shadow">
          <div className="px-4 py-1.5 text-white text-sm font-semibold flex items-center gap-2">
            <span className="material-icons text-sm">🗓</span>
            Cobertura día
          </div>
          <button onClick={prevDay} className="px-2 py-1.5 text-white hover:bg-blue-800 transition-colors">‹</button>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-2 py-1.5 bg-white text-azul text-sm font-bold focus:outline-none"
          />
          <button onClick={nextDay} className="px-2 py-1.5 text-white hover:bg-blue-800 transition-colors">›</button>
        </div>

        <div className="flex items-center bg-azul rounded-full overflow-hidden shadow">
          <div className="px-4 py-1.5 text-white text-sm font-semibold flex items-center gap-2">
            <span className="material-icons text-sm">👥</span>
            Grupo
          </div>
          <select
            value={filterGroup}
            onChange={e => setFilterGroup(e.target.value)}
            className="px-3 py-1.5 bg-white text-azul text-sm font-bold focus:outline-none min-w-[120px]"
          >
            <option value="Todos">Todos</option>
            {(config.groups || []).map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Gantt Chart Container */}
      <div className="bg-white rounded-xl shadow border border-borde overflow-hidden">
        <div className="bg-azul text-white text-center py-2 font-semibold text-sm capitalize">
          Cobertura de horarios - {dateLabel}
        </div>

        <div className="overflow-x-auto p-4">
          <div
            className="min-w-[900px] border border-borde relative text-[10px]"
            style={{
              display: 'grid',
              gridTemplateColumns: `200px repeat(${TOTAL_SLOTS}, minmax(20px, 1fr))`
            }}
          >
            {/* Header: Total empleados */}
            <div className="bg-blue-100 border-b border-r border-borde flex items-center justify-center font-bold text-azul uppercase py-1">
              Total empleados
            </div>
            {data.counts.map((count, i) => (
              <div key={i} className="bg-blue-100 border-b border-r border-borde flex items-center justify-center font-bold text-azul py-1">
                {count > 0 ? count : ''}
              </div>
            ))}

            {/* Header: TIME SLOTS */}
            <div className="bg-azul text-white border-b border-r border-borde flex items-center justify-center font-bold uppercase py-1">
              Nombre
            </div>
            {slots.map((slot, i) => (
              <div key={i} className="bg-azul text-white border-b border-r border-borde flex items-center justify-center font-semibold py-1">
                {slot}
              </div>
            ))}

            {/* Columns grid lines (background) */}
            <div 
               className="absolute top-[48px] bottom-0 left-[200px] right-0 pointer-events-none flex"
               style={{ zIndex: 0 }}
            >
               {slots.map((_, i) => (
                 <div key={i} className="flex-1 border-r border-borde/50" />
               ))}
            </div>

            {/* Content rows */}
            {data.list.length === 0 ? (
              <div
                className="col-span-full text-center py-8 text-sm text-muted font-medium bg-gray-50"
              >
                No hay turnos registrados para este grupo en la fecha seleccionada.
              </div>
            ) : (
              data.list.map((row, i) => (
                <div key={i} className="contents relative z-10 group">
                  {/* Name cell */}
                  <div className="border-b border-border bg-white flex items-center px-2 py-1 z-10 group-hover:bg-blue-50/50">
                    <div className="w-6 h-6 rounded-full bg-azul-50 text-azul font-bold flex items-center justify-center mr-2 shrink-0">
                      {row.empName.charAt(0)}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-azul truncate" title={row.empName}>{row.empName}</div>
                      <div className="text-muted truncate mt-0.5" title={row.task}>{row.task}</div>
                    </div>
                  </div>

                  {/* Empty cells space filler to allow borders */}
                  {slots.map((_, j) => (
                    <div key={j} className="border-b border-borde/10 group-hover:bg-blue-50/10"></div>
                  ))}

                  {/* Task Bar */}
                  {row.span > 0 && (
                    <div
                      className="absolute rounded-md flex items-center justify-center my-1.5 shadow-sm overflow-hidden whitespace-nowrap text-white font-semibold transition-transform hover:scale-[1.01] hover:shadow-md cursor-default z-20"
                      style={{
                        gridColumnStart: row.gridStart,
                        gridColumnEnd: `span ${row.span}`,
                        gridRow: i + 3, // +3 because of the 2 header rows
                        backgroundColor: row.color,
                        height: '24px',
                        left: '2px', // small margins
                        right: '2px'
                      }}
                      title={`${row.task} (${row.startTime} - ${row.endTime})`}
                    >
                      <span className="text-black/60 px-2 drop-shadow-sm font-bold">
                        {row.empGroup} {row.startTime} - {row.endTime} ({row.hours}h)
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
