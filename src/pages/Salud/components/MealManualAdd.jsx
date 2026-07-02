import { useState } from 'react'

export default function MealManualAdd({ mealLabel, onAccept, onClose }) {
  const [rows, setRows] = useState([{ name: '', kcal: '' }])

  const updateRow = (i, field, value) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }
  const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i))
  const addRow = () => setRows(prev => [...prev, { name: '', kcal: '' }])

  const total = rows.reduce((s, r) => s + (Number(r.kcal) || 0), 0)
  const hasValid = rows.some(r => r.name.trim() && Number(r.kcal) > 0)

  const handleAccept = () => {
    const items = rows
      .filter(r => r.name.trim() || Number(r.kcal) > 0)
      .map(r => ({ name: r.name.trim(), kcal: Number(r.kcal) || 0 }))
    onAccept(Math.round(total), items)
  }

  return (
    <div className="foto-meal-overlay" onClick={onClose}>
      <div className="foto-meal-modal" onClick={e => e.stopPropagation()}>
        <div className="foto-meal-header">
          <h3>✏️ {mealLabel}</h3>
          <button className="foto-meal-close" onClick={onClose}>✕</button>
        </div>

        <div className="meal-text-lines">
          {rows.map((row, i) => (
            <div key={i} className="meal-text-row">
              <input
                className="salud-input meal-text-food"
                placeholder="Nombre…"
                value={row.name}
                onChange={e => updateRow(i, 'name', e.target.value)}
              />
              <input
                className="salud-input meal-text-qty"
                placeholder="kcal"
                type="number"
                inputMode="numeric"
                value={row.kcal}
                onChange={e => updateRow(i, 'kcal', e.target.value)}
              />
              {rows.length > 1 && (
                <button className="foto-meal-remove" onClick={() => removeRow(i)}>✕</button>
              )}
            </div>
          ))}
          <button className="meal-text-add" onClick={addRow} type="button">
            + Añadir plato o ingrediente
          </button>
        </div>

        {total > 0 && (
          <div className="meal-entries-total">
            Total: <strong>{Math.round(total)} kcal</strong>
          </div>
        )}

        <button
          className="salud-btn salud-btn-save foto-meal-analyze-btn"
          onClick={handleAccept}
          disabled={!hasValid}
        >
          ✅ Guardar
        </button>
      </div>
    </div>
  )
}
