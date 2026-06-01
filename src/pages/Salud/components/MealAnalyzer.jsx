import { useState } from 'react'
import { useAuth } from '../../../context/AuthContext'

export default function MealAnalyzer({ mealLabel, onAccept, onClose }) {
  const { user } = useAuth()
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // ── Text state ──
  const [textLines, setTextLines] = useState([{ food: '', qty: '' }])

  const reset = () => {
    setItems(null)
    setError(null)
  }

  const analyzeText = async () => {
    const filled = textLines.filter(l => l.food.trim())
    if (!filled.length) return
    const combined = filled.map(l => {
      const q = l.qty.trim()
      return q ? `${q} ${l.food.trim()}` : l.food.trim()
    }).join('\n')
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch('/api/salud/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ text: combined }),
      })
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}))
        throw new Error(errData.error || `Error ${resp.status}`)
      }
      const data = await resp.json()
      if (!data.items?.length) {
        setError(data.message || 'No se pudo analizar')
        return
      }
      setItems(data.items)
    } catch (err) {
      setError(err.message || 'Error al analizar')
    } finally {
      setLoading(false)
    }
  }

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((it, i) =>
      i === idx ? { ...it, [field]: field === 'name' ? value : Number(value) || 0 } : it
    ))
  }
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  const totals = items ? items.reduce((acc, it) => ({
    kcal: acc.kcal + (it.kcal || 0),
    protein: acc.protein + (it.protein || 0),
    carbs: acc.carbs + (it.carbs || 0),
    fat: acc.fat + (it.fat || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 }) : null

  return (
    <div className="foto-meal-overlay" onClick={onClose}>
      <div className="foto-meal-modal" onClick={e => e.stopPropagation()}>
        <div className="foto-meal-header">
          <h3>🍽️ {mealLabel}</h3>
          <button className="foto-meal-close" onClick={onClose}>✕</button>
        </div>

        {/* ── Text mode ── */}
        {!items && (
          <>
            <div className="meal-text-lines">
              {textLines.map((line, i) => (
                <div key={i} className="meal-text-row">
                  <input
                    className="salud-input meal-text-food"
                    placeholder="Alimento…"
                    value={line.food}
                    onChange={e => {
                      const next = [...textLines]
                      next[i] = { ...next[i], food: e.target.value }
                      setTextLines(next)
                    }}
                  />
                  <input
                    className="salud-input meal-text-qty"
                    placeholder="Cantidad"
                    value={line.qty}
                    onChange={e => {
                      const next = [...textLines]
                      next[i] = { ...next[i], qty: e.target.value }
                      setTextLines(next)
                    }}
                  />
                  {textLines.length > 1 && (
                    <button
                      className="foto-meal-remove"
                      onClick={() => setTextLines(prev => prev.filter((_, j) => j !== i))}
                    >✕</button>
                  )}
                </div>
              ))}
              <button
                className="meal-text-add"
                onClick={() => setTextLines(prev => [...prev, { food: '', qty: '' }])}
                type="button"
              >+ Añadir ingrediente</button>
            </div>
            <button
              className="salud-btn salud-btn-save foto-meal-analyze-btn"
              onClick={analyzeText}
              disabled={loading || !textLines.some(l => l.food.trim())}
            >
              {loading ? '⏳ Analizando…' : '🔍 Analizar'}
            </button>
          </>
        )}

        {error && <p className="foto-meal-error">{error}</p>}

        {/* ── Results table (shared) ── */}
        {items && (
          <div className="foto-meal-results">
            <div className="foto-meal-table-wrap">
              <table className="foto-meal-table">
                <thead>
                  <tr>
                    <th>Alimento</th>
                    <th>g</th>
                    <th>kcal</th>
                    <th>P</th>
                    <th>C</th>
                    <th>G</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td>
                        <input className="foto-meal-cell-input foto-meal-cell-name" value={it.name}
                          onChange={e => updateItem(i, 'name', e.target.value)} />
                      </td>
                      <td><input className="foto-meal-cell-input" type="number" value={it.weight}
                        onChange={e => updateItem(i, 'weight', e.target.value)} inputMode="numeric" /></td>
                      <td><input className="foto-meal-cell-input" type="number" value={it.kcal}
                        onChange={e => updateItem(i, 'kcal', e.target.value)} inputMode="numeric" /></td>
                      <td><input className="foto-meal-cell-input" type="number" value={it.protein}
                        onChange={e => updateItem(i, 'protein', e.target.value)} inputMode="numeric" /></td>
                      <td><input className="foto-meal-cell-input" type="number" value={it.carbs}
                        onChange={e => updateItem(i, 'carbs', e.target.value)} inputMode="numeric" /></td>
                      <td><input className="foto-meal-cell-input" type="number" value={it.fat}
                        onChange={e => updateItem(i, 'fat', e.target.value)} inputMode="numeric" /></td>
                      <td><button className="foto-meal-remove" onClick={() => removeItem(i)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="foto-meal-totals">
                    <td>Total</td>
                    <td></td>
                    <td>{Math.round(totals.kcal)}</td>
                    <td>{Math.round(totals.protein)}</td>
                    <td>{Math.round(totals.carbs)}</td>
                    <td>{Math.round(totals.fat)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="meal-analyzer-actions">
              <button className="salud-btn meal-analyzer-back" onClick={reset}>
                ← Volver
              </button>
              <button className="salud-btn salud-btn-save" onClick={() => onAccept(Math.round(totals.kcal), items)}>
                ✅ Usar {Math.round(totals.kcal)} kcal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
