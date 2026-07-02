import express from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import bcrypt from 'bcrypt'
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, unlinkSync } from 'fs'
import { resolve, join, normalize } from 'path'
import { randomBytes } from 'crypto'

const app = express()
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
})
const PORT = process.env.PORT || 3000
const DIST = new URL('./dist', import.meta.url).pathname
const DB_PATH = resolve('/home/jai/apps/db.json')

// ── WebSocket: tokens de jugadores ──────────────────────
// Tokens en memoria: { [partyId]: { [charId]: { x, y, userId, charName, color } } }
const tokenState = {}

io.on('connection', (socket) => {
  const userId = parseInt(socket.handshake.query.userId)
  const partyId = socket.handshake.query.partyId

  if (!partyId) return socket.disconnect()

  socket.join(`party:${partyId}`)
  console.log(`[WS] conectado userId:${userId} partyId:${partyId} sala size:`, io.sockets.adapter.rooms.get(`party:${partyId}`)?.size)

  // Enviar estado actual de tokens al recién conectado
  const current = tokenState[partyId] || {}
  socket.emit('tokens:sync', current)

  // Jugador mueve su token
  socket.on('token:move', (data) => {
    const { charId, x, y } = data
    if (!charId || x == null || y == null) return

    const db = JSON.parse(readFileSync(DB_PATH, 'utf8'))
    const user = (db.users || []).find(u => u.id === userId)
    if (!user) return

    const isMaster = user.role === 'dndMaster' || user.role === 'master'

    // Verificar permiso: master mueve cualquiera, jugador solo el suyo
    const existingToken = tokenState[partyId]?.[charId]
    const isOwner = existingToken?.userId === userId
    if (!isMaster && !isOwner) return

    if (!tokenState[partyId]) tokenState[partyId] = {}
    tokenState[partyId][charId] = {
      ...tokenState[partyId][charId],
      x, y
    }

    const roomSize = io.sockets.adapter.rooms.get(`party:${partyId}`)?.size || 0
    console.log(`[WS token:move] charId:${charId} x:${x} y:${y} → broadcast a ${roomSize} sockets`)
    io.to(`party:${partyId}`).emit('tokens:update', tokenState[partyId])
  })

  // Master puede cambiar visibilidad de un token
  socket.on('token:setVisible', (data) => {
    const { charId, visible } = data
    const db = JSON.parse(readFileSync(DB_PATH, 'utf8'))
    const user = (db.users || []).find(u => u.id === userId)
    const isMaster = user?.role === 'dndMaster' || user?.role === 'master'
    if (!isMaster) return

    if (tokenState[partyId]?.[charId]) {
      tokenState[partyId][charId].visible = visible
      io.to(`party:${partyId}`).emit('tokens:update', tokenState[partyId])
    }
  })

  // Master puede inicializar token de un personaje o enemigo en el mapa
  socket.on('token:init', (data) => {
    const { charId, x, y, color, name, portrait } = data
    console.log('[WS token:init] userId:', userId, 'partyId:', partyId, 'charId:', charId)
    const db = JSON.parse(readFileSync(DB_PATH, 'utf8'))
    const user = (db.users || []).find(u => u.id === userId)
    console.log('[WS token:init] user found:', user?.username, 'role:', user?.role)
    const isMaster = user?.role === 'dndMaster' || user?.role === 'master'
    console.log('[WS token:init] isMaster:', isMaster)
    if (!isMaster) return

    // Resolver nombre y portrait: primero del payload, luego de la DB
    let charName = name
    let charPortrait = portrait
    if (!charName) {
      const chars = db.dnd?.characters || []
      const char = chars.find(c => String(c.id) === String(charId))
      charName = char?.name || charId
      charPortrait = charPortrait || char?.portrait
    }

    if (!tokenState[partyId]) tokenState[partyId] = {}
    // Para personajes: buscar el userId del jugador dueño
    const chars2 = db.dnd?.characters || []
    const charForUser = chars2.find(c => String(c.id) === String(charId))
    const tokenUserId = charForUser?.playerUserId ?? null

    tokenState[partyId][charId] = {
      charId,
      userId: tokenUserId,
      charName,
      portrait: charPortrait || null,
      x, y,
      color: color || '#6366f1',
      visible: true
    }
    io.to(`party:${partyId}`).emit('tokens:update', tokenState[partyId])
  })

  // Master puede eliminar token del mapa
  socket.on('token:remove', (data) => {
    const { charId } = data
    const db = JSON.parse(readFileSync(DB_PATH, 'utf8'))
    const user = (db.users || []).find(u => u.id === userId)
    const isMaster = user?.role === 'dndMaster' || user?.role === 'master'
    if (!isMaster) return

    if (tokenState[partyId]) {
      delete tokenState[partyId][charId]
      io.to(`party:${partyId}`).emit('tokens:update', tokenState[partyId])
    }
  })

  socket.on('disconnect', () => {
    // No limpiar tokens al desconectar — persisten hasta que el master los elimine
  })
})

app.use(express.json({ limit: '30mb' }))

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

  res.json({ user: { id: user.id, username: user.username, role: user.role, apps: user.apps || [] }, rememberToken: token })
})

