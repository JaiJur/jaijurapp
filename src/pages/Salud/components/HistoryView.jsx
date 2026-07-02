import { useState, useMemo } from 'react'
import WeekSummary from './WeekSummary'
import HistoryList from './HistoryList'
import { todayISO, addDays, rangeDays, lastNDays } from '../dateUtils'

const FILTERS = [
  { key: 'week', label: 'Última semana' },
  { key: 'month', label: 'Último mes' },
  { key: 'year', label: 'Último año' },
  { key: 'custom', label: 'Rango' },
]

export default function HistoryView({ entries, config, onEdit }) {
  const [filter, setFilter] = useState('month')
  const today = todayISO()
  const [customFrom, setCustomFrom] = useState(addDays(today, -30))
  const [customTo, setCustomTo] = useState(today)

  const { from, to } = useMemo(() => {
    if (filter === 'week') return { from: addDays(today, -6), to: today }
    if (filter === 'month') return { from: addDays(today, -29), to: today }
    if (filter === 'year') return { from: addDays(today, -364), to: today }
    return { from: customFrom, to: customTo }
  }, [filter, today, customFrom, customTo])

  const days = useMemo(() => {
    if (!from || !to || from > to) return []
    return rangeDays(from, to)
  }, [from, to])

  const filteredEntries = useMemo(() => {
    return entries
      .filter(e => e.date >= from && e.date <= to)
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [entries, from, to])

  // Las cards de historial solo muestran los últimos 10 días; el resto solo vive en el gráfico
  const last10Days = useMemo(() => lastNDays(10), [])
  const cardEntries = useMemo(() => {
    return entries
      .filter(e => last10Days.includes(e.date))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [entries, last10Days])

  return (
    <div className="salud-history-view">
      <div className="salud-filters">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`salud-filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filter === 'custom' && (
        <div className="salud-range-picker">
          <input
            type="date"
            className="salud-input"
            value={customFrom}
            max={customTo}
            onChange={e => setCustomFrom(e.target.value)}
          />
          <span className="salud-range-sep">→</span>
          <input
            type="date"
            className="salud-input"
            value={customTo}
            min={customFrom}
            max={today}
            onChange={e => setCustomTo(e.target.value)}
          />
        </div>
      )}

      <WeekSummary entries={filteredEntries} config={config} days={days} />

      <HistoryList entries={cardEntries} bmr={config?.bmr} onEdit={onEdit} />
    </div>
  )
}
