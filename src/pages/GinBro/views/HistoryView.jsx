// HistoryView — historial de sesiones pasadas
import { useState } from 'react'
import './HistoryView.css'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDuration(start, end) {
  if (!end) return ''
  const mins = Math.round((new Date(end) - new Date(start)) / 60000)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins/60)}h ${mins%60}min`
}

export default function HistoryView({ sessions }) {
  if (!sessions.length) {
    return (
      <div className="history-view">
        <div className="hiv-header"><h2>Historial de entrenos</h2></div>
        <p className="hiv-empty">Aún no tienes sesiones registradas.</p>
      </div>
    )
  }

  return (
    <div className="history-view">
      <div className="hiv-header"><h2>Historial de entrenos</h2></div>
      <div className="hiv-list">
        {sessions.map((s, i) => (
          <SessionSummary key={s.id || i} session={s} />
        ))}
      </div>
    </div>
  )
}

function SessionSummary({ session }) {
  const [open, setOpen] = useState(false)
  const done  = session.exercises.filter(e => e.done).length
  const total = session.exercises.length

  return (
    <div className="hiv-session">
      <div className="hiv-session-header" onClick={() => setOpen(o => !o)}>
        <div className="hiv-session-meta">
          <span className="hiv-session-name">{session.routineName}</span>
          <span className="hiv-session-date">{formatDate(session.date)}</span>
        </div>
        <div className="hiv-session-stats">
          <span className="hiv-badge">{done}/{total}</span>
          {session.endDate && (
            <span className="hiv-duration">{formatDuration(session.date, session.endDate)}</span>
          )}
          <span className="hiv-toggle">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="hiv-session-detail">
          {session.exercises.map((ex, i) => (
            <div key={i} className={`hiv-ex-row ${ex.done ? 'done' : 'skipped'}`}>
              <span className="hiv-ex-check">{ex.done ? '✓' : '–'}</span>
              <span className="hiv-ex-name">{ex.name}</span>
              {ex.type === 'cardio' ? (
                <span className="hiv-ex-detail">
                  {ex.sets[0]?.cardioType} · {ex.sets[0]?.minutes} min
                </span>
              ) : (
                <span className="hiv-ex-detail">
                  {ex.sets.filter(s => s.reps).map((s, j) => (
                    <span key={j}>{s.reps}×{s.weight || '—'}kg </span>
                  ))}
                </span>
              )}
              {ex.notes && <span className="hiv-ex-note">"{ex.notes}"</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
