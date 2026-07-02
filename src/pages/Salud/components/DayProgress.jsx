const MEAL_DEFS = [
  { key: 'breakfast', label: 'Desayuno', icon: '🌅' },
  { key: 'lunch', label: 'Comida', icon: '🍽️' },
  { key: 'snack', label: 'Merienda', icon: '🍎' },
  { key: 'dinner', label: 'Cena', icon: '🌙' },
]

const MAX_CAL = 3000

function mealKcal(entry, key) {
  const arr = entry?.meals?.[key]
  if (!Array.isArray(arr)) return 0
  return arr.reduce((s, e) => s + (e.kcal || 0), 0)
}

export default function DayProgress({ entry, config }) {
  const bmr = config?.bmr
  const minCalories = config?.minCalories
  const goalSteps = config?.goalSteps

  const mealTotals = MEAL_DEFS.map(m => ({ ...m, kcal: mealKcal(entry, m.key) }))
  const cal = mealTotals.reduce((s, m) => s + m.kcal, 0) || (entry?.calories ?? 0)
  const calPct = Math.min(100, (cal / MAX_CAL) * 100)
  const bmrPct = bmr ? Math.min(100, (bmr / MAX_CAL) * 100) : null
  const minPct = minCalories ? Math.min(100, (minCalories / MAX_CAL) * 100) : null

  let calBarClass = 'neutral'
  if (bmr && cal > bmr) {
    calBarClass = 'over'
  } else if (minCalories && cal > 0 && cal < minCalories) {
    calBarClass = 'low'
  } else if (bmr) {
    calBarClass = 'under'
  }

  const steps = entry?.steps ?? 0
  const stepsPct = goalSteps ? Math.min(100, (steps / goalSteps) * 100) : 0
  const stepsOver = goalSteps ? steps > goalSteps : false

  const hasGoals = bmr || goalSteps

  return (
    <div className="salud-day-progress">
      <div className="salud-progress-item">
        <div className="salud-progress-header">
          <span className="salud-progress-label">🔥 Calorías hoy</span>
          <span className="salud-progress-value">
            {cal ? `${cal}` : '0'}{bmr ? ` / ${bmr} kcal` : ' kcal'}
          </span>
        </div>
        <div className="salud-progress-track">
          {minPct != null && (
            <div className="salud-progress-marker salud-marker-min" style={{ left: `${minPct}%` }} />
          )}
          {bmrPct != null && (
            <div className="salud-progress-marker" style={{ left: `${bmrPct}%` }} />
          )}
          <div
            className={`salud-progress-fill-stack ${calBarClass}`}
            style={{ width: `${calPct}%` }}
          >
            {mealTotals.map(m => m.kcal > 0 && (
              <div
                key={m.key}
                className="salud-cal-segment"
                style={{ flexGrow: m.kcal }}
                title={`${m.label}: ${m.kcal} kcal`}
              />
            ))}
          </div>
        </div>
        {cal > 0 && (
          <div className="salud-cal-breakdown">
            {mealTotals.map(m => m.kcal > 0 && (
              <span key={m.key} className="salud-cal-breakdown-item">
                {m.icon} {m.kcal}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="salud-progress-item">
        <div className="salud-progress-header">
          <span className="salud-progress-label">🚶 Pasos hoy</span>
          <span className="salud-progress-value">
            {steps ? steps.toLocaleString() : '0'}{goalSteps ? ` / ${goalSteps.toLocaleString()}` : ''}
          </span>
        </div>
        <div className="salud-progress-track">
          <div
            className={`salud-progress-fill salud-progress-steps ${stepsOver ? 'over' : ''}`}
            style={{ width: `${goalSteps ? stepsPct : 0}%` }}
          />
        </div>
      </div>

      {!hasGoals && (
        <p className="salud-progress-hint">
          Configura tus objetivos en ⚙️ para ver el progreso del día.
        </p>
      )}
    </div>
  )
}
