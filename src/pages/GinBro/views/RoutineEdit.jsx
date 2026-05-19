// RoutineEdit — crear o editar una rutina
import { useState, useRef, useEffect } from 'react'
import './RoutineEdit.css'

const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const MUSCLE_GROUPS = ['Pecho','Espalda','Hombros','Bíceps','Tríceps','Piernas','Glúteos','Core','Cardio']
const DRAFT_KEY = 'ginbro_routine_draft'

function emptyExercise() {
  return { name: '', type: 'weights', muscleGroup: '', defaultSets: 3 }
}

function loadDraft(routine) {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw)
    // Solo usar el draft si corresponde a la misma rutina (o ambas son nuevas)
    const sameId = (draft.id ?? null) === (routine?.id ?? null)
    return sameId ? draft : null
  } catch { return null }
}

export default function RoutineEdit({ routine, onSave, onDelete, onCancel }) {
  const draft = loadDraft(routine)

  const [name, setName]           = useState(draft?.name           ?? routine?.name           ?? '')
  const [scheduledDays, setDays]  = useState(draft?.scheduledDays  ?? routine?.scheduledDays  ?? [])
  const [exercises, setExercises] = useState(draft?.exercises       ?? routine?.exercises      ?? [emptyExercise()])
  const [saving, setSaving]       = useState(false)

  // drag & drop refs
  const dragIdx  = useRef(null)
  const overIdx  = useRef(null)
  const [dragging, setDragging] = useState(null)

  // Guardar borrador en sessionStorage cada vez que cambia algo
  useEffect(() => {
    const draft = { id: routine?.id ?? null, name, scheduledDays, exercises }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [name, scheduledDays, exercises])

  function clearDraft() {
    sessionStorage.removeItem(DRAFT_KEY)
  }

  function toggleDay(d) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  function updateEx(idx, patch) {
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e))
  }

  function addEx() {
    setExercises(prev => [...prev, emptyExercise()])
  }

  function removeEx(idx) {
    setExercises(prev => prev.filter((_, i) => i !== idx))
  }

  // ── drag & drop ───────────────────────────────────────────
  function onDragStart(idx) {
    dragIdx.current = idx
    setDragging(idx)
  }

  function onDragEnter(idx) {
    overIdx.current = idx
    if (dragIdx.current === idx) return
    setExercises(prev => {
      const arr = [...prev]
      const item = arr.splice(dragIdx.current, 1)[0]
      arr.splice(idx, 0, item)
      dragIdx.current = idx
      return arr
    })
  }

  function onDragEnd() {
    dragIdx.current = null
    overIdx.current = null
    setDragging(null)
  }

  // touch drag (móvil)
  const touchStart = useRef(null)

  function onTouchStart(e, idx) {
    touchStart.current = { idx, y: e.touches[0].clientY }
    setDragging(idx)
  }

  function onTouchMove(e) {
    if (touchStart.current === null) return
    e.preventDefault()
    const y = e.touches[0].clientY
    const els = document.querySelectorAll('.re-ex-card')
    els.forEach((el, i) => {
      const rect = el.getBoundingClientRect()
      if (y >= rect.top && y <= rect.bottom && i !== dragIdx.current) {
        onDragEnter(i)
      }
    })
  }

  function onTouchEnd() {
    touchStart.current = null
    setDragging(null)
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    clearDraft()
    await onSave({
      id: routine?.id,
      name: name.trim(),
      scheduledDays,
      exercises,
      favorite: routine?.favorite || false,
    })
    setSaving(false)
  }

  function handleCancel() {
    clearDraft()
    onCancel()
  }

  return (
    <div className="routine-edit">
      <div className="re-header">
        <button className="re-back-btn" onClick={handleCancel}>←</button>
        <h2>{routine ? 'Editar rutina' : 'Nueva rutina'}</h2>
      </div>

      {/* Nombre */}
      <label className="re-label">Nombre de la rutina</label>
      <input
        className="re-name-input"
        placeholder="Ej: Empuje A, Pierna…"
        value={name}
        onChange={e => setName(e.target.value)}
      />

      {/* Días */}
      <label className="re-label">Días programados</label>
      <div className="re-days">
        {DAYS.map((d, i) => (
          <button key={i}
            className={`re-day-btn ${scheduledDays.includes(i) ? 'active' : ''}`}
            onClick={() => toggleDay(i)}
          >{d}</button>
        ))}
      </div>

      {/* Ejercicios */}
      <label className="re-label">Ejercicios <span className="re-label-hint">— arrastra ☰ para reordenar</span></label>
      <div
        className="re-exercises"
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {exercises.map((ex, idx) => (
          <div
            key={idx}
            className={`re-ex-card ${dragging === idx ? 're-ex-dragging' : ''}`}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragEnter={() => onDragEnter(idx)}
            onDragEnd={onDragEnd}
            onDragOver={e => e.preventDefault()}
            onTouchStart={e => onTouchStart(e, idx)}
          >
            <div className="re-ex-top">
              <span className="re-drag-handle" title="Arrastrar">☰</span>
              <input
                className="re-ex-name"
                placeholder="Nombre del ejercicio…"
                value={ex.name}
                onChange={e => updateEx(idx, { name: e.target.value })}
              />
              <button className="re-ex-remove" onClick={() => removeEx(idx)}>✕</button>
            </div>
            <div className="re-ex-bottom">
              <select className="re-ex-type" value={ex.type}
                onChange={e => updateEx(idx, { type: e.target.value })}>
                <option value="weights">Pesas / máquina</option>
                <option value="cardio">Cardio</option>
                <option value="bodyweight">Peso corporal</option>
              </select>
              {ex.type !== 'cardio' && (<>
                <select className="re-ex-muscle" value={ex.muscleGroup}
                  onChange={e => updateEx(idx, { muscleGroup: e.target.value })}>
                  <option value="">Músculo…</option>
                  {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
                </select>
                <input className="re-ex-sets" type="number" min="1" max="10"
                  title="Series por defecto" value={ex.defaultSets}
                  onChange={e => updateEx(idx, { defaultSets: parseInt(e.target.value) || 3 })} />
                <span className="re-ex-sets-label">series</span>
              </>)}
            </div>
          </div>
        ))}
        <button className="re-add-ex-btn" onClick={addEx}>+ Añadir ejercicio</button>
      </div>

      {/* Acciones */}
      <div className="re-actions">
        {routine?.id && (
          <button className="re-delete-btn"
            onClick={() => { if (confirm('¿Eliminar esta rutina?')) { clearDraft(); onDelete(routine.id) } }}
          >Eliminar</button>
        )}
        <button className="re-save-btn" onClick={handleSave}
          disabled={saving || !name.trim()}
        >{saving ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </div>
  )
}
