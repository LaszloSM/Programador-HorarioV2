import { useState, useMemo } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay
} from '@dnd-kit/core'
import { useScheduleStore } from '../../store/scheduleStore'
import { useComputeHours } from '../../hooks/useComputeHours'
import { useComputePoliv } from '../../hooks/useComputePoliv'
import { isHoliday } from '../../lib/shiftCodes'
import ShiftCell from './ShiftCell'
import EditShiftModal from './EditShiftModal'
import ContextMenu from './ContextMenu'

function DragPreviewCard({ empName, dateKey }) {
  const entry = useScheduleStore(s => s.globalSchedule[empName]?.[dateKey])
  if (!entry) return null
  const label = entry.code || entry.duration || '?'
  return (
    <div className="h-[4.5rem] w-[5.5rem] rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white flex items-center justify-center shadow-[0_10px_25px_-5px_rgba(14,165,233,0.5)] opacity-95 text-base font-black ring-2 ring-white/50 backdrop-blur-sm z-50">
      {label}
    </div>
  )
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

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function ScheduleTable() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [editModal, setEditModal] = useState(null) // { empName, dateKey }
  const [activeId, setActiveId] = useState(null)
  const [contextMenu, setContextMenu] = useState(null) // { x, y, empName, dateKey } | null
  const [filterGroup, setFilterGroup] = useState('Todos')
  const [filterName, setFilterName] = useState('')

  const config = useScheduleStore(s => s.config)
  const moveShift = useScheduleStore(s => s.moveShift)
  const copyShift = useScheduleStore(s => s.copyShift)
  const pasteShift = useScheduleStore(s => s.pasteShift)
  const deleteShift = useScheduleStore(s => s.deleteShift)
  const clipboardEntry = useScheduleStore(s => s.clipboardEntry)

  const { computeWeeklyHours } = useComputeHours()
  const { computeWeeklyPoliv } = useComputePoliv()

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 6)
    return d
  }, [weekStart])

  const dates = useMemo(() => getWeekDates(weekStart), [weekStart])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragStart = ({ active }) => {
    setActiveId(active.id)
  }

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over || active.id === over.id) return
    const src = active.data.current
    const dst = over.data.current
    if (src && dst) moveShift(src.empName, src.dateKey, dst.empName, dst.dateKey)
  }

  const handleContextMenu = (x, y, empName, dateKey) => {
    setContextMenu({ x, y, empName, dateKey })
  }

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

  const globalSchedule = useScheduleStore(s => s.globalSchedule)

  const taskGroupMap = useMemo(() => {
    const map = {}
    config.tasks.forEach(t => { map[t.name] = t.group })
    return map
  }, [config.tasks])

  const filteredEmployees = useMemo(() => {
    let list = config.employees
    if (filterGroup !== 'Todos') {
      list = list.filter(emp => {
        return dates.some(date => {
          const dk = toISO(date)
          const entry = globalSchedule[emp.name]?.[dk]
          return entry?.task && taskGroupMap[entry.task] === filterGroup
        })
      })
    }
    if (filterName.trim()) {
      const q = filterName.trim().toLowerCase()
      list = list.filter(emp => emp.name.toLowerCase().includes(q))
    }
    return list
  }, [config.employees, filterGroup, filterName, dates, globalSchedule, taskGroupMap])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-white rounded-3xl shadow-premium border border-borde/50 overflow-hidden backdrop-blur-xl">
        {/* Header: date navigation */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-borde/50 bg-gradient-to-r from-azul-50 to-white">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 bg-white border border-borde/70 rounded-xl p-1 shadow-sm">
              <button onClick={prevWeek} className="text-slate-600 hover:text-sky-600 hover:bg-sky-50 px-3 py-1.5 rounded-lg transition-colors font-bold text-lg leading-none">‹</button>
              <span className="text-slate-800 font-bold text-sm px-2 font-display tracking-tight">
                {weekStart.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} —{' '}
                {weekEnd.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <button onClick={nextWeek} className="text-slate-600 hover:text-sky-600 hover:bg-sky-50 px-3 py-1.5 rounded-lg transition-colors font-bold text-lg leading-none">›</button>
            </div>
            {/* Filter group */}
            <div className="flex items-center gap-3 border-l border-borde/60 pl-5">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Grupo</span>
              <select
                value={filterGroup}
                onChange={e => setFilterGroup(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 text-slate-800 font-semibold shadow-sm cursor-pointer transition-all"
              >
                <option value="Todos">Todos</option>
                {(config.groups || []).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            {/* Filter by employee name */}
            <div className="flex items-center gap-2 border-l border-borde/60 pl-5">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider hidden sm:block">Empleado</span>
              <input
                type="text"
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                placeholder="Buscar..."
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 text-slate-800 shadow-sm w-32"
              />
            </div>
          </div>
          <button onClick={goToday} className="text-xs font-bold text-sky-700 bg-sky-50 border border-sky-100 px-4 py-2 rounded-xl hover:bg-sky-100 transition-colors shadow-sm">
            Hoy
          </button>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto p-0">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-borde/50">
                <th className="text-left text-xs font-extrabold text-slate-500 uppercase tracking-wider px-6 py-4 w-40">Empleado</th>
                {dates.map((date, i) => {
                  const dateKey = toISO(date)
                  const fest = isHoliday(dateKey)
                  return (
                    <th key={dateKey} className="text-center py-3 px-1 border-l border-borde/20">
                      <div className={`text-xs font-bold uppercase tracking-wider ${fest ? 'text-red-500/80' : 'text-slate-400'}`}>{DAY_LABELS[i]}</div>
                      <div className={`text-base mt-0.5 font-black font-display ${fest ? 'text-red-600' : 'text-slate-700'}`}>
                        {date.getDate()}
                      </div>
                    </th>
                  )
                })}
                <th className="text-center text-xs font-extrabold text-slate-500 uppercase tracking-wider px-3 py-4 border-l border-borde/40 bg-slate-100/50">Hrs</th>
                <th className="text-center text-xs font-extrabold text-slate-500 uppercase tracking-wider px-3 py-4 bg-slate-100/50">Poliv</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={dates.length + 3} className="text-center text-slate-400 font-medium text-sm py-16 bg-slate-50/30">
                    {config.employees.length === 0 
                      ? 'No hay empleados configurados. Abre Configuración para agregar empleados.'
                      : 'No hay empleados con turnos para este grupo en esta semana.'}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => {
                  const hours = computeWeeklyHours(emp.name, weekStart, weekEnd)
                  const poliv = computeWeeklyPoliv(emp.name, weekStart, weekEnd)
                  const overHours = hours > emp.maxHours

                  return (
                    <tr key={emp.name} className="border-b border-borde/30 hover:bg-sky-50/40 transition-colors group">
                      <td className="px-6 py-3">
                        <div className="flex flex-col gap-0.5">
                          <div className="text-sm font-bold text-slate-700 truncate max-w-[9rem] group-hover:text-blue-700 transition-colors" title={emp.name}>
                            {emp.name}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {emp.maxHours}h{emp.jefatura ? ' · Jef.' : ''}
                          </div>
                        </div>
                      </td>
                      {dates.map(date => {
                        const dateKey = toISO(date)
                        return (
                          <td key={dateKey} className="px-1 py-1.5 border-l border-dashed border-borde/20">
                            <ShiftCell
                              empName={emp.name}
                              dateKey={dateKey}
                              onClick={() => setEditModal({ empName: emp.name, dateKey })}
                              onContextMenu={handleContextMenu}
                            />
                          </td>
                        )
                      })}
                      <td className="text-center px-3 py-3 border-l border-borde/40 bg-slate-50/30 group-hover:bg-transparent transition-colors">
                        <div className="flex flex-col items-center justify-center">
                          <span className={`text-base font-black font-display leading-none ${overHours ? 'text-red-500' : 'text-slate-800'}`}>
                            {hours}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">/ {emp.maxHours}</span>
                        </div>
                      </td>
                      <td className="text-center px-3 py-3 bg-slate-50/30 group-hover:bg-transparent transition-colors">
                        <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-md bg-white border border-slate-200 shadow-sm text-xs font-bold text-sky-700">
                          {poliv}%
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
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

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeId ? (() => {
          const [empName, dateKey] = activeId.split('__')
          return <DragPreviewCard empName={empName} dateKey={dateKey} />
        })() : null}
      </DragOverlay>
    </DndContext>
  )
}