// ── API: Registro D&D Player ─────────────────────────────
app.post('/api/dnd/register', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' })
  if (username.length < 3) return res.status(400).json({ error: 'El usuario debe tener al menos 3 caracteres' })
  if (password.length < 1) return res.status(400).json({ error: 'Contraseña requerida' })
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

  res.json({ user: { id: newUser.id, username: newUser.username, role: newUser.role, apps: newUser.apps || [] }, rememberToken: token })
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
  res.json({ user: { id: user.id, username: user.username, role: user.role, apps: user.apps || [] } })
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

// Subir textura de suelo
const FLOORS_ROOT = resolve('./public/textures/floors')
app.post('/api/dnd/floors/upload', requireUser, requireDnDMaster, (req, res) => {
  try {
    const { data, filename } = req.body
    if (!data || !filename) return res.status(400).json({ error: 'Datos requeridos' })
    mkdirSync(FLOORS_ROOT, { recursive: true })
    const ext = filename.split('.').pop().toLowerCase()
    if (!/^(png|jpg|jpeg|webp)$/.test(ext)) return res.status(400).json({ error: 'Formato no soportado (png/jpg/webp)' })
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const finalName = safeName.length > 3 ? safeName : `${Date.now()}.${ext}`
    const buf = Buffer.from(data.replace(/^data:image\/\w+;base64,/, ''), 'base64')
    writeFileSync(join(FLOORS_ROOT, finalName), buf)
    res.json({ url: `/textures/floors/${encodeURIComponent(finalName)}`, name: finalName.replace(/\.[^.]+$/, ''), file: finalName })
  } catch (e) {
    console.error('Floor upload error:', e)
    res.status(500).json({ error: e.message })
  }
})

// Borrar textura de suelo
app.delete('/api/dnd/floors/:filename', requireUser, requireDnDMaster, (req, res) => {
  try {
    const { filename } = req.params
    const filePath = normalize(join(FLOORS_ROOT, filename))
    if (!filePath.startsWith(FLOORS_ROOT)) return res.status(400).json({ error: 'Ruta inválida' })
    unlinkSync(filePath)
    res.json({ ok: true })
  } catch (e) {
    if (e.code === 'ENOENT') return res.status(404).json({ error: 'Archivo no encontrado' })
    res.status(500).json({ error: e.message })
  }
})

// ── API: D&D ─────────────────────────────────────────────
function getDnDData(db) {
  if (!db.dnd) db.dnd = { campaigns: [], characters: [] }
  if (!db.dnd.campaigns) db.dnd.campaigns = []
  if (!db.dnd.characters) db.dnd.characters = []
  // Migración: asignar player a personajes existentes
  db.dnd.characters.forEach(ch => { if (!ch.player) ch.player = 'Jai' })
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

// Renombrar campaña
app.put('/api/dnd/campaigns/:id', requireUser, requireDnDMaster, (req, res) => {
  const { name } = req.body
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nombre requerido' })
  const db = getDB()
  const dnd = getDnDData(db)
  const campaign = dnd.campaigns.find(c => c.id === parseInt(req.params.id))
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
  campaign.name = name.trim()
  saveDB(db)
  res.json(campaign)
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

// Asociar imagen a capítulo
app.post('/api/dnd/campaigns/:campaignId/chapters/:chapterId/images', requireUser, requireDnDMaster, (req, res) => {
  const { url, name } = req.body
  if (!url) return res.status(400).json({ error: 'URL requerida' })
  const db = getDB()
  const dnd = getDnDData(db)
  const campaign = dnd.campaigns.find(c => c.id === parseInt(req.params.campaignId))
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
  const chapter = campaign.chapters.find(ch => ch.id === parseInt(req.params.chapterId))
  if (!chapter) return res.status(404).json({ error: 'Capítulo no encontrado' })
  if (!chapter.images) chapter.images = []
  if (!chapter.images.some(img => img.url === url)) {
    chapter.images.push({ url, name: name || url.split('/').pop(), addedAt: Date.now() })
    saveDB(db)
  }
  res.json(chapter.images)
})

// Desasociar imagen de capítulo
app.delete('/api/dnd/campaigns/:campaignId/chapters/:chapterId/images', requireUser, requireDnDMaster, (req, res) => {
  const { url } = req.body
  const db = getDB()
  const dnd = getDnDData(db)
  const campaign = dnd.campaigns.find(c => c.id === parseInt(req.params.campaignId))
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
  const chapter = campaign.chapters.find(ch => ch.id === parseInt(req.params.chapterId))
  if (!chapter) return res.status(404).json({ error: 'Capítulo no encontrado' })
  if (!chapter.images) chapter.images = []
  chapter.images = chapter.images.filter(img => img.url !== url)
  saveDB(db)
  res.json(chapter.images)
})

// ── Notas del Master (por capítulo) ──────────────────────────
// Obtener notas de un capítulo
app.get('/api/dnd/campaigns/:campaignId/chapters/:chapterId/notes', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const campaign = dnd.campaigns.find(c => c.id === parseInt(req.params.campaignId))
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
  const chapter = campaign.chapters.find(ch => ch.id === parseInt(req.params.chapterId))
  if (!chapter) return res.status(404).json({ error: 'Capítulo no encontrado' })
  res.json(chapter.notes || [])
})

// Crear nota
app.post('/api/dnd/campaigns/:campaignId/chapters/:chapterId/notes', requireUser, requireDnDMaster, (req, res) => {
  const { title, subtitle, body } = req.body
  if (!title || !title.trim()) return res.status(400).json({ error: 'Título requerido' })
  const db = getDB()
  const dnd = getDnDData(db)
  const campaign = dnd.campaigns.find(c => c.id === parseInt(req.params.campaignId))
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
  const chapter = campaign.chapters.find(ch => ch.id === parseInt(req.params.chapterId))
  if (!chapter) return res.status(404).json({ error: 'Capítulo no encontrado' })
  if (!chapter.notes) chapter.notes = []
  const folderId = req.body.folderId || null
  const note = { id: Date.now(), title: title.trim(), subtitle: (subtitle || '').trim(), body: (body || '').trim(), folderId, imageShortcuts: req.body.imageShortcuts || [], createdAt: Date.now(), updatedAt: Date.now() }
  chapter.notes.push(note)
  saveDB(db)
  res.json(note)
})

// Actualizar nota
app.put('/api/dnd/campaigns/:campaignId/chapters/:chapterId/notes/:noteId', requireUser, requireDnDMaster, (req, res) => {
  const { title, subtitle, body } = req.body
  if (!title || !title.trim()) return res.status(400).json({ error: 'Título requerido' })
  const db = getDB()
  const dnd = getDnDData(db)
  const campaign = dnd.campaigns.find(c => c.id === parseInt(req.params.campaignId))
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
  const chapter = campaign.chapters.find(ch => ch.id === parseInt(req.params.chapterId))
  if (!chapter) return res.status(404).json({ error: 'Capítulo no encontrado' })
  const note = (chapter.notes || []).find(n => n.id === parseInt(req.params.noteId))
  if (!note) return res.status(404).json({ error: 'Nota no encontrada' })
  note.title = title.trim()
  note.subtitle = (subtitle || '').trim()
  note.body = (body || '').trim()
  if (req.body.folderId !== undefined) note.folderId = req.body.folderId || null
  if (req.body.imageShortcuts !== undefined) note.imageShortcuts = req.body.imageShortcuts || []
  note.updatedAt = Date.now()
  saveDB(db)
  res.json(note)
})

// Borrar nota
app.delete('/api/dnd/campaigns/:campaignId/chapters/:chapterId/notes/:noteId', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const campaign = dnd.campaigns.find(c => c.id === parseInt(req.params.campaignId))
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
  const chapter = campaign.chapters.find(ch => ch.id === parseInt(req.params.chapterId))
  if (!chapter) return res.status(404).json({ error: 'Capítulo no encontrado' })
  chapter.notes = (chapter.notes || []).filter(n => n.id !== parseInt(req.params.noteId))
  saveDB(db)
  res.json({ ok: true })
})

// Mover nota a carpeta (o a raíz con folderId=null)
app.patch('/api/dnd/campaigns/:campaignId/chapters/:chapterId/notes/:noteId/move', requireUser, requireDnDMaster, (req, res) => {
  const { folderId } = req.body
  const db = getDB()
  const dnd = getDnDData(db)
  const campaign = dnd.campaigns.find(c => c.id === parseInt(req.params.campaignId))
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
  const chapter = campaign.chapters.find(ch => ch.id === parseInt(req.params.chapterId))
  if (!chapter) return res.status(404).json({ error: 'Capítulo no encontrado' })
  const note = (chapter.notes || []).find(n => n.id === parseInt(req.params.noteId))
  if (!note) return res.status(404).json({ error: 'Nota no encontrada' })
  note.folderId = folderId || null
  note.updatedAt = Date.now()
  saveDB(db)
  res.json(note)
})

// ── Note Folders ──
// Crear carpeta de notas
app.post('/api/dnd/campaigns/:campaignId/chapters/:chapterId/noteFolders', requireUser, requireDnDMaster, (req, res) => {
  const { name } = req.body
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nombre requerido' })
  const db = getDB()
  const dnd = getDnDData(db)
  const campaign = dnd.campaigns.find(c => c.id === parseInt(req.params.campaignId))
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
  const chapter = campaign.chapters.find(ch => ch.id === parseInt(req.params.chapterId))
  if (!chapter) return res.status(404).json({ error: 'Capítulo no encontrado' })
  if (!chapter.noteFolders) chapter.noteFolders = []
  const folder = { id: Date.now(), name: name.trim(), parentId: req.body.parentId || null, createdAt: Date.now() }
  chapter.noteFolders.push(folder)
  saveDB(db)
  res.json(folder)
})

// Renombrar carpeta
app.put('/api/dnd/campaigns/:campaignId/chapters/:chapterId/noteFolders/:folderId', requireUser, requireDnDMaster, (req, res) => {
  const { name } = req.body
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nombre requerido' })
  const db = getDB()
  const dnd = getDnDData(db)
  const campaign = dnd.campaigns.find(c => c.id === parseInt(req.params.campaignId))
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
  const chapter = campaign.chapters.find(ch => ch.id === parseInt(req.params.chapterId))
  if (!chapter) return res.status(404).json({ error: 'Capítulo no encontrado' })
  const folder = (chapter.noteFolders || []).find(f => f.id === parseInt(req.params.folderId))
  if (!folder) return res.status(404).json({ error: 'Carpeta no encontrada' })
  folder.name = name.trim()
  saveDB(db)
  res.json(folder)
})

// Mover carpeta (cambiar parentId)
app.patch('/api/dnd/campaigns/:campaignId/chapters/:chapterId/noteFolders/:folderId/move', requireUser, requireDnDMaster, (req, res) => {
  const { parentId } = req.body
  const db = getDB()
  const dnd = getDnDData(db)
  const campaign = dnd.campaigns.find(c => c.id === parseInt(req.params.campaignId))
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
  const chapter = campaign.chapters.find(ch => ch.id === parseInt(req.params.chapterId))
  if (!chapter) return res.status(404).json({ error: 'Capítulo no encontrado' })
  const folderId = parseInt(req.params.folderId)
  const folder = (chapter.noteFolders || []).find(f => f.id === folderId)
  if (!folder) return res.status(404).json({ error: 'Carpeta no encontrada' })
  // Evitar ciclos: no puede moverse dentro de sí misma o de sus hijos
  const descendants = new Set()
  function collectDesc(id) { descendants.add(id); (chapter.noteFolders || []).filter(f => f.parentId === id).forEach(f => collectDesc(f.id)) }
  collectDesc(folderId)
  if (parentId && descendants.has(parseInt(parentId))) return res.status(400).json({ error: 'No se puede mover dentro de sí misma' })
  folder.parentId = parentId ? parseInt(parentId) : null
  saveDB(db)
  res.json(folder)
})

// Borrar carpeta (notas vuelven a raíz)
app.delete('/api/dnd/campaigns/:campaignId/chapters/:chapterId/noteFolders/:folderId', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const campaign = dnd.campaigns.find(c => c.id === parseInt(req.params.campaignId))
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
  const chapter = campaign.chapters.find(ch => ch.id === parseInt(req.params.chapterId))
  if (!chapter) return res.status(404).json({ error: 'Capítulo no encontrado' })
  const folderId = parseInt(req.params.folderId)
  // Recoger todos los ids a borrar (la carpeta + todas sus subcarpetas recursivas)
  const allFolders = chapter.noteFolders || []
  const idsToDelete = new Set()
  function collectChildren(id) {
    idsToDelete.add(id)
    allFolders.filter(f => f.parentId === id).forEach(f => collectChildren(f.id))
  }
  collectChildren(folderId)
  chapter.noteFolders = allFolders.filter(f => !idsToDelete.has(f.id))
  // Mover notas huérfanas a raíz
  ;(chapter.notes || []).forEach(n => { if (idsToDelete.has(n.folderId)) n.folderId = null })
  saveDB(db)
  res.json({ ok: true })
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

// Borrar mapa
app.delete('/api/dnd/campaigns/:campaignId/chapters/:chapterId/maps/:mapId', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const campaign = dnd.campaigns.find(c => c.id === parseInt(req.params.campaignId))
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
  const chapter = campaign.chapters.find(ch => ch.id === parseInt(req.params.chapterId))
  if (!chapter) return res.status(404).json({ error: 'Capítulo no encontrado' })
  chapter.maps = chapter.maps.filter(m => m.id !== parseInt(req.params.mapId))
  saveDB(db)
  res.json({ ok: true })
})

// Reordenar mapas de un capítulo
app.put('/api/dnd/campaigns/:campaignId/chapters/:chapterId/maps/order', requireUser, requireDnDMaster, (req, res) => {
  const { order } = req.body // array de map ids
  const db = getDB()
  const dnd = getDnDData(db)
  const campaign = dnd.campaigns.find(c => c.id === parseInt(req.params.campaignId))
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })
  const chapter = campaign.chapters.find(ch => ch.id === parseInt(req.params.chapterId))
  if (!chapter) return res.status(404).json({ error: 'Capítulo no encontrado' })
  const mapById = {}
  chapter.maps.forEach(m => { mapById[m.id] = m })
  const reordered = (order || []).map(id => mapById[id]).filter(Boolean)
  const remaining = chapter.maps.filter(m => !order.includes(m.id))
  chapter.maps = [...reordered, ...remaining]
  saveDB(db)
  res.json({ ok: true })
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
    const sounds = []
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
    // Also scan sounds folder
    try {
      const soundsSub = req.query.soundsPath || ''
      const soundsFull = normalize(join(SOUNDS_ROOT, (soundsSub || '').replace(/^\/+|\/+$/g, '')))
      if (soundsFull.startsWith(SOUNDS_ROOT)) {
        const sEntries = readdirSync(soundsFull)
        for (const name of sEntries) {
          if (name.startsWith('.')) continue
          const entryPath = join(soundsFull, name)
          let stat
          try { stat = statSync(entryPath) } catch { continue }
          if (/\.(mp3|wav|ogg|m4a|webm|aac)$/i.test(name)) {
            const relPath = soundsSub ? `${soundsSub}/${name}` : name
            const urlPath = relPath.split('/').map(encodeURIComponent).join('/')
            sounds.push({ name: name.replace(/\.[^.]+$/, ''), file: name, url: `/sounds/${urlPath}` })
          }
        }
        sounds.sort((a, b) => a.name.localeCompare(b.name, 'es'))
      }
    } catch {}
    folders.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    images.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    res.json({ path: sub, folders, images, sounds })
  } catch (e) {
    res.status(404).json({ error: 'Carpeta no encontrada' })
  }
})

