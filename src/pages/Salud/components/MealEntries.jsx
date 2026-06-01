import { useState } from 'react'
import MealAnalyzer from './MealAnalyzer'

export default function MealEntries({ mealKey, mealLabel, entries, onChange, onClose }) {
  const [analyzerOpen, setAnalyzerOpen] = useState(false)
  const [editIdx, setEditIdx] = useState(null) // index being edited inline

  const total = entries.reduce((s, e) => s + (e.kcal || 0), 0)

  const removeEntry = (idx) => {
    onChange(entries.filter((_, i) => i !== idx))
  }

  const updateKcal = (idx, val) => {
    onChange(entries.map((e, i) => i === idx ? { ...e, kcal: Number(val) || 0 } : e))
  }

  return (
    <div className="foto-meal-overlay" onClick={onClose}>
      <div className="foto-meal-modal" onClick={e => e.stopPropagation()}>
        <div className="foto-meal-header">
          <h3>{mealLabel}</h3>
          <button className="foto-meal-close" onClick={onClose}>✕</button>
        </div>

        {entries.length === 0 && (
          <p className="meal-entries-empty">No hay registros todavía</p>
        )}

        {entries.length > 0 && (
          <div className="meal-entries-list">
            {entries.map((entry, i) => (
              <div key={i} className="meal-entry-card">
                <div className="meal-entry-top">
                  {editIdx === i ? (
                    <input
                      className="salud-input meal-entry-kcal-input"
                      type="number"
                      value={entry.kcal}
                      onChange={e => updateKcal(i, e.target.value)}
                      onBlur={() => setEditIdx(null)}
                      autoFocus
                      inputMode="numeric"
                    />
                  ) : (
                    <span
                      className="meal-entry-kcal"
                      onClick={() => setEditIdx(i)}
                    >{entry.kcal} kcal</span>
                  )}
                  <button className="foto-meal-remove" onClick={() => removeEntry(i)}>✕</button>
                </div>
                {entry.items?.length > 0 && (
                  <div className="meal-entry-items">
                    {entry.items.map((it, j) => (
                      <span key={j} className="meal-entry-item-chip">
                        {it.name} {it.weight ? `${it.weight}g` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {entries.length > 0 && (
          <div className="meal-entries-total">
            Total: <strong>{total} kcal</strong>
          </div>
        )}

        <button
          className="salud-btn salud-btn-save meal-entries-add"
          onClick={() => setAnalyzerOpen(true)}
        >＋ Añadir registro</button>

        {analyzerOpen && (
          <MealAnalyzer
            mealLabel={mealLabel}
            onAccept={(kcal, items) => {
              onChange([...entries, { kcal, items: items || [] }])
              setAnalyzerOpen(false)
            }}
            onClose={() => setAnalyzerOpen(false)}
          />
        )}
      </div>
    </div>
  )
}
