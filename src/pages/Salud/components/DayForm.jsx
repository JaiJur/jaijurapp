import { useState, useEffect, useRef, useCallback } from 'react'
import MealEntries from './MealEntries'

const SLEEP_OPTIONS = [
  { value: 1, label: '😫', desc: 'Muy mal' },
  { value: 2, label: '😕', desc: 'Mal' },
  { value: 3, label: '😐', desc: 'Normal' },
  { value: 4, label: '😊', desc: 'Bien' },
  { value: 5, label: '😴', desc: 'Genial' },
]

const MEALS = [
  { key: 'breakfast', label: '🌅 Desayuno' },
  { key: 'lunch', label: '🍽️ Comida' },
  { key: 'snack', label: '🍎 Merienda' },
  { key: 'dinner', label: '🌙 Cena' },
]

const CONTORNO_FIELDS = [
  { key: 'brazo', label: '💪 Brazo' },
  { key: 'pecho', label: '🫁 Pecho' },
  { key: 'cadera', label: '🍑 Cadera' },
  { key: 'tripa', label: '🫃 Tripa' },
  { key: 'cintura', label: '📏 Cintura' },
  { key: 'pierna', label: '🦵 Pierna' },
]

// Migrar formato antiguo (número) a nuevo (array de entries)
function migrateEntries(existing, key) {
  const raw = existing?.meals?.[key]
  if (raw == null) return []
  if (Array.isArray(raw)) return raw
  // Formato antiguo: un número
  return [{ kcal: Number(raw) || 0, items: [] }]
}