// Subir imagen a una carpeta de dndImages
app.post('/api/dnd/images/upload', requireUser, requireDnDMaster, (req, res) => {
  try {
    const { data, filename, path: subPath } = req.body
    if (!data || !filename) return res.status(400).json({ error: 'Datos requeridos' })
    const targetDir = safeDndPath(subPath || '')
    if (!targetDir) return res.status(400).json({ error: 'Ruta inválida' })
    mkdirSync(targetDir, { recursive: true })
    const ext = filename.split('.').pop().toLowerCase()
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const finalName = safeName.length > 3 ? safeName : `${Date.now()}.${ext}`
    const buf = Buffer.from(data.replace(/^data:image\/\w+;base64,/, ''), 'base64')
    writeFileSync(join(targetDir, finalName), buf)
    const relPath = subPath ? `${subPath}/${finalName}` : finalName
    const urlPath = relPath.split('/').map(encodeURIComponent).join('/')
    res.json({ url: `/dndImages/${urlPath}`, name: finalName })
  } catch (e) {
    console.error('Image upload error:', e)
    res.status(500).json({ error: e.message })
  }
})

// Crear carpeta en dndImages
app.post('/api/dnd/images/folder', requireUser, requireDnDMaster, (req, res) => {
  try {
    const { name, path: subPath } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' })
    const clean = (subPath || '').replace(/^\/+|\/+$/g, '')
    const safeName = name.trim().replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ._\- ]/g, '_')
    const targetDir = normalize(join(DND_IMAGES_ROOT, clean, safeName))
    if (!targetDir.startsWith(DND_IMAGES_ROOT)) return res.status(400).json({ error: 'Ruta inválida' })
    mkdirSync(targetDir, { recursive: true })
    res.json({ ok: true, path: clean ? `${clean}/${safeName}` : safeName })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Subir sonido a public/sounds
app.post('/api/dnd/sounds/upload', requireUser, requireDnDMaster, (req, res) => {
  try {
    const { data, filename } = req.body
    if (!data || !filename) return res.status(400).json({ error: 'Datos requeridos' })
    mkdirSync(SOUNDS_ROOT, { recursive: true })
    const ext = filename.split('.').pop().toLowerCase()
    if (!/^(mp3|wav|ogg|m4a|webm|aac)$/.test(ext)) return res.status(400).json({ error: 'Formato no soportado' })
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const finalName = safeName.length > 3 ? safeName : `${Date.now()}.${ext}`
    const buf = Buffer.from(data.replace(/^data:[^;]+;base64,/, ''), 'base64')
    writeFileSync(join(SOUNDS_ROOT, finalName), buf)
    const urlPath = encodeURIComponent(finalName)
    res.json({ url: `/sounds/${urlPath}`, name: finalName.replace(/\.[^.]+$/, '') })
  } catch (e) {
    console.error('Sound upload error:', e)
    res.status(500).json({ error: e.message })
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
  const { mode, mapId, imageUrl, imageName, rotation, partyId } = req.body
  if (!['map', 'image', 'blank'].includes(mode)) {
    return res.status(400).json({ error: 'Modo inválido' })
  }
  const db = getDB()
  const channels = getViewerChannels(db)
  const prev = channels[channel] || emptyChannelState()
  channels[channel] = {
    mode,
    mapId: mode === 'map' ? (mapId ?? null) : null,
    partyId: mode === 'map' ? (partyId ?? prev.partyId ?? null) : null,
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

function isDnDPlayer(db, userId) {
  const user = db.users.find(u => u.id === userId)
  return user && (user.role === 'dnd' || user.role === 'dndPlayer')
}

function requireDnDMaster(req, res, next) {
  const db = getDB()
  if (!isDnDMaster(db, req.userId)) return res.status(403).json({ error: 'Solo el DM puede hacer esto' })
  next()
}

// ── Parties (multi-party system) ──────────────────────
function getParties(dnd) {
  if (!dnd.parties) {
    // Migrar desde dnd.party si existe
    if (dnd.party) {
      dnd.parties = [{ id: Date.now(), name: 'Grupo principal', ...dnd.party }]
      delete dnd.party
    } else {
      dnd.parties = []
    }
  }
  return dnd.parties
}
function findParty(dnd, partyId) {
  return getParties(dnd).find(p => p.id === parseInt(partyId))
}
function enrichParty(dnd, party) {
  const memberChars = (party.members || []).map(id => dnd.characters.find(c => c.id === id)).filter(Boolean)
  const enrichedEnemies = (party.enemies || []).map(e => {
    const glossEntry = (dnd.glossary?.entries || []).find(g => g.id === e.glossaryId)
    return { ...e, glossaryData: glossEntry || null }
  })
  return { ...party, enemies: enrichedEnemies, memberChars }
}

// Vista pública de parties (para el viewer)
app.get('/api/dnd/parties/view', (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const parties = getParties(dnd)
  saveDB(db)
  const visibleId = dnd.visiblePartyId || null
  const visible = visibleId ? parties.filter(p => p.id === visibleId) : parties
  res.json(visible.map(p => enrichParty(dnd, p)))
})

// Cambiar party visible en el viewer
app.put('/api/dnd/parties/visible', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  dnd.visiblePartyId = req.body.partyId || null
  saveDB(db)
  res.json({ ok: true, visiblePartyId: dnd.visiblePartyId })
})

// Obtener party visible actual
app.get('/api/dnd/parties/visible', requireUser, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  res.json({ visiblePartyId: dnd.visiblePartyId || null })
})

// Listar todas las parties
app.get('/api/dnd/parties', requireUser, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const parties = getParties(dnd)
  saveDB(db) // guardar posible migración
  if (isDnDMaster(db, req.userId)) {
    res.json(parties.map(p => enrichParty(dnd, p)))
  } else {
    // Jugadores solo ven parties donde tienen un personaje asignado
    const myCharIds = dnd.characters
      .filter(c => c.playerUserId === req.userId || c.ownerId === req.userId)
      .map(c => c.id)
    const myParties = parties.filter(p => (p.members || []).some(id => myCharIds.includes(id)))
    res.json(myParties.map(p => enrichParty(dnd, p)))
  }
})

// Crear party
app.post('/api/dnd/parties', requireUser, requireDnDMaster, (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' })
  const db = getDB()
  const dnd = getDnDData(db)
  const parties = getParties(dnd)
  const party = { id: Date.now(), name: name.trim(), members: [], initiative: [], usedSlots: {}, usedAbilities: {}, usedClassResources: {}, currentHp: {}, enemies: [], conditions: {} }
  parties.push(party)
  saveDB(db)
  res.json(enrichParty(dnd, party))
})

// Renombrar party
app.put('/api/dnd/parties/:partyId', requireUser, requireDnDMaster, (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' })
  const db = getDB()
  const dnd = getDnDData(db)
  const party = findParty(dnd, req.params.partyId)
  if (!party) return res.status(404).json({ error: 'Party no encontrada' })
  party.name = name.trim()
  saveDB(db)
  res.json(enrichParty(dnd, party))
})

// Borrar party
app.delete('/api/dnd/parties/:partyId', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  dnd.parties = getParties(dnd).filter(p => p.id !== parseInt(req.params.partyId))
  saveDB(db)
  res.json({ ok: true })
})

// Añadir miembro a party
app.post('/api/dnd/parties/:partyId/members', requireUser, requireDnDMaster, (req, res) => {
  const { charId } = req.body
  const db = getDB()
  const dnd = getDnDData(db)
  const party = findParty(dnd, req.params.partyId)
  if (!party) return res.status(404).json({ error: 'Party no encontrada' })
  if (!party.members) party.members = []
  if (!party.members.includes(charId)) party.members.push(charId)
  saveDB(db)
  res.json(enrichParty(dnd, party))
})

// Quitar miembro de party
app.delete('/api/dnd/parties/:partyId/members/:charId', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const party = findParty(dnd, req.params.partyId)
  if (!party) return res.status(404).json({ error: 'Party no encontrada' })
  const charId = parseInt(req.params.charId)
  party.members = (party.members || []).filter(id => id !== charId)
  party.initiative = (party.initiative || []).filter(id => id !== charId && id !== String(charId))
  saveDB(db)
  res.json(enrichParty(dnd, party))
})

