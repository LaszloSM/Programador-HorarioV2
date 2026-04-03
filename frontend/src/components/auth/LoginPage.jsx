import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-azul-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        {/* Logo area */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-azul rounded-xl flex items-center justify-center mb-3">
            <span className="text-white text-2xl font-bold">M</span>
          </div>
          <h1 className="text-azul text-xl font-semibold">Planificador de Horarios</h1>
          <p className="text-muted text-sm mt-1">Metro Riohacha — Polivalencia</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-azul mb-1">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-borde rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul"
              placeholder="usuario@metro.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-azul mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-borde rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-danger text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-azul text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-900 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}
