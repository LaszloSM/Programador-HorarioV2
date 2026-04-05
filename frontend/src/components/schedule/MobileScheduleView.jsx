
// MobileScheduleView.jsx — Optimized mobile view for the schedule table
import { useState, useMemo } from 'react'
import { useScheduleStore } from '../../store/scheduleStore'
import { useComputeHours } from '../../hooks/useComputeHours'
import { useComputePoliv } from '../../hooks/useComputePoliv'
import { isHoliday } from '../../lib/shiftCodes'
import { SHIFT_CODE_INFO, absenceCodes, absenceLabels, computeEndTimeWithMargin } from '../../lib/shiftCodes'
import EditShiftModal from './EditShiftModal'
import ContextMenu from './ContextMenu'

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const DAY_LABELS_FULL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d
}

function getWeekDates(startDate) {
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }
  return dates
}

function toISO(date) {
  return date.toISOString().slice(0, 10)
}

function MobileShiftPill({ empName, dateKey, onClick, onContextMenu }) {
  const entry = useScheduleStore(s => s.globalSchedule[empName]?.[dateKey])
  const config = useScheduleStore(s => s.config)

  const hasEntry = !(!entry || (!entry.duration && !entry.startTime && !entry.code))
  const isAbsence = entry && absenceCodes.includes(entry.duration)

  const emp = config.employees.find(e => e.name === empName)
  const isJefatura = emp?.jefatura ?? false
  const taskGroupMap = {}
  config.tasks.forEach(t => { taskGroupMap[t.name] = t.group })

  const hours = entry?.code && SHIFT_CODE_INFO[entry.code]
    ? SHIFT_CODE_INFO[entry.code].hours
    : parseInt(entry?.duration) || 0

  const taskGroup = entry?.task ? taskGroupMap[entry.task] : null
  const taskColor = taskGroup ? (config.groupColors?.[taskGroup] ?? null) : null

  if (!hasEntry) {
    return (
      <div
        onClick={e => { e.stopPropagation(); onClick?.() }}
        onContextMenu={e => { e.preventDefault(); onContextMenu?.(e.clientX, e.clientY, empName, dateKey) }}
        className="mobile-shift-pill mobile-shift-pill--empty"
        role="button"
        aria-label={`Agregar turno`}
      >
        <span className="mobile-shift-pill__plus">+</span>
      </div>
    )
  }

  if (isAbsence) {
    return (
      <div
        onClick={onClick}
        onContextMenu={e => { e.preventDefault(); onContextMenu?.(e.clientX, e.clientY, empName, dateKey) }}
        className="mobile-shift-pill mobile-shift-pill--absence"
        role="button"
        title={absenceLabels[entry.duration] ?? entry.duration}
      >
        <span className="mobile-shift-pill__code">{entry.duration}</span>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      onContextMenu={e => { e.preventDefault(); onContextMenu?.(e.clientX, e.clientY, empName, dateKey) }}
      className="mobile-shift-pill mobile-shift-pill--filled"
      style={{ backgroundColor: taskColor ?? '#1e3a5f' }}
      role="button"
    >
      <span className="mobile-shift-pill__code">
        {entry.code || (hours + 'h')}
      </span>
      {entry.startTime && (
        <span className="mobile-shift-pill__time">{entry.startTime}</span>
      )}
    </div>
  )
}

function EmployeeMobileCard({ emp, dates, onCellClick, onContextMenu }) {
  const [expanded, setExpanded] = useState(false)
  const { computeWeeklyHours } = useComputeHours()
  const { computeWeeklyPoliv } = useComputePoliv()

  const weekStart = dates[0]
  const weekEnd = dates[6]
  const hours = computeWeeklyHours(emp.name, weekStart, weekEnd)
  const poliv = computeWeeklyPoliv(emp.name, weekStart, weekEnd)
  const overHours = hours > emp.maxHours

  return (
    <div className="mobile-emp-card">
      {/* Card header */}
      <div
        className="mobile-emp-card__header"
        onClick={() => setExpanded(v => !v)}
        role="button"
        aria-expanded={expanded}
      >
        <div className="mobile-emp-card__info">
          <span className="mobile-emp-card__name" title={emp.name}>{emp.name}</span>
          <span className="mobile-emp-card__meta">
            {emp.maxHours}h{emp.jefatura ? ' · Jef.' : ''}
          </span>
        </div>
        <div className="mobile-emp-card__stats">
          <span className={`mobile-emp-card__hours ${overHours ? 'mobile-emp-card__hours--over' : ''}`}>
            {hours}<span className="mobile-emp-card__hours-max">/{emp.maxHours}</span>
          </span>
          <span className="mobile-emp-card__poliv">{poliv}%</span>
          <span className="mobile-emp-card__chevron" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        </div>
      </div>

      {/* Week grid of shifts - always visible, compact */}
      <div className="mobile-emp-card__week">
        {dates.map((date, i) => {
          const dateKey = toISO(date)
          const isFest = isHoliday(dateKey)
          const isToday = toISO(new Date()) === dateKey
          return (
            <div key={dateKey} className="mobile-emp-card__day">
              <span className={`mobile-emp-card__day-label ${isFest ? 'mobile-emp-card__day-label--fest' : ''} ${isToday ? 'mobile-emp-card__day-label--today' : ''}`}>
                {DAY_LABELS_FULL[i]}
              </span>
              <span className={`mobile-emp-card__day-num ${isFest ? 'mobile-emp-card__day-num--fest' : ''} ${isToday ? 'mobile-emp-card__day-num--today' : ''}`}>
                {date.getDate()}
              </span>
              <div className="mobile-emp-card__cell">
                <MobileShiftPill
                  empName={emp.name}
                  dateKey={dateKey}
                  onClick={() => onCellClick(emp.name, dateKey)}
                  onContextMenu={onContextMenu}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function MobileScheduleView() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [editModal, setEditModal] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [filterName, setFilterName] = useState('')
  const [filterGroup, setFilterGroup] = useState('Todos')

  const config = useScheduleStore(s => s.config)
  const globalSchedule = useScheduleStore(s => s.globalSchedule)
  const clipboardEntry = useScheduleStore(s => s.clipboardEntry)
  const copyShift = useScheduleStore(s => s.copyShift)
  const pasteShift = useScheduleStore(s => s.pasteShift)
  const deleteShift = useScheduleStore(s => s.deleteShift)

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 6)
    return d
  }, [weekStart])

  const dates = useMemo(() => getWeekDates(weekStart), [weekStart])

  const taskGroupMap = useMemo(() => {
    const map = {}
    config.tasks.forEach(t => { map[t.name] = t.group })
    return map
  }, [config.tasks])

  const filteredEmployees = useMemo(() => {
    let list = config.employees
    if (filterGroup !== 'Todos') {
      list = list.filter(emp =>
        dates.some(date => {
          const dk = toISO(date)
          const entry = globalSchedule[emp.name]?.[dk]
          return entry?.task && taskGroupMap[entry.task] === filterGroup
        })
      )
    }
    if (filterName.trim()) {
      const q = filterName.trim().toLowerCase()
      list = list.filter(emp => emp.name.toLowerCase().includes(q))
    }
    return list
  }, [config.employees, filterGroup, filterName, dates, globalSchedule, taskGroupMap])

  const prevWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }
  const nextWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }
  const goToday = () => setWeekStart(getMonday(new Date()))

  return (
    <div className="mobile-schedule">
      {/* Week navigation */}
      <div className="mobile-schedule__nav">
        <button onClick={prevWeek} className="mobile-schedule__nav-btn" aria-label="Semana anterior">‹</button>
        <div className="mobile-schedule__nav-center">
          <span className="mobile-schedule__week-range">
            {weekStart.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
            {' — '}
            {weekEnd.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <button onClick={nextWeek} className="mobile-schedule__nav-btn" aria-label="Semana siguiente">›</button>
        <button onClick={goToday} className="mobile-schedule__today-btn">Hoy</button>
      </div>

      {/* Filters */}
      <div className="mobile-schedule__filters">
        <div className="mobile-schedule__filter-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={filterName}
            onChange={e => setFilterName(e.target.value)}
            placeholder="Buscar empleado..."
            className="mobile-schedule__search"
          />
        </div>
        <select
          value={filterGroup}
          onChange={e => setFilterGroup(e.target.value)}
          className="mobile-schedule__group-select"
          aria-label="Filtrar por grupo"
        >
          <option value="Todos">Todos</option>
          {(config.groups || []).map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Employee list */}
      <div className="mobile-schedule__list">
        {filteredEmployees.length === 0 ? (
          <div className="mobile-schedule__empty">
            {config.employees.length === 0
              ? 'No hay empleados. Abre Configuración para agregar.'
              : 'No hay empleados con turnos para este grupo.'}
          </div>
        ) : (
          filteredEmployees.map(emp => (
            <EmployeeMobileCard
              key={emp.name}
              emp={emp}
              dates={dates}
              onCellClick={(empName, dateKey) => setEditModal({ empName, dateKey })}
              onContextMenu={(x, y, empName, dateKey) => setContextMenu({ x, y, empName, dateKey })}
            />
          ))
        )}
      </div>

      {/* Edit modal */}
      {editModal && (
        <EditShiftModal
          empName={editModal.empName}
          dateKey={editModal.dateKey}
          onClose={() => setEditModal(null)}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          empName={contextMenu.empName}
          dateKey={contextMenu.dateKey}
          canPaste={!!clipboardEntry}
          canCopy={!!globalSchedule[contextMenu.empName]?.[contextMenu.dateKey]}
          onCopy={() => copyShift(contextMenu.empName, contextMenu.dateKey)}
          onPaste={() => pasteShift(contextMenu.empName, contextMenu.dateKey)}
          onDelete={() => deleteShift(contextMenu.empName, contextMenu.dateKey)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
