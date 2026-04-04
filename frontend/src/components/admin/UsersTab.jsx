import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ email: '', password: '', role: 'basic', department_id: '' })
  const [departments, setDepartments] = useState([])

  useEffect(() => {
    supabase.from('departments').select('id, name').then(({ data }) => {
      if (data) setDepartments(data)
    })
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    setMsg('')
    try {
      const { data, error } = await supabase.functions.invoke('admin-list-users')
      if (error) throw error
      
      const authUsers = data?.users || []
      
      const { data: profiles } = await supabase.from('profiles').select('id, department_id, role')
      
      const merged = authUsers.map(u => {
        const prof = profiles?.find(p => p.id === u.id)
        return {
          ...u,
          department_id: prof?.department_id || u.user_metadata?.department_id || u.app_metadata?.department_id || null,
          display_role: prof?.role || u.app_metadata?.role || u.user_metadata?.role || u.role || 'basic'
        }
      })
      
      setUsers(merged)
    } catch (err) {
      setMsg(`Error listando usuarios: ${err.message}`)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setLoading(true)
    setMsg('')
    try {
      const payload = {
        email: form.email,
        password: form.password,
        role: form.role,
        department_id: form.department_id || null
      }
      const { data, error } = await supabase.functions.invoke('admin-create-user', { body: payload })
      if (error) throw error
      setMsg('Usuario creado exitosamente.')
      setForm({ email: '', password: '', role: 'basic', department_id: '' })
      loadUsers()
    } catch (err) {
      setMsg(`Error creando: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    setLoading(true)
    try {
      const { error } = await supabase.functions.invoke('admin-delete-user', { body: { id } })
      if (error) throw error
      setMsg('Usuario eliminado.')
      loadUsers()
    } catch (err) {
      setMsg(`Error eliminando: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (id, field, value) => {
    setLoading(true)
    setMsg('')
    try {
      const { error: edgeError } = await supabase.functions.invoke('admin-update-user', { 
        body: { id, [field]: value } 
      })
      
      if (edgeError) {
         console.warn("Edge function falló, intentando actualizar tabla profiles directo", edgeError);
         const { error: profError } = await supabase.from('profiles').update({ [field]: value }).eq('id', id)
         if (profError) throw profError
      }
      
      setMsg('Usuario actualizado.')
      loadUsers()
    } catch (err) {
      setMsg(`Error actualizando: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-6">
      {/* Formulario */}
      <div className="w-1/3">
        <h3 className="font-semibold text-azul mb-3">Crear usuario</h3>
        <p className="text-xs text-muted mb-4">Requiere Edge Functions: admin-create-user, etc.</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Email</label>
            <input
              className="w-full border border-borde rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-azul"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Contraseña</label>
            <input
              type="password"
              className="w-full border border-borde rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-azul"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Rol</label>
            <select
              className="w-full border border-borde rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-azul"
              value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
            >
              <option value="basic">Basic (Jefe de sección)</option>
              <option value="gerente">Gerente</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Departamento</label>
            <select
              className="w-full border border-borde rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-azul"
              value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}
            >
              <option value="">(sin departamento)</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <button
            onClick={handleCreate} disabled={loading}
            className="mt-2 bg-azul text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-900 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Crear'}
          </button>
          {msg && <p className="text-xs text-danger mt-2">{msg}</p>}
        </div>
      </div>

      {/* Tabla Usuarios */}
      <div className="w-2/3 border-l border-borde pl-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-azul">Usuarios</h3>
          <button onClick={loadUsers} disabled={loading} className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600">
            Actualizar
          </button>
        </div>

        <div className="overflow-x-hidden border border-borde rounded-lg">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="bg-azul-50 text-xs text-muted border-b border-borde">
              <tr>
                <th className="w-[35%] px-3 py-2 font-semibold">Email</th>
                <th className="w-[25%] px-3 py-2 font-semibold">Dpto</th>
                <th className="w-[25%] px-3 py-2 font-semibold">Rol</th>
                <th className="w-[15%] px-3 py-2 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted px-3 py-4 text-xs">
                    Pulsa "Actualizar".
                  </td>
                </tr>
              ) : (
                users.map(u => {
                  return (
                    <tr key={u.id} className="border-b border-borde/50 hover:bg-blue-50/20">
                      <td className="px-3 py-2 text-azul truncate" title={u.email}>
                        {u.email}
                      </td>
                      <td className="px-3 py-2">
                        <select
                           value={u.department_id || ''}
                           onChange={e => handleUpdate(u.id, 'department_id', e.target.value || null)}
                           className="w-full bg-transparent border border-borde rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-azul text-muted"
                        >
                           <option value="">(sin dpto)</option>
                           {departments.map(d => <option key={d.id} value={d.id} className="text-black">{d.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                           value={(u.display_role || 'basic').toLowerCase()}
                           onChange={e => handleUpdate(u.id, 'role', e.target.value)}
                           className="w-full bg-transparent border border-borde rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-azul text-muted"
                        >
                          <option value="basic" className="text-black">Basic</option>
                          <option value="gerente" className="text-black">Gerente</option>
                          <option value="admin" className="text-black">Administrador</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => handleDelete(u.id)} className="text-danger text-xs hover:underline">
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
