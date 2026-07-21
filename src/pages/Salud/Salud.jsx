import { useState, useMemo } from 'react'
import AppHeader from '../../components/AppHeader'
import useSalud from '../../hooks/useSalud'
import DayForm from './components/DayForm'
import DayProgress from './components/DayProgress'
import HistoryView from './components/HistoryView'
import BmrConfig from './components/BmrConfig'
import './Salud.css'

const VIEW_TABS = [
  { key: 'home', label: 'Home' },
  { key: 'history', label: 'Historial' },
]

export default function Salud() {
  const { entries, config, loading, saveEntry, deleteEntry, getToday, saveConfig, todayStr } = useSalud()
  const [editingDate, setEditingDate] = useState(null)
  const [view, setView] = useState('home')
  const [settingsOpen, setSettingsOpen] = useState(false)

  if (loading) {
    return <div className="salud-loading">Cargando…</div>
  }

  const today = todayStr()
  const todayEntry = getToday()
  const showModal = editingDate !== null && editingDate !== today

  const closeEditor = () => setEditingDate(null)

  return (
    <div className="salud-root">
      <AppHeader />
      <main className="salud-main">
        <div className="salud-header-row">
          <h1 className="salud-title">Salud</h1>
          <button className="salud-settings-btn" onClick={() => setSettingsOpen(true)}>⚙️</button>
        </div>

        <div className="salud-view-tabs">
          {VIEW_TABS.map(t => (
            <button
              key={t.key}
              className={`salud-view-tab ${view === t.key ? 'active' : ''}`}
              onClick={() => setView(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {view === 'home' && (
          <>
            <DayProgress entry={todayEntry} config={config} />

            <DayForm
              date={today}
              existing={todayEntry}
              allEntries={entries}
              bmr={config.bmr}
              onSave={async (data) => {
                await saveEntry(today, data)
              }}
              hideNotes
              hideCancel
              hideDelete
            />
          </>
        )}

        {view === 'history' && (
          <HistoryView
            entries={entries}
            config={config}
            onEdit={(date) => setEditingDate(date)}
          />
        )}
      </main>

      {showModal && (
        <div className="salud-modal-overlay" onClick={closeEditor}>
          <div className="salud-modal-body" onClick={e => e.stopPropagation()}>
            <DayForm
              date={editingDate}
              existing={entries.find(e => e.date === editingDate)}
              allEntries={entries}
              bmr={config.bmr}
              onSave={async (data) => {
                await saveEntry(editingDate, data)
              }}
              onCancel={closeEditor}
              onDelete={async (date) => {
                await deleteEntry(date)
                closeEditor()
              }}
            />
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="salud-modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="salud-modal-body" onClick={e => e.stopPropagation()}>
            <BmrConfig config={config} onSave={saveConfig} onCancel={() => setSettingsOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
