import { useScheduleStore } from '../../store/scheduleStore'

export default function Navbar({
  session, departments, currentDeptId, onDeptChange, onLogout,
  isDirty, isSaving, saveError, onClearError, isAdmin,
  activeTab, tabs, onTabChange, onOpenConfig, onOpenDepts
}) {
  const undoLastAction = useScheduleStore(s => s.undoLastAction)
  const historyStack = useScheduleStore(s => s.historyStack)

  return (
    <header className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white shadow-premium border-b border-sky-900/50">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-sky-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
            <span className="text-white text-sm font-black font-display tracking-wider">MR</span>
          </div>
          <span className="font-display font-semibold text-base hidden sm:block tracking-wide">
            Planificador de Horarios
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Department selector — admin only */}
          {isAdmin && departments.length > 0 && (
            <select
              value={currentDeptId ?? ''}
              onChange={e => onDeptChange(e.target.value === '' ? null : e.target.value)}
              className="bg-white/10 backdrop-blur-md text-white border border-white/20 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all cursor-pointer"
            >
              <option value="" className="text-slate-900">Todos los departamentos</option>
              {departments.map(d => (
                <option key={d.id} value={d.id} className="text-slate-900">{d.name}</option>
              ))}
            </select>
          )}
          {/* Show department name for non-admin */}
          {!isAdmin && currentDeptId && departments.length > 0 && (
            <span className="bg-white/10 text-white border border-white/20 text-xs rounded-lg px-3 py-1.5">
              {departments.find(d => d.id === currentDeptId)?.name ?? ''}
            </span>
          )}

          {/* Save status */}
          <div className="flex items-center min-w-[80px] justify-end">
            {isSaving && (
              <span className="text-xs font-medium text-sky-300 animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-sky-300 rounded-full animate-ping"></span> Guardando
              </span>
            )}
            {saveError && (
              <button
                onClick={onClearError}
                className="text-xs bg-red-500/20 text-red-200 border border-red-500/50 px-2 py-1 rounded-md hover:bg-red-500/40 transition-colors"
                title={saveError}
              >
                ⚠ Error
              </button>
            )}
            {isDirty && !isSaving && !saveError && (
              <span className="text-xs text-sky-300 flex items-center gap-1" title="Cambios sin guardar">
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full"></span> Pendiente
              </span>
            )}
          </div>

          <div className="h-5 w-px bg-white/20 mx-1 hidden sm:block"></div>

          {/* Undo */}
          <button
            onClick={undoLastAction}
            disabled={historyStack.length === 0}
            title="Deshacer (Ctrl+Z)"
            className="text-xs bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-sm transition-all disabled:opacity-30 disabled:hover:bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-1"
          >
            ↩ <span className="hidden sm:inline">Deshacer</span>
          </button>

          {/* Configuración — admin only */}
          {isAdmin && (
            <button
              onClick={onOpenConfig}
              title="Configuración"
              className="text-xs bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-sm transition-all px-3 py-1.5 rounded-lg flex items-center gap-1"
            >
              ⚙ <span className="hidden sm:inline">Config</span>
            </button>
          )}

          {/* Departamentos (solo admin) */}
          {isAdmin && (
            <button
              onClick={onOpenDepts}
              title="Gestionar departamentos"
              className="text-xs bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-sm transition-all px-3 py-1.5 rounded-lg"
            >
              Depts
            </button>
          )}

          <div className="h-5 w-px bg-white/20 mx-1 hidden sm:block"></div>

          {/* User */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-sky-200 hidden sm:block">
              {session.user.email}
            </span>
            <button
              onClick={onLogout}
              className="text-xs bg-sky-600 hover:bg-sky-500 border border-sky-500/50 shadow-md shadow-sky-900/20 text-white transition-all px-3 py-1.5 rounded-lg font-medium"
            >
              Salir
            </button>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <nav className="flex px-6 overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`text-sm px-5 py-3 whitespace-nowrap transition-all duration-300 relative font-medium ${
              activeTab === tab
                ? 'text-white'
                : 'text-sky-200/70 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-sky-400 rounded-t-full shadow-[0_-2px_10px_rgba(56,189,248,0.8)]"></span>
            )}
          </button>
        ))}
      </nav>
    </header>
  )
}
