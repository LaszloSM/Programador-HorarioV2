import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useScheduleStore } from '../../store/scheduleStore'
import { useScheduleSync } from '../../hooks/useScheduleSync'
import Navbar from './Navbar'
import MobileBottomNav from './MobileBottomNav'
import ScheduleTable from '../schedule/ScheduleTable'
import MobileScheduleView from '../schedule/MobileScheduleView'
import CoverageChart from '../schedule/CoverageChart'
import DailyCoverageGantt from '../schedule/DailyCoverageGantt'
import MonthlySummary from '../summary/MonthlySummary'
import CompensatoriosPanel from '../summary/CompensatoriosPanel'
import ConfigModal from '../admin/ConfigModal'
import DepartmentManager from '../admin/DepartmentManager'

const TABS = ['Horarios', 'Cobertura Día', 'Cobertura Hora', 'Resumen Mensual', 'Compensatorios']

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
  const saveError = useScheduleStore(s => s.saveError)
  const clearSaveError = useScheduleStore(s => s.clearSaveError)

  const isMobile = useIsMobile()

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

  // Load user profile and departments — only re-run when the actual user changes,
  // NOT on token refreshes (which also fire onAuthStateChange but don't change user.id)
  useEffect(() => {
    if (!session?.user?.id) return
    const init = async () => {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('department_id, role')
        .eq('id', session.user.id)
        .single()

      const admin = profile?.role === 'admin' ||
        session.user.app_metadata?.role === 'admin'
      const gerente = profile?.role === 'gerente'
      setIsAdmin(admin)
      setIsGerente(gerente)

      // Load departments list
      const { data: depts } = await supabase
        .from('departments')
        .select('id, name')
        .order('name')
      setDepartments(depts ?? [])

      // Load user's department, or 'Todos' if admin/gerente
      const deptId = (admin || gerente) ? null : (profile?.department_id ?? depts?.[0]?.id)
      setUserDeptId(deptId)
      loadDepartment(deptId)
    }
    init()
  }, [session?.user?.id])

  const handleDeptChange = (deptId) => {
    loadDepartment(deptId)
  }

  const handleLogout = () => supabase.auth.signOut()

  return (
    <div className={`app-shell ${isMobile ? 'app-shell--mobile' : ''}`}>
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

      <main className="app-shell__main">
        {activeTab === 'Horarios' && (
          isMobile ? <MobileScheduleView /> : <ScheduleTable />
        )}
        {activeTab === 'Cobertura Día' && <DailyCoverageGantt />}
        {activeTab === 'Cobertura Hora' && <CoverageChart />}
        {activeTab === 'Resumen Mensual' && <MonthlySummary />}
        {activeTab === 'Compensatorios' && <CompensatoriosPanel />}
      </main>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <MobileBottomNav
          activeTab={activeTab}
          tabs={TABS}
          onTabChange={setActiveTab}
        />
      )}

      {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}
      {showDepts && <DepartmentManager onClose={() => setShowDepts(false)} />}
    </div>
  )
}
