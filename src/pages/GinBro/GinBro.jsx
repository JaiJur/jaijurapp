import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import AppHeader from '../../components/AppHeader'
import HomeView    from './views/HomeView'
import SessionView from './views/SessionView'
import HistoryView from './views/HistoryView'
import RoutineEdit from './views/RoutineEdit'
import RoutinesView from './views/RoutinesView'
import WeightView  from './views/WeightView'
import './GinBro.css'

function apiHeaders(userId) {
  return { 'Content-Type': 'application/json', 'x-user-id': String(userId) }
}
async function apiFetch(path, userId, opts = {}) {
  const res = await fetch(path, { headers: apiHeaders(userId), ...opts })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

const TABS = [
  { id: 'home',     label: '🏋️ Entreno'  },
  { id: 'routines', label: '📋 Rutinas'   },
  { id: 'weight',   label: '⚖️ Peso'      },
  { id: 'history',  label: '🕒 Historial' },
]

export default function GinBro() {
  const { user } = useAuth()

  const [data, setData]                   = useState(null)
  const [tab, setTab]                     = useState('home')
  const [view, setView]                   = useState('home')
  const [activeSession, setActiveSession] = useState(null)
  const [editTarget, setEditTarget]       = useState(null)
  const [editReturnTab, setEditReturnTab] = useState('home')
  const [pickedRoutine, setPickedRoutine] = useState(null)
  const autosaveTimer = useRef(null)

  useEffect(() => {
    if (!user) return
    // Limpiamos pickedRoutine al montar para no arrastrar estado de sesiones anteriores
    setPickedRoutine(null)
    apiFetch('/api/ginbro', user.id).then(d => {
      setData(d)
      if (d.activeSession) {
        setActiveSession(d.activeSession)
        // Restaurar la rutina picked desde la sesión guardada
        const routine = (d.routines || []).find(r => r.id === d.activeSession.routineId)
        if (routine) setPickedRoutine(routine)
        setView('session')
        setTab('home')
      }
    }).catch(console.error)
  }, [user])

  function reload() {
    apiFetch('/api/ginbro', user.id).then(setData).catch(console.error)
  }

  async function save(patch) {
    await apiFetch('/api/ginbro', user.id, { method: 'PUT', body: JSON.stringify(patch) })
    reload()
  }

  function saveActiveSession(session) {
    if (!user) return
    clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      apiFetch('/api/ginbro/active-session', user.id, {
        method: 'PUT',
        body: JSON.stringify({ activeSession: session }),
      }).catch(console.error)
    }, 800)
  }

  function flushAndSaveSession(session) {
    // Guardado inmediato sin debounce (para cuando el usuario sale)
    if (!user) return
    clearTimeout(autosaveTimer.current)
    return apiFetch('/api/ginbro/active-session', user.id, {
      method: 'PUT',
      body: JSON.stringify({ activeSession: session }),
    }).catch(console.error)
  }

  function clearActiveSession() {
    if (!user) return
    apiFetch('/api/ginbro/active-session', user.id, {
      method: 'PUT',
      body: JSON.stringify({ activeSession: null }),
    }).catch(console.error)
  }

  function startSession(routine) {
    // Si ya hay una sesión activa para esta rutina, retomarla
    if (activeSession && activeSession.routineId === routine.id) {
      setView('session')
      return
    }
    const session = {
      id: Date.now(),
      routineId: routine.id,
      routineName: routine.name,
      date: new Date().toISOString(),
      exercises: routine.exercises.map(ex => ({
        ...ex,
        sets: ex.type === 'cardio'
          ? [{ cardioType: '', minutes: '' }]
          : Array.from({ length: ex.defaultSets || 3 }, () => ({ reps: '', weight: '' })),
        done: false,
        notes: '',
      })),
      finished: false,
    }
    setActiveSession(session)
    saveActiveSession(session)
    setView('session')
  }

  function openEditRoutine(routine = null, returnTab = 'home') {
    setEditTarget(routine)
    setEditReturnTab(returnTab)
    setView('editRoutine')
  }

  // Al cambiar de tab, resetear sub-vista
  function handleTabChange(newTab) {
    setTab(newTab)
    if (newTab === 'home') setView('home')
  }

  if (!data) {
    return (
      <div className="ginbro-root">
        <AppHeader />
        <div className="ginbro-loading">Cargando GinBro…</div>
      </div>
    )
  }

  // Una sesión activa tiene prioridad sobre cualquier tab/vista
  const isInSession   = !!activeSession && view === 'session'
  const isEditRoutine = view === 'editRoutine'
  const showSubheader = !isInSession && !isEditRoutine

  return (
    <div className="ginbro-root">
      <AppHeader />

      {showSubheader && (
        <nav className="ginbro-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`ginbro-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => handleTabChange(t.id)}
            >{t.label}</button>
          ))}
        </nav>
      )}

      <div className="ginbro-content">

        {/* ── Sesión activa: cubre toda la pantalla, persiste entre tabs ── */}
        {isInSession && (
          <SessionView
            session={activeSession}
            onSessionChange={(updated) => { setActiveSession(updated); saveActiveSession(updated) }}
            onFinish={async (finished) => {
              clearActiveSession()
              await save({ sessions: [finished, ...(data.sessions || [])] })
              setActiveSession(null)
              setPickedRoutine(null)
              setView('home')
              setTab('home')
            }}
            onCancel={async () => {
              await flushAndSaveSession(activeSession)
              // Guardamos pero NO limpiamos activeSession — persiste en home para continuar
              setView('home')
              setTab('home')
            }}
          />
        )}

        {/* ── Editor de rutina ── */}
        {isEditRoutine && (
          <RoutineEdit
            routine={editTarget}
            onSave={async (routine) => {
              const routines = [...(data.routines || [])]
              const idx = routines.findIndex(r => r.id === routine.id)
              if (idx >= 0) routines[idx] = routine
              else routines.push({ ...routine, id: Date.now() })
              await save({ routines })
              setView('home')
              setTab(editReturnTab)
            }}
            onDelete={async (routineId) => {
              await save({ routines: (data.routines || []).filter(r => r.id !== routineId) })
              setView('home')
              setTab(editReturnTab)
            }}
            onCancel={() => { setView('home'); setTab(editReturnTab) }}
          />
        )}

        {/* ── Tabs normales (solo visibles si no hay sesión ni editor) ── */}
        {!isInSession && !isEditRoutine && (
          <>
            {tab === 'home' && (
              <HomeView
                data={data}
                onStartSession={startSession}
                pickedRoutine={pickedRoutine}
                onPickRoutine={setPickedRoutine}
                activeSession={activeSession}
              />
            )}
            {tab === 'routines' && (
              <RoutinesView
                data={data}
                onStartSession={startSession}
                onEditRoutine={(r) => openEditRoutine(r, 'routines')}
                onNewRoutine={() => openEditRoutine(null, 'routines')}
                onSave={save}
              />
            )}
            {tab === 'history' && (
              <HistoryView sessions={data.sessions || []} />
            )}
            {tab === 'weight' && (
              <WeightView
                weightLog={data.weightLog || []}
                onSave={async (weightLog) => { await save({ weightLog }) }}
              />
            )}
          </>
        )}

      </div>
    </div>
  )
}
