import express from 'express'
import bcrypt from 'bcrypt'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { resolve, join, normalize } from 'path'
import { randomBytes } from 'crypto'

const app = express()
const PORT = process.env.PORT || 3000
const DIST = new URL('./dist', import.meta.url).pathname
const DB_PATH = resolve('/home/jai/apps/db.json')

app.use(express.json())

// ── DB helpers ───────────────────────────────────────────
function getDB() {
  return JSON.parse(readFileSync(DB_PATH, 'utf8'))
}
function saveDB(db) {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8')
}

function mealUserId(db, userId) {
  const user = db.users.find(u => u.id === userId)
  return user?.sharedMealWith ?? userId
}

function getMealData(db, userId) {
  const effectiveId = mealUserId(db, userId)
  if (!db.mealplanner) db.mealplanner = {}
  if (!db.mealplanner[effectiveId]) {
    db.mealplanner[effectiveId] = { planning: {}, lista: [], preparados: [], favoritos: [] }
  }
  return db.mealplanner[effectiveId]
}

function getGinBroData(db, userId) {
  if (!db.ginbro) db.ginbro = {}
  if (!db.ginbro[userId]) {
    db.ginbro[userId] = { routines: [], sessions: [], activeSession: null, weightLog: [] }
  }
  if (!db.ginbro[userId].weightLog) db.ginbro[userId].weightLog = []
  return db.ginbro[userId]
}

// ── Middleware: autenticación ────────────────────────────
function requireUser(req, res, next) {
  const userId = parseInt(req.headers['x-user-id'])
  if (!userId) return res.status(401).json({ error: 'No autenticado' })
  req.userId = userId
  next()
}

// ── API: Login ───────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Faltan credenciales' })
  const db = getDB()
  const user = db.users.find(u => u.username === username)
  if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' })
  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' })

  // Generar remember token (1 año)
  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  if (!db.rememberTokens) db.rememberTokens = {}
  db.rememberTokens[token] = { userId: user.id, expires }
  saveDB(db)

  res.json({ user: { id: user.id, username: user.username, role: user.role }, rememberToken: token })
})

// ── API: Registro D&D Player ─────────────────────────────
app.post('/api/dnd/register', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' })
  if (username.length < 3) return res.status(400).json({ error: 'El usuario debe tener al menos 3 caracteres' })
  if (password.length < 4) return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' })
  const db = getDB()
  if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: 'Ese nombre de usuario ya existe' })
  }
  const hashedPw = await bcrypt.hash(password, 12)
  const maxId = Math.max(...db.users.map(u => u.id), 0)
  const newUser = { id: maxId + 1, username, password: hashedPw, role: 'dndPlayer' }
  db.users.push(newUser)

  // Auto-login: generar remember token
  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  if (!db.rememberTokens) db.rememberTokens = {}
  db.rememberTokens[token] = { userId: newUser.id, expires }
  saveDB(db)

  res.json({ user: { id: newUser.id, username: newUser.username, role: newUser.role }, rememberToken: token })
})

// ── API: Validar remember token ──────────────────────────
app.post('/api/auth/token', (req, res) => {
  const { token } = req.body
  if (!token) return res.status(400).json({ error: 'Token requerido' })
  const db = getDB()
  const entry = db.rememberTokens?.[token]
  if (!entry) return res.status(401).json({ error: 'Token inválido' })
  if (new Date(entry.expires) < new Date()) {
    delete db.rememberTokens[token]
    saveDB(db)
    return res.status(401).json({ error: 'Token expirado' })
  }
  const user = db.users.find(u => u.id === entry.userId)
  if (!user) return res.status(401).json({ error: 'Usuario no encontrado' })
  res.json({ user: { id: user.id, username: user.username, role: user.role } })
})

// ── API: MealPlanner ─────────────────────────────────────
app.get('/api/mealplanner', requireUser, (req, res) => {
  const db = getDB()
  res.json(getMealData(db, req.userId))
})

