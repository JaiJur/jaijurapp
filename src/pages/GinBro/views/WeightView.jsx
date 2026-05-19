// WeightView — registro y gráfico de evolución de peso
import { useState } from 'react'
import './WeightView.css'

const GOAL_KG   = 85
const START_KG  = 102
const START_DATE = new Date('2026-01-01')

function daysSince(dateStr) {
  return Math.round((new Date(dateStr) - START_DATE) / 86400000)
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

// ── Gráfico SVG ─────────────────────────────────────────
function WeightChart({ entries }) {
  const W = 340, H = 200
  const PAD = { top: 16, right: 16, bottom: 32, left: 36 }
  const gW = W - PAD.left - PAD.right
  const gH = H - PAD.top  - PAD.bottom

  // Todos los puntos incluyendo el punto inicial fijo
  const allPoints = [
    { date: START_DATE.toISOString(), kg: START_KG },
    ...entries,
  ]

  const today = new Date()
  const totalDays = Math.max(daysSince(today.toISOString()), 1)

  // Rango Y: desde objetivo -2 hasta máximo +2
  const maxKg = Math.max(START_KG, ...entries.map(e => e.kg)) + 2
  const minKg = Math.min(GOAL_KG, ...entries.map(e => e.kg)) - 2

  function xOf(dateStr) {
    return PAD.left + (daysSince(dateStr) / totalDays) * gW
  }
  function yOf(kg) {
    return PAD.top + ((maxKg - kg) / (maxKg - minKg)) * gH
  }

  // Línea de progreso
  const points = allPoints.map(p => `${xOf(p.date)},${yOf(p.kg)}`).join(' ')

  // Línea objetivo horizontal
  const goalY = yOf(GOAL_KG)

  // Etiquetas eje Y
  const ySteps = []
  for (let kg = Math.ceil(minKg); kg <= Math.floor(maxKg); kg += 5) {
    ySteps.push(kg)
  }

  // Etiquetas eje X (meses)
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const xLabels = []
  for (let m = 0; m < 12; m++) {
    const d = new Date(2026, m, 1)
    if (d <= today) {
      const x = PAD.left + (daysSince(d.toISOString()) / totalDays) * gW
      xLabels.push({ label: months[m], x })
    }
  }

  const lastPoint = allPoints[allPoints.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="wv-chart-svg" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {ySteps.map(kg => (
        <line key={kg}
          x1={PAD.left} y1={yOf(kg)} x2={W - PAD.right} y2={yOf(kg)}
          stroke="#222" strokeWidth="1"
        />
      ))}

      {/* Objetivo line */}
      <line
        x1={PAD.left} y1={goalY} x2={W - PAD.right} y2={goalY}
        stroke="#ff6a00" strokeWidth="1.5" strokeDasharray="5,4" opacity=".7"
      />
      <text x={W - PAD.right - 2} y={goalY - 4} fill="#ff6a00" fontSize="9" textAnchor="end">
        objetivo {GOAL_KG}kg
      </text>

      {/* Eje Y labels */}
      {ySteps.map(kg => (
        <text key={kg} x={PAD.left - 4} y={yOf(kg) + 3.5}
          fill="#555" fontSize="8.5" textAnchor="end">{kg}</text>
      ))}

      {/* Eje X labels */}
      {xLabels.map(({ label, x }) => (
        <text key={label} x={x} y={H - PAD.bottom + 12}
          fill="#555" fontSize="8.5" textAnchor="middle">{label}</text>
      ))}

      {/* Área bajo la curva */}
      {allPoints.length > 1 && (
        <polyline
          points={points}
          fill="none" stroke="#4a9eff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
        />
      )}

      {/* Puntos */}
      {allPoints.map((p, i) => (
        <circle key={i}
          cx={xOf(p.date)} cy={yOf(p.kg)} r={i === 0 ? 3.5 : 4}
          fill={i === 0 ? '#555' : '#4a9eff'}
          stroke="#0d0d0d" strokeWidth="1.5"
        />
      ))}

      {/* Punto actual con etiqueta */}
      {lastPoint && allPoints.length > 1 && (
        <text x={xOf(lastPoint.date)} y={yOf(lastPoint.kg) - 8}
          fill="#4a9eff" fontSize="10" fontWeight="bold" textAnchor="middle">
          {lastPoint.kg}kg
        </text>
      )}
    </svg>
  )
}

// ── Vista principal ──────────────────────────────────────
export default function WeightView({ weightLog, onSave }) {
  const [newKg, setNewKg]     = useState('')
  const [saving, setSaving]   = useState(false)

  // Ordenar entradas por fecha ascendente
  const entries = [...weightLog].sort((a, b) => new Date(a.date) - new Date(b.date))
  const latest  = entries[entries.length - 1]
  const diff    = latest ? (latest.kg - START_KG).toFixed(1) : null
  const toGoal  = latest ? (latest.kg - GOAL_KG).toFixed(1) : (START_KG - GOAL_KG)

  async function handleAdd() {
    const kg = parseFloat(newKg)
    if (!kg || kg < 30 || kg > 300) return
    setSaving(true)
    const entry = { date: new Date().toISOString(), kg }
    await onSave([...weightLog, entry])
    setNewKg('')
    setSaving(false)
  }

  async function handleDelete(idx) {
    const updated = entries.filter((_, i) => i !== idx)
    await onSave(updated)
  }

  return (
    <div className="weight-view">
      {/* Stats */}
      <div className="wv-stats">
        <div className="wv-stat">
          <span className="wv-stat-label">Inicio</span>
          <span className="wv-stat-val">{START_KG} kg</span>
        </div>
        <div className="wv-stat">
          <span className="wv-stat-label">Actual</span>
          <span className="wv-stat-val wv-stat-current">
            {latest ? `${latest.kg} kg` : '—'}
          </span>
        </div>
        <div className="wv-stat">
          <span className="wv-stat-label">Cambio</span>
          <span className={`wv-stat-val ${diff < 0 ? 'wv-down' : diff > 0 ? 'wv-up' : ''}`}>
            {diff !== null ? `${diff > 0 ? '+' : ''}${diff} kg` : '—'}
          </span>
        </div>
        <div className="wv-stat">
          <span className="wv-stat-label">Para objetivo</span>
          <span className="wv-stat-val wv-goal-diff">
            {toGoal > 0 ? `-${toGoal} kg` : '¡Logrado! 🎉'}
          </span>
        </div>
      </div>

      {/* Gráfico */}
      <div className="wv-chart-wrap">
        <WeightChart entries={entries} />
      </div>

      {/* Añadir pesada */}
      <div className="wv-add-row">
        <input
          className="wv-kg-input"
          type="number" step="0.1" min="30" max="300"
          placeholder="Ej: 99.5"
          value={newKg}
          onChange={e => setNewKg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <span className="wv-kg-unit">kg</span>
        <button className="wv-add-btn" onClick={handleAdd} disabled={saving || !newKg}>
          {saving ? '…' : '+ Registrar'}
        </button>
      </div>

      {/* Lista de pesadas */}
      <div className="wv-log">
        <h3 className="wv-log-title">Registro</h3>
        {entries.length === 0 && (
          <p className="wv-log-empty">Aún no has registrado ningún peso.</p>
        )}
        {[...entries].reverse().map((e, i) => (
          <div key={i} className="wv-log-row">
            <span className="wv-log-date">{formatDate(e.date)}</span>
            <span className="wv-log-kg">{e.kg} kg</span>
            <button className="wv-log-del" onClick={() => handleDelete(entries.length - 1 - i)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
