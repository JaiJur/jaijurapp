import { useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'
import './Juegos.css'

const GAMES = [
  {
    id: 'star-control',
    label: 'Star Control',
    description: 'Batallas 2D de naves espaciales',
    href: '/juegos/star-control',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 6l6 14-6 6-6-6z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round"/>
        <path d="M18 20l-8 6 4 2M30 20l8 6-4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="24" cy="30" r="3" fill="#ff6a00"/>
      </svg>
    ),
  },
]

export default function Juegos() {
  const navigate = useNavigate()

  return (
    <div className="juegos-root">
      <AppHeader appName="Juegos" />
      <main className="juegos-main">
        <div className="juegos-grid">
          {GAMES.map(game => (
            <button key={game.id} className="juegos-card" onClick={() => navigate(game.href)}>
              <div className="juegos-card-icon">{game.icon}</div>
              <div className="juegos-card-info">
                <span className="juegos-card-label">{game.label}</span>
                <span className="juegos-card-desc">{game.description}</span>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
