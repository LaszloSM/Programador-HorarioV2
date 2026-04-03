import { useScheduleStore } from '../../store/scheduleStore'

export default function Navbar({
  session, departments, currentDeptId, onDeptChange, onLogout,
  isDirty, isSaving, saveError, onClearError, isAdmin,
  activeTab, tabs, onTabChange, onOpenConfig, onOpenDepts
}) {
  const undoLastAction = useScheduleStore(s => s.undoLastAction)
  const historyStack = useScheduleStore(s => s.historyStack)

  return (
    <header className="bg-azul text-white shadow-md">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-azul text-sm font-bold">M</span>
          </div>
          <span className="font-semibold text-sm hidden sm:block">Planificador de Horarios</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Department selector */}
          {departments.length > 0 && (
            <select
              value={currentDeptId ?? ''}
              onChange={e => onDeptChange(e.target.value === '' ? null : e.target.value)}
              className="bg-blue-800 text-white text-xs rounded px-2 py-1 border border-blue-600 focus:outline-none"
            >
              {isAdmin && <option value="">Todos los departamentos</option>}
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}

          {/* Save status */}
          {isSaving && (
            <span className="text-xs text-blue-200">Guardando...</span>
          )}
          {saveError && (
            <button
              onClick={onClearError}
              className="text-xs text-red-300 hover:text-red-100"
              title={saveError}
            >
              ⚠ Error al guardar
            </button>
          )}
          {isDirty && !isSaving && !saveError && (
            <span className="text-xs text-blue-300">●</span>
          )}

          {/* Undo */}
          <button
            onClick={undoLastAction}
            disabled={historyStack.length === 0}
            title="Deshacer (Ctrl+Z)"
            className="text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-40 px-2 py-1 rounded"
          >
            ↩ Deshacer
          </button>

          {/* Configuración */}
          <button
            onClick={onOpenConfig}
            title="Configuración"
            className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded"
          >
            ⚙ Config
          </button>

          {/* Departamentos (solo admin) */}
          {isAdmin && (
            <button
              onClick={onOpenDepts}
              title="Gestionar departamentos"
              className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded"
            >
              Depts
            </button>
          )}

          {/* User */}
          <span className="text-xs text-blue-200 hidden sm:block">
            {session.user.email}
          </span>
          <button
            onClick={onLogout}
            className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <nav className="flex px-4 gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`text-sm px-4 py-2 whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-white font-semibold'
                : 'text-blue-200 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>
    </header>
  )
}
