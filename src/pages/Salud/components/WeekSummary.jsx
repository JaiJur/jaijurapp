import { useState, useMemo } from 'react'

const METRICS = [
  { key: 'cal', label: 'Calorías' },
  { key: 'steps', label: 'Pasos' },
  { key: 'weight', label: 'Peso' },
  { key: 'strength', label: 'Fuerza' },
]

const H = 360
const PAD_T = 25
const PAD_B = 22
const CHART_H = H - PAD_T - PAD_B
const BASE_W = 700

export default function WeekSummary({ entries, config, days: daysProp }) {
  const [visible, setVisible] = useState({ cal: true, steps: true, weight: true, strength: false })
  const bmr = config?.bmr
  const minCalories = config?.minCalories
  const goalWeight = config?.goalWeight
  const goalSteps = config?.goalSteps

  function toggleMetric(key) {
    setVisible(prev => {
      const next = { ...prev, [key]: !prev[key] }
      // Evitar quedarse sin ninguna métrica activa
      if (!next.cal && !next.steps && !next.weight && !next.strength) return prev
      return next
    })
  }

  // Si se pasa un rango explícito de días (daysProp) se usa ese; si no, todos desde la primera entrada hasta hoy
  const { days, entryMap } = useMemo(() => {
    const map = Object.fromEntries(entries.map(e => [e.date, e]))
    if (daysProp) return { days: daysProp, entryMap: map }

    const today = new Date().toISOString().slice(0, 10)
    if (!entries.length) return { days: [], entryMap: map }

    // Encontrar la fecha más antigua
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
    const first = sorted[0].date
    const result = []
    const d = new Date(first + 'T12:00:00')
    const end = new Date(today + 'T12:00:00')
    while (d <= end) {
      result.push(d.toISOString().slice(0, 10))
      d.setDate(d.getDate() + 1)
    }
    return { days: result, entryMap: map }
  }, [entries, daysProp])

  if (!days.length) {
    return (
      <div className="salud-week">
        <p className="salud-empty">Sin datos en este rango.</p>
      </div>
    )
  }

  const totalW = BASE_W
  const dayW = totalW / days.length
  const showCal = visible.cal
  const showSteps = visible.steps
  const showWeight = visible.weight
  const showStrength = visible.strength
  const activeCount = [visible.cal, visible.steps, visible.weight, visible.strength].filter(Boolean).length
  const dense = days.length > 31
  const showPoints = days.length <= 60
  const showPointLabels = days.length <= 21

  // Datos
  const calData = days.map(d => entryMap[d]?.calories ?? null)
  const stepsData = days.map(d => entryMap[d]?.steps ?? null)
  const weightData = days.map(d => entryMap[d]?.weight ?? null)
  const strengthWeightData = days.map(d => entryMap[d]?.strengthWeight ?? null)
  const strengthDays = days.map(d => !!entryMap[d]?.strength)

  // Helpers de escala
  function buildScale(data, ref, pad, ref2) {
    const vals = data.filter(v => v != null)
    const all = [...vals]
    if (ref != null) all.push(ref)
    if (ref2 != null) all.push(ref2)
    if (!all.length) return null
    const margin = (Math.max(...all) - Math.min(...all)) * (pad || 0.15) || 50
    const min = Math.min(...all) - margin
    const max = Math.max(...all) + margin
    return { min, max, yFn: v => PAD_T + CHART_H - ((v - min) / (max - min)) * CHART_H }
  }

  const calScale = showCal ? buildScale(calData, bmr, 0.15, minCalories) : null
  const stepsScale = showSteps ? buildScale(stepsData, goalSteps, 0.1) : null
  const weightScale = showWeight ? buildScale(weightData, goalWeight, 0.2) : null
  const strengthScale = showStrength ? buildScale(strengthWeightData, null, 0.2) : null

  function xPos(i) { return i * dayW + dayW / 2 }

  // Construir puntos + paths
  function buildPoints(data, scale) {
    if (!scale) return { points: [], line: '' }
    const points = data
      .map((v, i) => v != null ? { x: xPos(i), y: scale.yFn(v), v } : null)
      .filter(Boolean)
    const line = points.map((p, j) => `${j === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
    return { points, line }
  }

  const cal = buildPoints(calData, calScale)
  const steps = buildPoints(stepsData, stepsScale)
  const weight = buildPoints(weightData, weightScale)
  const strengthW = buildPoints(strengthWeightData, strengthScale)

  // Medias (solo visibles en pestañas individuales)
  function calcAvg(data) {
    const vals = data.filter(v => v != null)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  const calAvg = (showCal && activeCount === 1) ? calcAvg(calData) : null
  const stepsAvg = (showSteps && activeCount === 1) ? calcAvg(stepsData) : null

  // Labels de día (en rangos largos se muestran solo algunos para no amontonar)
  const labelStep = days.length <= 31 ? 1 : days.length <= 90 ? 7 : days.length <= 180 ? 14 : 30
  const dayLabels = days.map((d, i) => {
    if (i % labelStep !== 0) return null
    const dt = new Date(d + 'T12:00:00')
    if (dense) {
      return { text: dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) }
    }
    const wd = dt.toLocaleDateString('es-ES', { weekday: 'narrow' })
    const day = dt.getDate()
    return { wd, day, isFirst: day === 1 }
  })

  return (
    <div className="salud-week">
      {/* Toggles de métricas (selección múltiple) */}
      <div className="salud-tabs">
        {METRICS.map(m => (
          <button
            key={m.key}
            className={`salud-tab ${visible[m.key] ? 'active' : ''}`}
            onClick={() => toggleMetric(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Chart, ancho completo, sin scroll */}
      <div className="salud-chart-wrap">
        <svg width="100%" height={H} viewBox={`0 0 ${totalW} ${H}`} preserveAspectRatio="none" className="salud-chart-svg">

          {/* Day columns alternadas */}
          {days.map((_, i) => (
            i % 2 === 0 && <rect key={i} x={i * dayW} y={0} width={dayW} height={H - PAD_B} fill="#0e0e16" />
          ))}

          {/* Day labels */}
          {dayLabels.map((l, i) => l && (
            <g key={i}>
              {l.text ? (
                <text x={xPos(i)} y={H - 4} textAnchor="middle" fill="#555" fontSize="8">{l.text}</text>
              ) : (
                <>
                  <text x={xPos(i)} y={H - 10} textAnchor="middle" fill="#555" fontSize="9">{l.wd}</text>
                  <text x={xPos(i)} y={H - 1} textAnchor="middle" fill={l.isFirst ? '#888' : '#3a3a4a'} fontSize="7">
                    {l.day}
                  </text>
                </>
              )}
            </g>
          ))}

          {/* ── Marcador de ejercicio de fuerza (solo en filtro de Pasos en solitario) ── */}
          {showSteps && activeCount === 1 && strengthDays.map((s, i) => s && (
            <text key={`str${i}`} x={xPos(i)} y={PAD_T - 11} textAnchor="middle" fontSize={dense ? '9' : '12'}>
              🏋️
            </text>
          ))}

          {/* ── Ref lines (solo cuando ese filtro está solo) ── */}
          {showCal && activeCount === 1 && bmr && calScale && (
            <line x1={0} y1={calScale.yFn(bmr)} x2={totalW} y2={calScale.yFn(bmr)}
              stroke="#4dff88" strokeWidth="1" strokeDasharray="4 3" opacity=".5" />
          )}
          {showCal && activeCount === 1 && minCalories && calScale && (
            <line x1={0} y1={calScale.yFn(minCalories)} x2={totalW} y2={calScale.yFn(minCalories)}
              stroke="#ffc83e" strokeWidth="1" strokeDasharray="4 3" opacity=".5" />
          )}
          {showSteps && activeCount === 1 && goalSteps && stepsScale && (
            <line x1={0} y1={stepsScale.yFn(goalSteps)} x2={totalW} y2={stepsScale.yFn(goalSteps)}
              stroke="#4dff88" strokeWidth="1" strokeDasharray="4 3" opacity=".5" />
          )}
          {showWeight && activeCount === 1 && goalWeight && weightScale && (
            <line x1={0} y1={weightScale.yFn(goalWeight)} x2={totalW} y2={weightScale.yFn(goalWeight)}
              stroke="#4b90ff" strokeWidth="1" strokeDasharray="4 3" opacity=".5" />
          )}

          {/* ── Avg lines (solo en pestañas individuales) ── */}
          {calAvg != null && calScale && (
            <line x1={0} y1={calScale.yFn(calAvg)} x2={totalW} y2={calScale.yFn(calAvg)}
              stroke="#ff5050" strokeWidth="1" strokeDasharray="2 4" opacity=".6" />
          )}
          {stepsAvg != null && stepsScale && (
            <line x1={0} y1={stepsScale.yFn(stepsAvg)} x2={totalW} y2={stepsScale.yFn(stepsAvg)}
              stroke="#50bbff" strokeWidth="1" strokeDasharray="2 4" opacity=".6" />
          )}

          {/* ── Steps line ── */}
          {showSteps && steps.points.length > 1 && (
            <path d={steps.line} fill="none" stroke="#50bbff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {showSteps && showPoints && steps.points.map((p, i) => (
            <g key={`s${i}`}>
              <circle cx={p.x} cy={p.y} r={dense ? '2' : '3.5'} fill="#50bbff" />
              {showPointLabels && (
                <text x={p.x} y={p.y - 7} textAnchor="middle" fill="#70ccff" fontSize="7" fontWeight="600">
                  {p.v >= 1000 ? (p.v / 1000).toFixed(1) + 'k' : p.v}
                </text>
              )}
            </g>
          ))}

          {/* ── Calories line ── */}
          {showCal && cal.points.length > 1 && (
            <path d={cal.line} fill="none" stroke="#ff5050" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {showCal && showPoints && cal.points.map((p, i) => (
            <g key={`c${i}`}>
              <circle cx={p.x} cy={p.y} r={dense ? '2' : '3.5'} fill="#ff5050" />
              {showPointLabels && (
                <text x={p.x} y={p.y - 7} textAnchor="middle" fill="#ff8080" fontSize="7" fontWeight="600">{Math.round(p.v)}</text>
              )}
            </g>
          ))}

          {/* ── Weight line ── */}
          {showWeight && weight.points.length > 1 && (
            <path d={weight.line} fill="none" stroke="#ffaa30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {showWeight && showPoints && weight.points.map((p, i) => (
            <g key={`w${i}`}>
              <circle cx={p.x} cy={p.y} r={dense ? '2' : '3.5'} fill="#ffaa30" />
              {showPointLabels && (
                <text x={p.x} y={p.y - 7} textAnchor="middle" fill="#ffcc70" fontSize="7" fontWeight="600">{Number(p.v).toFixed(1)}</text>
              )}
            </g>
          ))}

          {/* ── Strength weight line ── */}
          {showStrength && strengthW.points.length > 1 && (
            <path d={strengthW.line} fill="none" stroke="#c65dff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {showStrength && showPoints && strengthW.points.map((p, i) => (
            <g key={`sw${i}`}>
              <circle cx={p.x} cy={p.y} r={dense ? '2' : '3.5'} fill="#c65dff" />
              {showPointLabels && (
                <text x={p.x} y={p.y - 7} textAnchor="middle" fill="#dd9bff" fontSize="7" fontWeight="600">{Number(p.v).toFixed(1)}</text>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* Leyenda */}
      <div className="salud-chart-legend">
        {showCal && <span className="salud-legend-item"><span className="salud-legend-dot" style={{ background: '#ff5050' }} />Calorías</span>}
        {showSteps && <span className="salud-legend-item"><span className="salud-legend-dot" style={{ background: '#50bbff' }} />Pasos</span>}
        {showWeight && <span className="salud-legend-item"><span className="salud-legend-dot" style={{ background: '#ffaa30' }} />Peso</span>}
        {showStrength && <span className="salud-legend-item"><span className="salud-legend-dot" style={{ background: '#c65dff' }} />Peso ejercicios</span>}
        {showSteps && activeCount === 1 && strengthDays.some(Boolean) && <span className="salud-legend-item">🏋️ Fuerza</span>}
        {showCal && activeCount === 1 && bmr && <span className="salud-legend-item"><span className="salud-legend-line" style={{ background: '#4dff88' }} />TDEE {bmr}</span>}
        {showCal && activeCount === 1 && minCalories && <span className="salud-legend-item"><span className="salud-legend-line" style={{ background: '#ffc83e' }} />Mín {minCalories}</span>}
        {showWeight && activeCount === 1 && goalWeight && <span className="salud-legend-item"><span className="salud-legend-line" style={{ background: '#4b90ff' }} />Obj {goalWeight}kg</span>}
        {showSteps && activeCount === 1 && goalSteps && <span className="salud-legend-item"><span className="salud-legend-line" style={{ background: '#4dff88' }} />Obj {goalSteps.toLocaleString()}</span>}
        {calAvg != null && <span className="salud-legend-item"><span className="salud-legend-line" style={{ background: '#ff5050' }} />Media {Math.round(calAvg)}</span>}
        {stepsAvg != null && <span className="salud-legend-item"><span className="salud-legend-line" style={{ background: '#50bbff' }} />Media {Math.round(stepsAvg).toLocaleString()}</span>}
      </div>
    </div>
  )
}
