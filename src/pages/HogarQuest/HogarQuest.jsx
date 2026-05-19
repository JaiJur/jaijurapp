import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import AppHeader from '../../components/AppHeader'
import HomeView     from './views/HomeView'
import CasaView     from './views/CasaView'
import ProfileView  from './views/ProfileView'
import HistorialView from './views/HistorialView'
import AdminView    from './views/AdminView'
import './HogarQuest.css'

const TABS = [
  { id: 'home',     label: '🏠 Hogar'    },
  { id: 'casa',     label: '🐉 La Casa'  },
  { id: 'perfil',   label: '⭐ Perfil'   },
  { id: 'historial',label: '📜 Historial'},
  { id: 'admin',    label: '⚙️ Admin'    },
]

function apiHeaders(userId) {
  return { 'Content-Type': 'application/json', 'x-user-id': String(userId) }
}
async function apiFetch(path, userId, opts = {}) {
  const res = await fetch(path, { headers: apiHeaders(userId), ...opts })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export default function HogarQuest() {
  const { user } = useAuth()
  const [tab, setTab]   = useState('home')
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!user) return
    apiFetch('/api/hogar', user.id).then(setData)
  }, [user])

  const save = useCallback(async (updated) => {
    setData(updated)
    await apiFetch('/api/hogar', user.id, {
      method: 'PUT',
      body: JSON.stringify(updated)
    })
  }, [user])

  // ── Completar tarea ──────────────────────────────────
  const handleComplete = useCallback(async (task) => {
    if (!data) return
    const now = new Date().toISOString()
    const completion = {
      taskId: task.id, taskName: task.name, zone: task.zone,
      xp: task.xp, username: user.username, ts: now
    }

    // Actualizar tarea
    const tasks = data.tasks.map(t =>
      t.id === task.id ? { ...t, lastDone: now, lastWho: user.username } : t
    )

    // XP personal
    const myXP = (data.myXP || 0) + task.xp
    const myCompletions = [...(data.completions || []), completion]

    // XP de zona (para monstruo de zona)
    const zones = data.zones.map(z =>
      z.id === task.zone ? { ...z, xp: (z.xp || 0) + task.xp } : z
    )

    // Pool global (para jefe semanal)
    const poolXP = (data.poolXP || 0) + task.xp

    // Historial global
    const allCompletions = [...(data.allCompletions || []), completion]

    // Logros
    const logros = checkLogros(data.logros || [], myCompletions, myXP, task)

    // Monstruos de zona: ¿derrota?
    const monsters = advanceMonsters(data.monsters || [], task.zone, zones)

    const updated = {
      ...data, tasks, zones, monsters,
      myXP, completions: myCompletions,
      poolXP, allCompletions, logros
    }
    save(updated)
  }, [data, user, save])

  // ── Lógica de monstruos de zona ──────────────────────
  function advanceMonsters(monsters, zoneId, zones) {
    const zone = zones.find(z => z.id === zoneId)
    if (!zone) return monsters
    return monsters.map(m => {
      if (m.zone !== zoneId || m.defeated) return m
      if ((zone.xp || 0) >= m.xpRequired) {
        return { ...m, defeated: true, defeatedAt: new Date().toISOString() }
      }
      return m
    })
  }

  // ── Logros ────────────────────────────────────────────
  function checkLogros(current, completions, xp, lastTask) {
    const set = new Set(current)
    const total = completions.length
    if (total >= 10)  set.add('tasks10')
    if (total >= 50)  set.add('tasks50')
    if (total >= 100) set.add('tasks100')
    if (xp >= 500)    set.add('level5')
    if (xp >= 1000)   set.add('level10')
    // zona
    const byZone = completions.filter(c => c.zone === lastTask.zone).length
    if (byZone >= 5)  set.add('zone5')
    return [...set]
  }

  // ── Admin: tareas ─────────────────────────────────────
  const handleSaveTask = useCallback((form) => {
    const tasks = form.id
      ? data.tasks.map(t => t.id === form.id ? { ...form } : t)
      : [...(data.tasks || []), { ...form, id: uid() }]
    save({ ...data, tasks })
  }, [data, save])

  const handleDeleteTask = useCallback((id) => {
    save({ ...data, tasks: data.tasks.filter(t => t.id !== id) })
  }, [data, save])

  // ── Admin: zonas ─────────────────────────────────────
  const handleSaveZone = useCallback((form) => {
    const zones = form.id
      ? data.zones.map(z => z.id === form.id ? { ...form } : z)
      : [...(data.zones || []), { ...form, id: uid(), xp: 0 }]

    // Si es zona nueva, añadir cadena de monstruos inicial
    let monsters = data.monsters || []
    if (!form.id) {
      const zoneId = zones[zones.length - 1].id
      monsters = [...monsters, ...defaultMonsters(zoneId)]
    }
    save({ ...data, zones, monsters })
  }, [data, save])

  const handleDeleteZone = useCallback((id) => {
    save({
      ...data,
      zones: data.zones.filter(z => z.id !== id),
      tasks: data.tasks.filter(t => t.zone !== id),
      monsters: (data.monsters || []).filter(m => m.zone !== id),
    })
  }, [data, save])

  function defaultMonsters(zoneId) {
    return [
      { id: uid(), zone: zoneId, name: 'Goblin',  xpRequired: 50,  defeated: false },
      { id: uid(), zone: zoneId, name: 'Orco',    xpRequired: 150, defeated: false },
      { id: uid(), zone: zoneId, name: 'Troll',   xpRequired: 350, defeated: false },
      { id: uid(), zone: zoneId, name: 'Ogro',    xpRequired: 700, defeated: false },
      { id: uid(), zone: zoneId, name: 'Gigante', xpRequired: 1200, defeated: false},
    ]
  }

  if (!data) return (
    <div className="hq-app">
      <AppHeader title="HogarQuest" />
      <p style={{ textAlign: 'center', marginTop: 40, color: '#555' }}>Cargando...</p>
    </div>
  )

  const profileData = {
    xp: data.myXP || 0,
    logros: data.logros || [],
    completions: data.completions || [],
  }
  const casaData = {
    boss: data.boss || null,
    bossHistory: data.bossHistory || [],
    poolXP: data.poolXP || 0,
  }

  return (
    <div className="hq-app">
      <AppHeader title="HogarQuest" />
      <div className="hq-tabs">
        {TABS.map(t => (
          <button key={t.id}
            className={`hq-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >{t.label}</button>
        ))}
      </div>
      <div className="hq-content">
        {tab === 'home'      && <HomeView     data={data}       onComplete={handleComplete} />}
        {tab === 'casa'      && <CasaView     data={casaData} />}
        {tab === 'perfil'    && <ProfileView  data={profileData} username={user.username} />}
        {tab === 'historial' && <HistorialView data={{ completions: data.allCompletions || [], zones: data.zones || [] }} />}
        {tab === 'admin'     && (
          <AdminView
            data={data}
            onSaveTask={handleSaveTask}
            onDeleteTask={handleDeleteTask}
            onSaveZone={handleSaveZone}
            onDeleteZone={handleDeleteZone}
          />
        )}
      </div>
    </div>
  )
}