// Reordenar initiative
app.put('/api/dnd/parties/:partyId/initiative', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const party = findParty(dnd, req.params.partyId)
  if (!party) return res.status(404).json({ error: 'Party no encontrada' })
  party.initiative = req.body.initiative || []
  saveDB(db)
  res.json({ ok: true })
})

// Cambiar valor de iniciativa de un miembro y reordenar
app.patch('/api/dnd/parties/:partyId/initiative-value', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const party = findParty(dnd, req.params.partyId)
  if (!party) return res.status(404).json({ error: 'Party no encontrada' })
  const { key, value } = req.body
  if (!key || value == null) return res.status(400).json({ error: 'key y value requeridos' })
  if (!party.initiativeValues) party.initiativeValues = {}
  party.initiativeValues[key] = Number(value)
  // Reordenar initiative array por valor descendente
  const allKeys = [...new Set([...(party.members || []).map(String), ...(party.enemies || []).map(e => `e${e.id}`)])]
  allKeys.sort((a, b) => (party.initiativeValues[b] ?? -999) - (party.initiativeValues[a] ?? -999))
  party.initiative = allKeys
  saveDB(db)
  res.json({ ok: true, initiative: party.initiative, initiativeValues: party.initiativeValues })
})

// Resetear iniciativa de toda la party
app.post('/api/dnd/parties/:partyId/reset-initiative', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const party = findParty(dnd, req.params.partyId)
  if (!party) return res.status(404).json({ error: 'Party no encontrada' })
  party.initiative = []
  party.initiativeValues = {}
  saveDB(db)
  res.json({ ok: true })
})

