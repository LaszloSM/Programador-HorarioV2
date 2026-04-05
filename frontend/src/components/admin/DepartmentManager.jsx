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
    <div className="fixed inset-0 bg-nm-surface/90 backdrop-blur-md flex items-center justify-center z-[110] p-4" onClick={onClose}>
      <div
        className="bg-white rounded-[2.5rem] shadow-premium w-full max-w-md mx-auto overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-8 py-6 border-b border-borde/50 bg-nm-surface-low">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-nm-primary/10 flex items-center justify-center text-xl">🏢</div>
             <h2 className="text-nm-on-surface font-black text-xl tracking-tight">Estructura</h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-nm-surface-high transition-colors text-2xl text-nm-on-surface-variant">×</button>
        </div>

        <div className="px-8 py-6 space-y-4">
          <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 scrollbar-hide">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3 opacity-50">
                <div className="w-8 h-8 border-4 border-nm-primary/30 border-t-nm-primary rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-nm-on-surface-variant">Sincronizando...</p>
              </div>
            ) : departments.length === 0 ? (
              <div className="text-center py-10 bg-nm-surface-low rounded-3xl border border-dashed border-nm-outline-variant/30">
                 <p className="text-xs font-bold text-nm-on-surface-variant uppercase tracking-widest">Sin departamentos</p>
              </div>
            ) : (
              departments.map(d => (
                <div key={d.id} className="group flex items-center justify-between p-4 bg-nm-surface-low hover:bg-nm-surface-high rounded-2xl border border-borde/30 transition-all active:scale-[0.98]">
                  <span className="text-sm text-nm-on-surface font-black tracking-tight">{d.name}</span>
                  <button
                    onClick={() => deleteDept(d.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-borde/50 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-nm-on-surface-variant px-1">Nuevo Departamento</p>
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nombre de la sede/área"
                className="flex-1 bg-nm-surface-low border border-borde rounded-2xl px-5 py-3.5 text-sm font-bold text-nm-on-surface focus:outline-none focus:ring-2 focus:ring-nm-primary/20 transition-all placeholder:opacity-50"
                onKeyDown={e => e.key === 'Enter' && addDept()}
              />
              <button
                onClick={addDept}
                disabled={saving || !newName.trim()}
                className="w-14 h-14 bg-nm-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-nm-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
