import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import './AppHeader.css'

export default function AppHeader({ appName }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <header className="app-header">
      <button className="app-header-logo" onClick={() => navigate('/')}>
        <span className="logo-bracket">[</span>
        <span className="logo-text">J</span>
        <span className="logo-bracket">]</span>
        {appName && <span className="logo-appname">{appName}</span>}
      </button>

      <div className="app-header-right" ref={menuRef}>
        <button
          className={`hamburger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Menú"
        >
          <span /><span /><span />
        </button>

        {menuOpen && (
          <div className="dropdown-menu">
            <div className="dropdown-user">
              <span className="dropdown-username">{user?.username}</span>
              <span className="dropdown-role">{user?.role}</span>
            </div>
            <div className="dropdown-divider" />
            <button className="dropdown-item" onClick={() => { setMenuOpen(false); navigate('/') }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Inicio
            </button>
            <div className="dropdown-divider" />
            <button className="dropdown-item danger" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
