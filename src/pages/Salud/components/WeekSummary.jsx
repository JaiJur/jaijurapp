import { useState, useRef, useEffect, useMemo } from 'react'

const TABS = [
  { key: 'all', label: 'Todo' },
  { key: 'cal', label: 'Calorías' },
  { key: 'steps', label: 'Pasos' },
  { key: 'weight', label: 'Peso' },
]

const DAYS_VISIBLE = 7
const DAY_W = 58
const H = 180
const PAD_T = 25
const PAD_B = 22
const CHART_H = H - PAD_T - PAD_B

export default function WeekSummary({ entries, config }) {
  const [tab, setTab] = useState('all')
  const scrollRef = useRef(null)
  const bmr = config?.bmr
  const goalWeight = config?.goalWeight
  const goalSteps = config?.goalSteps

  // Construir array de todos los días desde la primera entrada hasta hoy
  const { days, entryMap } = useMemo(() => {
    const map = Object.fromEntries(entries.map(e => [e.date, e]))
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
  }, [entries])

  // Scroll al final (día actual) al montar
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [days.length, tab])

  if (!days.length) {
    return (
      <div className="salud-week">
        <p className="salud-empty">Sin datos todavía.</p>
      </div>
    )
  }

  const totalW = days.length * DAY_W
  const showCal = tab === 'all' || tab === 'cal'
  const showSteps = tab === 'all' || tab === 'steps'
  const showWeight = tab === 'all' || tab === 'weight'

  // Datos
  const calData = days.map(d => entryMap[d]?.calories ?? null)
  const stepsData = days.map(d => entryMap[d]?.steps ?? null)
  const weightData = days.map(d => entryMap[d]?.weight ?? null)

  // Helpers de escala
  function buildScale(data, ref, pad) {
    const vals = data.filter(v => v != null)
    const all = ref != null ? [...vals, ref] : vals
    if (!all.length) return null
    const margin = (Math.max(...all) - Math.min(...all)) * (pad || 0.15) || 50
    const min = Math.min(...all) - margin
    const max = Math.max(...all) + margin
    return { min, max, yFn: v => PAD_T + CHART_H - ((v - min) / (max - min)) * CHART_H }
  }

  const calScale = showCal ? buildScale(calData, bmr) : null
  const stepsScale = showSteps ? buildScale(stepsData, goalSteps, 0.1) : null
  const weightScale = showWeight ? buildScale(weightData, goalWeight, 0.2) : null

  function xPos(i) { return i * DAY_W + DAY_W / 2 }

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

  // Medias (solo visibles en pestañas individuales)
  function calcAvg(data) {
    const vals = data.filter(v => v != null)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  const calAvg = tab === 'cal' ? calcAvg(calData) : null
  const stepsAvg = tab === 'steps' ? calcAvg(stepsData) : null

  // Labels de día
  const dayLabels = days.map(d => {
    const dt = new Date(d + 'T12:00:00')
    const wd = dt.toLocaleDateString('es-ES', { weekday: 'narrow' })
    const day = dt.getDate()
    return { wd, day, isFirst: day === 1 }
  })

  return (
    <div className="salud-week">
      {/* Tabs */}
      <div className="salud-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`salud-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Chart con scroll horizontal */}
      <div className="salud-chart-scroll" ref={scrollRef}>
        <svg width={totalW} height={H} viewBox={`0 0 ${totalW} ${H}`} className="salud-chart-svg">

          {/* Day columns alternadas */}
          {days.map((_, i) => (
            i % 2 === 0 && <rect key={i} x={i * DAY_W} y={0} width={DAY_W} height={H - PAD_B} fill="#0e0e16" />
          ))}

          {/* Day labels */}
          {dayLabels.map((l, i) => (
            <g key={i}>
              <text x={xPos(i)} y={H - 10} textAnchor="middle" fill="#555" fontSize="9">{l.wd}</text>
              <text x={xPos(i)} y={H - 1} textAnchor="middle" fill={l.isFirst ? '#888' : '#3a3a4a'} fontSize="7">
                {l.day}
              </text>
            </g>
          ))}

          {/* ── Ref lines ── */}
          {showCal && bmr && calScale && (
            <line x1={0} y1={calScale.yFn(bmr)} x2={totalW} y2={calScale.yFn(bmr)}
              stroke="#4dff88" strokeWidth="1" strokeDasharray="4 3" opacity=".5" />
          )}
          {showSteps && goalSteps && stepsScale && (
            <line x1={0} y1={stepsScale.yFn(goalSteps)} x2={totalW} y2={stepsScale.yFn(goalSteps)}
              stroke="#4dff88" strokeWidth="1" strokeDasharray="4 3" opacity=".5" />
          )}
          {showWeight && goalWeight && weightScale && (
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
          {showSteps && steps.points.map((p, i) => (
            <g key={`s${i}`}>
              <circle cx={p.x} cy={p.y} r="3.5" fill="#50bbff" />
              <text x={p.x} y={p.y - 7} textAnchor="middle" fill="#70ccff" fontSize="7" fontWeight="600">
                {p.v >= 1000 ? (p.v / 1000).toFixed(1) + 'k' : p.v}
              </text>
            </g>
          ))}

          {/* ── Calories line ── */}
          {showCal && cal.points.length > 1 && (
            <path d={cal.line} fill="none" stroke="#ff5050" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {showCal && cal.points.map((p, i) => (
            <g key={`c${i}`}>
              <circle cx={p.x} cy={p.y} r="3.5" fill="#ff5050" />
              <text x={p.x} y={p.y - 7} textAnchor="middle" fill="#ff8080" fontSize="7" fontWeight="600">{Math.round(p.v)}</text>
            </g>
          ))}

          {/* ── Weight line ── */}
          {showWeight && weight.points.length > 1 && (
            <path d={weight.line} fill="none" stroke="#ffaa30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {showWeight && weight.points.map((p, i) => (
            <g key={`w${i}`}>
              <circle cx={p.x} cy={p.y} r="3.5" fill="#ffaa30" />
              <text x={p.x} y={p.y - 7} textAnchor="middle" fill="#ffcc70" fontSize="7" fontWeight="600">{Number(p.v).toFixed(1)}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Leyenda */}
      <div className="salud-chart-legend">
        {showCal && <span className="salud-legend-item"><span className="salud-legend-dot" style={{ background: '#ff5050' }} />Calorías</span>}
        {showSteps && <span className="salud-legend-item"><span className="salud-legend-dot" style={{ background: '#50bbff' }} />Pasos</span>}
        {showWeight && <span className="salud-legend-item"><span className="salud-legend-dot" style={{ background: '#ffaa30' }} />Peso</span>}
        {showCal && bmr && <span className="salud-legend-item"><span className="salud-legend-line" style={{ background: '#4dff88' }} />TDEE {bmr}</span>}
        {showWeight && goalWeight && <span className="salud-legend-item"><span className="salud-legend-line" style={{ background: '#4b90ff' }} />Obj {goalWeight}kg</span>}
        {showSteps && goalSteps && <span className="salud-legend-item"><span className="salud-legend-line" style={{ background: '#4dff88' }} />Obj {goalSteps.toLocaleString()}</span>}
        {calAvg != null && <span className="salud-legend-item"><span className="salud-legend-line" style={{ background: '#ff5050' }} />Media {Math.round(calAvg)}</span>}
        {stepsAvg != null && <span className="salud-legend-item"><span className="salud-legend-line" style={{ background: '#50bbff' }} />Media {Math.round(stepsAvg).toLocaleString()}</span>}
      </div>
    </div>
  )
}
