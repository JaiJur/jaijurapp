// SessionView — entreno activo con checklist, autosave y añadir ejercicios
import { useState } from 'react'
import './SessionView.css'

const MUSCLE_GROUPS = ['Pecho','Espalda','Hombros','Bíceps','Tríceps','Piernas','Glúteos','Core']

export default function SessionView({ session, onSessionChange, onFinish, onCancel }) {
  const [exercises, setExercises] = useState(session.exercises)
  const [showAddEx, setShowAddEx] = useState(false)
  const [newEx, setNewEx]         = useState({ name: '', type: 'weights', muscleGroup: '', sets: 3 })
  const [confirmCancel, setConfirmCancel] = useState(false)

  const total = exercises.length
  const done  = exercises.filter(e => e.done).length

  // Notifica cambios hacia arriba (para autosave)
  function update(updated) {
    setExercises(updated)
    onSessionChange({ ...session, exercises: updated })
  }

  function updateSet(exIdx, setIdx, patch) {
    update(exercises.map((e, i) => {
      if (i !== exIdx) return e
      return { ...e, sets: e.sets.map((s, j) => j === setIdx ? { ...s, ...patch } : s) }
    }))
  }

  function addSet(exIdx) {
    update(exercises.map((e, i) => {
      if (i !== exIdx) return e
      const last = e.sets[e.sets.length - 1] || {}
      return { ...e, sets: [...e.sets, { ...last, reps: '', weight: '' }] }
    }))
  }

  function removeSet(exIdx, setIdx) {
    update(exercises.map((e, i) => {
      if (i !== exIdx) return e
      const sets = e.sets.filter((_, j) => j !== setIdx)
      return { ...e, sets: sets.length ? sets : e.sets }
    }))
  }

  function toggleDone(idx) {
    update(exercises.map((e, i) => i === idx ? { ...e, done: !e.done } : e))
  }

  function updateNote(idx, notes) {
    update(exercises.map((e, i) => i === idx ? { ...e, notes } : e))
  }

  function updateCardioSet(idx, patch) {
    update(exercises.map((e, i) => {
      if (i !== idx) return e
      return { ...e, sets: [{ ...e.sets[0], ...patch }] }
    }))
  }

  // ── añadir ejercicio sobre la marcha ──────────────────────
  function handleAddExercise() {
    if (!newEx.name.trim()) return
    const ex = {
      name: newEx.name.trim(),
      type: newEx.type,
      muscleGroup: newEx.muscleGroup,
      sets: newEx.type === 'cardio'
        ? [{ cardioType: '', minutes: '' }]
        : Array.from({ length: newEx.sets || 3 }, () => ({ reps: '', weight: '' })),
      done: false,
      notes: '',
    }
    update([...exercises, ex])
    setNewEx({ name: '', type: 'weights', muscleGroup: '', sets: 3 })
    setShowAddEx(false)
  }

  function handleFinish() {
    onFinish({ ...session, exercises, finished: true, endDate: new Date().toISOString() })
  }

  return (
    <div className="session-view">
      {/* Header */}
      <div className="sv-header">
        <button className="sv-back-btn" onClick={() => setConfirmCancel(true)}>←</button>
        <div className="sv-title-block">
          <h2 className="sv-title">{session.routineName}</h2>
          <div className="sv-title-meta">
            <span className="sv-date">{new Date(session.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            <span className="sv-progress-dot">·</span>
            <span className="sv-progress">{done}/{total} ejercicios</span>
          </div>
        </div>
        <button className="sv-add-ex-btn-header" onClick={() => setShowAddEx(true)} title="Añadir ejercicio">+</button>
      </div>

      {/* Progress bar */}
      <div className="sv-progress-bar">
        <div className="sv-progress-fill" style={{ width: `${total ? (done/total)*100 : 0}%` }} />
      </div>

      {/* Exercises */}
      <div className="sv-exercises">
        {exercises.map((ex, idx) => (
          <ExerciseCard
            key={idx}
            exercise={ex}
            onToggleDone={() => toggleDone(idx)}
            onUpdateSet={(si, patch) => updateSet(idx, si, patch)}
            onAddSet={() => addSet(idx)}
            onRemoveSet={(si) => removeSet(idx, si)}
            onNoteChange={(notes) => updateNote(idx, notes)}
            onCardioChange={(patch) => updateCardioSet(idx, patch)}
          />
        ))}
      </div>

      {/* Add exercise panel */}
      {showAddEx && (
        <div className="sv-add-ex-panel">
          <div className="sv-add-ex-title">Añadir ejercicio</div>
          <input
            className="sv-add-ex-input"
            placeholder="Nombre del ejercicio…"
            value={newEx.name}
            onChange={e => setNewEx(p => ({ ...p, name: e.target.value }))}
            autoFocus
          />
          <div className="sv-add-ex-row">
            <select
              className="sv-add-ex-select"
              value={newEx.type}
              onChange={e => setNewEx(p => ({ ...p, type: e.target.value }))}
            >
              <option value="weights">Pesas / máquina</option>
              <option value="cardio">Cardio</option>
              <option value="bodyweight">Peso corporal</option>
            </select>
            {newEx.type !== 'cardio' && (
              <>
                <select
                  className="sv-add-ex-select"
                  value={newEx.muscleGroup}
                  onChange={e => setNewEx(p => ({ ...p, muscleGroup: e.target.value }))}
                >
                  <option value="">Músculo…</option>
                  {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input
                  className="sv-add-ex-sets"
                  type="number" min="1" max="10"
                  value={newEx.sets}
                  onChange={e => setNewEx(p => ({ ...p, sets: parseInt(e.target.value) || 3 }))}
                  title="Series"
                />
                <span className="sv-add-ex-sets-label">series</span>
              </>
            )}
          </div>
          <div className="sv-add-ex-actions">
            <button className="sv-add-ex-cancel" onClick={() => setShowAddEx(false)}>Cancelar</button>
            <button className="sv-add-ex-confirm" onClick={handleAddExercise} disabled={!newEx.name.trim()}>
              Añadir
            </button>
          </div>
        </div>
      )}

      {/* Finish */}
      <div className="sv-footer">
        {done === total && total > 0 ? (
          <button className="sv-finish-btn" onClick={handleFinish}>🏁 Finalizar entreno</button>
        ) : (
          <p className="sv-finish-hint">{done}/{total} completados — sigue así 💪</p>
        )}
      </div>

      {/* Confirm cancel */}
      {confirmCancel && (
        <div className="sv-confirm-overlay">
          <div className="sv-confirm-box">
            <p>El progreso se guarda automáticamente. Puedes retomar el entreno cuando quieras.</p>
            <div className="sv-confirm-actions">
              <button className="sv-confirm-stay" onClick={() => setConfirmCancel(false)}>Seguir entrenando</button>
              <button className="sv-confirm-leave" onClick={onCancel}>Salir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ExerciseCard ─────────────────────────────────────────
function ExerciseCard({ exercise, onToggleDone, onUpdateSet, onAddSet, onRemoveSet, onNoteChange, onCardioChange }) {
  const isCardio = exercise.type === 'cardio'

  return (
    <div className={`sv-ex-card ${exercise.done ? 'done' : ''}`}>
      <div className="sv-ex-header">
        <button className={`sv-check-btn ${exercise.done ? 'checked' : ''}`} onClick={onToggleDone}>
          {exercise.done ? '✓' : '○'}
        </button>
        <div className="sv-ex-name">{exercise.name}</div>
        {exercise.muscleGroup && <span className="sv-ex-muscle">{exercise.muscleGroup}</span>}
      </div>

      {isCardio ? (
        <div className="sv-cardio-row">
          <select
            className="sv-cardio-type"
            value={exercise.sets[0]?.cardioType || ''}
            onChange={e => onCardioChange({ cardioType: e.target.value })}
          >
            <option value="">Tipo de cardio…</option>
            {['Cinta','Bici','Elíptica','Remo ergómetro','Saltar cuerda','Correr','HIIT','Otro'].map(t =>
              <option key={t} value={t}>{t}</option>
            )}
          </select>
          <input
            className="sv-cardio-min"
            type="number" min="1" placeholder="min"
            value={exercise.sets[0]?.minutes || ''}
            onChange={e => onCardioChange({ minutes: e.target.value })}
          />
          <span className="sv-cardio-unit">min</span>
        </div>
      ) : (
        <div className="sv-sets">
          <div className="sv-sets-header">
            <span>Serie</span><span>Reps</span><span>Kg</span><span></span>
          </div>
          {exercise.sets.map((set, si) => (
            <div key={si} className="sv-set-row">
              <span className="sv-set-num">{si + 1}</span>
              <input className="sv-set-input" type="number" min="0" placeholder="—"
                value={set.reps} onChange={e => onUpdateSet(si, { reps: e.target.value })} />
              <input className="sv-set-input" type="number" min="0" step="0.5" placeholder="—"
                value={set.weight} onChange={e => onUpdateSet(si, { weight: e.target.value })} />
              <button className="sv-remove-set" onClick={() => onRemoveSet(si)}>✕</button>
            </div>
          ))}
          <button className="sv-add-set-btn" onClick={onAddSet}>+ Serie</button>
        </div>
      )}

      <input
        className="sv-notes-input"
        type="text" placeholder="Notas (opcional)…"
        value={exercise.notes || ''}
        onChange={e => onNoteChange(e.target.value)}
      />
    </div>
  )
}
