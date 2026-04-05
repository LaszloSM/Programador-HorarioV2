import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useScheduleStore } from '../../store/scheduleStore'
import { useScheduleSync } from '../../hooks/useScheduleSync'
import Navbar from './Navbar'
import ScheduleTable from '../schedule/ScheduleTable'
import CoverageChart from '../schedule/CoverageChart'
import DailyCoverageGantt from '../schedule/DailyCoverageGantt'
import MonthlySummary from '../summary/MonthlySummary'
import CompensatoriosPanel from '../summary/CompensatoriosPanel'
import ConfigModal from '../admin/ConfigModal'
import DepartmentManager from '../admin/DepartmentManager'

const TABS = ['Horarios', 'Cobertura Día', 'Cobertura Hora', 'Resumen Mensual', 'Compensatorios']

export default function AppShell({ session }) {
  const [activeTab, setActiveTab] = useState('Horarios')
  const [departments, setDepartments] = useState([])
  const [userDeptId, setUserDeptId] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isGerente, setIsGerente] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [showDepts, setShowDepts] = useState(false)

  const loadDepartment = useScheduleStore(s => s.loadDepartment)
  const currentDeptId = useScheduleStore(s => s.currentDeptId)
  const isDirty = useScheduleStore(s => s.isDirty)
  const isSaving = useScheduleStore(s => s.isSaving)
  const isLoading = useScheduleStore(s => s.isLoading)
  const saveError = useScheduleStore(s => s.saveError)
  const clearSaveError = useScheduleStore(s => s.clearSaveError)

  // Set up realtime sync
  useScheduleSync()

  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        useScheduleStore.getState().undoLastAction()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Load user profile and departments
  useEffect(() => {
    const init = async () => {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('department_id, role')
        .eq('id', session.user.id)
        .single()

      const role = profile?.role || session.user.app_metadata?.role
      const admin = role === 'admin'
      const gerente = role === 'gerente'
      setIsAdmin(admin)
      setIsGerente(gerente)

      // Load departments list
      const { data: depts } = await supabase
        .from('departments')
        .select('id, name')
        .order('name')
      setDepartments(depts ?? [])

      // Load user's department or 'Todos' if admin or gerente
      const deptId = (admin || gerente) ? null : (profile?.department_id ?? depts?.[0]?.id)
      setUserDeptId(deptId)
      loadDepartment(deptId)
    }
    init()
  }, [session])

  const handleDeptChange = (deptId) => {
    loadDepartment(deptId)
  }

  const handleLogout = () => supabase.auth.signOut()

  return (
    <div className="min-h-screen bg-azul-50 flex flex-col">
      <Navbar
        session={session}
        departments={departments}
        currentDeptId={currentDeptId}
        onDeptChange={handleDeptChange}
        onLogout={handleLogout}
        isDirty={isDirty}
        isSaving={isSaving}
        saveError={saveError}
        onClearError={clearSaveError}
        isAdmin={isAdmin}
        isGerente={isGerente}
        activeTab={activeTab}
        tabs={TABS}
        onTabChange={setActiveTab}
        onOpenConfig={() => setShowConfig(true)}
        onOpenDepts={() => setShowDepts(true)}
      />

      <main className="flex-1 p-4 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 p-4 rounded-xl shadow-lg border border-sky-100 flex items-center gap-3 text-sky-900 font-medium">
              <div className="w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
              Cargando datos...
            </div>
          </div>
        )}
        {activeTab === 'Horarios' && <ScheduleTable />}
        {activeTab === 'Cobertura Día' && <DailyCoverageGantt />}
        {activeTab === 'Cobertura Hora' && <CoverageChart />}
        {activeTab === 'Resumen Mensual' && <MonthlySummary />}
        {activeTab === 'Compensatorios' && <CompensatoriosPanel />}
      </main>

      {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}
      {showDepts && <DepartmentManager onClose={() => setShowDepts(false)} />}
    </div>
  )
}
