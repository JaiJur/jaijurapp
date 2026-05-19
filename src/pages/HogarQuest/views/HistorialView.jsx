import { useState } from 'react'
import '../views/views.css'

export default function HistorialView({ data }) {
  const [filterUser, setFilterUser] = useState('all')
  const [filterZone, setFilterZone] = useState('all')

  const { completions = [], zones = [] } = data

  const filtered = completions
    .slice()
    .reverse()
    .filter(c => filterUser === 'all' || c.username === filterUser)
    .filter(c => filterZone === 'all' || c.zone === filterZone)

  const users = [...new Set(completions.map(c => c.username))]

  return (
    <div className="hq-historial">
      {/* Filtros usuario */}
      <div className="hq-historial-filters">
        <button
          className={`hq-filter-btn ${filterUser === 'all' ? 'active' : ''}`}
          onClick={() => setFilterUser('all')}
        >Todos</button>
        {users.map(u => (
          <button
            key={u}
            className={`hq-filter-btn ${filterUser === u ? 'active' : ''}`}
            onClick={() => setFilterUser(u)}
          >{u}</button>
        ))}
      </div>

      {/* Filtros zona */}
      <div className="hq-historial-filters">
        <button
          className={`hq-filter-btn ${filterZone === 'all' ? 'active' : ''}`}
          onClick={() => setFilterZone('all')}
        >Todas las zonas</button>
        {zones.map(z => (
          <button
            key={z.id}
            className={`hq-filter-btn ${filterZone === z.id ? 'active' : ''}`}
            onClick={() => setFilterZone(z.id)}
          >{z.emoji} {z.name}</button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="hq-empty">Sin actividad aún</p>
      )}

      {filtered.map((c, i) => (
        <div key={i} className="hq-log-item">
          <div className="hq-log-icon">{zones.find(z => z.id === c.zone)?.emoji || '🏠'}</div>
          <div className="hq-log-info">
            <div className="hq-log-name">{c.taskName}</div>
            <div className="hq-log-meta">
              {c.username} · {new Date(c.ts).toLocaleString('es-ES')}
            </div>
          </div>
          <div className="hq-log-xp">+{c.xp} XP</div>
        </div>
      ))}
    </div>
  )
}
