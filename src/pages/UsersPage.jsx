import AppHeader from '../components/AppHeader'
import UserManager from './UserManager'
import './Home.css'

export default function UsersPage() {
  return (
    <div className="home-root">
      <div className="home-bg">
        <div className="home-grid" />
        <div className="home-orb" />
      </div>

      <AppHeader />

      <main className="home-main">
        <UserManager />
      </main>
    </div>
  )
}