app.put('/api/mealplanner', requireUser, (req, res) => {
  const { planning, lista, preparados, favoritos } = req.body
  const db = getDB()
  const data = getMealData(db, req.userId)
  if (planning   !== undefined) data.planning   = planning
  if (lista      !== undefined) data.lista      = lista
  if (preparados !== undefined) data.preparados = preparados
  if (favoritos  !== undefined) data.favoritos  = favoritos
  saveDB(db)
  res.json({ ok: true })
})

// ── API: GinBro — datos generales ────────────────────────
app.get('/api/ginbro', requireUser, (req, res) => {
  const db = getDB()
  res.json(getGinBroData(db, req.userId))
})

app.put('/api/ginbro', requireUser, (req, res) => {
  const { routines, sessions, weightLog } = req.body
  const db = getDB()
  const data = getGinBroData(db, req.userId)
  if (routines   !== undefined) data.routines   = routines
  if (sessions   !== undefined) data.sessions   = sessions
  if (weightLog  !== undefined) data.weightLog  = weightLog
  saveDB(db)
  res.json({ ok: true })
})

// ── API: GinBro — sesión activa (autosave) ───────────────
app.get('/api/ginbro/active-session', requireUser, (req, res) => {
  const db = getDB()
  const data = getGinBroData(db, req.userId)
  res.json({ activeSession: data.activeSession || null })
})

app.put('/api/ginbro/active-session', requireUser, (req, res) => {
  const { activeSession } = req.body
  const db = getDB()
  const data = getGinBroData(db, req.userId)
  data.activeSession = activeSession   // null para limpiar al terminar
  saveDB(db)
  res.json({ ok: true })
})

// ── API: HogarQuest ──────────────────────────────────────
const HOGAR_MASTER_ID = 1  // datos compartidos viven bajo el usuario 1

function getHogarData(db, userId) {
  if (!db.hogar) db.hogar = {}
  // Datos compartidos (zonas, tareas, monstruos, pool, jefe)
  if (!db.hogar[HOGAR_MASTER_ID]) {
    db.hogar[HOGAR_MASTER_ID] = {
      tasks: [], zones: [], monsters: [],
      allCompletions: [], poolXP: 0,
      boss: { name: 'Balrog', xpRequired: 500 },
      bossHistory: [], weekStart: null
    }
  }
  // Datos individuales (xp personal, logros, completions propias)
  if (!db.hogar[userId]) {
    db.hogar[userId] = { myXP: 0, completions: [], logros: [] }
  }
  // Merge: shared + personal
  return { ...db.hogar[HOGAR_MASTER_ID], ...db.hogar[userId] }
}

function saveHogarData(db, userId, body) {
  if (!db.hogar) db.hogar = {}
  if (!db.hogar[HOGAR_MASTER_ID]) db.hogar[HOGAR_MASTER_ID] = {}
  if (!db.hogar[userId]) db.hogar[userId] = {}

  const sharedFields = ['tasks','zones','monsters','allCompletions','poolXP','boss','bossHistory','weekStart']
  const personalFields = ['myXP','completions','logros']

  sharedFields.forEach(f => { if (body[f] !== undefined) db.hogar[HOGAR_MASTER_ID][f] = body[f] })
  personalFields.forEach(f => { if (body[f] !== undefined) db.hogar[userId][f] = body[f] })
}

function resetWeeklyBossIfNeeded(data) {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const weekKey = monday.toISOString().slice(0, 10)
  if (data.weekStart !== weekKey) {
    // Nueva semana: guardar resultado anterior en historial
    if (data.weekStart && data.boss) {
      const defeated = (data.poolXP || 0) >= (data.boss?.xpRequired || 9999)
      data.bossHistory = [...(data.bossHistory || []), {
        name: data.boss.name, week: data.weekStart, defeated
      }]
    }
    // Rotar al siguiente jefe
    const BOSSES = [
      { name: 'Balrog',        xpRequired: 500  },
      { name: 'Dragón Rojo',   xpRequired: 750  },
      { name: 'Lich',          xpRequired: 1000 },
      { name: 'Hidra',         xpRequired: 800  },
      { name: 'Behemoth',      xpRequired: 1200 },
    ]
    const idx = data.bossHistory.length % BOSSES.length
    data.boss = BOSSES[idx]
    data.poolXP = 0
    data.weekStart = weekKey
  }
  return data
}

