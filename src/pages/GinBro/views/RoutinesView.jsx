import './RoutinesView.css'

const DAY_SHORT = ['D','L','M','X','J','V','S']

export default function RoutinesView({ data, onStartSession, onEditRoutine, onNewRoutine, onSave }) {
  const routines = data.routines || []

  async function toggleFavorite(routine) {
    const updated = { ...routine, favorite: !routine.favorite }
    const newRoutines = routines.map(r => r.id === routine.id ? updated : r)
    await onSave({ routines: newRoutines })
  }

  return (
    <div className="routines-view">

      <div className="rv-header">
        <h2 className="rv-title">Mis rutinas</h2>
        <button className="rv-new-btn" onClick={onNewRoutine}>+ Nueva</button>
      </div>

      {routines.length === 0 ? (
        <div className="rv-empty">
          <p>Aún no tienes rutinas.</p>
          <button className="rv-new-btn-lg" onClick={onNewRoutine}>+ Crear primera rutina</button>
        </div>
      ) : (
        <ul className="rv-list">
          {routines.map(routine => (
            <li key={routine.id} className="rv-item">
              <div className="rv-item-info" onClick={() => onStartSession(routine)}>
                <div className="rv-item-name">{routine.name}</div>
                <div className="rv-item-meta">
                  <span>{routine.exercises?.length || 0} ejercicios</span>
                  {routine.scheduledDays?.length > 0 && (
                    <span className="rv-days-badge">
                      {routine.scheduledDays.map(d => DAY_SHORT[d]).join(' ')}
                    </span>
                  )}
                </div>
                <div className="rv-item-pills">
                  {(routine.exercises || []).slice(0, 3).map((ex, i) => (
                    <span key={i} className="rv-pill">{ex.name}</span>
                  ))}
                  {(routine.exercises?.length || 0) > 3 && (
                    <span className="rv-pill rv-pill-more">+{routine.exercises.length - 3}</span>
                  )}
                </div>
              </div>
              <div className="rv-item-actions">
                <button
                  className={`rv-fav-btn ${routine.favorite ? 'active' : ''}`}
                  onClick={() => toggleFavorite(routine)}
                  title="Favorito"
                >★</button>
                <button className="rv-edit-btn" onClick={() => onEditRoutine(routine)}>✎</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
