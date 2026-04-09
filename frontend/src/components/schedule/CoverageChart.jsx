import { useState, useMemo } from 'react'
import { useScheduleStore } from '../../store/scheduleStore'
import { SHIFT_CODE_INFO, coverageTimes, absenceCodes, computeEndTimeWithMargin } from '../../lib/shiftCodes'

function timeToMinutes(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// "JUAN MARTINEZ" → "JUAN M."
function abbrevName(fullName) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 9).toUpperCase()
  return `${parts[0]} ${parts[1][0]}.`.toUpperCase()
}

// Contrast-safe text color for a hex background
function textColorFor(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.55 ? '#1E293B' : '#FFFFFF'
}

function getCurrentTimeSlot() {
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  const rounded = m < 30 ? `${String(h).padStart(2, '0')}:00` : `${String(h).padStart(2, '0')}:30`
  return rounded
}

export default function CoverageChart() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const globalSchedule = useScheduleStore(s => s.globalSchedule)
  const config = useScheduleStore(s => s.config)
  const todayStr = new Date().toISOString().slice(0, 10)
  const isToday = selectedDate === todayStr
  const currentSlot = isToday ? getCurrentTimeSlot() : null

  const taskGroupMap = useMemo(() => {
    const map = {}
    config.tasks.forEach(t => { map[t.name] = t.group })
    return map
  }, [config.tasks])

  const slots = useMemo(() => {
    return coverageTimes.map(slotTime => {
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
          const group = taskGroupMap[entry.task]
          workers.push({ name: emp.name, task: entry.task, group })
        }
      })
      return { slotTime, workers }
    })
  }, [globalSchedule, config, selectedDate, taskGroupMap])

  const maxWorkers = useMemo(() => Math.max(...slots.map(s => s.workers.length), 1), [slots])
  const peakCount = maxWorkers
  const totalEmployees = config.employees.length || 1

  // Groups with colors (non-empty)
  const groupEntries = useMemo(() =>
    Object.entries(config.groupColors).filter(([g, c]) => g && g !== '' && c),
    [config.groupColors]
  )

  // Coverage level for row background
  function coverageLevel(count) {
    if (count === 0) return 0
    const pct = count / maxWorkers
    if (pct >= 0.85) return 3  // high
    if (pct >= 0.45) return 2  // medium
    return 1                    // low
  }

  const levelBg = {
    0: '',
    1: '',
    2: '',
    3: 'bg-azul-50/30',
  }

  return (
    <div className="bg-white md:rounded-2xl border border-borde/50 shadow-sm overflow-hidden flex flex-col">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-borde/40 bg-gradient-to-r from-azul-50/60 to-white shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="font-bold text-azul text-[15px] tracking-tight leading-none">
              Cobertura por Hora
            </h2>
            <p className="text-[11px] text-metro-muted mt-1 font-medium">
              Pico&nbsp;
              <span className="font-bold text-azul">{peakCount}</span>
              &nbsp;·&nbsp;
              {totalEmployees} empleados
            </p>
          </div>
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="border border-borde rounded-xl px-3 py-2 text-sm font-bold text-azul bg-white focus:outline-none focus:ring-2 focus:ring-azul/20 cursor-pointer transition-shadow hover:shadow-sm"
        />
      </div>

      {/* ── Group legend ─────────────────────────────────────── */}
      {groupEntries.length > 0 && (
        <div className="flex gap-3 px-5 py-2 border-b border-borde/20 flex-wrap bg-white shrink-0">
          {groupEntries.map(([group, color]) => (
            <div key={group} className="flex items-center gap-1.5 text-[11px] font-semibold text-metro-muted">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              {group}
            </div>
          ))}
        </div>
      )}

      {/* ── Column header row ─────────────────────────────────── */}
      <div className="flex items-center px-5 py-1.5 bg-slate-50 border-b border-borde/30 shrink-0">
        <div className="w-[52px] shrink-0 text-[10px] font-semibold text-metro-muted uppercase tracking-wider text-right pr-2">
          Hora
        </div>
        <div className="w-[88px] shrink-0 px-2 text-[10px] font-semibold text-metro-muted uppercase tracking-wider">
          Nivel
        </div>
        <div className="flex-1 min-w-0 text-[10px] font-semibold text-metro-muted uppercase tracking-wider pl-1">
          Empleados (desplazar →)
        </div>
        <div className="w-7 shrink-0 text-[10px] font-semibold text-metro-muted uppercase tracking-wider text-center">
          #
        </div>
      </div>

      {/* ── Time slots ────────────────────────────────────────── */}
      <div>
        {slots.map(({ slotTime, workers }) => {
          const isMainHour = slotTime.endsWith(':00')
          const isCurrent  = slotTime === currentSlot
          const count      = workers.length
          const pct        = Math.round((count / maxWorkers) * 100)
          const level      = coverageLevel(count)

          // Coverage bar color
          const barColor = count === 0 ? '#E2E8F0'
            : pct >= 85 ? '#0E3B75'
            : pct >= 45 ? '#2563EB'
            : '#93C5FD'

          return (
            <div
              key={slotTime}
              className={[
                'flex items-center px-5 transition-colors',
                isMainHour ? 'border-t border-borde/40' : '',
                isCurrent  ? 'bg-amber-50 border-l-2 border-l-amber-400' : levelBg[level],
                'hover:bg-azul-50/30',
              ].filter(Boolean).join(' ')}
              style={{ minHeight: '32px' }}
            >
              {/* Time label */}
              <div
                className={[
                  'w-[52px] shrink-0 text-right pr-2 tabular-nums leading-none py-1.5',
                  isMainHour
                    ? 'text-[11px] font-black text-azul'
                    : 'text-[10px] font-medium text-metro-muted',
                  isCurrent ? 'text-amber-600 font-black' : '',
                ].filter(Boolean).join(' ')}
              >
                {slotTime}
              </div>

              {/* Coverage intensity bar */}
              <div className="w-[88px] shrink-0 px-2 flex items-center gap-1.5 py-1.5">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
                <span className="text-[9px] font-bold tabular-nums w-6 text-right"
                  style={{ color: count === 0 ? '#CBD5E1' : barColor }}>
                  {pct > 0 ? `${pct}%` : ''}
                </span>
              </div>

              {/* Employee chips — wrap naturally, all names visible */}
              <div className="flex-1 min-w-0 py-1 flex flex-wrap gap-1 items-center">
                {count === 0 ? (
                  <div className="h-px w-10 bg-borde/30 rounded-full mx-1" />
                ) : (
                  workers.map((w, i) => {
                    const bgColor = w.group
                      ? (config.groupColors[w.group] ?? '#94A3B8')
                      : '#94A3B8'
                    const fgColor = textColorFor(bgColor)
                    return (
                      <span
                        key={i}
                        title={`${w.name}${w.task ? ' — ' + w.task : ''}`}
                        className="inline-flex items-center rounded-md text-[10px] font-bold cursor-default select-none"
                        style={{
                          backgroundColor: bgColor,
                          color: fgColor,
                          padding: '2px 8px',
                          minWidth: '76px',
                        }}
                      >
                        <span className="truncate w-full text-center">
                          {abbrevName(w.name)}
                        </span>
                      </span>
                    )
                  })
                )}
              </div>

              {/* Count badge */}
              <div
                className={[
                  'w-7 shrink-0 text-center text-[11px] font-black rounded py-0.5 ml-1',
                  count > 0
                    ? 'text-azul bg-azul-50'
                    : 'text-slate-300',
                ].join(' ')}
              >
                {count > 0 ? count : ''}
              </div>
            </div>
          )
        })}
      </div>

      {isToday && currentSlot && (
        <div className="px-5 py-2 border-t border-borde/20 bg-amber-50/60 shrink-0">
          <p className="text-[10px] text-amber-700 font-semibold text-center">
            Franja actual resaltada en ámbar
          </p>
        </div>
      )}
    </div>
  )
}
