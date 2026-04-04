import { useState } from 'react'
import { useScheduleStore } from '../../store/scheduleStore'
import {
  SHIFT_CODE_INFO, shiftCodeByDurationStart,
  absenceCodes, absenceLabels, shiftOptions, startTimes,
  allowedFestivo, allowedNormal, isHoliday
} from '../../lib/shiftCodes'

export default function EditShiftModal({ empName, dateKey, onClose }) {
  const entry = useScheduleStore(s => s.globalSchedule[empName]?.[dateKey]) || {}
  const config = useScheduleStore(s => s.config)
  const setShift = useScheduleStore(s => s.setShift)
  const deleteShift = useScheduleStore(s => s.deleteShift)

  const isFestivo = isHoliday(dateKey)

  const [duration, setDuration] = useState(entry.duration ?? '')
  const [startTime, setStartTime] = useState(entry.startTime ?? '')
  const [code, setCode] = useState(entry.code ?? '')
  const [task, setTask] = useState(entry.task ?? '')
  const [error, setError] = useState(null)

  const isAbsence = absenceCodes.includes(duration)

  // Derived: available tasks based on duration type
  const availableTasks = isAbsence
    ? [{ name: 'Ausente', group: 'AUSENTE' }]
    : config.tasks.filter(t => t.group !== 'AUSENTE')

  // Auto-fill: when code changes, fill startTime + duration
  const handleCodeChange = (newCode) => {
    setCode(newCode)
    setError(null)
    if (newCode && SHIFT_CODE_INFO[newCode]) {
      const info = SHIFT_CODE_INFO[newCode]
      setStartTime(info.start || '')
      setDuration(String(info.hours))
    }
  }

  // Auto-fill: when duration or startTime changes, detect code
  const detectCode = (dur, start) => {
    if (dur && start && !absenceCodes.includes(dur)) {
      const key = `${dur}|${start}`
      const detected = shiftCodeByDurationStart[key]
      setCode(detected ?? '')
    }
  }

  const handleDurationChange = (val) => {
    setError(null)
    const isAbs = absenceCodes.includes(val)

    // Validate absence type vs day type
    if (isAbs) {
      const allowed = isFestivo ? allowedFestivo : allowedNormal
      if (!allowed.includes(val)) {
        setError(isFestivo
          ? 'En festivos/domingos solo se permite D (Descanso) o F (Festivo).'
          : 'En días normales no se permite D o F. Usa C, I, S, V, DF o LC.')
        return
      }
      setDuration(val)
      setStartTime('')
      setCode('')
      setTask('Ausente')
      return
    }

    setDuration(val)
    if (task === 'Ausente') setTask('')
    detectCode(val, startTime)
  }

  const handleStartTimeChange = (val) => {
    setStartTime(val)
    detectCode(duration, val)
  }

  const handleSave = () => {
    const isEmpty = !duration && !startTime && !code && !task
    if (isEmpty) {
      deleteShift(empName, dateKey)
      onClose()
      return
    }

    // Validate if absence
    if (absenceCodes.includes(duration)) {
      const allowed = isFestivo ? allowedFestivo : allowedNormal
      if (!allowed.includes(duration)) {
        setError(isFestivo
          ? 'En festivos/domingos solo se permite D o F.'
          : 'En días normales no se permite D o F.')
        return
      }
    }

    setShift(empName, dateKey, {
      startTime: isAbsence ? '' : startTime,
      duration,
      task: isAbsence ? 'Ausente' : task,
      code: isAbsence ? '' : code,
    })
    onClose()
  }

  const handleDelete = () => {
    deleteShift(empName, dateKey)
    onClose()
  }

  // Format date for display
  const displayDate = dateKey
    ? new Date(dateKey + 'T00:00:00').toLocaleDateString('es-CO', {
        weekday: 'long', day: 'numeric', month: 'long'
      })
    : ''

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-azul font-semibold text-base">{empName}</h2>
            <p className="text-muted text-xs capitalize">{displayDate}{isFestivo ? ' · Festivo' : ''}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-azul text-xl leading-none">×</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-danger text-xs rounded-lg px-3 py-2 mb-3">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {/* Duration */}
          <div>
            <label className="block text-xs font-medium text-azul mb-1">Duración / Ausencia</label>
            <select
              value={duration}
              onChange={e => handleDurationChange(e.target.value)}
              className="w-full border border-borde rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul"
            >
              <option value="">— Sin asignar —</option>
              <optgroup label="Horas de trabajo">
                {shiftOptions.filter(h => h > 0).map(h => (
                  <option key={h} value={String(h)}>{h} horas</option>
                ))}
              </optgroup>
              <optgroup label="Ausencias">
                {absenceCodes
                  .filter(c => isFestivo ? allowedFestivo.includes(c) : allowedNormal.includes(c))
                  .map(c => (
                    <option key={c} value={c}>{c} — {absenceLabels[c] ?? c}</option>
                  ))
                }
              </optgroup>
            </select>
          </div>

          {/* Start time — disabled for absences */}
          {!isAbsence && (
            <div>
              <label className="block text-xs font-medium text-azul mb-1">Hora inicio</label>
              <select
                value={startTime}
                onChange={e => handleStartTimeChange(e.target.value)}
                className="w-full border border-borde rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul"
              >
                <option value="">— Seleccionar —</option>
                {startTimes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {/* Shift code */}
          {!isAbsence && (
            <div>
              <label className="block text-xs font-medium text-azul mb-1">Código de turno</label>
              <input
                type="text"
                value={code}
                onChange={e => handleCodeChange(e.target.value)}
                placeholder="ej: 7, 43, Sin Codigo"
                className="w-full border border-borde rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul"
              />
              {code && SHIFT_CODE_INFO[code] && (
                <p className="text-xs text-muted mt-1">
                  {SHIFT_CODE_INFO[code].hours}h · inicio {SHIFT_CODE_INFO[code].start}
                </p>
              )}
            </div>
          )}

          {/* Task */}
          <div>
            <label className="block text-xs font-medium text-azul mb-1">Tarea</label>
            <select
              value={isAbsence ? 'Ausente' : task}
              onChange={e => setTask(e.target.value)}
              disabled={isAbsence}
              className="w-full border border-borde rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul disabled:opacity-50"
            >
              <option value="">— Seleccionar —</option>
              {availableTasks.map(t => (
                <option key={t.name} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          <button
            onClick={handleDelete}
            className="flex-1 bg-red-50 text-danger border border-red-200 rounded-lg py-2 text-sm hover:bg-red-100 transition-colors"
          >
            Eliminar
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-azul-50 text-azul border border-borde rounded-lg py-2 text-sm hover:bg-blue-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-azul text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-900 transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
