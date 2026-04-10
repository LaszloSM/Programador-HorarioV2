import { useState } from 'react'
import { useScheduleStore } from '../../store/scheduleStore'

export default function Navbar({
  session, departments, currentDeptId, onDeptChange, onLogout,
  isDirty, isSaving, saveError, onClearError, isAdmin, isGerente,
  activeTab, tabs, onTabChange, onOpenConfig, onOpenDepts
}) {
  const undoLastAction = useScheduleStore(s => s.undoLastAction)
  const historyStack = useScheduleStore(s => s.historyStack)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="app-header">
      {/* Top bar */}
      <div className="app-header__top">
        {/* Brand */}
        <div className="app-header__brand">
          <img src="/icon-192.png" alt="Metro Riohacha" className="app-header__logo" />
          <span className="app-header__title">Programador Metro</span>
        </div>

        {/* Desktop: All controls inline */}
        <div className="app-header__controls app-header__controls--desktop">
          {/* Department selector */}
          {isAdmin && departments.length > 0 && (
            <select
              value={currentDeptId ?? ''}
              onChange={e => onDeptChange(e.target.value === '' ? null : e.target.value)}
              className="app-header__dept-select"
            >
              <option value="">Todos los departamentos</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
          {!isAdmin && currentDeptId && departments.length > 0 && (
            <span className="app-header__dept-label">
              {departments.find(d => d.id === currentDeptId)?.name ?? ''}
            </span>
          )}

          {/* Save status */}
          <div className="app-header__save-status">
            {isSaving && (
              <span className="app-header__saving">
                <span className="app-header__saving-dot" /> Guardando
              </span>
            )}
            {saveError && (
              <button onClick={onClearError} className="app-header__error-btn" title={saveError}>
                ⚠ Error
              </button>
            )}
            {isDirty && !isSaving && !saveError && (
              <span className="app-header__pending" title="Cambios sin guardar">
                <span className="app-header__pending-dot" /> Pendiente
              </span>
            )}
          </div>

          <div className="app-header__divider" />

          {/* Undo */}
          {!isGerente && (
            <button
              onClick={undoLastAction}
              disabled={historyStack.length === 0}
              title="Deshacer (Ctrl+Z)"
              className="app-header__btn"
            >
              ↩ <span className="app-header__btn-label">Deshacer</span>
            </button>
          )}

          {/* Config — admin only */}
          {isAdmin && (
            <button onClick={onOpenConfig} title="Configuración" className="app-header__btn">
              ⚙ <span className="app-header__btn-label">Config</span>
            </button>
          )}

          {/* Departments — admin only */}
          {isAdmin && (
            <button onClick={onOpenDepts} title="Gestionar departamentos" className="app-header__btn">
              Depts
            </button>
          )}

          <div className="app-header__divider" />

          {/* User */}
          <span className="app-header__user-email">{session.user.email}</span>
          <button onClick={onLogout} className="app-header__logout-btn">Salir</button>
        </div>

        {/* Mobile: compact controls */}
        <div className="app-header__controls app-header__controls--mobile">
          {/* Save status dot */}
          {isSaving && <span className="app-header__saving-dot app-header__saving-dot--pulse" title="Guardando..." />}
          {saveError && (
            <button onClick={onClearError} className="app-header__error-btn--sm" title={saveError}>⚠</button>
          )}
          {isDirty && !isSaving && !saveError && (
            <span className="app-header__pending-dot--sm" title="Cambios sin guardar" />
          )}

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="app-header__hamburger"
            aria-label="Menú"
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="app-header__mobile-menu">
          {/* Department selector for admin only */}
          {isAdmin && departments.length > 0 && (
            <div className="app-header__menu-item">
              <span className="app-header__menu-label">Departamento</span>
              <select
                value={currentDeptId ?? ''}
                onChange={e => { onDeptChange(e.target.value === '' ? null : e.target.value); setMenuOpen(false) }}
                className="app-header__dept-select app-header__dept-select--menu"
              >
                <option value="">Todos</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}
          {!isAdmin && currentDeptId && departments.length > 0 && (
            <div className="app-header__menu-item">
              <span className="app-header__menu-label">Departamento</span>
              <span className="app-header__dept-label">
                {departments.find(d => d.id === currentDeptId)?.name ?? ''}
              </span>
            </div>
          )}

          {/* Undo */}
          {!isGerente && (
            <button
              onClick={() => { undoLastAction(); setMenuOpen(false) }}
              disabled={historyStack.length === 0}
              className="app-header__menu-action"
            >
              ↩ Deshacer <span className="app-header__menu-shortcut">(Ctrl+Z)</span>
            </button>
          )}

          {/* Config */}
          {isAdmin && (
            <button onClick={() => { onOpenConfig(); setMenuOpen(false) }} className="app-header__menu-action">
              ⚙ Configuración
            </button>
          )}

          {/* Departments */}
          {isAdmin && (
            <button onClick={() => { onOpenDepts(); setMenuOpen(false) }} className="app-header__menu-action">
              🏢 Departamentos
            </button>
          )}

          {/* User info & logout */}
          <div className="app-header__menu-footer">
            <span className="app-header__menu-email">{session.user.email}</span>
            <button onClick={onLogout} className="app-header__logout-btn app-header__logout-btn--menu">
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* Desktop tab navigation */}
      <nav className="app-header__tabs app-header__tabs--desktop">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`app-header__tab ${activeTab === tab ? 'app-header__tab--active' : ''}`}
          >
            {tab}
            {activeTab === tab && <span className="app-header__tab-indicator" />}
          </button>
        ))}
      </nav>
    </header>
  )
}
