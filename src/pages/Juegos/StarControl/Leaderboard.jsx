import { useEffect, useState } from 'react'
import './StarControl.css'

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0))
  const m = Math.floor(s / 60)
  const rest = s % 60
  return `${m}:${rest.toString().padStart(2, '0')}`
}

/**
 * Ranking de Star Control: top 10 de TODAS las partidas jugadas por TODOS
 * los usuarios (no solo la mejor de cada uno). "ready" indica que la
 * puntuación de esta partida ya se ha terminado de guardar en el servidor
 * (si se pide antes, se corre el riesgo de no ver reflejada la partida
 * recién terminada). "padTo" (opcional, p.ej. 10) fuerza a mostrar siempre
 * ese número de filas, rellenando con huecos vacíos las posiciones sin datos.
 */
export default function Leaderboard({ userId, ready, padTo }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!userId || !ready) return
    fetch('/api/starcontrol/scores', { headers: { 'x-user-id': String(userId) } })
      .then(res => { if (!res.ok) throw new Error(); return res.json() })
      .then(setData)
      .catch(() => setError(true))
  }, [userId, ready])

  if (error) return null
  if (!ready || !data) return <div className="sc-leaderboard-loading">Cargando ranking…</div>

  const top = data.top || []
  const rows = padTo ? Array.from({ length: padTo }, (_, i) => top[i] || null) : top

  return (
    <div className="sc-leaderboard">
      <div className="sc-leaderboard-title">🏆 Ranking (top 10)</div>
      {!padTo && top.length === 0 && <div className="sc-leaderboard-empty">Sé el primero en puntuar</div>}
      <ol className="sc-leaderboard-list">
        {rows.map((s, i) => s ? (
          <li key={s.id || `${s.userId}-${i}`} className={String(s.userId) === String(userId) ? 'sc-leaderboard-self' : ''}>
            <span className="sc-leaderboard-pos">{i + 1}</span>
            <span className="sc-leaderboard-name">{s.username}</span>
            <span className="sc-leaderboard-time">{formatTime(s.time)}</span>
            <span className="sc-leaderboard-score">{s.score}</span>
          </li>
        ) : (
          <li key={`empty-${i}`} className="sc-leaderboard-empty-row">
            <span className="sc-leaderboard-pos">{i + 1}</span>
            <span className="sc-leaderboard-name">—</span>
            <span className="sc-leaderboard-time">—</span>
            <span className="sc-leaderboard-score">—</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