app.get('/api/hogar', requireUser, (req, res) => {
  const db = getDB()
  let shared = db.hogar?.[HOGAR_MASTER_ID] || {}
  shared = resetWeeklyBossIfNeeded(shared)
  if (!db.hogar) db.hogar = {}
  db.hogar[HOGAR_MASTER_ID] = shared
  saveDB(db)
  const personal = db.hogar[req.userId] || {}
  res.json({ ...shared, ...personal })
})

app.put('/api/hogar', requireUser, (req, res) => {
  const db = getDB()
  saveHogarData(db, req.userId, req.body)
  saveDB(db)
  res.json({ ok: true })
})

// ── API: Assets ──────────────────────────────────────────
const PROPS_ROOT = resolve('./public/textures/props')

app.get('/api/assets/props', (req, res) => {
  const sub = (req.query.path || '').replace(/^\/+|\/+$/g, '')
  const full = normalize(join(PROPS_ROOT, sub))
  if (!full.startsWith(PROPS_ROOT)) return res.status(400).json({ error: 'Ruta inválida' })
  try {
    const entries = readdirSync(full)
    const folders = []
    const files = []
    for (const name of entries) {
      if (name.startsWith('.')) continue
      const entryPath = join(full, name)
      let stat
      try { stat = statSync(entryPath) } catch { continue }
      if (stat.isDirectory()) {
        folders.push({ name, path: sub ? `${sub}/${name}` : name })
      } else if (/\.(png|jpg|jpeg|webp|svg)$/i.test(name)) {
        const relPath = sub ? `${sub}/${name}` : name
        const urlPath = relPath.split('/').map(encodeURIComponent).join('/')
        files.push({ name: name.replace(/\.[^.]+$/, ''), file: name, url: `/textures/props/${urlPath}` })
      }
    }
    folders.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    files.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    res.json({ path: sub, folders, files })
  } catch { res.json({ path: sub, folders: [], files: [] }) }
})

app.get('/api/assets/floors', (req, res) => {
  const dir = resolve('./public/textures/floors')
  try {
    const files = readdirSync(dir)
      .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
      .map(f => ({ name: f.replace(/\.[^.]+$/, ''), file: f, url: `/textures/floors/${encodeURIComponent(f)}` }))
    res.json(files)
  } catch { res.json([]) }
})

// ── API: D&D ─────────────────────────────────────────────
function getDnDData(db) {
  if (!db.dnd) db.dnd = { campaigns: [], characters: [] }
  if (!db.dnd.campaigns) db.dnd.campaigns = []
  if (!db.dnd.characters) db.dnd.characters = []
  return db.dnd
}

// Listar campañas
app.get('/api/dnd/campaigns', requireUser, (req, res) => {
  const db = getDB()
  res.json(getDnDData(db).campaigns)
})

// Crear campaña
app.post('/api/dnd/campaigns', requireUser, requireDnDMaster, (req, res) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'Nombre requerido' })
    const db = getDB()
    const dnd = getDnDData(db)
    const campaign = { id: Date.now(), name, chapters: [] }
    dnd.campaigns.push(campaign)
    saveDB(db)
    res.json(campaign)
  } catch (e) {
    console.error('POST /api/dnd/campaigns error:', e)
    res.status(500).json({ error: e.message })
  }
})

// Borrar campaña
app.delete('/api/dnd/campaigns/:id', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  dnd.campaigns = dnd.campaigns.filter(c => c.id !== parseInt(req.params.id))
  saveDB(db)
  res.json({ ok: true })
})

// Crear capítulo
app.post('/api/dnd/campaigns/:campaignId/chapters', requireUser, requireDnDMaster, (req, res) => {
  const { name } = req.body
  const db = getDB()
  const dnd = getDnDData(db)
  const campaign = dnd.campaigns.find(c => c.id === parseInt(req.params.campaignId))
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
  const chapter = { id: Date.now(), name, maps: [] }
  campaign.chapters.push(chapter)
  saveDB(db)
  res.json(chapter)
})