// HP de un PC en party
app.patch('/api/dnd/parties/:partyId/hp/:charId', requireUser, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const party = findParty(dnd, req.params.partyId)
  if (!party) return res.status(404).json({ error: 'Party no encontrada' })
  const charId = parseInt(req.params.charId)
  if (!party.currentHp) party.currentHp = {}
  party.currentHp[charId] = req.body.hp
  const ch = dnd.characters.find(c => c.id === charId)
  if (ch?.stats?.hp) ch.stats.hp.current = req.body.hp
  saveDB(db)
  res.json({ ok: true })
})

// Slots de un PC en party
app.patch('/api/dnd/parties/:partyId/slots/:charId', requireUser, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const party = findParty(dnd, req.params.partyId)
  if (!party) return res.status(404).json({ error: 'Party no encontrada' })
  if (!party.usedSlots) party.usedSlots = {}
  party.usedSlots[parseInt(req.params.charId)] = req.body.usedSlots
  saveDB(db)
  res.json({ ok: true })
})

// Ability slots (huecos de habilidad)
app.patch('/api/dnd/parties/:partyId/ability-slots/:charId', requireUser, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const party = findParty(dnd, req.params.partyId)
  if (!party) return res.status(404).json({ error: 'Party no encontrada' })
  if (!party.usedAbilities) party.usedAbilities = {}
  party.usedAbilities[parseInt(req.params.charId)] = req.body.usedAbilities
  saveDB(db)
  res.json({ ok: true })
})

// Class resource slots (recursos de clase: Canalizar Divinidad, Ki, etc.)
app.patch('/api/dnd/parties/:partyId/class-resources/:charId', requireUser, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const party = findParty(dnd, req.params.partyId)
  if (!party) return res.status(404).json({ error: 'Party no encontrada' })
  if (!party.usedClassResources) party.usedClassResources = {}
  party.usedClassResources[parseInt(req.params.charId)] = req.body.usedClassResources
  saveDB(db)
  res.json({ ok: true })
})

// Conditions
app.patch('/api/dnd/parties/:partyId/conditions/:key', requireUser, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const party = findParty(dnd, req.params.partyId)
  if (!party) return res.status(404).json({ error: 'Party no encontrada' })
  if (!party.conditions) party.conditions = {}
  party.conditions[req.params.key] = req.body.conditions || []
  saveDB(db)
  res.json({ ok: true })
})

// Añadir enemigo a party
app.post('/api/dnd/parties/:partyId/enemy', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const party = findParty(dnd, req.params.partyId)
  if (!party) return res.status(404).json({ error: 'Party no encontrada' })
  if (!party.enemies) party.enemies = []
  const { glossaryId, initiative, hpMax, label } = req.body
  let finalHpMax = hpMax
  if (!finalHpMax && glossaryId) {
    const entry = (dnd.glossary?.entries || []).find(g => g.id === glossaryId)
    if (entry?.stats?.hp) {
      const { dice, sides, modifier } = entry.stats.hp
      let total = modifier || 0
      for (let i = 0; i < (dice || 1); i++) total += Math.floor(Math.random() * (sides || 6)) + 1
      finalHpMax = Math.max(1, total)
    } else { finalHpMax = 10 }
  }
  const enemy = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    glossaryId: glossaryId || null, label: label || '',
    initiative: initiative ?? 0, hpMax: finalHpMax || 10, hpCurrent: finalHpMax || 10, portrait: null
  }
  if (glossaryId) {
    const entry = (dnd.glossary?.entries || []).find(g => g.id === glossaryId)
    if (entry?.portraits?.length > 0) enemy.portrait = entry.portraits[Math.floor(Math.random() * entry.portraits.length)]
  }
  party.enemies.push(enemy)
  if (!party.initiative) party.initiative = []
  if (!party.initiativeValues) party.initiativeValues = {}
  party.initiativeValues[`e${enemy.id}`] = enemy.initiative
  // Reordenar por iniciativa
  const allKeys = [...new Set([...(party.members || []).map(String), ...party.enemies.map(e => `e${e.id}`)])]
  allKeys.sort((a, b) => (party.initiativeValues[b] ?? -999) - (party.initiativeValues[a] ?? -999))
  party.initiative = allKeys
  saveDB(db)
  const glossEntry = (dnd.glossary?.entries || []).find(g => g.id === glossaryId)
  res.json({ ...enemy, glossaryData: glossEntry || null })
})

// Quitar enemigo de party
app.delete('/api/dnd/parties/:partyId/enemy/:id', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const party = findParty(dnd, req.params.partyId)
  if (!party) return res.status(404).json({ error: 'Party no encontrada' })
  const enemyId = parseInt(req.params.id)
  party.enemies = (party.enemies || []).filter(e => e.id !== enemyId)
  party.initiative = (party.initiative || []).filter(k => k !== `e${enemyId}`)
  saveDB(db)
  res.json({ ok: true })
})

// HP enemigo en party
app.patch('/api/dnd/parties/:partyId/enemy/:id/hp', requireUser, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const party = findParty(dnd, req.params.partyId)
  if (!party) return res.status(404).json({ error: 'Party no encontrada' })
  const enemy = (party.enemies || []).find(e => e.id === parseInt(req.params.id))
  if (!enemy) return res.status(404).json({ error: 'Enemigo no encontrado' })
  enemy.hpCurrent = req.body.hp
  saveDB(db)
  res.json({ ok: true })
})

// Descanso en party
app.post('/api/dnd/parties/:partyId/rest', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  const party = findParty(dnd, req.params.partyId)
  if (!party) return res.status(404).json({ error: 'Party no encontrada' })
  const restType = req.body.type
  if (restType === 'long') {
    party.usedSlots = {}; party.usedAbilities = {}; party.usedClassResources = {}; party.currentHp = {}
    ;(party.members || []).forEach(id => { const ch = dnd.characters.find(c => c.id === id); if (ch?.stats?.hp) ch.stats.hp.current = ch.stats.hp.max })
  } else if (restType === 'short') {
    party.currentHp = {}
    ;(party.members || []).forEach(id => { const ch = dnd.characters.find(c => c.id === id); if (ch?.stats?.hp) ch.stats.hp.current = ch.stats.hp.max })
  }
  saveDB(db)
  res.json({ ok: true })
})

