import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Home from './pages/Home'
import MealPlanner from './pages/MealPlanner/MealPlanner'
import GinBro from './pages/GinBro/GinBro'
import HogarQuest from './pages/HogarQuest/HogarQuest'
import DnD from './pages/DnD/DnD'
import MapEditor from './pages/DnD/MapEditor'
import MapViewer from './pages/DnD/MapViewer'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
