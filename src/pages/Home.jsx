import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppHeader from '../components/AppHeader'
import UserManager from './UserManager'
import './Home.css'

const APPS = [
  {
    id: 'mealplanner',
    label: 'Meal Planner',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="14" width="32" height="24" rx="3" stroke="currentColor" strokeWidth="2.2" fill="none"/>
        <path d="M16 14V10M24 14V10M32 14V10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M8 22h32" stroke="currentColor" strokeWidth="2.2"/>
        <path d="M16 30h4M28 30h4M16 35h4M28 35h4" stroke="#ff6a00" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    ),
    href: '/meal-planner',
  },
  {
    id: 'ginbro',
    label: 'GinBro',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 24h6l3-9 4 18 4-12 3 6h4l3-8 4 16 3-11h8"
          stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="24" cy="10" r="3.5" stroke="#ff6a00" strokeWidth="2"/>
        <path d="M18 38c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#ff6a00" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    href: '/ginbro',
  },
  {
    id: 'hogar',
    label: 'HogarQuest',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 22L24 8l16 14v18a2 2 0 01-2 2H10a2 2 0 01-2-2V22z"
          stroke="currentColor" strokeWidth="2.2" fill="none"/>
        <path d="M18 40V28h12v12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M20 18l4-4 4 4" stroke="#c8f135" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    href: '/hogar',
  },
  {
    id: 'dnd',
    label: 'D&D',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="24,4 28,18 42,18 31,27 35,41 24,32 13,41 17,27 6,18 20,18"
          stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round"/>
        <circle cx="24" cy="24" r="4" fill="#c8a96e"/>
      </svg>
    ),
    href: '/dnd',
  },
  {
    id: 'salud',
    label: 'Salud',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 42s-14-8.5-14-18.5C10 15.5 14 12 19 12c2.8 0 4.5 1.5 5 2.5.5-1 2.2-2.5 5-2.5 5 0 9 3.5 9 11.5S24 42 24 42z"
          stroke="currentColor" strokeWidth="2.2" fill="none"/>
        <path d="M20 26h8M24 22v8" stroke="#ff4060" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    ),
    href: '/salud',
  },
]

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Filtrar apps según rol/apps del usuario
  const APP_ID_MAP = { mealplanner: 'planner', ginbro: 'ginbro', hogar: 'hogar', dnd: 'dnd', salud: 'salud' }
  const visibleApps = (user?.role === 'master' || user?.role === 'premium')
    ? APPS
    : APPS.filter(app => (user?.apps || []).includes(APP_ID_MAP[app.id] || app.id))

  return (
    <div className="home-root">
      <div className="home-bg">
        <div className="home-grid" />
        <div className="home-orb" />
      </div>

      <AppHeader />

      <main className="home-main">
        <div className="app-grid">
          {visibleApps.map(app => (
            <button key={app.id} className="app-icon" onClick={() => navigate(app.href)}>
              <div className="app-icon-img">{app.icon}</div>
              <span className="app-icon-label">{app.label}</span>
            </button>
          ))}
        </div>

        {user?.role === 'master' && <UserManager />}
      </main>
    </div>
  )
}