// Renombrar capítulo
app.put('/api/dnd/campaigns/:campaignId/chapters/:chapterId', requireUser, requireDnDMaster, (req, res) => {
  const { name } = req.body
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nombre requerido' })
  const db = getDB()
  const dnd = getDnDData(db)
  const campaign = dnd.campaigns.find(c => c.id === parseInt(req.params.campaignId))
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
  const chapter = campaign.chapters.find(ch => ch.id === parseInt(req.params.chapterId))
  if (!chapter) return res.status(404).json({ error: 'Capítulo no encontrado' })
  chapter.name = name.trim()
  saveDB(db)
  res.json(chapter)
})

// Borrar capítulo
app.delete('/api/dnd/campaigns/:campaignId/chapters/:chapterId', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const campaign = dnd.campaigns.find(c => c.id === parseInt(req.params.campaignId))
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
  campaign.chapters = campaign.chapters.filter(ch => ch.id !== parseInt(req.params.chapterId))
  saveDB(db)
  res.json({ ok: true })
})

// Crear mapa
app.post('/api/dnd/campaigns/:campaignId/chapters/:chapterId/maps', requireUser, requireDnDMaster, (req, res) => {
  const { name } = req.body
  const db = getDB()
  const dnd = getDnDData(db)
  const campaign = dnd.campaigns.find(c => c.id === parseInt(req.params.campaignId))
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
  const chapter = campaign.chapters.find(ch => ch.id === parseInt(req.params.chapterId))
  if (!chapter) return res.status(404).json({ error: 'Capítulo no encontrado' })
  const map = {
    id: Date.now(), name,
    hexSize: 40,
    showGrid: true,
    floorTexture: 'stone',
    rooms: [],
    props: [],
    revealedRooms: []
  }
  chapter.maps.push(map)
  saveDB(db)
  res.json(map)
})

// Obtener mapa (público para el visor)
app.get('/api/dnd/maps/:mapId', (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  for (const campaign of dnd.campaigns) {
    for (const chapter of campaign.chapters) {
      const map = chapter.maps.find(m => m.id === parseInt(req.params.mapId))
      if (map) return res.json(map)
    }
  }
  res.status(404).json({ error: 'Mapa no encontrado' })
})

// Guardar mapa completo
app.put('/api/dnd/maps/:mapId', requireUser, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  for (const campaign of dnd.campaigns) {
    for (const chapter of campaign.chapters) {
      const idx = chapter.maps.findIndex(m => m.id === parseInt(req.params.mapId))
      if (idx !== -1) {
        chapter.maps[idx] = { ...chapter.maps[idx], ...req.body, id: chapter.maps[idx].id }
        saveDB(db)
        return res.json(chapter.maps[idx])
      }
    }
  }
  res.status(404).json({ error: 'Mapa no encontrado' })
})

// ── API: Encounter (enemigos por mapa) ────────────────────
// Helper: buscar mapa por id en todas las campañas
function findMapById(dnd, mapId) {
  for (const c of dnd.campaigns) {
    for (const ch of c.chapters) {
      const m = ch.maps.find(m => m.id === parseInt(mapId))
      if (m) return m
    }
  }
  return null
}

app.get('/api/dnd/maps/:mapId/encounter', requireUser, (req, res) => {
  const db = getDB()
  const map = findMapById(getDnDData(db), req.params.mapId)
  if (!map) return res.status(404).json({ error: 'Mapa no encontrado' })
  res.json(map.encounter || [])
})

app.post('/api/dnd/maps/:mapId/encounter', requireUser, (req, res) => {
  const db = getDB()
  const map = findMapById(getDnDData(db), req.params.mapId)
  if (!map) return res.status(404).json({ error: 'Mapa no encontrado' })
  if (!map.encounter) map.encounter = []
  const enemy = { id: Date.now(), ...req.body }
  map.encounter.push(enemy)
  saveDB(db)
  res.json(enemy)
})

