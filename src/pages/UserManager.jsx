import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  { id: 'master', label: '👑 Master', desc: 'Acceso total' },
  { id: 'premium', label: '⭐ Premium', desc: 'Todas las apps' },
  { id: 'dnd', label: '🎲 D&D', desc: 'Jugador D&D + apps asignadas' },
  { id: 'dndPlayer', label: '⚔️ DnD Player', desc: 'Solo D&D' },
  { id: 'user', label: '👤 User', desc: 'Apps asignadas' },
]

const APPS = [
  { id: 'dnd', label: '🎲 D&D' },
  { id: 'planner', label: '🍽 Meal Planner' },
  { id: 'stardewpedia', label: '🌾 StardewPedia' },
  { id: 'ginbro', label: '💪 GinBro' },
  { id: 'hogar', label: '🏠 HogarQuest' },
]

export default function UserManager() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [editingUser, setEditingUser] = useState(null)
  const [createModal, setCreateModal] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const headers = { 'Content-Type': 'application/json', 'x-user-id': user?.id }

  useEffect(() => { fetchUsers() }, [])

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2000) }

  async function fetchUsers() {
    try {
      const r = await fetch('/api/admin/users', { headers })
      if (r.ok) setUsers(await r.json())
    } catch {}
  }

  async function createUser(data) {
    setError('')
    try {
      const r = await fetch('/api/admin/users', { method: 'POST', headers, body: JSON.stringify(data) })
      const res = await r.json()
      if (!r.ok) { setError(res.error); return }
      fetchUsers()
      setCreateModal(false)
      showToast('✅ Usuario creado')
    } catch (e) { setError(e.message) }
  }

  async function updateUser(id, data) {
    setError('')
    try {
      const r = await fetch(`/api/admin/users/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) })
      const res = await r.json()
      if (!r.ok) { setError(res.error); return }
      fetchUsers()
      setEditingUser(null)
      showToast('✅ Usuario actualizado')
    } catch (e) { setError(e.message) }
  }

  async function deleteUser(id, username) {
    if (!confirm(`¿Eliminar usuario "${username}"? Esta acción no se puede deshacer.`)) return
    try {
      const r = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers })
      if (!r.ok) { const d = await r.json(); alert(d.error); return }
      fetchUsers()
      showToast('🗑 Usuario eliminado')
    } catch {}
  }

  return (
    <div className="um-section">
      <div className="um-header" onClick={() => {}}>
        <span className="um-title">👥 Usuarios</span>
        <button className="um-btn-create" onClick={() => { setCreateModal(true); setError('') }}>+ Nuevo</button>
      </div>

      <div className="um-list">
        {users.map(u => (
          <div key={u.id} className={`um-card ${u.id === user?.id ? 'um-card-self' : ''}`}>
            <div className="um-card-main">
              <span className="um-card-name">{u.username}</span>
              <span className="um-card-role">{ROLES.find(r => r.id === u.role)?.label || u.role}</span>
              {(u.apps || []).length > 0 && (
                <span className="um-card-apps">{u.apps.map(a => APPS.find(x => x.id === a)?.label || a).join(', ')}</span>
              )}
            </div>
            <div className="um-card-actions">
              <button className="um-btn-edit" onClick={() => { setEditingUser({ ...u, newPassword: '' }); setError('') }}>✏️</button>
              {u.id !== user?.id && <button className="um-btn-delete" onClick={() => deleteUser(u.id, u.username)}>✕</button>}
            </div>
          </div>
        ))}
      </div>

      {(createModal || editingUser) && (
        <UserFormModal
          user={editingUser}
          allUsers={users}
          error={error}
          onSave={(data) => editingUser ? updateUser(editingUser.id, data) : createUser(data)}
          onClose={() => { setCreateModal(false); setEditingUser(null); setError('') }}
        />
      )}

      {toast && <div className="um-toast">{toast}</div>}
    </div>
  )
}

function UserFormModal({ user: editUser, allUsers, error, onSave, onClose }) {
  const isEdit = !!editUser
  const [username, setUsername] = useState(editUser?.username || '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(editUser?.role || 'user')
  const [apps, setApps] = useState(editUser?.apps || [])
  const [sharedMealWith, setSharedMealWith] = useState(editUser?.sharedMealWith ?? '')
  const showApps = role === 'dnd' || role === 'user'

  function toggleApp(id) {
    setApps(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

  function handleSave() {
    const data = { username, role, apps: showApps ? apps : [] }
    if (!isEdit) data.password = password
    else if (password) data.password = password
    if (sharedMealWith !== '' && sharedMealWith !== null) data.sharedMealWith = parseInt(sharedMealWith)
    else data.sharedMealWith = null
    onSave(data)
  }

  return (
    <div className="um-overlay" onClick={onClose}>
      <div className="um-modal" onClick={e => e.stopPropagation()}>
        <h3 className="um-modal-title">{isEdit ? `Editar: ${editUser.username}` : 'Nuevo usuario'}</h3>

        <label className="um-label">Usuario</label>
        <input className="um-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="nombre..." autoFocus />

        <label className="um-label">{isEdit ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}</label>
        <input className="um-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isEdit ? '••••' : 'contraseña...'} />

        <label className="um-label">Rol</label>
        <div className="um-roles">
          {ROLES.map(r => (
            <button key={r.id} className={`um-role-btn ${role === r.id ? 'active' : ''}`}
              onClick={() => setRole(r.id)}>
              <span className="um-role-label">{r.label}</span>
              <span className="um-role-desc">{r.desc}</span>
            </button>
          ))}
        </div>

        {showApps && <>
          <label className="um-label">Apps asignadas</label>
          <div className="um-apps">
            {APPS.map(a => (
              <button key={a.id} className={`um-app-btn ${apps.includes(a.id) ? 'active' : ''}`}
                onClick={() => toggleApp(a.id)}>{a.label}</button>
            ))}
          </div>
        </>}

        {(apps.includes('planner') || role === 'premium' || role === 'master') && (
          <>
            <label className="um-label">Compartir Meal Planner con</label>
            <select className="um-input" value={sharedMealWith} onChange={e => setSharedMealWith(e.target.value)}>
              <option value="">— No compartir —</option>
              {allUsers.filter(u => u.id !== editUser?.id).map(u => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </>
        )}

        {error && <div className="um-error">{error}</div>}

        <div className="um-modal-btns">
          <button className="um-btn-save" onClick={handleSave}>{isEdit ? 'Guardar' : 'Crear'}</button>
          <button className="um-btn-cancel" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
