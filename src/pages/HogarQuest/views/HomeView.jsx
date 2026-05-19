import { useState, useCallback } from 'react'
import './HomeView.css'

const RECURRENCE_LABEL = {
  daily:   'Diaria',
  weekly:  'Semanal',
  once:    'Puntual',
}

function getRecurrenceLabel(task) {
  if (task.recurrence === 'custom') return `Cada ${task.recurrenceDays}d`
  return RECURRENCE_LABEL[task.recurrence] || task.recurrence
}

function isOverdue(task) {
  if (!task.lastDone) return task.recurrence !== 'once'
  const last = new Date(task.lastDone)
  const now  = new Date()
  const diffDays = (now - last) / (1000 * 60 * 60 * 24)
  if (task.recurrence === 'daily')  return diffDays >= 1
  if (task.recurrence === 'weekly') return diffDays >= 7
  if (task.recurrence === 'custom') return diffDays >= (task.recurrenceDays || 1)
  return false
}

function isDone(task) {
  if (!task.lastDone) return false
  const last = new Date(task.lastDone)
  const now  = new Date()
  const diffDays = (now - last) / (1000 * 60 * 60 * 24)
  if (task.recurrence === 'once')   return true
  if (task.recurrence === 'daily')  return diffDays < 1
  if (task.recurrence === 'weekly') return diffDays < 7
  if (task.recurrence === 'custom') return diffDays < (task.recurrenceDays || 1)
  return false
}

function MonsterMini({ zone, monsters }) {
  const chain = monsters.filter(m => m.zone === zone.id)
  const current = chain.find(m => !m.defeated)
  if (!current) return <span style={{ fontSize: '0.7rem', color: '#555' }}>✅ Zona limpia</span>
  const pct = Math.min(100, Math.round((zone.xp / current.xpRequired) * 100))
  return (
    <div className="hq-zone-monster-mini">
      <span>{current.name}</span>
      <div className="hq-mini-bar-bg">
        <div className="hq-mini-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span style={{ color: '#c8f135' }}>{pct}%</span>
    </div>
  )
}

function spawnXPFloat(xp, e) {
  const el = document.createElement('div')
  el.className = 'hq-xp-float'
  el.textContent = `+${xp} XP`
  el.style.left = `${e.clientX}px`
  el.style.top  = `${e.clientY - 10}px`
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 1300)
}

export default function HomeView({ data, onComplete }) {
  const [openZones, setOpenZones] = useState({})

  const toggleZone = (id) =>
    setOpenZones(prev => ({ ...prev, [id]: !prev[id] }))

  const handleComplete = useCallback((task, e) => {
    if (isDone(task)) return
    spawnXPFloat(task.xp, e)
    onComplete(task)
  }, [onComplete])

  const { tasks = [], zones = [], monsters = [] } = data

  return (
    <div className="hq-home">
      {zones.length === 0 && (
        <p className="hq-empty">No hay zonas creadas. Ve a Admin para empezar.</p>
      )}
      {zones.map(zone => {
        const zoneTasks = tasks.filter(t => t.zone === zone.id)
        const isOpen = openZones[zone.id] ?? true
        const pending = zoneTasks.filter(t => !isDone(t)).length
        return (
          <div key={zone.id} className="hq-zone-card">
            <div className="hq-zone-header" onClick={() => toggleZone(zone.id)}>
              <div className="hq-zone-left">
                <span className="hq-zone-emoji">{zone.emoji}</span>
                <span className="hq-zone-name">{zone.name}</span>
                {pending > 0 && (
                  <span style={{
                    background: '#ff6b6b', color: '#fff',
                    borderRadius: '10px', padding: '1px 7px',
                    fontSize: '0.65rem', fontWeight: 600
                  }}>{pending}</span>
                )}
              </div>
              <MonsterMini zone={{ ...zone, xp: zone.xp || 0 }} monsters={monsters} />
              <span className={`hq-zone-chevron ${isOpen ? 'open' : ''}`}>▼</span>
            </div>

            {isOpen && zoneTasks.length > 0 && (
              <div className="hq-task-list">
                {zoneTasks.map(task => {
                  const done    = isDone(task)
                  const overdue = !done && isOverdue(task)
                  return (
                    <div
                      key={task.id}
                      className={`hq-task-item ${done ? 'done' : ''} ${overdue ? 'overdue' : ''}`}
                      onClick={e => handleComplete(task, e)}
                    >
                      <div className="hq-task-check">{done ? '✓' : ''}</div>
                      <div className="hq-task-info">
                        <div className="hq-task-name">{task.name}</div>
                        <div className="hq-task-meta">
                          {getRecurrenceLabel(task)}
                          {task.lastDone && ` · ${task.lastWho}`}
                          {overdue && ' · ⚠️ Atrasada'}
                        </div>
                      </div>
                      <div className="hq-task-xp">+{task.xp} XP</div>
                    </div>
                  )
                })}
              </div>
            )}
            {isOpen && zoneTasks.length === 0 && (
              <p className="hq-empty" style={{ margin: 0 }}>Sin tareas en esta zona</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