app.put('/api/dnd/maps/:mapId/encounter/:enemyId', requireUser, (req, res) => {
  const db = getDB()
  const map = findMapById(getDnDData(db), req.params.mapId)
  if (!map) return res.status(404).json({ error: 'Mapa no encontrado' })
  const idx = (map.encounter || []).findIndex(e => e.id === parseInt(req.params.enemyId))
  if (idx === -1) return res.status(404).json({ error: 'Enemigo no encontrado' })
  map.encounter[idx] = { ...map.encounter[idx], ...req.body, id: map.encounter[idx].id }
  saveDB(db)
  res.json(map.encounter[idx])
})

app.delete('/api/dnd/maps/:mapId/encounter/:enemyId', requireUser, (req, res) => {
  const db = getDB()
  const map = findMapById(getDnDData(db), req.params.mapId)
  if (!map) return res.status(404).json({ error: 'Mapa no encontrado' })
  map.encounter = (map.encounter || []).filter(e => e.id !== parseInt(req.params.enemyId))
  saveDB(db)
  res.json({ ok: true })
})

// Limpiar todo el encounter
app.delete('/api/dnd/maps/:mapId/encounter', requireUser, (req, res) => {
  const db = getDB()
  const map = findMapById(getDnDData(db), req.params.mapId)
  if (!map) return res.status(404).json({ error: 'Mapa no encontrado' })
  map.encounter = []
  saveDB(db)
  res.json({ ok: true })
})

// ── API: D&D Images (navegación de carpetas en public/dndImages) ──
const DND_IMAGES_ROOT = resolve('./public/dndImages')

function safeDndPath(sub) {
  // Evitar path traversal: resolver y comprobar que sigue dentro de root
  const clean = (sub || '').replace(/^\/+|\/+$/g, '')
  const full = normalize(join(DND_IMAGES_ROOT, clean))
  if (!full.startsWith(DND_IMAGES_ROOT)) return null
  return full
}

app.get('/api/dnd/images', (req, res) => {
  const sub = req.query.path || ''
  const full = safeDndPath(sub)
  if (!full) return res.status(400).json({ error: 'Ruta inválida' })
  try {
    const entries = readdirSync(full)
    const folders = []
    const images = []
    for (const name of entries) {
      if (name.startsWith('.')) continue
      const entryPath = join(full, name)
      let stat
      try { stat = statSync(entryPath) } catch { continue }
      if (stat.isDirectory()) {
        folders.push({ name, path: sub ? `${sub}/${name}` : name })
      } else if (/\.(png|jpg|jpeg|webp|gif)$/i.test(name)) {
        const relPath = sub ? `${sub}/${name}` : name
        const urlPath = relPath.split('/').map(encodeURIComponent).join('/')
        images.push({ name, url: `/dndImages/${urlPath}` })
      }
    }
    folders.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    images.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    res.json({ path: sub, folders, images })
  } catch (e) {
    res.status(404).json({ error: 'Carpeta no encontrada' })
  }
})

// ── API: D&D Glossary (bestiario, artefactos, lore) ──────
function getGlossary(db) {
  const dnd = getDnDData(db)
  if (!dnd.glossary) dnd.glossary = { entries: [], favorites: {} }
  if (!dnd.glossary.entries) dnd.glossary.entries = []
  if (!dnd.glossary.favorites) dnd.glossary.favorites = {}
  return dnd.glossary
}

app.get('/api/dnd/glossary', requireUser, (req, res) => {
  const db = getDB()
  res.json(getGlossary(db))
})

app.post('/api/dnd/glossary', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const g = getGlossary(db)
  const entry = { id: Date.now(), ...req.body }
  g.entries.push(entry)
  saveDB(db)
  res.json(entry)
})

app.put('/api/dnd/glossary/:id', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const g = getGlossary(db)
  const idx = g.entries.findIndex(e => e.id === parseInt(req.params.id))
  if (idx === -1) return res.status(404).json({ error: 'Entrada no encontrada' })
  g.entries[idx] = { ...g.entries[idx], ...req.body, id: g.entries[idx].id }
  saveDB(db)
  res.json(g.entries[idx])
})

app.delete('/api/dnd/glossary/:id', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const g = getGlossary(db)
  g.entries = g.entries.filter(e => e.id !== parseInt(req.params.id))
  saveDB(db)
  res.json({ ok: true })
})