app.get('/api/dnd/characters', requireUser, (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  // master ve todos; jugadores ven solo su personaje (por playerUserId o ownerId)
  if (isDnDMaster(db, req.userId)) {
    res.json(dnd.characters)
  } else {
    res.json(dnd.characters.filter(c => c.playerUserId === req.userId || c.ownerId === req.userId))
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
  // Solo el dueño, el jugador asignado, o master puede editar
  const canEdit = isDnDMaster(db, req.userId) || ch.ownerId === req.userId || ch.playerUserId === req.userId
  if (!canEdit) {
    return res.status(403).json({ error: 'Sin permiso' })
  }
  // Master puede cambiar playerUserId, jugadores no
  const newPlayerUserId = isDnDMaster(db, req.userId) && req.body.playerUserId !== undefined
    ? req.body.playerUserId
    : ch.playerUserId
  dnd.characters[idx] = { ...ch, ...req.body, id: ch.id, ownerId: ch.ownerId || req.userId, playerUserId: newPlayerUserId }
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

// ── API: D&D Soundboard ──────────────────────────────────
const SOUNDS_ROOT = resolve('./public/sounds')

function getSoundboard(db) {
  const dnd = getDnDData(db)
  if (!dnd.soundboard) dnd.soundboard = []
  return dnd.soundboard
}

// Listar sonidos disponibles en public/sounds (navegación de carpetas)
app.get('/api/dnd/sounds/files', requireUser, requireDnDMaster, (req, res) => {
  const sub = (req.query.path || '').replace(/^\/+|\/+$/g, '')
  const full = normalize(join(SOUNDS_ROOT, sub))
  if (!full.startsWith(SOUNDS_ROOT)) return res.status(400).json({ error: 'Ruta inválida' })
  try {
    mkdirSync(full, { recursive: true })
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
      } else if (/\.(mp3|wav|ogg|m4a|webm|aac)$/i.test(name)) {
        const relPath = sub ? `${sub}/${name}` : name
        const urlPath = relPath.split('/').map(encodeURIComponent).join('/')
        files.push({ name: name.replace(/\.[^.]+$/, ''), file: name, url: `/sounds/${urlPath}` })
      }
    }
    folders.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    files.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    res.json({ path: sub, folders, files })
  } catch { res.json({ path: sub, folders: [], files: [] }) }
})

// CRUD del soundboard (array de { id, name, category, url, icon })
app.get('/api/dnd/soundboard', requireUser, (req, res) => {
  const db = getDB()
  res.json(getSoundboard(db))
})

app.post('/api/dnd/soundboard', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const sb = getSoundboard(db)
  const sound = { id: Date.now(), ...req.body }
  sb.push(sound)
  saveDB(db)
  res.json(sound)
})

app.put('/api/dnd/soundboard/:id', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const sb = getSoundboard(db)
  const idx = sb.findIndex(s => s.id === parseInt(req.params.id))
  if (idx === -1) return res.status(404).json({ error: 'Sonido no encontrado' })
  sb[idx] = { ...sb[idx], ...req.body, id: sb[idx].id }
  saveDB(db)
  res.json(sb[idx])
})

app.delete('/api/dnd/soundboard/:id', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const sb = getSoundboard(db)
  const dnd = getDnDData(db)
  dnd.soundboard = sb.filter(s => s.id !== parseInt(req.params.id))
  saveDB(db)
  res.json({ ok: true })
})

// Disparar sonido en el viewer (escribe un comando que el viewer recoge por polling)
app.post('/api/dnd/soundboard/play', requireUser, requireDnDMaster, (req, res) => {
  const { url, name, volume } = req.body
  if (!url) return res.status(400).json({ error: 'URL requerida' })
  const db = getDB()
  const dnd = getDnDData(db)
  dnd.soundCommand = { url, name: name || '', volume: volume ?? 1, ts: Date.now() }
  saveDB(db)
  res.json({ ok: true })
})

// Endpoint para que el viewer lea el último comando de sonido
app.get('/api/dnd/sound-command', (req, res) => {
  const db = getDB()
  const dnd = getDnDData(db)
  res.json(dnd.soundCommand || null)
})

// ── API: Admin — Gestión de usuarios (solo master) ───────
function requireMaster(req, res, next) {
  const db = getDB()
  const user = db.users.find(u => u.id === req.userId)
  if (!user || user.role !== 'master') return res.status(403).json({ error: 'Solo el administrador puede hacer esto' })
  next()
}

const AVAILABLE_ROLES = ['master', 'premium', 'dnd', 'dndPlayer', 'user']
const AVAILABLE_APPS = ['dnd', 'planner', 'stardewpedia']

app.get('/api/admin/users', requireUser, requireMaster, (req, res) => {
  const db = getDB()
  res.json(db.users.map(u => ({ id: u.id, username: u.username, role: u.role, apps: u.apps || [], sharedMealWith: u.sharedMealWith })))
})

// Listar jugadores D&D (para selector de personaje)
app.get('/api/dnd/players', requireUser, (req, res) => {
  const db = getDB()
  const players = db.users.filter(u => u.role === 'dnd' || u.role === 'dndPlayer')
  res.json(players.map(u => ({ id: u.id, username: u.username })))
})

app.post('/api/admin/users', requireUser, requireMaster, async (req, res) => {
  const { username, password, role, apps } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' })
  if (username.length < 1) return res.status(400).json({ error: 'Usuario requerido' })
  if (password.length < 1) return res.status(400).json({ error: 'Contraseña requerida' })
  if (role && !AVAILABLE_ROLES.includes(role)) return res.status(400).json({ error: 'Rol inválido' })
  const db = getDB()
  if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: 'Ese nombre de usuario ya existe' })
  }
  const hashedPw = await bcrypt.hash(password, 12)
  const maxId = Math.max(...db.users.map(u => u.id), 0)
  const newUser = { id: maxId + 1, username, password: hashedPw, role: role || 'user' }
  if (apps && apps.length > 0) newUser.apps = apps.filter(a => AVAILABLE_APPS.includes(a))
  db.users.push(newUser)
  saveDB(db)
  res.json({ id: newUser.id, username: newUser.username, role: newUser.role, apps: newUser.apps || [] })
})

app.put('/api/admin/users/:id', requireUser, requireMaster, async (req, res) => {
  const db = getDB()
  const userId = parseInt(req.params.id)
  const user = db.users.find(u => u.id === userId)
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
  const { username, password, role, apps, sharedMealWith } = req.body
  if (username !== undefined) {
    if (username.length < 1) return res.status(400).json({ error: 'Usuario requerido' })
    const dup = db.users.find(u => u.id !== userId && u.username.toLowerCase() === username.toLowerCase())
    if (dup) return res.status(409).json({ error: 'Ese nombre de usuario ya existe' })
    user.username = username
  }
  if (password) {
    if (password.length < 1) return res.status(400).json({ error: 'Contraseña requerida' })
    user.password = await bcrypt.hash(password, 12)
  }
  if (role !== undefined) {
    if (!AVAILABLE_ROLES.includes(role)) return res.status(400).json({ error: 'Rol inválido' })
    user.role = role
  }
  if (apps !== undefined) user.apps = apps.filter(a => AVAILABLE_APPS.includes(a))
  if (sharedMealWith !== undefined) {
    if (sharedMealWith === null || sharedMealWith === '') delete user.sharedMealWith
    else user.sharedMealWith = parseInt(sharedMealWith)
  }
  saveDB(db)
  res.json({ id: user.id, username: user.username, role: user.role, apps: user.apps || [], sharedMealWith: user.sharedMealWith })
})

