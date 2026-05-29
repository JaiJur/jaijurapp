import { useState } from 'react'

export default function BmrConfig({ config, onSave }) {
  const [open, setOpen] = useState(false)
  const [bmr, setBmr] = useState(config?.bmr ?? '')
  const [goalWeight, setGoalWeight] = useState(config?.goalWeight ?? '')
  const [goalSteps, setGoalSteps] = useState(config?.goalSteps ?? '')

  const handleSave = () => {
    onSave({
      bmr: bmr !== '' ? Number(bmr) : null,
      goalWeight: goalWeight !== '' ? Number(goalWeight) : null,
      goalSteps: goalSteps !== '' ? Number(goalSteps) : null,
    })
    setOpen(false)
  }

  if (!open) {
    return (
      <div className="salud-bmr-bar" onClick={() => { setBmr(config?.bmr ?? ''); setGoalWeight(config?.goalWeight ?? ''); setGoalSteps(config?.goalSteps ?? ''); setOpen(true) }}>
        <div className="salud-bmr-values">
          {config?.bmr ? (
            <span className="salud-bmr-value">🔋 TDEE: <strong>{config.bmr} kcal</strong></span>
          ) : (
            <span className="salud-bmr-value salud-bmr-empty">🔋 Sin TDEE configurado</span>
          )}
          {config?.goalWeight && (
            <span className="salud-bmr-value">🎯 Peso: <strong>{config.goalWeight} kg</strong></span>
          )}
          {config?.goalSteps && (
            <span className="salud-bmr-value">🚶 Pasos: <strong>{config.goalSteps.toLocaleString()}</strong></span>
          )}
        </div>
        <span className="salud-bmr-edit">⚙️</span>
      </div>
    )
  }

  return (
    <div className="salud-bmr-form">
      <label className="salud-field">
        <span className="salud-label">🔋 Metabolismo basal / TDEE (kcal/día)</span>
        <p className="salud-bmr-hint">
          Tu gasto calórico diario total. Se usará para calcular el déficit o superávit.
        </p>
        <input
          type="number"
          className="salud-input"
          placeholder="ej: 2200"
          value={bmr}
          onChange={e => setBmr(e.target.value)}
          inputMode="numeric"
        />
      </label>

      <label className="salud-field">
        <span className="salud-label">🎯 Peso objetivo (kg)</span>
        <input
          type="number"
          className="salud-input"
          placeholder="ej: 72.0"
          step="0.1"
          value={goalWeight}
          onChange={e => setGoalWeight(e.target.value)}
          inputMode="decimal"
        />
      </label>

      <label className="salud-field">
        <span className="salud-label">🚶 Objetivo de pasos diarios</span>
        <input
          type="number"
          className="salud-input"
          placeholder="ej: 10000"
          value={goalSteps}
          onChange={e => setGoalSteps(e.target.value)}
          inputMode="numeric"
        />
      </label>

      <div className="salud-form-actions">
        <button className="salud-btn salud-btn-save" onClick={handleSave}>Guardar</button>
        <button className="salud-btn salud-btn-cancel" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </div>
  )
}