app.put('/api/dnd/glossary/favorites/:campaignId', requireUser, (req, res) => {
  const db = getDB()
  const g = getGlossary(db)
  g.favorites[req.params.campaignId] = req.body.ids || []
  saveDB(db)
  res.json({ ok: true })
})

// ── API: D&D Viewer (visor global con múltiples canales) ──
// Estructura: dnd.viewer.channels[channelId] = { mode, mapId, imageUrl, imageName, updatedAt }
// Canales actuales: 'main' (TV/proyector) y 'tablet' (pantalla secundaria)
const VIEWER_CHANNELS = ['main', 'tablet']

function emptyChannelState() {
  return { mode: 'blank', mapId: null, imageUrl: null, imageName: null, rotation: 0, updatedAt: Date.now() }
}

function getViewerChannels(db) {
  const dnd = getDnDData(db)
  // Inicialización + migración desde esquema antiguo (viewer como objeto único)
  if (!dnd.viewer || typeof dnd.viewer !== 'object') dnd.viewer = {}
  if (!dnd.viewer.channels) {
    // Si había estado antiguo (viewer.mode, viewer.mapId...), migrarlo al canal 'main'
    const legacy = (dnd.viewer.mode) ? { ...dnd.viewer } : null
    dnd.viewer = { channels: {} }
    VIEWER_CHANNELS.forEach(ch => { dnd.viewer.channels[ch] = emptyChannelState() })
    if (legacy) dnd.viewer.channels.main = { ...emptyChannelState(), ...legacy }
  } else {
    VIEWER_CHANNELS.forEach(ch => {
      if (!dnd.viewer.channels[ch]) dnd.viewer.channels[ch] = emptyChannelState()
    })
  }
  return dnd.viewer.channels
}

// GET todos los canales (para el panel de control)
app.get('/api/dnd/viewer', (req, res) => {
  const db = getDB()
  res.json(getViewerChannels(db))
})

// GET un canal concreto (lo usa cada visor)
app.get('/api/dnd/viewer/:channel', (req, res) => {
  const { channel } = req.params
  if (!VIEWER_CHANNELS.includes(channel)) return res.status(404).json({ error: 'Canal inválido' })
  const db = getDB()
  res.json(getViewerChannels(db)[channel])
})

// PUT un canal (actualiza lo que muestra)
app.put('/api/dnd/viewer/:channel', requireUser, (req, res) => {
  const { channel } = req.params
  if (!VIEWER_CHANNELS.includes(channel)) return res.status(404).json({ error: 'Canal inválido' })
  const { mode, mapId, imageUrl, imageName, rotation } = req.body
  if (!['map', 'image', 'blank'].includes(mode)) {
    return res.status(400).json({ error: 'Modo inválido' })
  }
  const db = getDB()
  const channels = getViewerChannels(db)
  const prev = channels[channel] || emptyChannelState()
  channels[channel] = {
    mode,
    mapId: mode === 'map' ? (mapId ?? null) : null,
    imageUrl: mode === 'image' ? (imageUrl ?? null) : null,
    imageName: mode === 'image' ? (imageName ?? null) : null,
    rotation: typeof rotation === 'number' ? rotation : (mode === prev.mode ? (prev.rotation || 0) : 0),
    updatedAt: Date.now()
  }
  saveDB(db)
  res.json(channels[channel])
})

// PATCH rotación de un canal (sin cambiar modo/imagen)
app.patch('/api/dnd/viewer/:channel/rotate', requireUser, (req, res) => {
  const { channel } = req.params
  if (!VIEWER_CHANNELS.includes(channel)) return res.status(404).json({ error: 'Canal inválido' })
  const { rotation } = req.body
  if (![0, 90, 180, 270].includes(rotation)) return res.status(400).json({ error: 'Rotación inválida' })
  const db = getDB()
  const channels = getViewerChannels(db)
  channels[channel].rotation = rotation
  channels[channel].updatedAt = Date.now()
  saveDB(db)
  res.json(channels[channel])
})

