import '../views/views.css'

const XP_PER_LEVEL = 100

function getLevel(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1
}
function getLevelProgress(xp) {
  return xp % XP_PER_LEVEL
}

const ALL_LOGROS = [
  { id: 'tasks10',   icon: '🗡️', name: '10 tareas',      desc: 'Completar 10 tareas en total' },
  { id: 'tasks50',   icon: '⚔️', name: '50 tareas',      desc: 'Completar 50 tareas en total' },
  { id: 'tasks100',  icon: '🏆', name: '100 tareas',     desc: 'Completar 100 tareas en total' },
  { id: 'zone5',     icon: '🏠', name: 'Amo de zona',    desc: 'Completar 5 tareas de una misma zona' },
  { id: 'streak3',   icon: '🔥', name: 'Racha x3',       desc: '3 días activos seguidos' },
  { id: 'streak7',   icon: '🌟', name: 'Racha x7',       desc: '7 días activos seguidos' },
  { id: 'first',     icon: '⚡', name: 'Primero',        desc: 'Ser el primero en completar una tarea' },
  { id: 'level5',    icon: '⭐', name: 'Nivel 5',        desc: 'Alcanzar el nivel 5' },
  { id: 'level10',   icon: '💫', name: 'Nivel 10',       desc: 'Alcanzar el nivel 10' },
]

export default function ProfileView({ data, username }) {
  const { xp = 0, logros = [], completions = [] } = data
  const level = getLevel(xp)
  const progress = getLevelProgress(xp)
  const initial = username?.[0]?.toUpperCase() || '?'

  const recent = completions.slice().reverse().slice(0, 5)

  return (
    <div className="hq-profile">
      {/* Hero */}
      <div className="hq-profile-hero">
        <div className="hq-profile-avatar">{initial}</div>
        <div className="hq-profile-name">{username}</div>
        <div className="hq-level-badge">NIVEL {level}</div>
        <div className="hq-xp-bar-wrap">
          <div className="hq-xp-bar-labels">
            <span>{xp} XP total</span>
            <span>{progress} / {XP_PER_LEVEL}</span>
          </div>
          <div className="hq-xp-bar-bg">
            <div className="hq-xp-bar-fill" style={{ width: `${(progress / XP_PER_LEVEL) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Logros */}
      <div>
        <div className="hq-admin-section-title">🏅 Logros</div>
        <div className="hq-logros-grid">
          {ALL_LOGROS.map(logro => {
            const unlocked = logros.includes(logro.id)
            return (
              <div key={logro.id} className={`hq-logro-card ${unlocked ? 'unlocked' : ''}`}>
                <div className="hq-logro-icon">{logro.icon}</div>
                <div className="hq-logro-name">{logro.name}</div>
                <div className="hq-logro-desc">{logro.desc}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Actividad reciente */}
      {recent.length > 0 && (
        <div>
          <div className="hq-admin-section-title">🕒 Actividad reciente</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recent.map((c, i) => (
              <div key={i} className="hq-log-item">
                <div className="hq-log-info">
                  <div className="hq-log-name">{c.taskName}</div>
                  <div className="hq-log-meta">{new Date(c.ts).toLocaleString('es-ES')}</div>
                </div>
                <div className="hq-log-xp">+{c.xp} XP</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
