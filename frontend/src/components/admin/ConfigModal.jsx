import { useState, useEffect } from 'react'
import { useScheduleStore } from '../../store/scheduleStore'
import UsersTab from './UsersTab'

const CONTRACT_OPTIONS = [36, 42, 44]

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

export default function ConfigModal({ onClose }) {
  const config = useScheduleStore(s => s.config)
  const applyConfig = useScheduleStore(s => s.applyConfig)
  const isMobile = useIsMobile()

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

  const addTask = () => setTasks(prev => [...prev, { name: '', group: groups[0]?.name || 'CAJAS' }])
  const removeTask = (i) => setTasks(prev => prev.filter((_, idx) => idx !== i))
  const updateTask = (i, field, val) => setTasks(prev =>
    prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t)
  )

  const addGroup = () => setGroups(prev => [...prev, { name: '', originalName: null, color: '#0ea5e9' }])
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
    { id: 'employees', label: 'Personal', icon: '👤' },
    { id: 'compensatorios', label: 'Saldos', icon: '⚖️' },
    { id: 'tasks', label: 'Tareas', icon: '📋' },
    { id: 'groups', label: 'Grupos', icon: '🎨' },
    { id: 'users', label: 'Usuarios', icon: '🔑' },
  ]

  return (
    <div className="fixed inset-0 bg-nm-surface/90 backdrop-blur-lg flex items-center justify-center z-[100] p-0 md:p-4 overflow-hidden" onClick={onClose}>
      <div
        className={`bg-white md:rounded-3xl shadow-premium w-full max-w-5xl mx-auto h-full md:h-[90vh] flex flex-col transition-all transform ${isMobile ? 'rounded-none' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-borde/60 bg-azul">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                 <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0 0 4.93 19.07M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
               </svg>
             </div>
             <h2 className="text-white font-black text-base tracking-tight">Panel de Control</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/15 transition-colors text-2xl text-white/80 hover:text-white">×</button>
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-borde/50 px-4 bg-white sticky top-0 z-10 overflow-x-auto scrollbar-hide">
          <div className="flex min-w-max">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`py-3.5 px-5 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                   activeSection === s.id
                   ? 'border-azul text-azul bg-azul-50/50'
                   : 'border-transparent text-muted hover:text-azul/70 hover:border-borde'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-azul-50/40">
          {/* Employees */}
          {activeSection === 'employees' && (
            <div className="space-y-3">
              {employees.map((emp, i) => (
                <div key={i} className="flex gap-3 p-4 bg-white rounded-2xl shadow-sm border border-borde/50 items-center animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex-1 space-y-3">
                     <div className="flex gap-2">
                        <input
                          value={emp.name}
                          onChange={e => updateEmployee(i, 'name', e.target.value)}
                          placeholder="Nombre del empleado"
                          className="flex-1 bg-white border border-borde rounded-xl px-4 py-2.5 text-sm font-bold text-azul focus:outline-none focus:ring-2 focus:ring-azul/20"
                        />
                        <select
                          value={emp.maxHours}
                          onChange={e => updateEmployee(i, 'maxHours', Number(e.target.value))}
                          className="bg-white border border-borde rounded-xl px-3 py-2.5 text-sm font-black text-azul focus:outline-none"
                        >
                          {CONTRACT_OPTIONS.map(h => <option key={h} value={h}>{h}h</option>)}
                        </select>
                     </div>
                     <label className="flex items-center gap-3 px-1 cursor-pointer group/chk">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${emp.jefatura ? 'bg-nm-primary border-nm-primary' : 'border-nm-outline-variant/50'}`}>
                           {emp.jefatura && <span className="text-white text-[10px]">✓</span>}
                        </div>
                        <input
                          type="checkbox"
                          checked={emp.jefatura}
                          onChange={e => updateEmployee(i, 'jefatura', e.target.checked)}
                          className="hidden"
                        />
                        <span className="text-xs font-black text-nm-on-surface-variant uppercase tracking-widest">Rol Jefatura</span>
                      </label>
                  </div>
                  <button onClick={() => removeEmployee(i)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">×</button>
                </div>
              ))}
              <button
                onClick={addEmployee}
                className="w-full border-2 border-dashed border-nm-outline-variant/30 rounded-2xl py-4 text-xs font-black uppercase tracking-widest text-nm-on-surface-variant hover:border-nm-primary hover:text-nm-primary transition-all bg-white/50"
              >
                + Agregar Nuevo Personal
              </button>
            </div>
          )}

          {/* Tasks */}
          {activeSection === 'tasks' && (
            <div className="space-y-3">
              {tasks.map((task, i) => (
                <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-borde/50 animate-in fade-in slide-in-from-bottom-2">
                  <input
                    value={task.name}
                    onChange={e => updateTask(i, 'name', e.target.value)}
                    placeholder="Eje: CAJA 01"
                    className="flex-1 bg-white border border-borde rounded-xl px-4 py-2.5 text-sm font-bold text-azul focus:outline-none"
                  />
                  <select
                    value={task.group}
                    onChange={e => updateTask(i, 'group', e.target.value)}
                    className="bg-white border border-borde rounded-xl px-3 py-2.5 text-xs font-black uppercase text-azul focus:outline-none max-w-[120px]"
                  >
                    {groups.map(g => {
                      const gName = g.name.trim() || 'Nuevo Grupo'
                      return <option key={gName} value={gName}>{gName}</option>
                    })}
                  </select>
                  <button onClick={() => removeTask(i)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 text-xl">×</button>
                </div>
              ))}
              <button onClick={addTask} className="w-full border-2 border-dashed border-nm-outline-variant/30 rounded-2xl py-4 text-xs font-black uppercase tracking-widest text-nm-on-surface-variant bg-white/50">+ Crear Tarea</button>
            </div>
          )}

          {/* Groups */}
          {activeSection === 'groups' && (
            <div className="space-y-3">
              {groups.map((group, j) => (
                <div key={j} className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-borde/50">
                  <input
                    value={group.name}
                    onChange={e => updateGroup(j, 'name', e.target.value)}
                    className="flex-1 bg-white border border-borde rounded-xl px-4 py-2.5 text-sm font-bold text-azul"
                  />
                  <div className="relative w-12 h-10 group/picker overflow-hidden rounded-xl border border-borde">
                    <input
                      type="color"
                      value={group.color}
                      onChange={e => updateGroup(j, 'color', e.target.value)}
                      className="absolute inset-[-10px] w-[200%] h-[200%] cursor-pointer"
                    />
                  </div>
                  <button onClick={() => removeGroup(j)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500">×</button>
                </div>
              ))}
              <button onClick={addGroup} className="w-full border-2 border-dashed border-nm-outline-variant/30 rounded-2xl py-4 text-xs font-black uppercase tracking-widest text-nm-on-surface-variant bg-white/50">+ Nuevo Grupo</button>
            </div>
          )}

          {/* Initial Balances */}
          {activeSection === 'compensatorios' && (
            <div className="space-y-4">
              <div className="bg-nm-primary/5 rounded-2xl p-4 border border-nm-primary/10">
                 <p className="text-xs text-nm-on-surface-variant font-bold leading-relaxed">
                   Introduce el balance inicial de cada empleado. Estos días se sumarán al cálculo automático del mes base.
                 </p>
              </div>
              
              <div className="bg-white rounded-2xl shadow-sm border border-borde/50 overflow-hidden">
                <table className="w-full border-collapse">
                  <thead className="bg-nm-surface-container">
                    <tr>
                      <th className="text-left text-[10px] font-black px-6 py-4 text-nm-on-surface-variant uppercase tracking-widest">Empleado</th>
                      <th className="text-center text-[10px] font-black px-6 py-4 text-nm-on-surface-variant uppercase tracking-widest">Saldo Inicial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nm-outline-variant/10">
                    {employees.filter(e => e.name.trim()).map((emp, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 text-sm font-bold text-nm-on-surface">{emp.name}</td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="number"
                            value={initialPending[emp.name] ?? 0}
                            onChange={e => setInitialPending(prev => ({
                              ...prev,
                              [emp.name]: parseInt(e.target.value) || 0
                            }))}
                            className="w-24 bg-white border border-borde rounded-xl px-3 py-2 text-sm font-black text-center text-azul focus:outline-none focus:ring-2 focus:ring-azul/20"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Users */}
          {activeSection === 'users' && <UsersTab />}
        </div>

        {/* Footer */}
        <div className={`flex gap-3 px-6 py-5 border-t border-borde/60 bg-white ${isMobile ? 'pb-10' : ''}`}>
          <button onClick={onClose} className="flex-1 bg-white text-muted font-black rounded-xl py-3 text-xs uppercase tracking-widest border border-borde hover:bg-azul-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-[2] bg-azul text-white rounded-xl py-3 text-sm font-black uppercase tracking-widest shadow-md hover:bg-azul/90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Aplicar Cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
