import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppHeader from '../components/AppHeader'
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
  {
    id: 'notes',
    label: 'Notas',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="6" width="28" height="36" rx="3" stroke="currentColor" strokeWidth="2.2" fill="none"/>
        <path d="M16 16h16M16 22h16M16 28h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M30 32l4 4 6-8" stroke="#ff6a00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    href: '/notes',
  },
  {
    id: 'minis',
    label: 'Miniaturas',
    public: true,
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 6c-5 0-8 4-8 8 0 3 1.5 5 3 6.5V30h10v-9.5c1.5-1.5 3-3.5 3-6.5 0-4-3-8-8-8z" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinejoin="round"/>
        <rect x="14" y="34" width="20" height="8" rx="2" stroke="currentColor" strokeWidth="2.2" fill="none"/>
        <circle cx="24" cy="15" r="2.4" fill="#ff6a00"/>
      </svg>
    ),
    href: '/minis',
  },
  {
    id: 'juegos',
    label: 'Juegos',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 6l6 14-6 6-6-6z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round"/>
        <path d="M18 20l-8 6 4 2M30 20l8 6-4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="24" cy="30" r="3" fill="#ff6a00"/>
      </svg>
    ),
    href: '/juegos',
  },
  {
    id: 'users',
    label: 'Usuarios',
    masterOnly: true,
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="16" r="7" stroke="currentColor" strokeWidth="2.2" fill="none"/>
        <path d="M10 40c0-7.7 6.3-14 14-14s14 6.3 14 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
        <circle cx="36" cy="14" r="4.5" stroke="#ff6a00" strokeWidth="1.8" fill="none"/>
        <path d="M30 36c0-4 2.7-7.5 6-9" stroke="#ff6a00" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    href: '/users',
  },
]

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const APP_ID_MAP = { mealplanner: 'planner', dnd: 'dnd', salud: 'salud', notes: 'notes', juegos: 'juegos' }
  const visibleApps = (user?.role === 'master' || user?.role === 'premium')
    ? APPS.filter(app => !app.masterOnly || user?.role === 'master')
    : APPS.filter(app => !app.masterOnly && (app.public || (user?.apps || []).includes(APP_ID_MAP[app.id] || app.id)))

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
      </main>
    </div>
  )
}
