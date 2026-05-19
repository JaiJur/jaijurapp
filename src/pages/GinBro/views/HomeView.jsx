import { useState } from 'react'
import './HomeView.css'

const DAY_NAMES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const DAY_SHORT = ['D','L','M','X','J','V','S']

function getTodayRoutine(routines) {
  const day = new Date().getDay()
  return routines.find(r => r.scheduledDays?.includes(day)) || null
}

function getDateLabel() {
  const now = new Date()
  return {
    day:   DAY_NAMES[now.getDay()],
    date:  now.getDate(),
    month: now.toLocaleDateString('es-ES', { month: 'long' }),
  }
}

/* ── Picker de rutinas (bottom sheet) ── */
function RoutinePicker({ routines, onSelect, onClose }) {
  return (
    <div className="picker-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="picker-sheet">
        <div className="picker-header">
          <span className="picker-title">Elegir rutina</span>
          <button className="picker-close" onClick={onClose}>✕</button>
        </div>
        {routines.length === 0 ? (
          <p className="picker-empty">No tienes rutinas creadas todavía.</p>
        ) : (
          <ul className="picker-list">
            {routines.map(r => (
              <li key={r.id} className="picker-item" onClick={() => onSelect(r)}>
                <div className="picker-item-name">{r.name}</div>
                <div className="picker-item-meta">
                  <span>{r.exercises?.length || 0} ejercicios</span>
                  {r.scheduledDays?.length > 0 && (
                    <span className="picker-days">
                      {r.scheduledDays.map(d => DAY_SHORT[d]).join(' ')}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// pickedRoutine y onPickRoutine viven en GinBro para persistir entre tabs
export default function HomeView({ data, onStartSession, pickedRoutine, onPickRoutine, activeSession }) {
  const routines = data.routines || []
  const [showPicker, setShowPicker] = useState(false)
  const { day, date, month } = getDateLabel()

  // La rutina activa es SOLO la elegida explícitamente o la que tiene sesión en curso
  // No se precarga ninguna rutina del día automáticamente
  const activeRoutine = pickedRoutine || null

  const hasOngoingSession = activeSession && activeRoutine &&
    activeSession.routineId === activeRoutine.id
  const doneCount  = hasOngoingSession ? activeSession.exercises.filter(e => e.done).length : 0
  const totalCount = hasOngoingSession ? activeSession.exercises.length : 0

  function handleSelect(r) {
    onPickRoutine(r)
    setShowPicker(false)
  }

  return (
    <div className="home-view">

      {/* ── Fecha ── */}
      <div className="hv-date-hero">
        <span className="hv-date-day">{day}</span>
        <span className="hv-date-num">{date}</span>
        <span className="hv-date-month">{month}</span>
      </div>

      {/* ── Rutina activa ── */}
      {activeRoutine ? (
        <div className="hv-today-card">
          <div className="hv-today-top">
            <div className="hv-today-badge">
              {hasOngoingSession
                ? `En curso · ${doneCount}/${totalCount}`
                : 'Rutina seleccionada'}
            </div>
            <button className="hv-change-btn" onClick={() => setShowPicker(true)}>
              cambiar
            </button>
          </div>
          <div className="hv-today-name">{activeRoutine.name}</div>
          <div className="hv-today-meta">
            {activeRoutine.exercises?.length || 0} ejercicios
            {activeRoutine.scheduledDays?.length > 0 && (
              <span className="hv-days-badge">
                {activeRoutine.scheduledDays.map(d => DAY_SHORT[d]).join(' ')}
              </span>
            )}
          </div>
          <div className="hv-today-pills">
            {(activeRoutine.exercises || []).slice(0, 4).map((ex, i) => (
              <span key={i} className="hv-ex-pill">{ex.name}</span>
            ))}
            {(activeRoutine.exercises?.length || 0) > 4 && (
              <span className="hv-ex-pill hv-ex-more">+{activeRoutine.exercises.length - 4}</span>
            )}
          </div>
          <button className="hv-start-btn" onClick={() => onStartSession(activeRoutine)}>
            {hasOngoingSession ? '▶ Continuar entreno' : '▶ Empezar entreno'}
          </button>
        </div>
      ) : (
        <div className="hv-no-routine">
          <p className="hv-no-routine-msg">No hay entreno programado para hoy</p>
          <button className="hv-pick-btn" onClick={() => setShowPicker(true)}>
            Elegir rutina
          </button>
        </div>
      )}

      {/* ── Picker ── */}
      {showPicker && (
        <RoutinePicker
          routines={routines}
          onSelect={handleSelect}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
