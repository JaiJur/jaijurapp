import { useAuth } from '../context/AuthContext'
import { Navigate, useLocation } from 'react-router-dom'

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  // dndPlayer solo puede acceder a /dnd*
  if (user.role === 'dndPlayer' && !location.pathname.startsWith('/dnd')) {
    return <Navigate to="/dnd" replace />
  }
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  return children
}
