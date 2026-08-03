import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import MealEntries from './MealEntries'

const MEALS = [
  { key: 'breakfast', label: '🌅 Desayuno' },
  { key: 'lunch', label: '🍽️ Comida' },
  { key: 'snack', label: '🍎 Merienda' },
  { key: 'dinner', label: '🌙 Cena' },
]

const STRENGTH_GROUPS = [
  { key: 'brazo', label: 'Brazo', icon: '💪' },
  { key: 'pierna', label: 'Pierna', icon: '🦵' },
  { key: 'hombro', label: 'Hombro', icon: '🤾' },
  { key: 'pecho', label: 'Pecho', icon: '🫁' },
  { key: 'espalda', label: 'Espalda', icon: '🔙' },
  { key: 'abdomen', label: 'Abdomen', icon: '🍫' },
]

// Migrar formato antiguo (número) a nuevo (array de entries)
function migrateEntries(existing, key) {
  const raw = existing?.meals?.[key]
  if (raw == null) return []
  if (Array.isArray(raw)) return raw
  // Formato antiguo: un número
  return [{ kcal: Number(raw) || 0, items: [] }]
}

function daysBetween(fromDate, toDate) {
  const a = new Date(fromDate + 'T00:00:00')
  const b = new Date(toDate + 'T00:00:00')
  return Math.round((b - a) / 86400000)
}

// Lunes (YYYY-MM-DD) de la semana que contiene dateStr
function getMonday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() // 0=domingo, 1=lunes, ... 6=sábado
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export default function DayForm({ date, existing, bmr, allEntries, onSave, onCancel, onDelete, hideNotes, hideCancel, hideDelete }) {
  const [meals, setMeals] = useState(() =>
    Object.fromEntries(MEALS.map(m => [m.key, migrateEntries(existing, m.key)]))
  )
  const [steps, setSteps] = useState(existing?.steps ?? '')
  const [strength, setStrength] = useState(() =>
    Array.isArray(existing?.strength) ? existing.strength : []
  )
  const [weight, setWeight] = useState(existing?.weight ?? '')
  const [strengthWeight, setStrengthWeight] = useState(existing?.strengthWeight ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [openMealKey, setOpenMealKey] = useState(null)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef(null)
  const isFirstRender = useRef(true)

  const mealTotal = (key) => meals[key].reduce((s, e) => s + (e.kcal || 0), 0)
  const totalCal = MEALS.reduce((s, m) => s + mealTotal(m.key), 0)
  const hasCals = MEALS.some(m => meals[m.key].length > 0)

  const toggleStrength = (key) => {
    setStrength(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  // Última fecha (anterior a `date`) en la que se entrenó cada grupo muscular
  const lastTrained = useMemo(() => {
    const map = {}
    for (const e of allEntries || []) {
      if (e.date === date || e.date > date) continue
      const groups = Array.isArray(e.strength) ? e.strength : []
      for (const g of groups) {
        if (!map[g] || e.date > map[g]) map[g] = e.date
      }
    }
    return map
  }, [allEntries, date])

  const groupStatus = (key) => {
    if (strength.includes(key)) return 'red'
    const last = lastTrained[key]
    if (!last) return 'gray'
    const diff = daysBetween(last, date)
    if (diff === 1) return 'yellow'
    const monday = getMonday(date)
    if (last >= monday) return 'green'
    return 'gray'
  }

  const buildData = useCallback(() => {
    const mealsData = {}
    MEALS.forEach(m => {
      mealsData[m.key] = meals[m.key].length > 0 ? meals[m.key] : null
    })
    return {
      meals: mealsData,
      calories: hasCals ? totalCal : null,
      steps: steps !== '' ? Number(steps) : null,
      strength: strength.length > 0 ? strength : null,
      strengthWeight: strengthWeight !== '' ? Number(strengthWeight) : null,
      weight: weight !== '' ? Number(weight) : null,
      notes: notes.trim() || null,
    }
  }, [meals, steps, strength, strengthWeight, weight, notes, hasCals, totalCal])

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
  }, [meals, steps, strength, strengthWeight, weight, notes])

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="salud-form">
      <h2 className="salud-form-date">{dateLabel}</h2>

      <div className="salud-row">
        <label className="salud-field">
          <span className="salud-label">⚖️ Peso (kg)</span>
          <input type="number" className="salud-input" placeholder="ej: 75.2" step="0.1"
            value={weight} onChange={e => setWeight(e.target.value)} inputMode="decimal" />
        </label>

        <label className="salud-field">
          <span className="salud-label">🚶 Pasos</span>
          <input type="number" className="salud-input" placeholder="ej: 8000"
            value={steps} onChange={e => setSteps(e.target.value)} inputMode="numeric" />
        </label>
      </div>

      {/* ── Ingestas ── */}
      <div className="salud-meals">
        <span className="salud-label">🔥 Calorías por ingesta</span>
        <div className="salud-meals-grid salud-meals-col">
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
        <span className="salud-label">🏋️ Ejercicio de fuerza</span>

        <label className="salud-field salud-strength-weight-field">
          <span className="salud-label">🏋️‍♂️ Peso que manejas (kg)</span>
          <input type="number" className="salud-input" placeholder="ej: 8.5" step="0.5"
            value={strengthWeight} onChange={e => setStrengthWeight(e.target.value)} inputMode="decimal" />
        </label>

        <div className="salud-strength-grid">
          {STRENGTH_GROUPS.map(g => {
            const status = groupStatus(g.key)
            return (
              <button
                key={g.key}
                type="button"
                className={`salud-strength-btn status-${status} ${strength.includes(g.key) ? 'active' : ''}`}
                onClick={() => toggleStrength(g.key)}
              >
                <span className="salud-strength-icon">{g.icon}</span>
                <span className="salud-strength-label">{g.label}</span>
                <span className={`salud-strength-dot dot-${status}`} />
              </button>
            )
          })}
        </div>
      </div>

      {!hideNotes && (
        <label className="salud-field">
          <span className="salud-label">📝 Notas</span>
          <textarea className="salud-input salud-textarea" placeholder="Opcional…"
            value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
        </label>
      )}

      <div className="salud-form-actions">
        <span className="salud-autosave-indicator">{saving ? '💾 Guardando…' : '✓ Guardado automáticamente'}</span>
        {!hideCancel && (
          <button className="salud-btn salud-btn-cancel" onClick={onCancel}>Cerrar</button>
        )}
      </div>

      {!hideDelete && existing && onDelete && (
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
