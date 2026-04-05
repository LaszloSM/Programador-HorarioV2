import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useScheduleStore } from '../../store/scheduleStore'
import { SHIFT_CODE_INFO, absenceCodes, absenceLabels, computeEndTimeWithMargin } from '../../lib/shiftCodes'

export default function ShiftCell({ empName, dateKey, onClick, onContextMenu }) {
  const entry = useScheduleStore(s => s.globalSchedule[empName]?.[dateKey])
  const config = useScheduleStore(s => s.config)
  const copyShift = useScheduleStore(s => s.copyShift)
  const pasteShift = useScheduleStore(s => s.pasteShift)

  const hasEntry = !(!entry || (!entry.duration && !entry.startTime && !entry.code))

  // DnD - draggable
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `${empName}__${dateKey}`,
    data: { empName, dateKey },
    disabled: !hasEntry,
  })

  // DnD - droppable
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop__${empName}__${dateKey}`,
    data: { empName, dateKey },
  })

  const setRef = (node) => {
    setDragRef(node)
    setDropRef(node)
  }

  const emp = config.employees.find(e => e.name === empName)
  const isJefatura = emp?.jefatura ?? false
  const taskGroupMap = {}
  config.tasks.forEach(t => { taskGroupMap[t.name] = t.group })

  const isAbsence = entry && absenceCodes.includes(entry.duration)
  const hours = entry?.code && SHIFT_CODE_INFO[entry.code]
    ? SHIFT_CODE_INFO[entry.code].hours
    : parseInt(entry?.duration) || 0

  const endTime = !isAbsence && entry?.startTime && hours > 0
    ? computeEndTimeWithMargin(entry.startTime, hours, isJefatura)
    : null

  // Task color from groupColors
  const taskGroup = entry?.task ? taskGroupMap[entry.task] : null
  const taskColor = taskGroup ? (config.groupColors[taskGroup] ?? '#CBD5E1') : null

  // Ctrl+C handler
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault()
      copyShift(empName, dateKey)
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault()
      pasteShift(empName, dateKey)
    }
  }

  if (!hasEntry) {
    // Empty cell
    return (
      <div
        ref={setDropRef}
        onClick={e => { e.stopPropagation(); onClick?.() }}
        onContextMenu={e => { e.preventDefault(); onContextMenu?.(e.clientX, e.clientY, empName, dateKey) }}
        className={`h-16 border border-borde rounded-lg cursor-pointer hover:bg-azul-50 transition-colors flex items-center justify-center ${isOver ? 'bg-azul-100 border-azul' : 'bg-white'}`}
      >
        <span className="text-muted text-xs">+</span>
      </div>
    )
  }

  return (
    <div
      ref={setRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      onContextMenu={e => { e.preventDefault(); onContextMenu?.(e.clientX, e.clientY, empName, dateKey) }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className={`h-16 rounded-lg transition-all select-none relative overflow-hidden ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${isOver ? 'ring-2 ring-azul' : ''}`}
      style={{
        backgroundColor: isAbsence ? '#EAEAEA' : (taskColor ?? '#E0E7FF'),
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* Color accent top strip */}
      {!isAbsence && taskColor && (
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: taskColor }} />
      )}

      <div className="flex flex-col justify-center h-full px-2 pt-1">
        {isAbsence ? (
          <>
            <span className="text-xs font-bold text-gray-600">{entry.duration}</span>
            <span className="text-xs text-gray-500 truncate">{absenceLabels[entry.duration] ?? entry.duration}</span>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-azul">{entry.code || hours + 'h'}</span>
              {hours > 0 && <span className="text-xs text-muted">{hours}h</span>}
            </div>
            {entry.startTime && (
              <span className="text-xs text-azul">{entry.startTime}{endTime ? ` → ${endTime}` : ''}</span>
            )}
            {entry.task && (
              <span className="text-xs text-muted truncate">{entry.task}</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
