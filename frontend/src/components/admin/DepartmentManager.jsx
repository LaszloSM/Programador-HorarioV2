import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function DepartmentManager({ onClose }) {
  const [departments, setDepartments] = useState([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('departments').select('*').order('name').then(({ data }) => {
      setDepartments(data ?? [])
      setLoading(false)
    })
  }, [])

  const addDept = async () => {
    if (!newName.trim()) return
    setSaving(true)
    const { data } = await supabase.from('departments').insert({ name: newName.trim() }).select().single()
    if (data) setDepartments(prev => [...prev, data])
    setNewName('')
    setSaving(false)
  }

  const deleteDept = async (id) => {
    if (!confirm('¿Eliminar este departamento? Se borrarán todos sus datos.')) return
    await supabase.from('departments').delete().eq('id', id)
    setDepartments(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-borde">
          <h2 className="text-azul font-semibold text-lg">Departamentos</h2>
          <button onClick={onClose} className="text-muted hover:text-azul text-xl">×</button>
        </div>

        <div className="px-6 py-4 space-y-2">
          {loading ? (
            <p className="text-muted text-sm text-center py-4">Cargando...</p>
          ) : (
            departments.map(d => (
              <div key={d.id} className="flex items-center justify-between p-2 bg-azul-50 rounded-lg">
                <span className="text-sm text-azul font-medium">{d.name}</span>
                <button
                  onClick={() => deleteDept(d.id)}
                  className="text-danger text-xs hover:underline"
                >
                  Eliminar
                </button>
              </div>
            ))
          )}

          <div className="flex gap-2 mt-4">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nombre del departamento"
              className="flex-1 border border-borde rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul"
              onKeyDown={e => e.key === 'Enter' && addDept()}
            />
            <button
              onClick={addDept}
              disabled={saving || !newName.trim()}
              className="bg-azul text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-900 disabled:opacity-50"
            >
              Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
