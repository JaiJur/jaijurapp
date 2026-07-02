const SLEEP_EMOJI = ['', '😫', '😕', '😐', '😊', '😴']

const CONTORNO_LABELS = {
  brazo: '💪', pecho: '🫁', cadera: '🍑',
  tripa: '🫃', cintura: '📏', pierna: '🦵',
}

const STRENGTH_ICONS = {
  brazo: '💪', pierna: '🦵', hombro: '🤾',
  pecho: '🫁', espalda: '🔙', abdomen: '🍫',
}

export default function HistoryList({ entries, bmr, onEdit }) {
  if (!entries.length) {
    return <p className="salud-empty">No hay registros todavía.</p>
  }

  return (
    <div className="salud-history">
      <h2 className="salud-section-title">Historial</h2>
      {entries.map(entry => {
        const d = new Date(entry.date + 'T12:00:00')
        const label = d.toLocaleDateString('es-ES', {
          weekday: 'short', day: 'numeric', month: 'short',
        })
        return (
          <div key={entry.date} className="salud-entry" onClick={() => onEdit(entry.date)}>
            <div className="salud-entry-header">
              <span className="salud-entry-date">{label}</span>
            </div>
            <div className="salud-entry-metrics">
              {entry.calories != null && <span className="salud-metric">🔥 {entry.calories} kcal</span>}
              {entry.calories != null && bmr && (() => {
                const diff = entry.calories - bmr
                const cls = diff < 0 ? 'deficit' : diff > 0 ? 'surplus' : 'even'
                return <span className={`salud-metric salud-metric-deficit ${cls}`}>{diff < 0 ? `📉 ${Math.abs(diff)}` : diff > 0 ? `📈 +${diff}` : '⚖️ 0'}</span>
              })()}
              {entry.sleep != null && <span className="salud-metric">{SLEEP_EMOJI[entry.sleep]} Sueño</span>}
              {entry.steps != null && <span className="salud-metric">🚶 {entry.steps.toLocaleString()}</span>}
              {entry.strength && (
                <span className="salud-metric">
                  🏋️ {Array.isArray(entry.strength)
                    ? entry.strength.map(k => STRENGTH_ICONS[k] || k).join(' ')
                    : (typeof entry.strength === 'string' ? entry.strength : 'Fuerza')}
                </span>
              )}
              {entry.weight != null && <span className="salud-metric">⚖️ {entry.weight} kg</span>}
            </div>
            {entry.contorno && (
              <div className="salud-entry-contorno">
                {Object.entries(entry.contorno).map(([k, v]) =>
                  v != null ? <span key={k} className="salud-metric salud-metric-contorno">{CONTORNO_LABELS[k] || k} {v}</span> : null
                )}
              </div>
            )}
            {entry.notes && <p className="salud-entry-notes">{entry.notes}</p>}
          </div>
        )
      })}
    </div>
  )
}
