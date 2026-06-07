import { useState } from 'react'
import AppHeader from '../../components/AppHeader'
import useSalud from '../../hooks/useSalud'
import DayForm from './components/DayForm'
import HistoryList from './components/HistoryList'
import WeekSummary from './components/WeekSummary'
import BmrConfig from './components/BmrConfig'
import './Salud.css'

export default function Salud() {
  const { entries, config, loading, saveEntry, deleteEntry, getToday, saveConfig, todayStr } = useSalud()
  const [editingDate, setEditingDate] = useState(null)
  const [pickingDate, setPickingDate] = useState(false)
  const [customDate, setCustomDate] = useState('')

  if (loading) {
    return <div className="salud-loading">Cargando…</div>
  }

  const today = todayStr()
  const todayEntry = getToday()
  const showForm = editingDate !== null

  const handlePickDate = () => {
    if (customDate && customDate <= today) {
      setEditingDate(customDate)
      setPickingDate(false)
      setCustomDate('')
    }
  }

  return (
    <div className="salud-root">
      <AppHeader />
      <main className="salud-main">
        <h1 className="salud-title">Salud</h1>

        <BmrConfig config={config} onSave={saveConfig} />

        <WeekSummary entries={entries} config={config} />

        {!showForm && !pickingDate && (
          <div className="salud-action-row">
            <button
              className="salud-btn-today"
              onClick={() => setEditingDate(today)}
            >
              {todayEntry ? '✏️ Editar hoy' : '➕ Registrar hoy'}
            </button>
            <button
              className="salud-btn-other"
              onClick={() => setPickingDate(true)}
            >
              📅 Otro día
            </button>
          </div>
        )}

        {pickingDate && !showForm && (
          <div className="salud-date-picker">
            <input
              type="date"
              className="salud-input"
              value={customDate}
              max={today}
              onChange={e => setCustomDate(e.target.value)}
            />
            <div className="salud-date-picker-actions">
              <button className="salud-btn salud-btn-save" onClick={handlePickDate} disabled={!customDate}>
                Continuar
              </button>
              <button className="salud-btn salud-btn-cancel" onClick={() => { setPickingDate(false); setCustomDate('') }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <DayForm
            date={editingDate}
            existing={entries.find(e => e.date === editingDate)}
            bmr={config.bmr}
            onSave={async (data) => {
              await saveEntry(editingDate, data)
            }}
            onCancel={() => setEditingDate(null)}
            onDelete={async (date) => {
              await deleteEntry(date)
              setEditingDate(null)
            }}
          />
        )}

        <HistoryList
          entries={entries}
          bmr={config.bmr}
          onEdit={(date) => setEditingDate(date)}
        />
      </main>
    </div>
  )
}
