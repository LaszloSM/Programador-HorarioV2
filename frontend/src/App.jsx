import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import LoginPage from './components/auth/LoginPage'
import AppShell from './components/layout/AppShell'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-azul-50">
        <div className="text-muted text-sm">Cargando...</div>
      </div>
    )
  }

  if (!session) return <LoginPage />
  return <AppShell session={session} />
}
