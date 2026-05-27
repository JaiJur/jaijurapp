import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Home from './pages/Home'

// Lazy-loaded subapps (code-splitting)
const MealPlanner = lazy(() => import('./pages/MealPlanner/MealPlanner'))
const GinBro = lazy(() => import('./pages/GinBro/GinBro'))
const HogarQuest = lazy(() => import('./pages/HogarQuest/HogarQuest'))
const DnD = lazy(() => import('./pages/DnD/DnD'))
const MapEditor = lazy(() => import('./pages/DnD/MapEditor'))
const MapViewer = lazy(() => import('./pages/DnD/MapViewer'))
const PartyViewer = lazy(() => import('./pages/DnD/PartyViewer'))

const Loading = () => <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#888',fontFamily:'sans-serif'}}>Cargando…</div>

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/meal-planner" element={<ProtectedRoute><MealPlanner /></ProtectedRoute>} />
          <Route path="/ginbro" element={<ProtectedRoute><GinBro /></ProtectedRoute>} />
          <Route path="/hogar" element={<ProtectedRoute><HogarQuest /></ProtectedRoute>} />
          <Route path="/dnd" element={<DnD />} />
          <Route path="/dnd/editor/:mapId" element={<ProtectedRoute roles={['master','dndMaster']}><MapEditor /></ProtectedRoute>} />
          <Route path="/dnd/viewer" element={<MapViewer />} />
          <Route path="/dnd/viewer/:channel" element={<MapViewer />} />
          <Route path="/dnd/party" element={<PartyViewer />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
