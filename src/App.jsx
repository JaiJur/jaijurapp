import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Home from './pages/Home'

// Lazy-loaded subapps (code-splitting)
const MealPlanner = lazy(() => import('./pages/MealPlanner/MealPlanner'))

const DnD = lazy(() => import('./pages/DnD/DnD'))
const DocsPage = lazy(() => import('./pages/DnD/DocsPage'))
const MapEditor = lazy(() => import('./pages/DnD/MapEditor'))
const MapViewer = lazy(() => import('./pages/DnD/MapViewer'))
const MapViewerMulti = lazy(() => import('./pages/DnD/MapViewerMulti'))
const PartyViewer = lazy(() => import('./pages/DnD/PartyViewer'))
const Salud = lazy(() => import('./pages/Salud/Salud'))
const Notes = lazy(() => import('./pages/Notes/Notes'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const Juegos = lazy(() => import('./pages/Juegos/Juegos'))
const StarControl = lazy(() => import('./pages/Juegos/StarControl/StarControl'))
const Minis = lazy(() => import('./pages/Minis/Minis'))
const MiniDetail = lazy(() => import('./pages/Minis/MiniDetail'))
const MinisAdmin = lazy(() => import('./pages/Minis/MinisAdmin'))
const MinisLegal = lazy(() => import('./pages/Minis/MinisLegal'))
const MinisServicios = lazy(() => import('./pages/Minis/MinisServicios'))

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

          <Route path="/salud" element={<ProtectedRoute><Salud /></ProtectedRoute>} />
          <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute roles={['master']}><UsersPage /></ProtectedRoute>} />
          <Route path="/minis" element={<Minis />} />
          <Route path="/minis/gestion" element={<ProtectedRoute roles={['master']}><MinisAdmin /></ProtectedRoute>} />
          <Route path="/minis/legal" element={<MinisLegal />} />
          <Route path="/minis/servicios" element={<MinisServicios />} />
          <Route path="/minis/:id" element={<MiniDetail />} />
          <Route path="/dnd" element={<DnD />} />
          <Route path="/dnd/docs/:slug" element={<ProtectedRoute roles={['master','dndMaster']}><DocsPage /></ProtectedRoute>} />
          <Route path="/dnd/editor/:mapId" element={<ProtectedRoute roles={['master','dndMaster']}><MapEditor /></ProtectedRoute>} />
          <Route path="/dnd/viewer" element={<MapViewer />} />
          <Route path="/dnd/viewer/:channel" element={<MapViewer />} />
          <Route path="/dnd/viewer/:channel/multi" element={<MapViewerMulti />} />
          <Route path="/dnd/party" element={<PartyViewer />} />
          <Route path="/juegos" element={<ProtectedRoute><Juegos /></ProtectedRoute>} />
          <Route path="/juegos/star-control" element={<ProtectedRoute><StarControl /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
