import { useScheduleStore } from '../../store/scheduleStore'
import { useComputePoliv } from '../../hooks/useComputePoliv'

export default function EmployeeManager({ onClose }) {
  const config = useScheduleStore(s => s.config)
  const { computeMonthlyPoliv } = useComputePoliv()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-borde">
          <h2 className="text-azul font-semibold text-lg">Empleados</h2>
          <button onClick={onClose} className="text-muted hover:text-azul text-xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {config.employees.map(emp => {
            const poliv = computeMonthlyPoliv(emp.name, year, month)
            return (
              <div key={emp.name} className="p-3 bg-azul-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-azul">{emp.name}</div>
                    <div className="text-xs text-muted">{emp.maxHours}h/sem{emp.jefatura ? ' · Jefatura' : ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted">Poliv. mensual</div>
                    <div className="text-sm font-bold text-azul">{poliv}%</div>
                  </div>
                </div>
              </div>
            )
          })}
          {config.employees.length === 0 && (
            <p className="text-muted text-sm text-center py-8">No hay empleados configurados.</p>
          )}
        </div>
      </div>
    </div>
  )
}
