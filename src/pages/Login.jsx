import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const u = await login(username, password)
      if (u.role === 'dndPlayer') {
        navigate('/dnd')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-root">
      <div className="login-bg">
        <div className="login-grid" />
        <div className="login-orb" />
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <span className="logo-bracket">[</span>
            <span className="logo-text">J</span>
            <span className="logo-bracket">]</span>
          </div>
          <h1 className="login-title">jaijur.com</h1>
          <p className="login-subtitle">Acceso privado</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label" htmlFor="username">Usuario</label>
            <input
              id="username"
              className="field-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="tu usuario"
              autoComplete="username"
              required
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="password">Contraseña</label>
            <input
              id="password"
              className="field-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button className={`login-btn${loading ? ' loading' : ''}`} type="submit" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
