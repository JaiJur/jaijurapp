import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)
const USER_KEY  = 'jaijur_user'
const TOKEN_KEY = 'jaijur_remember'

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY)
    if (stored) {
      try {
        setUser(JSON.parse(stored))
        setLoading(false)
        return
      } catch {}
    }

    // Sin sesión guardada: intentar auto-login con remember token
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => {
          setUser(data.user)
          localStorage.setItem(USER_KEY, JSON.stringify(data.user))
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (username, password) => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión')
    setUser(data.user)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    if (data.rememberToken) {
      localStorage.setItem(TOKEN_KEY, data.rememberToken)
    }
    return data.user
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(TOKEN_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