app.delete('/api/admin/users/:id', requireUser, requireMaster, (req, res) => {
  const db = getDB()
  const userId = parseInt(req.params.id)
  if (userId === req.userId) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' })
  const user = db.users.find(u => u.id === userId)
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
  db.users = db.users.filter(u => u.id !== userId)
  // Limpiar tokens del usuario eliminado
  if (db.rememberTokens) {
    for (const [token, entry] of Object.entries(db.rememberTokens)) {
      if (entry.userId === userId) delete db.rememberTokens[token]
    }
  }
  saveDB(db)
  res.json({ ok: true })
})

// ── API: Salud (registro diario) ─────────────────────────
function getSaludData(db, userId) {
  if (!db.salud) db.salud = {}
  if (!db.salud[userId]) db.salud[userId] = { entries: [], config: {} }
  if (!db.salud[userId].config) db.salud[userId].config = {}
  return db.salud[userId]
}

// GET — todas las entradas + config
app.get('/api/salud', requireUser, (req, res) => {
  const db = getDB()
  const data = getSaludData(db, req.userId)
  res.json(data)
})

// PUT — guardar config (metabolismo basal, etc.)
app.put('/api/salud/config', requireUser, (req, res) => {
  const db = getDB()
  const data = getSaludData(db, req.userId)
  Object.assign(data.config, req.body)
  saveDB(db)
  res.json(data.config)
})

// PUT — guardar/actualizar entrada de un día
app.put('/api/salud/:date', requireUser, (req, res) => {
  const db = getDB()
  const data = getSaludData(db, req.userId)
  const { date } = req.params
  const idx = data.entries.findIndex(e => e.date === date)
  const entry = { date, ...req.body, updatedAt: new Date().toISOString() }
  if (idx >= 0) data.entries[idx] = entry
  else data.entries.push(entry)
  // mantener ordenado por fecha desc
  data.entries.sort((a, b) => b.date.localeCompare(a.date))
  saveDB(db)
  res.json(entry)
})

// DELETE — borrar entrada de un día
app.delete('/api/salud/:date', requireUser, (req, res) => {
  const db = getDB()
  const data = getSaludData(db, req.userId)
  data.entries = data.entries.filter(e => e.date !== req.params.date)
  saveDB(db)
  res.json({ ok: true })
})

// ── API: D&D Props upload ────────────────────────────────
app.post('/api/dnd/props/upload', requireUser, requireDnDMaster, (req, res) => {
  try {
    const { data, filename, path: subPath } = req.body
    if (!data || !filename) return res.status(400).json({ error: 'Datos requeridos' })
    const clean = (subPath || '').replace(/^\/+|\/+$/g, '')
    const targetDir = normalize(join(PROPS_ROOT, clean))
    if (!targetDir.startsWith(PROPS_ROOT)) return res.status(400).json({ error: 'Ruta inválida' })
    mkdirSync(targetDir, { recursive: true })
    const ext = filename.split('.').pop().toLowerCase()
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const finalName = safeName.length > 3 ? safeName : `${Date.now()}.${ext}`
    const buf = Buffer.from(data.replace(/^data:image\/\w+;base64,/, ''), 'base64')
    writeFileSync(join(targetDir, finalName), buf)
    const relPath = clean ? `${clean}/${finalName}` : finalName
    const urlPath = relPath.split('/').map(encodeURIComponent).join('/')
    res.json({ url: `/textures/props/${urlPath}`, name: finalName })
  } catch (e) {
    console.error('Prop upload error:', e)
    res.status(500).json({ error: e.message })
  }
})

// Crear carpeta de props
app.post('/api/dnd/props/folder', requireUser, requireDnDMaster, (req, res) => {
  try {
    const { name, path: subPath } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' })
    const clean = (subPath || '').replace(/^\/+|\/+$/g, '')
    const safeName = name.trim().replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ._\- ]/g, '_')
    const targetDir = normalize(join(PROPS_ROOT, clean, safeName))
    if (!targetDir.startsWith(PROPS_ROOT)) return res.status(400).json({ error: 'Ruta inválida' })
    mkdirSync(targetDir, { recursive: true })
    res.json({ ok: true, path: clean ? `${clean}/${safeName}` : safeName })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── API: D&D Reference Data (armas, armaduras, trasfondos) ──
function getRefData(db) {
  const dnd = getDnDData(db)
  if (!dnd.refData) dnd.refData = { weapons: [], armor: [], backgrounds: [], classes: [], races: [] }
  return dnd.refData
}

// Inicializar desde JSON estáticos si está vacío
function initRefDataIfEmpty(db) {
  const ref = getRefData(db)
  if (ref.weapons.length === 0 && ref.armor.length === 0 && ref.backgrounds.length === 0) {
    try {
      const eq = JSON.parse(readFileSync(resolve('./public/data/equipment-es.json'), 'utf8'))
      const bg = JSON.parse(readFileSync(resolve('./public/data/backgrounds-es.json'), 'utf8'))
      ref.weapons = (eq.weapons || []).map((w, i) => ({ id: Date.now() + i, ...w }))
      ref.armor = (eq.armor || []).map((a, i) => ({ id: Date.now() + 1000 + i, ...a }))
      ref.backgrounds = (bg || []).map((b, i) => ({ id: Date.now() + 2000 + i, ...b }))
      saveDB(db)
    } catch (e) { console.error('Error loading ref data:', e) }
  }
  return ref
}

app.get('/api/dnd/refdata', requireUser, (req, res) => {
  const db = getDB()
  res.json(initRefDataIfEmpty(db))
})

// CRUD genérico para cada tipo
;['weapons', 'armor', 'backgrounds'].forEach(type => {
  // Crear
  app.post(`/api/dnd/refdata/${type}`, requireUser, requireDnDMaster, (req, res) => {
    const db = getDB()
    const ref = getRefData(db)
    const item = { id: Date.now(), ...req.body }
    ref[type].push(item)
    saveDB(db)
    res.json(item)
  })

  // Editar
  app.put(`/api/dnd/refdata/${type}/:id`, requireUser, requireDnDMaster, (req, res) => {
    const db = getDB()
    const ref = getRefData(db)
    const idx = ref[type].findIndex(i => i.id === parseInt(req.params.id))
    if (idx === -1) return res.status(404).json({ error: 'No encontrado' })
    ref[type][idx] = { ...ref[type][idx], ...req.body, id: ref[type][idx].id }
    saveDB(db)
    res.json(ref[type][idx])
  })

  // Borrar
  app.delete(`/api/dnd/refdata/${type}/:id`, requireUser, requireDnDMaster, (req, res) => {
    const db = getDB()
    const ref = getRefData(db)
    ref[type] = ref[type].filter(i => i.id !== parseInt(req.params.id))
    saveDB(db)
    res.json({ ok: true })
  })
})

// ── API: Clases SRD (id es string, no número) ────────────
app.put('/api/dnd/refdata/classes/:id', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const ref = getRefData(db)
  if (!ref.classes) ref.classes = []
  const idx = ref.classes.findIndex(c => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Clase no encontrada' })
  ref.classes[idx] = { ...ref.classes[idx], ...req.body, id: ref.classes[idx].id }
  saveDB(db)
  res.json(ref.classes[idx])
})

// ── API: Razas SRD (id es string) ────────────────────────
app.put('/api/dnd/refdata/races/:id', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const ref = getRefData(db)
  if (!ref.races) ref.races = []
  const idx = ref.races.findIndex(r => r.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Raza no encontrada' })
  ref.races[idx] = { ...ref.races[idx], ...req.body, id: ref.races[idx].id }
  saveDB(db)
  res.json(ref.races[idx])
})

app.post('/api/dnd/refdata/races', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const ref = getRefData(db)
  if (!ref.races) ref.races = []
  const race = { id: req.body.id || req.body.name?.toLowerCase().replace(/\s+/g,'-'), ...req.body }
  if (ref.races.find(r => r.id === race.id)) return res.status(409).json({ error: 'Ya existe una raza con ese id' })
  ref.races.push(race)
  saveDB(db)
  res.json(race)
})

