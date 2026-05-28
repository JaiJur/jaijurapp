import React, { useState } from 'react'
import { useAuth } from '../../../context/AuthContext'

export default function DnDAuthGate() {
  const { login } = useAuth()
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try { await login(username, password) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }
  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    if (password !== confirmPw) { setError('Las contraseñas no coinciden'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/dnd/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      localStorage.setItem('jaijur_user', JSON.stringify(data.user))
      if (data.rememberToken) localStorage.setItem('jaijur_remember', data.rememberToken)
      window.location.reload()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="dnd-root">
      <div className="dnd-bg" />
      <main className="dnd-auth-gate">
        <div className="dnd-auth-card">
          <h1 className="dnd-auth-title">⚔️ D&D</h1>
          <div className="dnd-auth-tabs">
            <button className={`dnd-auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError('') }}>Entrar</button>
            <button className={`dnd-auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setError('') }}>Crear cuenta</button>
          </div>
          {mode === 'login' ? (
            <div className="dnd-auth-form" onKeyDown={e => e.key === 'Enter' && handleLogin(e)}>
              <input className="dnd-input" placeholder="Usuario" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
              <input className="dnd-input" type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />
              {error && <div className="dnd-auth-error">{error}</div>}
              <button className="dnd-btn-primary dnd-auth-submit" onClick={handleLogin} disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          ) : (
            <div className="dnd-auth-form" onKeyDown={e => e.key === 'Enter' && handleRegister(e)}>
              <input className="dnd-input" placeholder="Nombre de usuario (mín. 3)" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
              <input className="dnd-input" type="password" placeholder="Contraseña (mín. 4)" value={password} onChange={e => setPassword(e.target.value)} />
              <input className="dnd-input" type="password" placeholder="Confirmar contraseña" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
              {error && <div className="dnd-auth-error">{error}</div>}
              <button className="dnd-btn-primary dnd-auth-submit" onClick={handleRegister} disabled={loading}>
                {loading ? 'Creando...' : 'Crear personaje'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
