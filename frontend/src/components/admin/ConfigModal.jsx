import { useState } from 'react'
import { useScheduleStore } from '../../store/scheduleStore'

import UsersTab from './UsersTab'

const CONTRACT_OPTIONS = [36, 42, 44]

export default function ConfigModal({ onClose }) {
  const config = useScheduleStore(s => s.config)
  const applyConfig = useScheduleStore(s => s.applyConfig)

  const [employees, setEmployees] = useState(config.employees.map(e => ({ ...e })))
  const [tasks, setTasks] = useState(config.tasks.map(t => ({ ...t })))
  const [groups, setGroups] = useState(
    (config.groups || []).map(g => ({
      originalName: g,
      name: g,
      color: config.groupColors[g] ?? '#CBD5E1'
    }))
  )
  const [initialPending, setInitialPending] = useState({ ...config.initialPending })
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('employees')

  const addEmployee = () => setEmployees(prev => [...prev, { name: '', maxHours: 44, jefatura: false }])
  const removeEmployee = (i) => setEmployees(prev => prev.filter((_, idx) => idx !== i))
  const updateEmployee = (i, field, val) => setEmployees(prev =>
    prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e)
  )

  const addTask = () => setTasks(prev => [...prev, { name: '', group: 'CAJAS' }])
  const removeTask = (i) => setTasks(prev => prev.filter((_, idx) => idx !== i))
  const updateTask = (i, field, val) => setTasks(prev =>
    prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t)
  )

  const addGroup = () => setGroups(prev => [...prev, { name: '', originalName: null, color: '#CBD5E1' }])
  const removeGroup = (i) => setGroups(prev => prev.filter((_, idx) => idx !== i))
  const updateGroup = (i, field, val) => setGroups(prev => {
    const next = [...prev]
    if (field === 'name') {
      const oldName = next[i].name
      const newName = val
      setTasks(prevTasks => prevTasks.map(t => t.group === oldName ? { ...t, group: newName } : t))
    }
    next[i][field] = val
    return next
  })

  const handleSave = async () => {
    setSaving(true)
    const filteredEmployees = employees.filter(e => e.name.trim())
    const employeeMaxHours = {}
    filteredEmployees.forEach(e => { employeeMaxHours[e.name] = e.maxHours })

    const finalGroups = []
    const finalColors = {}
    const renameMap = {}

    groups.forEach(g => {
      const finalName = g.name.trim() || 'Nuevo Grupo'
      finalGroups.push(finalName)
      finalColors[finalName] = g.color
      if (g.originalName && g.originalName !== finalName) {
        renameMap[g.originalName] = finalName
      }
    })

    const finalTasks = tasks.filter(t => t.name.trim()).map(t => ({
       ...t,
       group: renameMap[t.group] || t.group
    }))

    await applyConfig({
      ...config,
      employees: filteredEmployees,
      tasks: finalTasks,
      groups: finalGroups,
      groupColors: finalColors,
      initialPending,
      employeeMaxHours,
    })
    setSaving(false)
    onClose()
  }

  const SECTIONS = [
    { id: 'employees', label: 'Empleados y horas' },
    { id: 'compensatorios', label: 'Compensatorios iniciales' },
    { id: 'tasks', label: 'Tareas' },
    { id: 'groups', label: 'Grupos (nombre & color)' },
    { id: 'users', label: 'Usuarios (admin)' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-borde">
          <h2 className="text-azul font-semibold text-lg">Configuración</h2>
          <button onClick={onClose} className="text-muted hover:text-azul text-xl">×</button>
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-borde px-6">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`py-2 px-4 text-sm border-b-2 transition-colors ${
                activeSection === s.id ? 'border-azul text-azul font-semibold' : 'border-transparent text-muted hover:text-azul'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Employees */}
          {activeSection === 'employees' && (
            <div className="space-y-2">
              {employees.map((emp, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-azul-50 rounded-lg">
                  <input
                    value={emp.name}
                    onChange={e => updateEmployee(i, 'name', e.target.value)}
                    placeholder="Nombre del empleado"
                    className="flex-1 border border-borde rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-azul"
                  />
                  <select
                    value={emp.maxHours}
                    onChange={e => updateEmployee(i, 'maxHours', Number(e.target.value))}
                    className="border border-borde rounded px-2 py-1 text-sm focus:outline-none"
                  >
                    {CONTRACT_OPTIONS.map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emp.jefatura}
                      onChange={e => updateEmployee(i, 'jefatura', e.target.checked)}
                      className="rounded"
                    />
                    Jefatura
                  </label>
                  <button onClick={() => removeEmployee(i)} className="text-danger hover:text-red-700 text-lg leading-none">×</button>
                </div>
              ))}
              <button
                onClick={addEmployee}
                className="w-full border-2 border-dashed border-borde rounded-lg py-2 text-sm text-muted hover:border-azul hover:text-azul transition-colors"
              >
                + Agregar empleado
              </button>
            </div>
          )}

          {/* Tasks */}
          {activeSection === 'tasks' && (
            <div className="space-y-2">
              {tasks.map((task, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-azul-50 rounded-lg">
                  <input
                    value={task.name}
                    onChange={e => updateTask(i, 'name', e.target.value)}
                    placeholder="Nombre de la tarea"
                    className="flex-1 border border-borde rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-azul"
                  />
                  <select
                    value={task.group}
                    onChange={e => updateTask(i, 'group', e.target.value)}
                    className="border border-borde rounded px-2 py-1 text-sm focus:outline-none"
                  >
                    {groups.map(g => {
                       const gName = g.name.trim() || 'Nuevo Grupo'
                       return <option key={gName} value={gName}>{gName}</option>
                    })}
                  </select>
                  <button onClick={() => removeTask(i)} className="text-danger hover:text-red-700 text-lg leading-none">×</button>
                </div>
              ))}
              <button
                onClick={addTask}
                className="w-full border-2 border-dashed border-borde rounded-lg py-2 text-sm text-muted hover:border-azul hover:text-azul transition-colors"
              >
                + Agregar tarea
              </button>
            </div>
          )}

          {/* Groups */}
          {activeSection === 'groups' && (
            <div className="space-y-2">
              {groups.map((group, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-azul-50 rounded-lg">
                  <input
                    value={group.name}
                    onChange={e => updateGroup(i, 'name', e.target.value)}
                    placeholder="Nombre del grupo"
                    className="flex-1 border border-borde rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-azul"
                  />
                  <input
                    type="color"
                    value={group.color}
                    onChange={e => updateGroup(i, 'color', e.target.value)}
                    className="w-10 h-8 rounded border border-borde cursor-pointer"
                  />
                  <div
                    className="flex-1 h-8 rounded-lg max-w-[100px]"
                    style={{ backgroundColor: group.color }}
                  />
                  <button onClick={() => removeGroup(i)} className="text-danger hover:text-red-700 text-lg leading-none">×</button>
                </div>
              ))}
              <button
                onClick={addGroup}
                className="w-full border-2 border-dashed border-borde rounded-lg py-2 text-sm text-muted hover:border-azul hover:text-azul transition-colors"
              >
                + Añadir grupo
              </button>
            </div>
          )}

          {/* Compensatorios Iniciales */}
          {activeSection === 'compensatorios' && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                Saldo inicial de compensatorios al inicio del mes base. Si un empleado inicia con días a favor, introduce aquí su balance de partida.
              </p>
              {employees.filter(e => e.name.trim()).length === 0 ? (
                <p className="text-sm text-muted text-center py-4">
                  Agrega empleados primero en la pestaña "Empleados".
                </p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-borde">
                      <th className="text-left text-xs font-semibold text-muted pb-2">Empleado</th>
                      <th className="text-center text-xs font-semibold text-muted pb-2">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.filter(e => e.name.trim()).map((emp, i) => (
                      <tr key={i} className="border-b border-borde/50">
                        <td className="py-2 text-sm text-azul">{emp.name}</td>
                        <td className="py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={initialPending[emp.name] ?? 0}
                            onChange={e => setInitialPending(prev => ({
                              ...prev,
                              [emp.name]: parseInt(e.target.value) || 0
                            }))}
                            className="w-20 border border-borde rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-azul"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Users */}
          {activeSection === 'users' && <UsersTab />}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-borde">
          <button onClick={onClose} className="flex-1 bg-azul-50 text-azul border border-borde rounded-lg py-2 text-sm hover:bg-blue-100">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-azul text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-900 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      </div>
    </div>
  )
}