export default function DayForm({ date, existing, bmr, onSave, onCancel, onDelete }) {
  const [meals, setMeals] = useState(() =>
    Object.fromEntries(MEALS.map(m => [m.key, migrateEntries(existing, m.key)]))
  )
  const [sleep, setSleep] = useState(existing?.sleep ?? 3)
  const [steps, setSteps] = useState(existing?.steps ?? '')
  const [strength, setStrength] = useState(!!existing?.strength)
  const [strengthType, setStrengthType] = useState(
    typeof existing?.strength === 'string' ? existing.strength : ''
  )
  const [weight, setWeight] = useState(existing?.weight ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [contorno, setContorno] = useState(() => {
    const c = existing?.contorno || {}
    return Object.fromEntries(CONTORNO_FIELDS.map(f => [f.key, c[f.key] ?? '']))
  })
  const [contornoOpen, setContornoOpen] = useState(() =>
    CONTORNO_FIELDS.some(f => existing?.contorno?.[f.key] != null)
  )
  const [openMealKey, setOpenMealKey] = useState(null)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef(null)
  const isFirstRender = useRef(true)

  const mealTotal = (key) => meals[key].reduce((s, e) => s + (e.kcal || 0), 0)
  const totalCal = MEALS.reduce((s, m) => s + mealTotal(m.key), 0)
  const hasCals = MEALS.some(m => meals[m.key].length > 0)

  const buildData = useCallback(() => {
    const mealsData = {}
    MEALS.forEach(m => {
      mealsData[m.key] = meals[m.key].length > 0 ? meals[m.key] : null
    })
    return {
      meals: mealsData,
      calories: hasCals ? totalCal : null,
      sleep,
      steps: steps !== '' ? Number(steps) : null,
      strength: strength ? (strengthType.trim() || true) : false,
      weight: weight !== '' ? Number(weight) : null,
      notes: notes.trim() || null,
      contorno: (() => {
        const c = {}
        let any = false
        CONTORNO_FIELDS.forEach(f => {
          c[f.key] = contorno[f.key] !== '' ? Number(contorno[f.key]) : null
          if (c[f.key] != null) any = true
        })
        return any ? c : null
      })(),
    }
  }, [meals, sleep, steps, strength, strengthType, weight, notes, contorno, hasCals, totalCal])

  // Autosave con debounce de 800ms
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaving(true)
      await onSave(buildData())
      setSaving(false)
    }, 800)
    return () => clearTimeout(debounceRef.current)
  }, [meals, sleep, steps, strength, strengthType, weight, notes, contorno])

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="salud-form">
      <h2 className="salud-form-date">{dateLabel}</h2>

      {/* ── Ingestas ── */}
      <div className="salud-meals">
        <span className="salud-label">🔥 Calorías por ingesta</span>
        <div className="salud-meals-grid">
          {MEALS.map(m => {
            const kcal = mealTotal(m.key)
            const count = meals[m.key].length
            return (
              <button
                key={m.key}
                className={`salud-meal-btn ${count > 0 ? 'has-data' : ''}`}
                onClick={() => setOpenMealKey(m.key)}
                type="button"
              >
                <span className="salud-meal-label">{m.label}</span>
                <span className="salud-meal-kcal">
                  {count > 0 ? `${kcal} kcal` : '—'}
                </span>
                {count > 1 && <span className="salud-meal-count">{count} reg.</span>}
              </button>
            )
          })}
        </div>
        {hasCals && (
          <div className="salud-meals-total">
            <span className="salud-meals-total-label">Total</span>
            <span className="salud-meals-total-value">{totalCal} kcal</span>
            {bmr && (() => {
              const diff = totalCal - bmr
              const cls = diff < 0 ? 'deficit' : diff > 0 ? 'surplus' : 'even'
              return (
                <span className={`salud-deficit ${cls}`}>
                  {diff < 0 ? `📉 ${Math.abs(diff)} kcal` : diff > 0 ? `📈 +${diff} kcal` : '⚖️ 0'}
                </span>
              )
            })()}
          </div>
        )}
      </div>

      <div className="salud-field">
        <span className="salud-label">😴 Calidad del sueño</span>
        <div className="salud-sleep-row">
          {SLEEP_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`salud-sleep-btn ${sleep === opt.value ? 'active' : ''}`}
              onClick={() => setSleep(opt.value)}
              title={opt.desc}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <label className="salud-field">
        <span className="salud-label">🚶 Pasos</span>
        <input type="number" className="salud-input" placeholder="ej: 8000"
          value={steps} onChange={e => setSteps(e.target.value)} inputMode="numeric" />
      </label>

      <div className="salud-field">
        <div className="salud-field-row">
          <span className="salud-label">🏋️ Ejercicio de fuerza</span>
          <button className={`salud-toggle ${strength ? 'on' : ''}`}
            onClick={() => setStrength(!strength)}>{strength ? 'Sí' : 'No'}</button>
        </div>
        {strength && (
          <input type="text" className="salud-input salud-strength-type"
            placeholder="ej: Bíceps, Piernas, Pecho…"
            value={strengthType}
            onChange={e => setStrengthType(e.target.value)} />
        )}
      </div>

      <label className="salud-field">
        <span className="salud-label">⚖️ Peso (kg)</span>
        <input type="number" className="salud-input" placeholder="ej: 75.2" step="0.1"
          value={weight} onChange={e => setWeight(e.target.value)} inputMode="decimal" />
      </label>

      {/* ── Medidas de contorno ── */}
      <div className="salud-contorno">
        <button className={`salud-contorno-toggle ${contornoOpen ? 'open' : ''}`}
          onClick={() => setContornoOpen(!contornoOpen)} type="button">
          <span className="salud-label">📐 Medidas de contorno (cm)</span>
          <span className="salud-contorno-chevron">{contornoOpen ? '▲' : '▼'}</span>
        </button>
        {contornoOpen && (
          <div className="salud-contorno-grid">
            {CONTORNO_FIELDS.map(f => (
              <label key={f.key} className="salud-contorno-item">
                <span className="salud-contorno-label">{f.label}</span>
                <input type="number" className="salud-input salud-contorno-input" placeholder="cm"
                  step="0.1" value={contorno[f.key]}
                  onChange={e => setContorno(prev => ({ ...prev, [f.key]: e.target.value }))}
                  inputMode="decimal" />
              </label>
            ))}
          </div>
        )}
      </div>

      <label className="salud-field">
        <span className="salud-label">📝 Notas</span>
        <textarea className="salud-input salud-textarea" placeholder="Opcional…"
          value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
      </label>

      <div className="salud-form-actions">
        <span className="salud-autosave-indicator">{saving ? '💾 Guardando…' : '✓ Guardado automáticamente'}</span>
        <button className="salud-btn salud-btn-cancel" onClick={onCancel}>Cerrar</button>
      </div>

      {existing && onDelete && (
        <div className="salud-form-delete">
          {!confirmDelete ? (
            <button className="salud-btn-delete" onClick={() => setConfirmDelete(true)}>
              🗑️ Eliminar registro
            </button>
          ) : (
            <div className="salud-delete-confirm">
              <span className="salud-delete-msg">¿Seguro?</span>
              <button className="salud-btn-delete-yes" onClick={() => onDelete(date)}>Sí, eliminar</button>
              <button className="salud-btn-delete-no" onClick={() => setConfirmDelete(false)}>No</button>
            </div>
          )}
        </div>
      )}

      {openMealKey && (
        <MealEntries
          mealKey={openMealKey}
          mealLabel={MEALS.find(m => m.key === openMealKey)?.label || ''}
          entries={meals[openMealKey]}
          onChange={(updated) => setMeals(prev => ({ ...prev, [openMealKey]: updated }))}
          onClose={() => setOpenMealKey(null)}
        />
      )}
    </div>
  )
}
