import { useAuth } from '../context/AuthContext'
import { Navigate, useLocation } from 'react-router-dom'

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  // dndPlayer: solo /dnd*
  if (user.role === 'dndPlayer' && !location.pathname.startsWith('/dnd')) {
    return <Navigate to="/dnd" replace />
  }

  // dnd: acceso a /dnd* y a sus apps asignadas
  if (user.role === 'dnd') {
    const appRoutes = { dnd: '/dnd', planner: '/meal-planner', stardewpedia: '/stardew' }
    const allowedPaths = (user.apps || []).map(a => appRoutes[a]).filter(Boolean)
    allowedPaths.push('/') // siempre puede ver Home
    const allowed = allowedPaths.some(p => location.pathname.startsWith(p))
    if (!allowed) return <Navigate to="/dnd" replace />
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  return children
}