app.delete('/api/dnd/refdata/races/:id', requireUser, requireDnDMaster, (req, res) => {
  const db = getDB()
  const ref = getRefData(db)
  if (!ref.races) ref.races = []
  ref.races = ref.races.filter(r => r.id !== req.params.id)
  saveDB(db)
  res.json({ ok: true })
})

// ── Foto Meal Analysis (Claude Vision) ───────────────────
app.post('/api/salud/analyze-meal', requireUser, async (req, res) => {
  const { image } = req.body // base64 string (sin prefijo data:...)
  if (!image) return res.status(400).json({ error: 'No image provided' })
  console.log('[analyze-meal] Received image, length:', image.length)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[analyze-meal] No ANTHROPIC_API_KEY configured')
    return res.status(500).json({ error: 'API key not configured' })
  }

  try {
    // Detectar media type del base64
    let mediaType = 'image/jpeg'
    let rawBase64 = image
    if (image.startsWith('data:')) {
      const match = image.match(/^data:(image\/\w+);base64,/)
      if (match) {
        mediaType = match[1]
        rawBase64 = image.slice(match[0].length)
      }
    }

    console.log('[analyze-meal] Calling Anthropic API, mediaType:', mediaType, 'base64 len:', rawBase64.length)

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: rawBase64 },
            },
            {
              type: 'text',
              text: `Analiza esta foto de comida. Devuelve SOLO un JSON válido (sin markdown, sin backticks) con esta estructura exacta:
{
  "items": [
    { "name": "nombre del ingrediente/alimento", "weight": gramos_estimados, "kcal": calorias, "protein": gramos, "carbs": gramos, "fat": gramos }
  ]
}
Estima el peso razonable para una ración visible en la foto. Sé conciso en los nombres. Responde SOLO el JSON.`
            }
          ]
        }]
      })
    })

    if (!resp.ok) {
      const err = await resp.text()
      console.error('[analyze-meal] Anthropic API error:', resp.status, err)
      return res.status(502).json({ error: 'API error: ' + resp.status })
    }

    const data = await resp.json()
    const text = data.content?.[0]?.text || ''
    console.log('[analyze-meal] Response received, length:', text.length, 'text:', text.slice(0, 300))
    // Limpiar posibles backticks
    const clean = text.replace(/```json\s?|```/g, '').trim()
    
    // Intentar extraer JSON del texto
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.json({ items: [], message: clean })
    }
    const parsed = JSON.parse(jsonMatch[0])
    res.json(parsed)
  } catch (err) {
    console.error('Meal analysis error:', err)
    res.status(500).json({ error: 'Analysis failed' })
  }
})

// ── Text Meal Analysis (Claude) ──────────────────────────
app.post('/api/salud/analyze-text', requireUser, async (req, res) => {
  const { text } = req.body
  if (!text || !text.trim()) return res.status(400).json({ error: 'No text provided' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  try {
    console.log('[analyze-text] Input:', text.slice(0, 200))
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `Analiza estos ingredientes/alimentos y calcula sus valores nutricionales:

${text.trim()}

Devuelve SOLO un JSON válido (sin markdown, sin backticks) con esta estructura exacta:
{
  "items": [
    { "name": "nombre del ingrediente", "weight": gramos_estimados, "kcal": calorias, "protein": gramos, "carbs": gramos, "fat": gramos }
  ]
}
Interpreta cantidades coloquiales (un puñado, una cucharada, medio tomate, etc.) y estima los gramos razonablemente. Sé conciso en los nombres. Responde SOLO el JSON.`
        }]
      })
    })

    if (!resp.ok) {
      const err = await resp.text()
      console.error('[analyze-text] API error:', resp.status, err)
      return res.status(502).json({ error: 'API error: ' + resp.status })
    }

    const data = await resp.json()
    const raw = data.content?.[0]?.text || ''
    console.log('[analyze-text] Response:', raw.slice(0, 300))
    const clean = raw.replace(/```json\s?|```/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return res.json({ items: [], message: clean })
    res.json(JSON.parse(jsonMatch[0]))
  } catch (err) {
    console.error('Text analysis error:', err)
    res.status(500).json({ error: 'Analysis failed' })
  }
})

// ── API: Notes ──────────────────────────────────────────
app.get('/api/notes', requireUser, (req, res) => {
  const db = getDB()
  if (!db.notes) db.notes = {}
  const userNotes = db.notes[req.userId] || []
  res.json(userNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)))
})

app.post('/api/notes', requireUser, (req, res) => {
  const { title, body } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'Título requerido' })
  const db = getDB()
  if (!db.notes) db.notes = {}
  if (!db.notes[req.userId]) db.notes[req.userId] = []
  const note = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: title.trim(),
    body: (body || '').trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  db.notes[req.userId].push(note)
  saveDB(db)
  res.json(note)
})

app.put('/api/notes/:id', requireUser, (req, res) => {
  const { title, body } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'Título requerido' })
  const db = getDB()
  const userNotes = db.notes?.[req.userId] || []
  const note = userNotes.find(n => n.id === req.params.id)
  if (!note) return res.status(404).json({ error: 'Nota no encontrada' })
  note.title = title.trim()
  note.body = (body || '').trim()
  note.updatedAt = new Date().toISOString()
  saveDB(db)
  res.json(note)
})

app.delete('/api/notes/:id', requireUser, (req, res) => {
  const db = getDB()
  const userNotes = db.notes?.[req.userId] || []
  const idx = userNotes.findIndex(n => n.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Nota no encontrada' })
  userNotes.splice(idx, 1)
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

// Servir archivos de audio para el soundboard
app.use('/sounds', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=86400, no-transform')
  res.setHeader('Vary', 'Accept-Encoding')
  next()
}, express.static(SOUNDS_ROOT))

app.use(express.static(DIST))
app.get('*', (req, res) => {
  res.sendFile(resolve(DIST, 'index.html'))
})

httpServer.listen(PORT, () => {
  console.log(`jaijur.com · puerto ${PORT} (WS activo)`)
})