// ── API: D&D Character Portraits ─────────────────────────
const PORTRAITS_DIR = resolve('./public/dndImages/portraits')
app.post('/api/dnd/portraits', requireUser, (req, res) => {
  try {
    const { data, filename } = req.body
    if (!data || !filename) return res.status(400).json({ error: 'Datos requeridos' })
    const mkdirSync = require('fs').mkdirSync
    mkdirSync(PORTRAITS_DIR, { recursive: true })
    const ext = filename.split('.').pop().toLowerCase()
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`
    const buf = Buffer.from(data.replace(/^data:image\/\w+;base64,/, ''), 'base64')
    writeFileSync(join(PORTRAITS_DIR, safeName), buf)
    res.json({ url: `/dndImages/portraits/${safeName}` })
  } catch (e) {
    console.error('Portrait upload error:', e)
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/dnd/portraits', requireUser, (req, res) => {
  try {
    const { readdirSync } = require('fs')
    const mkdirSync = require('fs').mkdirSync
    mkdirSync(PORTRAITS_DIR, { recursive: true })
    const files = readdirSync(PORTRAITS_DIR).filter(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
    res.json(files.map(f => `/dndImages/portraits/${f}`))
  } catch { res.json([]) }
})

// ── API: D&D Characters ──────────────────────────────────
function isDnDMaster(db, userId) {
  const user = db.users.find(u => u.id === userId)
  return user && (user.role === 'master' || user.role === 'dndMaster')
}

function requireDnDMaster(req, res, next) {
  const db = getDB()
  if (!isDnDMaster(db, req.userId)) return res.status(403).json({ error: 'Solo el DM puede hacer esto' })
  next()
}

app.get('/api/dnd/characters', requireUser, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  // master ve todos, dndPlayer solo los suyos
  if (isDnDMaster(db, req.userId)) {
    res.json(dnd.characters)
  } else {
    res.json(dnd.characters.filter(c => c.ownerId === req.userId))
  }
})

app.post('/api/dnd/characters', requireUser, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const character = { ...req.body, id: Date.now(), ownerId: req.userId }
  dnd.characters.push(character)
  saveDB(db)
  res.json(character)
})

app.put('/api/dnd/characters/:id', requireUser, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const idx = dnd.characters.findIndex(c => c.id === parseInt(req.params.id))
  if (idx === -1) return res.status(404).json({ error: 'Personaje no encontrado' })
  const ch = dnd.characters[idx]
  // Solo el dueño o master puede editar
  if (ch.ownerId && ch.ownerId !== req.userId && !isDnDMaster(db, req.userId)) {
    return res.status(403).json({ error: 'Sin permiso' })
  }
  dnd.characters[idx] = { ...ch, ...req.body, id: ch.id, ownerId: ch.ownerId || req.userId }
  saveDB(db)
  res.json(dnd.characters[idx])
})

app.delete('/api/dnd/characters/:id', requireUser, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const ch = dnd.characters.find(c => c.id === parseInt(req.params.id))
  if (!ch) return res.status(404).json({ error: 'Personaje no encontrado' })
  // Solo el dueño o master puede borrar
  if (ch.ownerId && ch.ownerId !== req.userId && !isDnDMaster(db, req.userId)) {
    return res.status(403).json({ error: 'Sin permiso' })
  }
  dnd.characters = dnd.characters.filter(c => c.id !== parseInt(req.params.id))
  saveDB(db)
  res.json({ ok: true })
})

// ── Serve React build ────────────────────────────────────
// Servir imágenes de texturas directamente desde public/ (no depende del build)
const PUBLIC_TEXTURES = resolve('./public/textures')
app.use('/textures', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=86400, no-transform')
  res.setHeader('Vary', 'Accept-Encoding')
  next()
}, express.static(PUBLIC_TEXTURES))

// Servir imágenes D&D (retratos, mapas de pueblo, cartas, puzzles...)
app.use('/dndImages', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=86400, no-transform')
  res.setHeader('Vary', 'Accept-Encoding')
  next()
}, express.static(DND_IMAGES_ROOT))

app.use(express.static(DIST))
app.get('*', (req, res) => {
  res.sendFile(resolve(DIST, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`jaijur.com · puerto ${PORT}`)
})
