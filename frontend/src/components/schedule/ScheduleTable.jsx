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
    <div className="h-16 w-24 rounded-lg bg-azul text-white flex items-center justify-center shadow-xl opacity-90 text-sm font-bold">
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

  const employees = config.employees

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-white rounded-2xl shadow-sm border border-borde overflow-hidden">
        {/* Header: date navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-borde bg-azul-50">
          <div className="flex items-center gap-2">
            <button onClick={prevWeek} className="text-azul hover:bg-azul-100 px-2 py-1 rounded text-sm">‹</button>
            <span className="text-azul font-semibold text-sm">
              {weekStart.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} —{' '}
              {weekEnd.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <button onClick={nextWeek} className="text-azul hover:bg-azul-100 px-2 py-1 rounded text-sm">›</button>
          </div>
          <button onClick={goToday} className="text-xs text-azul border border-borde px-3 py-1 rounded-lg hover:bg-azul-50">
            Hoy
          </button>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-azul-50 border-b border-borde">
                <th className="text-left text-xs font-semibold text-muted px-4 py-2 w-36">Empleado</th>
                {dates.map((date, i) => {
                  const dateKey = toISO(date)
                  const fest = isHoliday(dateKey)
                  return (
                    <th key={dateKey} className={`text-center text-xs font-semibold py-2 px-1 ${fest ? 'text-danger' : 'text-muted'}`}>
                      <div>{DAY_LABELS[i]}</div>
                      <div className={`text-sm font-bold ${fest ? 'text-danger' : 'text-azul'}`}>
                        {date.getDate()}
                      </div>
                    </th>
                  )
                })}
                <th className="text-center text-xs font-semibold text-muted px-2 py-2">Hrs</th>
                <th className="text-center text-xs font-semibold text-muted px-2 py-2">Poliv</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={dates.length + 3} className="text-center text-muted text-sm py-12">
                    No hay empleados configurados. Abre Configuración para agregar empleados.
                  </td>
                </tr>
              ) : (
                employees.map(emp => {
                  const hours = computeWeeklyHours(emp.name, weekStart, weekEnd)
                  const poliv = computeWeeklyPoliv(emp.name, weekStart, weekEnd)
                  const overHours = hours > emp.maxHours

                  return (
                    <tr key={emp.name} className="border-b border-borde hover:bg-azul-50/30">
                      <td className="px-4 py-2">
                        <div className="text-sm font-medium text-azul truncate max-w-[8rem]" title={emp.name}>
                          {emp.name}
                        </div>
                        <div className="text-xs text-muted">{emp.maxHours}h{emp.jefatura ? ' · Jef.' : ''}</div>
                      </td>
                      {dates.map(date => {
                        const dateKey = toISO(date)
                        return (
                          <td key={dateKey} className="px-1 py-1">
                            <ShiftCell
                              empName={emp.name}
                              dateKey={dateKey}
                              onClick={() => setEditModal({ empName: emp.name, dateKey })}
                              onContextMenu={handleContextMenu}
                            />
                          </td>
                        )
                      })}
                      <td className="text-center px-2 py-2">
                        <span className={`text-sm font-bold ${overHours ? 'text-danger' : 'text-azul'}`}>
                          {hours}
                        </span>
                        <span className="text-xs text-muted">/{emp.maxHours}</span>
                      </td>
                      <td className="text-center px-2 py-2">
                        <span className="text-sm font-bold text-azul">{poliv}%</span>
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
