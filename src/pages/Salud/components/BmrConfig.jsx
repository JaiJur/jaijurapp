import { useState } from 'react'

export default function BmrConfig({ config, onSave, onCancel }) {
  const [bmr, setBmr] = useState(config?.bmr ?? '')
  const [minCalories, setMinCalories] = useState(config?.minCalories ?? '')
  const [goalWeight, setGoalWeight] = useState(config?.goalWeight ?? '')
  const [goalSteps, setGoalSteps] = useState(config?.goalSteps ?? '')

  const handleSave = () => {
    onSave({
      bmr: bmr !== '' ? Number(bmr) : null,
      minCalories: minCalories !== '' ? Number(minCalories) : null,
      goalWeight: goalWeight !== '' ? Number(goalWeight) : null,
      goalSteps: goalSteps !== '' ? Number(goalSteps) : null,
    })
    onCancel?.()
  }

  return (
    <div className="salud-bmr-form">
      <h2 className="salud-form-date">⚙️ Ajustes</h2>

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
        <span className="salud-label">⚠️ Calorías mínimas diarias</span>
        <p className="salud-bmr-hint">
          Por debajo de esto se considera una restricción excesiva, aunque estés en déficit.
        </p>
        <input
          type="number"
          className="salud-input"
          placeholder="ej: 1500"
          value={minCalories}
          onChange={e => setMinCalories(e.target.value)}
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
        <button className="salud-btn salud-btn-cancel" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}
