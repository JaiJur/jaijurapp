import { useState } from 'react'
import '../views/views.css'

const RECURRENCE_OPTIONS = [
  { value: 'daily',  label: 'Diaria' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'custom', label: 'Cada X días' },
  { value: 'once',   label: 'Puntual' },
]

function TaskModal({ zones, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    name: '', zone: zones[0]?.id || '', recurrence: 'weekly',
    recurrenceDays: 2, xp: 10
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="hq-modal-backdrop" onClick={onClose}>
      <div className="hq-modal" onClick={e => e.stopPropagation()}>
        <div className="hq-modal-title">{initial ? 'Editar tarea' : 'Nueva tarea'}</div>

        <div className="hq-field">
          <label className="hq-label">Nombre</label>
          <input className="hq-input" value={form.name}
            onChange={e => set('name', e.target.value)} placeholder="Fregar los platos..." />
        </div>

        <div className="hq-field">
          <label className="hq-label">Zona</label>
          <select className="hq-select" value={form.zone} onChange={e => set('zone', e.target.value)}>
            {zones.map(z => <option key={z.id} value={z.id}>{z.emoji} {z.name}</option>)}
          </select>
        </div>

        <div className="hq-field">
          <label className="hq-label">Recurrencia</label>
          <select className="hq-select" value={form.recurrence} onChange={e => set('recurrence', e.target.value)}>
            {RECURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {form.recurrence === 'custom' && (
          <div className="hq-field">
            <label className="hq-label">Cada cuántos días</label>
            <input className="hq-input" type="number" min="1" value={form.recurrenceDays}
              onChange={e => set('recurrenceDays', parseInt(e.target.value) || 1)} />
          </div>
        )}

        <div className="hq-field">
          <label className="hq-label">XP por completar</label>
          <input className="hq-input" type="number" min="1" value={form.xp}
            onChange={e => set('xp', parseInt(e.target.value) || 1)} />
        </div>

        <div className="hq-modal-actions">
          <button className="hq-btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="hq-btn-primary"
            onClick={() => form.name.trim() && onSave(form)}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

function ZoneModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: '', emoji: '🏠' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="hq-modal-backdrop" onClick={onClose}>
      <div className="hq-modal" onClick={e => e.stopPropagation()}>
        <div className="hq-modal-title">{initial ? 'Editar zona' : 'Nueva zona'}</div>
        <div className="hq-field">
          <label className="hq-label">Emoji</label>
          <input className="hq-input" value={form.emoji} maxLength={2}
            onChange={e => set('emoji', e.target.value)} />
        </div>
        <div className="hq-field">
          <label className="hq-label">Nombre</label>
          <input className="hq-input" value={form.name}
            onChange={e => set('name', e.target.value)} placeholder="Cocina..." />
        </div>
        <div className="hq-modal-actions">
          <button className="hq-btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="hq-btn-primary"
            onClick={() => form.name.trim() && onSave(form)}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

export default function AdminView({ data, onSaveTask, onDeleteTask, onSaveZone, onDeleteZone }) {
  const [modal, setModal] = useState(null) // { type: 'task'|'zone', initial?: obj }
  const { tasks = [], zones = [] } = data

  const RECURRENCE_LABEL = { daily:'Diaria', weekly:'Semanal', once:'Puntual' }
  const recLabel = t => t.recurrence === 'custom' ? `Cada ${t.recurrenceDays}d` : (RECURRENCE_LABEL[t.recurrence] || '')

  return (
    <div className="hq-admin">
      {/* Zonas */}
      <div>
        <div className="hq-admin-section-title">🗺️ Zonas</div>
        <div className="hq-admin-list" style={{ marginBottom: 10 }}>
          {zones.length === 0 && <p className="hq-empty">Sin zonas</p>}
          {zones.map(z => (
            <div key={z.id} className="hq-admin-item">
              <div className="hq-admin-item-info">
                <div className="hq-admin-item-name">{z.emoji} {z.name}</div>
                <div className="hq-admin-item-meta">
                  {tasks.filter(t => t.zone === z.id).length} tareas
                </div>
              </div>
              <div className="hq-admin-actions">
                <button className="hq-icon-btn"
                  onClick={() => setModal({ type: 'zone', initial: z })}>✏️</button>
                <button className="hq-icon-btn danger"
                  onClick={() => onDeleteZone(z.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
        <button className="hq-add-btn" onClick={() => setModal({ type: 'zone' })}>
          + Nueva zona
        </button>
      </div>

      {/* Tareas */}
      <div>
        <div className="hq-admin-section-title">📋 Tareas</div>
        <div className="hq-admin-list" style={{ marginBottom: 10 }}>
          {tasks.length === 0 && <p className="hq-empty">Sin tareas</p>}
          {tasks.map(t => (
            <div key={t.id} className="hq-admin-item">
              <div className="hq-admin-item-info">
                <div className="hq-admin-item-name">{t.name}</div>
                <div className="hq-admin-item-meta">
                  {zones.find(z => z.id === t.zone)?.emoji} {zones.find(z => z.id === t.zone)?.name}
                  {' · '}{recLabel(t)}{' · '}{t.xp} XP
                </div>
              </div>
              <div className="hq-admin-actions">
                <button className="hq-icon-btn"
                  onClick={() => setModal({ type: 'task', initial: t })}>✏️</button>
                <button className="hq-icon-btn danger"
                  onClick={() => onDeleteTask(t.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
        {zones.length > 0 && (
          <button className="hq-add-btn" onClick={() => setModal({ type: 'task' })}>
            + Nueva tarea
          </button>
        )}
        {zones.length === 0 && (
          <p className="hq-empty">Crea una zona primero</p>
        )}
      </div>

      {/* Modales */}
      {modal?.type === 'task' && (
        <TaskModal
          zones={zones}
          initial={modal.initial}
          onSave={form => { onSaveTask(form); setModal(null) }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'zone' && (
        <ZoneModal
          initial={modal.initial}
          onSave={form => { onSaveZone(form); setModal(null) }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
