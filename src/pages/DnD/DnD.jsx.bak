import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AppHeader from '../../components/AppHeader'
import CharacterWizard from './CharacterWizard'
import './DnD.css'

const CONDITION_LIST = [
  { id: 'agarrado', label: 'AGA' }, { id: 'apresado', label: 'APR' }, { id: 'asustado', label: 'ASU' },
  { id: 'aturdido', label: 'ATU' }, { id: 'cansancio', label: 'CAN', levels: 6 }, { id: 'cegado', label: 'CEG' },
  { id: 'derribado', label: 'DER' }, { id: 'ensordecido', label: 'ENS' }, { id: 'envenenado', label: 'ENV' },
  { id: 'hechizado', label: 'HEC' }, { id: 'incapacitado', label: 'INC' }, { id: 'inconsciente', label: 'INS' },
  { id: 'invisible', label: 'INV' }, { id: 'paralizado', label: 'PAR' }, { id: 'petrificado', label: 'PET' },
]

function ConditionPills({ conditions }) {
  if (!conditions || Object.keys(conditions).length === 0) return null
  const pills = []
  CONDITION_LIST.forEach(c => {
    if (c.levels) {
      const lv = conditions[c.id]
      if (lv && lv > 0) pills.push({ label: `${c.label}${lv}`, id: c.id })
    } else if (conditions[c.id]) {
      pills.push({ label: c.label, id: c.id })
    }
  })
  if (pills.length === 0) return null
  return <div className="condition-pills">{pills.map(p => <span key={p.id} className="condition-pill">{p.label}</span>)}</div>
}

function ConditionManager({ conditions, onChange }) {
  const conds = conditions || {}
  function toggleCondition(id) {
    const next = { ...conds }
    if (next[id]) delete next[id]; else next[id] = true
    onChange(next)
  }
  function setCansancio(lv) {
    const next = { ...conds }
    if (lv === 0) delete next.cansancio; else next.cansancio = lv
    onChange(next)
  }
  return (
    <div className="condition-manager">
      <div className="condition-manager-label">Estados</div>
      <div className="condition-manager-grid">
        {CONDITION_LIST.map(c => {
          if (c.levels) {
            const lv = conds[c.id] || 0
            return (
              <div key={c.id} className={`condition-check ${lv > 0 ? 'active' : ''}`}>
                <span className="condition-check-name">{c.id}</span>
                <select className="condition-level-select" value={lv} onChange={e => setCansancio(parseInt(e.target.value))}>
                  <option value={0}>—</option>
                  {Array.from({length: c.levels}, (_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                </select>
              </div>
            )
          }
          const isActive = !!conds[c.id]
          return (
            <label key={c.id} className={`condition-check ${isActive ? 'active' : ''}`}>
              <input type="checkbox" checked={isActive} onChange={() => toggleCondition(c.id)} />
              <span className="condition-check-name">{c.id}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

const SOUND_CATEGORIES = ['⚔️ Combate', '🏰 Ambiente', '🚪 Objetos', '✨ Magia', '🐉 Criaturas', '🎭 Social', '💀 Terror']
const SOUND_ICONS = ['🔈','⚔️','💥','🔥','❄️','⚡','🌊','🌪️','🏹','🛡️','🚪','🔔','💀','👻','🐉','🧙','✨','🎵','🪓','🗡️','💣','🔮','🌿','🪨','🐺','🦇','💎','🏰','🔒','🪄']

function SoundModal({ mode, sound, browsePath, browseData, onBrowse, onSave, onDelete, onClose }) {
  const [name, setName] = useState(sound?.name || '')
  const [url, setUrl] = useState(sound?.url || '')
  const [category, setCategory] = useState(sound?.category || SOUND_CATEGORIES[0])
  const [icon, setIcon] = useState(sound?.icon || '🔈')
  const [showBrowser, setShowBrowser] = useState(false)
  const [showIcons, setShowIcons] = useState(false)
  const [customCat, setCustomCat] = useState('')
  const [useCustomCat, setUseCustomCat] = useState(false)
  const previewRef = useRef(null)

  function handleSelectFile(file) {
    setUrl(file.url)
    if (!name) setName(file.name)
    setShowBrowser(false)
  }

  function handlePreview() {
    if (previewRef.current) { previewRef.current.pause(); previewRef.current = null; return }
    if (!url) return
    const a = new Audio(url)
    a.volume = 0.5
    a.onended = () => { previewRef.current = null }
    a.play().catch(() => {})
    previewRef.current = a
  }

  function handleSave() {
    if (!name.trim() || !url.trim()) return
    onSave({ name: name.trim(), url: url.trim(), category: useCustomCat ? customCat.trim() : category, icon })
  }

  return (
    <div className="dnd-modal-overlay" onClick={onClose}>
      <div className="dnd-modal sb-modal" onClick={e => e.stopPropagation()}>
        <h3>{mode === 'edit' ? '✏️ Editar sonido' : '🔊 Nuevo sonido'}</h3>

        <div className="glossary-form-row">
          <label>Nombre</label>
          <input className="dnd-input" value={name} onChange={e => setName(e.target.value)} placeholder="Espada chocando..." autoFocus />
        </div>

        <div className="glossary-form-row">
          <label>URL del audio</label>
          <div className="sb-url-row">
            <input className="dnd-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="/sounds/sword.mp3 o https://..." style={{flex:1}} />
            <button className="dnd-btn-sm" onClick={() => { setShowBrowser(true); onBrowse(browsePath || '') }} title="Explorar archivos locales">📂</button>
            {url && <button className="dnd-btn-sm" onClick={handlePreview} title="Preescuchar">▶️</button>}
          </div>
        </div>

        <div className="glossary-form-row">
          <label>Categoría</label>
          {!useCustomCat ? (
            <div className="sb-cat-row">
              <select className="dnd-input" value={category} onChange={e => setCategory(e.target.value)}>
                {SOUND_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="dnd-btn-sm" onClick={() => setUseCustomCat(true)} title="Categoría personalizada">✏️</button>
            </div>
          ) : (
            <div className="sb-cat-row">
              <input className="dnd-input" value={customCat} onChange={e => setCustomCat(e.target.value)} placeholder="Mi categoría..." style={{flex:1}} />
              <button className="dnd-btn-sm" onClick={() => setUseCustomCat(false)}>↩</button>
            </div>
          )}
        </div>

        <div className="glossary-form-row">
          <label>Icono</label>
          <div className="sb-icon-row">
            <button className="sb-icon-preview" onClick={() => setShowIcons(!showIcons)}>{icon}</button>
            {showIcons && (
              <div className="sb-icon-grid">
                {SOUND_ICONS.map(i => (
                  <button key={i} className={`sb-icon-option ${icon === i ? 'active' : ''}`} onClick={() => { setIcon(i); setShowIcons(false) }}>{i}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* File browser */}
        {showBrowser && (
          <div className="sb-browser">
            <div className="sb-browser-header">
              <span className="sb-browser-path">📂 /sounds/{browsePath}</span>
              {browsePath && <button className="dnd-btn-sm" onClick={() => onBrowse(browsePath.split('/').slice(0,-1).join('/'))}>⬆ Subir</button>}
            </div>
            <div className="sb-browser-list">
              {browseData.folders.map(f => (
                <button key={f.path} className="sb-browser-item sb-browser-folder" onClick={() => onBrowse(f.path)}>📁 {f.name}</button>
              ))}
              {browseData.files.map(f => (
                <button key={f.url} className="sb-browser-item sb-browser-file" onClick={() => handleSelectFile(f)}>🎵 {f.name}</button>
              ))}
              {browseData.folders.length === 0 && browseData.files.length === 0 && (
                <div className="dnd-empty-sm">Carpeta vacía — sube archivos .mp3/.wav/.ogg a <code>public/sounds/</code></div>
              )}
            </div>
          </div>
        )}

        <div className="dnd-modal-btns">
          <button className="dnd-btn-primary" onClick={handleSave} disabled={!name.trim() || !url.trim()}>
            {mode === 'edit' ? 'Guardar' : 'Añadir'}
          </button>
          {onDelete && <button className="dnd-btn-danger" onClick={onDelete}>🗑 Eliminar</button>}
          <button className="dnd-btn-cancel" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

export default function DnD() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const isMaster = user?.role === 'master' || user?.role === 'dndMaster'
  const [campaigns, setCampaigns] = useState([])
  const [expanded, setExpanded] = useState({})
  const [modal, setModal] = useState(null) // { type, campaignId?, chapterId? }
  const [inputVal, setInputVal] = useState('')

  // Navegador de imágenes: estado por capítulo { [chapterId]: { path, folders, images } }
  const [imageBrowser, setImageBrowser] = useState({})
  const [viewerState, setViewerState] = useState(null)
  const [toast, setToast] = useState('')

  // Glosario
  const [glossary, setGlossary] = useState({ entries: [], favorites: {} })
  const [glossaryFilter, setGlossaryFilter] = useState('all') // all, enemy, artifact, lore
  const [glossarySubFilter, setGlossarySubFilter] = useState('all') // spell: 'all'|'truco'|'1'...; enemy: 'all'|campaignId
  const [glossarySearch, setGlossarySearch] = useState('')
  const [glossaryModal, setGlossaryModal] = useState(null) // null | { mode: 'create'|'edit', entry }
  const [expandedEntry, setExpandedEntry] = useState(null)
  const [glossaryPage, setGlossaryPage] = useState(0)
  const GLOSSARY_PAGE_SIZE = 10

  // Characters
  const [characters, setCharacters] = useState([])
  const [characterModal, setCharacterModal] = useState(null) // null | { mode: 'create'|'edit', character }
  const [expandedCharacter, setExpandedCharacter] = useState(null)
  const [charSearch, setCharSearch] = useState('')

  // Parties (multi-party)
  const [parties, setParties] = useState([])
  const [partyAddModal, setPartyAddModal] = useState(null) // null | { partyId }
  const [partyCreateModal, setPartyCreateModal] = useState(false)
  const [partyCreateName, setPartyCreateName] = useState('')
  const [visiblePartyId, setVisiblePartyId] = useState(null)

  // Gestor de Imágenes global
  const [globalImages, setGlobalImages] = useState(null)
  const [imageModal, setImageModal] = useState(null)

  // Soundboard
  const [soundboard, setSoundboard] = useState([])
  const [soundModal, setSoundModal] = useState(null) // null | { mode: 'create'|'edit'|'browse', sound? }
  const [soundBrowsePath, setSoundBrowsePath] = useState('')
  const [soundBrowseData, setSoundBrowseData] = useState({ folders: [], files: [] })
  const [soundVolume, setSoundVolume] = useState(1)
  const [soundPlaying, setSoundPlaying] = useState(null) // id del sonido reproduciéndose

  const headers = { 'Content-Type': 'application/json', 'x-user-id': user?.id }

  async function updateConditions(partyId, key, conditions) {
    await fetch(`/api/dnd/parties/${partyId}/conditions/${key}`, { method: 'PATCH', headers, body: JSON.stringify({ conditions }) })
    setParties(ps => ps.map(p => p.id === partyId ? { ...p, conditions: { ...(p.conditions || {}), [key]: conditions } } : p))
  }

  useEffect(() => { if (!user) return; if (isMaster) { fetchCampaigns(); fetchSoundboard() } fetchViewer(); fetchGlossary(); fetchCharacters(); fetchParties() }, [user])
  // Refrescar estado del visor cada 5s (por si alguien más lo cambia)
  useEffect(() => {
    const iv = setInterval(fetchViewer, 5000)
    return () => clearInterval(iv)
  }, [])

  async function fetchCampaigns() {
    try {
      const r = await fetch('/api/dnd/campaigns', { headers })
      const data = await r.json()
      setCampaigns(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('fetchCampaigns error:', e)
      setCampaigns([])
    }
  }

  async function fetchViewer() {
    try {
      const r = await fetch('/api/dnd/viewer')
      if (r.ok) setViewerState(await r.json())
    } catch {}
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 1800)
  }

  // ── Soundboard ──────────────────────────────────────────
  async function fetchSoundboard() {
    try {
      const r = await fetch('/api/dnd/soundboard', { headers })
      setSoundboard(await r.json())
    } catch {}
  }

  async function fetchSoundFiles(path = '') {
    try {
      const r = await fetch(`/api/dnd/sounds/files?path=${encodeURIComponent(path)}`, { headers })
      const data = await r.json()
      setSoundBrowsePath(path)
      setSoundBrowseData(data)
    } catch {}
  }

  async function addSound(sound) {
    try {
      const r = await fetch('/api/dnd/soundboard', { method: 'POST', headers, body: JSON.stringify(sound) })
      const s = await r.json()
      setSoundboard(prev => [...prev, s])
      showToast('🔊 Sonido añadido')
    } catch {}
  }

  async function updateSound(id, data) {
    await fetch(`/api/dnd/soundboard/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) })
    fetchSoundboard()
  }

  async function deleteSound(id) {
    if (!confirm('¿Eliminar este sonido del soundboard?')) return
    await fetch(`/api/dnd/soundboard/${id}`, { method: 'DELETE', headers })
    setSoundboard(prev => prev.filter(s => s.id !== id))
    showToast('🗑 Sonido eliminado')
  }

  const audioRef = useRef(null)

  function playSound(sound) {
    // Parar audio anterior si existe
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (soundPlaying === sound.id) {
      // Click en el mismo botón → parar
      setSoundPlaying(null)
      return
    }
    setSoundPlaying(sound.id)
    const audio = new Audio(sound.url)
    audio.volume = soundVolume
    audioRef.current = audio
    audio.play().catch(err => {
      console.error('Error reproduciendo sonido:', err)
      setSoundPlaying(null)
    })
    audio.onended = () => {
      setSoundPlaying(null)
      audioRef.current = null
    }
    audio.onerror = () => {
      console.error('Error cargando sonido:', sound.url)
      setSoundPlaying(null)
      audioRef.current = null
    }
  }

  // ── Glosario ─────────────────────────────────────────
  async function fetchGlossary() {
    try {
      const r = await fetch('/api/dnd/glossary', { headers })
      if (r.ok) setGlossary(await r.json())
    } catch {}
  }
  async function saveGlossaryEntry(entry) {
    const isNew = !entry.id
    const url = isNew ? '/api/dnd/glossary' : `/api/dnd/glossary/${entry.id}`
    const method = isNew ? 'POST' : 'PUT'
    await fetch(url, { method, headers, body: JSON.stringify(entry) })
    fetchGlossary()
    setGlossaryModal(null)
    showToast(isNew ? '📖 Entrada creada' : '📖 Entrada actualizada')
  }
  async function deleteGlossaryEntry(id) {
    if (!confirm('¿Borrar esta entrada del glosario?')) return
    await fetch(`/api/dnd/glossary/${id}`, { method: 'DELETE', headers })
    fetchGlossary()
    showToast('🗑 Entrada eliminada')
  }
  async function toggleFavorite(campaignId, entryId) {
    const favs = glossary.favorites[campaignId] || []
    const next = favs.includes(entryId) ? favs.filter(id => id !== entryId) : [...favs, entryId]
    await fetch(`/api/dnd/glossary/favorites/${campaignId}`, {
      method: 'PUT', headers, body: JSON.stringify({ ids: next })
    })
    fetchGlossary()
  }
  function newEnemyTemplate() {
    return {
      category: 'enemy', name: '', description: '',
      portraits: [],
      stats: { ca: 10, hp: { dice: 2, sides: 6, modifier: 0 }, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, speed: '30 pies', challenge: '1/4' },
      spellSlots: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0 },
      isSpellcaster: false,
      actions: [{ name: '', range: 'Cuerpo a cuerpo', modifier: 0, damage: '', secondaryDamage: '', note: '', actionType: 'normal', isSpell: false, spellLevel: 'truco', aoe: '' }],
      traits: [],
      abilities: [{ name: '', description: '', uses: '' }],
      skills: [],
      tags: []
    }
  }
  function newArtifactTemplate() {
    return { category: 'artifact', name: '', description: '', rarity: 'Común', properties: '', tags: [] }
  }
  function newLoreTemplate() {
    return { category: 'lore', name: '', description: '', images: [], tags: [] }
  }
  function newSpellTemplate() {
    return {
      category: 'spell', name: '', description: '',
      castTime: 'Acción', range: '', components: { v: false, s: false, m: false, mDesc: '' },
      concentration: false,
      duration: '', damage: '', damageType: '', secondaryDamage: '', secondaryDamageType: '',
      spellLevel: 'truco',
      tags: []
    }
  }

  // ── Characters ────────────────────────────────────────
  async function fetchCharacters() {
    try {
      const r = await fetch('/api/dnd/characters', { headers })
      if (r.ok) setCharacters(await r.json())
    } catch {}
  }
  async function saveCharacter(character) {
    const isNew = !character.id
    const url = isNew ? '/api/dnd/characters' : `/api/dnd/characters/${character.id}`
    const method = isNew ? 'POST' : 'PUT'
    await fetch(url, { method, headers, body: JSON.stringify(character) })
    fetchCharacters()
    setCharacterModal(null)
    showToast(isNew ? '🛡️ Personaje creado' : '🛡️ Personaje actualizado')
  }
  async function quickSaveCharacter(character) {
    if (!character.id) return
    await fetch(`/api/dnd/characters/${character.id}`, { method: 'PUT', headers, body: JSON.stringify(character) })
    fetchCharacters()
  }
  async function deleteCharacter(id) {
    if (!confirm('¿Borrar este personaje?')) return
    await fetch(`/api/dnd/characters/${id}`, { method: 'DELETE', headers })
    fetchCharacters()
    showToast('🗑 Personaje eliminado')
  }

  // ── Parties ────────────────────────────────────────────
  async function fetchParties() {
    try {
      const r = await fetch('/api/dnd/parties', { headers })
      if (r.ok) setParties(await r.json())
      const rv = await fetch('/api/dnd/parties/visible', { headers })
      if (rv.ok) { const d = await rv.json(); setVisiblePartyId(d.visiblePartyId) }
    } catch {}
  }
  async function setPartyVisible(partyId) {
    const newId = visiblePartyId === partyId ? null : partyId
    await fetch('/api/dnd/parties/visible', { method: 'PUT', headers, body: JSON.stringify({ partyId: newId }) })
    setVisiblePartyId(newId)
    showToast(newId ? '👁 Party visible en el visor' : '👁 Todas las parties visibles')
  }
  async function createParty() {
    const name = partyCreateName.trim()
    if (!name) return
    await fetch('/api/dnd/parties', { method: 'POST', headers, body: JSON.stringify({ name }) })
    fetchParties()
    setPartyCreateModal(false)
    setPartyCreateName('')
    showToast('⚔️ Party creada')
  }
  async function renameParty(partyId, currentName) {
    const name = prompt('Nuevo nombre de la party:', currentName)
    if (!name || !name.trim() || name.trim() === currentName) return
    await fetch(`/api/dnd/parties/${partyId}`, { method: 'PUT', headers, body: JSON.stringify({ name: name.trim() }) })
    fetchParties()
    showToast('✏️ Party renombrada')
  }
  async function deleteParty(partyId) {
    if (!confirm('¿Borrar esta party y todo su contenido?')) return
    await fetch(`/api/dnd/parties/${partyId}`, { method: 'DELETE', headers })
    fetchParties()
    showToast('🗑 Party eliminada')
  }
  async function addToParty(partyId, charId) {
    await fetch(`/api/dnd/parties/${partyId}/members`, { method: 'POST', headers, body: JSON.stringify({ charId }) })
    fetchParties()
    showToast('🛡️ Añadido a la party')
  }
  async function removeFromParty(partyId, charId) {
    await fetch(`/api/dnd/parties/${partyId}/members/${charId}`, { method: 'DELETE', headers })
    fetchParties()
    showToast('👋 Eliminado de la party')
  }
  async function updateInitiative(partyId, newOrder) {
    await fetch(`/api/dnd/parties/${partyId}/initiative`, { method: 'PUT', headers, body: JSON.stringify({ initiative: newOrder }) })
    setParties(ps => ps.map(p => p.id === partyId ? { ...p, initiative: newOrder } : p))
  }
  async function updatePartyHp(partyId, charId, hp) {
    await fetch(`/api/dnd/parties/${partyId}/hp/${charId}`, { method: 'PATCH', headers, body: JSON.stringify({ hp }) })
    setParties(ps => ps.map(p => p.id === partyId ? {
      ...p, currentHp: { ...p.currentHp, [charId]: hp },
      memberChars: (p.memberChars||[]).map(c => c.id === charId ? { ...c, stats: { ...c.stats, hp: { ...c.stats.hp, current: hp } } } : c)
    } : p))
  }
  async function updatePartySlots(partyId, charId, usedSlots) {
    await fetch(`/api/dnd/parties/${partyId}/slots/${charId}`, { method: 'PATCH', headers, body: JSON.stringify({ usedSlots }) })
    setParties(ps => ps.map(p => p.id === partyId ? { ...p, usedSlots: { ...p.usedSlots, [charId]: usedSlots } } : p))
  }
  async function partyRest(partyId, type) {
    if (!confirm(type === 'long' ? '¿Descanso largo? Se restaurarán PG y huecos de conjuro.' : '¿Descanso corto? Se restaurarán los PG.')) return
    await fetch(`/api/dnd/parties/${partyId}/rest`, { method: 'POST', headers, body: JSON.stringify({ type }) })
    fetchParties()
    showToast(type === 'long' ? '🌙 Descanso largo completado' : '☀️ Descanso corto completado')
  }
  function rollInitiative(dexMod, surprised) {
    const roll1 = Math.floor(Math.random() * 20) + 1 + dexMod
    if (!surprised) return roll1
    const roll2 = Math.floor(Math.random() * 20) + 1 + dexMod
    return Math.min(roll1, roll2)
  }
  async function addEnemyToParty(partyId, glossaryId, label, hpMax, surprised) {
    const entry = glossary.entries.find(e => e.id === glossaryId)
    const dexMod = entry?.stats?.dex ? Math.floor((entry.stats.dex - 10) / 2) : 0
    const initiative = rollInitiative(dexMod, surprised)
    const r = await fetch(`/api/dnd/parties/${partyId}/enemy`, {
      method: 'POST', headers,
      body: JSON.stringify({ glossaryId, initiative, label, hpMax: hpMax || undefined })
    })
    if (r.ok) {
      fetchParties()
      const surprisedTxt = surprised ? ' (sorprendido)' : ''
      showToast(`💀 Añadido · Init: ${initiative}${surprisedTxt}`)
    }
  }
  async function removeEnemyFromParty(partyId, enemyId) {
    await fetch(`/api/dnd/parties/${partyId}/enemy/${enemyId}`, { method: 'DELETE', headers })
    fetchParties()
    showToast('💀 Enemigo eliminado')
  }
  async function clearEnemies(partyId) {
    if (!confirm('¿Eliminar todos los enemigos de este grupo?')) return
    const party = parties.find(p => p.id === partyId)
    for (const e of (party?.enemies || [])) {
      await fetch(`/api/dnd/parties/${partyId}/enemy/${e.id}`, { method: 'DELETE', headers })
    }
    fetchParties()
    showToast('💀 Enemigos eliminados')
  }
  async function clearParty(partyId) {
    if (!confirm('¿Vaciar todo el grupo (PCs y enemigos)?')) return
    const party = parties.find(p => p.id === partyId)
    for (const e of (party?.enemies || [])) {
      await fetch(`/api/dnd/parties/${partyId}/enemy/${e.id}`, { method: 'DELETE', headers })
    }
    for (const memberId of (party?.members || [])) {
      await fetch(`/api/dnd/parties/${partyId}/member/${memberId}`, { method: 'DELETE', headers })
    }
    fetchParties()
    showToast('🧹 Grupo vaciado')
  }
  async function updateEnemyHp(partyId, enemyId, hp) {
    await fetch(`/api/dnd/parties/${partyId}/enemy/${enemyId}/hp`, { method: 'PATCH', headers, body: JSON.stringify({ hp }) })
    setParties(ps => ps.map(p => p.id === partyId ? {
      ...p, enemies: (p.enemies || []).map(e => e.id === enemyId ? { ...e, hpCurrent: hp } : e)
    } : p))
  }
  function scrollToGlossaryEntry(entryId) {
    // Expandir glosario, filtrar enemigos, expandir la entrada
    if (!expanded.glossary) toggleExpand('glossary')
    setGlossaryFilter('enemy')
    setGlossarySubFilter('all')
    setExpandedEntry(entryId)
    // Buscar la página correcta
    const enemyEntries = glossary.entries.filter(e => e.category === 'enemy')
    const idx = enemyEntries.findIndex(e => e.id === entryId)
    if (idx !== -1) setGlossaryPage(Math.floor(idx / GLOSSARY_PAGE_SIZE))
    // Scroll suave
    setTimeout(() => {
      const el = document.querySelector(`[data-glossary-id="${entryId}"]`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 200)
  }

  function newCharacterTemplate() {
    return {
      // Paso 1: Descripción
      name: '', description: '', portrait: '', race: '', level: 1,
      // Paso 2: Clase
      class: '', subclass: '',
      proficiencies: [], // ['Armaduras ligeras', 'Espadas largas', ...]
      savingThrows: { str: false, dex: false, con: false, int: false, wis: false, cha: false },
      stats: { ca: 10, hp: { max: 10, current: 10 }, speed: '30 pies', proficiencyBonus: 2,
        str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
        hitDice: { die: 8, count: 1, used: 0 }, passivePerception: 10 },
      // Paso 4: Trasfondo
      background: '', backgroundTraits: [],
      bgSkills: [], bgTools: [], bgEquipment: [], gold: 0,
      // Paso 5: Habilidades (skills)
      skills: [],
      // Paso 6: Equipo
      equipment: [],
      consumables: [],
      // Paso 7: Conjuros
      isSpellcaster: false,
      spellSlots: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0 },
      actions: [],
      // Misc
      player: user?.name || 'Jai',
      traits: [],
      abilities: [],
      tags: []
    }
  }

  const isGlobalFavorite = (entryId) => {
    return Object.values(glossary.favorites || {}).some(ids => ids.includes(entryId))
  }

  const filteredGlossary = (() => {
    let items = glossary.entries.filter(e => {
      // Ocultar entradas marcadas como hidden para jugadores
      if (!isMaster && e.hidden) return false
      if (glossaryFilter !== 'all' && e.category !== glossaryFilter) return false
      // Subfiltro: spell por nivel
      if (glossaryFilter === 'spell' && glossarySubFilter !== 'all') {
        if (e.spellLevel !== glossarySubFilter) return false
      }
      // Subfiltro: enemy por campaña favorita
      if (glossaryFilter === 'enemy' && glossarySubFilter !== 'all') {
        const favIds = glossary.favorites[glossarySubFilter] || []
        if (!favIds.includes(e.id)) return false
      }
      if (glossarySearch) {
        const q = glossarySearch.toLowerCase()
        return e.name?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q) || e.tags?.some(t => t.toLowerCase().includes(q))
      }
      return true
    })
    // Favoritos primero
    items.sort((a, b) => {
      const aFav = isGlobalFavorite(a.id) ? 1 : 0
      const bFav = isGlobalFavorite(b.id) ? 1 : 0
      return bFav - aFav
    })
    return items
  })()

  const glossaryTotalPages = Math.ceil(filteredGlossary.length / GLOSSARY_PAGE_SIZE)
  const glossaryPageItems = filteredGlossary.slice(glossaryPage * GLOSSARY_PAGE_SIZE, (glossaryPage + 1) * GLOSSARY_PAGE_SIZE)

  // ── Visor global ─────────────────────────────────────
  async function sendImageToViewer(img, channel) {
    await fetch(`/api/dnd/viewer/${channel}`, {
      method: 'PUT', headers,
      body: JSON.stringify({ mode: 'image', imageUrl: img.url, imageName: img.name })
    })
    await fetchViewer()
    const label = channel === 'tablet' ? '📱' : '📺'
    showToast(`${label} "${img.name}"`)
  }
  async function clearViewer(channel) {
    await fetch(`/api/dnd/viewer/${channel}`, {
      method: 'PUT', headers,
      body: JSON.stringify({ mode: 'blank' })
    })
    await fetchViewer()
    const label = channel === 'tablet' ? '📱' : '📺'
    showToast(`${label} limpiado`)
  }

  async function rotateViewer(channel) {
    const state = viewerState?.[channel]
    if (!state || state.mode !== 'image') return
    const next = ((state.rotation || 0) + 90) % 360
    await fetch(`/api/dnd/viewer/${channel}/rotate`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ rotation: next })
    })
    await fetchViewer()
  }
  async function sendMapToViewer(mapId, mapName, channel) {
    await fetch(`/api/dnd/viewer/${channel}`, {
      method: 'PUT', headers,
      body: JSON.stringify({ mode: 'map', mapId })
    })
    await fetchViewer()
    const label = channel === 'tablet' ? '📱' : '📺'
    showToast(`${label} "${mapName}"`)
  }
  async function deleteMap(campaignId, chapterId, mapId) {
    if (!confirm('¿Borrar este mapa? Esta acción no se puede deshacer.')) return
    await fetch(`/api/dnd/campaigns/${campaignId}/chapters/${chapterId}/maps/${mapId}`, { method: 'DELETE', headers })
    fetchCampaigns()
    showToast('🗑 Mapa eliminado')
  }
  async function reorderMaps(campaignId, chapterId, order) {
    await fetch(`/api/dnd/campaigns/${campaignId}/chapters/${chapterId}/maps/order`, {
      method: 'PUT', headers, body: JSON.stringify({ order })
    })
    fetchCampaigns()
  }

  // ── Navegador de imágenes ────────────────────────────
  async function loadImages(chapterId, path = '') {
    try {
      const q = path ? `?path=${encodeURIComponent(path)}` : ''
      const r = await fetch(`/api/dnd/images${q}`)
      if (!r.ok) { setImageBrowser(s => ({ ...s, [chapterId]: { path, folders: [], images: [], error: true } })); return }
      const data = await r.json()
      setImageBrowser(s => ({ ...s, [chapterId]: { ...data } }))
    } catch {
      setImageBrowser(s => ({ ...s, [chapterId]: { path, folders: [], images: [], error: true } }))
    }
  }
  function toggleImageBrowser(chapterId) {
    const key = `img-${chapterId}`
    setExpanded(prev => {
      const next = { ...prev, [key]: !prev[key] }
      if (next[key] && !imageBrowser[chapterId]) loadImages(chapterId, '')
      return next
    })
  }

  // Gestor de imágenes global
  async function loadGlobalImages(path = '') {
    try {
      const q = path ? `?path=${encodeURIComponent(path)}` : ''
      const r = await fetch(`/api/dnd/images${q}`)
      if (r.ok) setGlobalImages(await r.json())
    } catch {}
  }

  async function assignImageToChapter(campaignId, chapterId, img) {
    await fetch(`/api/dnd/campaigns/${campaignId}/chapters/${chapterId}/images`, {
      method: 'POST', headers, body: JSON.stringify({ url: img.url, name: img.name })
    })
    fetchCampaigns()
    showToast(`🖼️ Imagen asignada`)
  }

  async function removeImageFromChapter(campaignId, chapterId, url) {
    await fetch(`/api/dnd/campaigns/${campaignId}/chapters/${chapterId}/images`, {
      method: 'DELETE', headers, body: JSON.stringify({ url })
    })
    fetchCampaigns()
    showToast('🗑 Imagen desasociada')
  }

  async function createCampaign() {
    const name = inputVal.trim()
    if (!name) return
    try {
      const r = await fetch('/api/dnd/campaigns', { method: 'POST', headers, body: JSON.stringify({ name }) })
      if (!r.ok) { console.error('createCampaign failed', await r.text()); return }
      setInputVal(''); setModal(null); fetchCampaigns()
    } catch (e) { console.error('createCampaign error:', e) }
  }

  async function createChapter() {
    const name = inputVal.trim()
    if (!name) return
    try {
      const r = await fetch(`/api/dnd/campaigns/${modal.campaignId}/chapters`, { method: 'POST', headers, body: JSON.stringify({ name }) })
      if (!r.ok) { console.error('createChapter failed', await r.text()); return }
      setInputVal(''); setModal(null); fetchCampaigns()
    } catch (e) { console.error('createChapter error:', e) }
  }

  async function createMap() {
    const name = inputVal.trim()
    if (!name) return
    try {
      const r = await fetch(`/api/dnd/campaigns/${modal.campaignId}/chapters/${modal.chapterId}/maps`, {
        method: 'POST', headers, body: JSON.stringify({ name })
      })
      if (!r.ok) { console.error('createMap failed', await r.text()); return }
      const map = await r.json()
      setInputVal(''); setModal(null); fetchCampaigns()
      window.open(`/dnd/editor/${map.id}`, '_blank')
    } catch (e) { console.error('createMap error:', e) }
  }

  async function deleteCampaign(e, id) {
    e.stopPropagation()
    if (!confirm('¿Borrar campaña y todos sus mapas?')) return
    await fetch(`/api/dnd/campaigns/${id}`, { method: 'DELETE', headers })
    fetchCampaigns()
  }

  async function renameChapter(campaignId, chapterId, currentName) {
    const name = prompt('Nuevo nombre del capítulo:', currentName)
    if (!name || !name.trim() || name.trim() === currentName) return
    await fetch(`/api/dnd/campaigns/${campaignId}/chapters/${chapterId}`, {
      method: 'PUT', headers, body: JSON.stringify({ name: name.trim() })
    })
    fetchCampaigns()
    showToast('✏️ Capítulo renombrado')
  }

  async function renameCampaign(campaignId, currentName) {
    const name = prompt('Nuevo nombre de la campaña:', currentName)
    if (!name || !name.trim() || name.trim() === currentName) return
    await fetch(`/api/dnd/campaigns/${campaignId}`, {
      method: 'PUT', headers, body: JSON.stringify({ name: name.trim() })
    })
    fetchCampaigns()
    showToast('✏️ Campaña renombrada')
  }

  async function deleteChapter(e, campaignId, chapterId) {
    e.stopPropagation()
    if (!confirm('¿Borrar este capítulo y todos sus mapas?')) return
    await fetch(`/api/dnd/campaigns/${campaignId}/chapters/${chapterId}`, { method: 'DELETE', headers })
    fetchCampaigns()
    showToast('🗑 Capítulo eliminado')
  }

  function toggleExpand(key) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }
  function openModal(type, campaignId = null, chapterId = null) {
    setInputVal(''); setModal({ type, campaignId, chapterId })
  }

  const modalTitles = { campaign: 'Nueva Campaña', chapter: 'Nuevo Capítulo', map: 'Nuevo Mapa' }
  const modalActions = { campaign: createCampaign, chapter: createChapter, map: createMap }

  // ── Render de estado del visor (una etiqueta por canal) ──
  function channelLabel(channel) {
    const state = viewerState?.[channel]
    if (!state) return '…'
    if (state.mode === 'blank') return '⚫'
    if (state.mode === 'image') return `🖼 ${state.imageName || 'Imagen'}`
    if (state.mode === 'map') {
      for (const c of campaigns) for (const ch of c.chapters) {
        const m = ch.maps.find(m => m.id === state.mapId)
        if (m) return `🗺 ${m.name}`
      }
      return '🗺 Mapa'
    }
    return '—'
  }

  // ── Auth gate: si no hay usuario, mostrar login/registro ──
  if (authLoading) return <div className="dnd-root"><div className="dnd-bg" /></div>
  if (!user) return <DnDAuthGate />

  return (
    <div className="dnd-root">
      <div className="dnd-bg" />
      <AppHeader />
      <main className="dnd-main">
        <div className="dnd-header">
          <h1 className="dnd-title">⚔️ D&amp;D</h1>
          {isMaster && <div className="dnd-header-actions">
            <div className="dnd-channel-card" title="Canal principal (TV/proyector)">
              <div className="dnd-channel-head">
                <span className="dnd-channel-icon">📺</span>
                <span className="dnd-channel-label">{channelLabel('main')}</span>
              </div>
              <div className="dnd-channel-btns">
                <button className="dnd-btn-sm" onClick={() => window.open('/dnd/viewer/main','_blank')}>🖥</button>
                {(viewerState?.main?.mode === 'image' || viewerState?.main?.mode === 'map') && <button className="dnd-btn-sm" onClick={() => rotateViewer('main')} title="Rotar 90°">↻</button>}
                <button className="dnd-btn-sm" onClick={() => clearViewer('main')}>🚫</button>
              </div>
            </div>
            <div className="dnd-channel-card" title="Canal tablet (pantalla secundaria)">
              <div className="dnd-channel-head">
                <span className="dnd-channel-icon">📱</span>
                <span className="dnd-channel-label">{channelLabel('tablet')}</span>
              </div>
              <div className="dnd-channel-btns">
                <button className="dnd-btn-sm" onClick={() => window.open('/dnd/viewer/tablet','_blank')}>🖥</button>
                {(viewerState?.tablet?.mode === 'image' || viewerState?.tablet?.mode === 'map') && <button className="dnd-btn-sm" onClick={() => rotateViewer('tablet')} title="Rotar 90°">↻</button>}
                <button className="dnd-btn-sm" onClick={() => clearViewer('tablet')}>🚫</button>
              </div>
            </div>
          </div>}
        </div>

        {isMaster && <div className="dnd-campaigns-section">
          <div className="dnd-glossary-header" onClick={() => toggleExpand('campaigns')}>
            <span className="dnd-chevron">{expanded.campaigns ? '▾' : '▸'}</span>
            <span className="dnd-glossary-title">🗡️ Campañas</span>
            <button className="dnd-btn-primary" style={{marginLeft:'auto'}} onClick={e => { e.stopPropagation(); openModal('campaign') }}>+ Campaña</button>
          </div>
          {expanded.campaigns && <div className="dnd-campaigns">
          {campaigns.length === 0 && (
            <div className="dnd-empty">No hay campañas. ¡Crea la primera!</div>
          )}
          {campaigns.map(campaign => (
            <div key={campaign.id} className="dnd-campaign">
              <div className="dnd-campaign-header" onClick={() => toggleExpand(`c-${campaign.id}`)}>
                <span className="dnd-chevron">{expanded[`c-${campaign.id}`] ? '▾' : '▸'}</span>
                <span className="dnd-campaign-name">{campaign.name}</span>
                <div className="dnd-campaign-actions">
                  <button className="dnd-btn-sm" onClick={e => { e.stopPropagation(); openModal('chapter', campaign.id) }}>+ Capítulo</button>
                  <button className="dnd-btn-sm" onClick={e => { e.stopPropagation(); renameCampaign(campaign.id, campaign.name) }} title="Renombrar">✏️</button>
                  <button className="dnd-btn-danger" onClick={e => deleteCampaign(e, campaign.id)}>✕</button>
                </div>
              </div>
              {expanded[`c-${campaign.id}`] && (
                <div className="dnd-chapters">
                  {campaign.chapters.map(chapter => (
                    <div key={chapter.id} className="dnd-chapter">
                      <div className="dnd-chapter-header" onClick={() => toggleExpand(`ch-${chapter.id}`)}>
                        <span className="dnd-chevron">{expanded[`ch-${chapter.id}`] ? '▾' : '▸'}</span>
                        <span className="dnd-chapter-name">{chapter.name}</span>
                        <div className="dnd-chapter-actions">
                          <button className="dnd-btn-sm" onClick={e => { e.stopPropagation(); openModal('map', campaign.id, chapter.id) }}>+ Mapa</button>
                          <button className="dnd-btn-sm" onClick={e => { e.stopPropagation(); renameChapter(campaign.id, chapter.id, chapter.name) }} title="Renombrar">✏️</button>
                          <button className="dnd-btn-danger" onClick={e => deleteChapter(e, campaign.id, chapter.id)} title="Borrar capítulo">✕</button>
                        </div>
                      </div>

                      {expanded[`ch-${chapter.id}`] && (
                        <div className="dnd-maps">
                          {chapter.maps.map((map, mapIdx) => (
                            <div key={map.id} className="dnd-map-block"
                              draggable onDragStart={e => { e.dataTransfer.setData('text/plain', String(map.id)); e.dataTransfer.effectAllowed = 'move' }}
                              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('dnd-map-dragover') }}
                              onDragLeave={e => e.currentTarget.classList.remove('dnd-map-dragover')}
                              onDrop={e => {
                                e.preventDefault(); e.currentTarget.classList.remove('dnd-map-dragover')
                                const fromId = parseInt(e.dataTransfer.getData('text/plain'))
                                if (fromId === map.id) return
                                const ids = chapter.maps.map(m => m.id)
                                const fromIdx = ids.indexOf(fromId)
                                const toIdx = ids.indexOf(map.id)
                                if (fromIdx === -1 || toIdx === -1) return
                                ids.splice(fromIdx, 1)
                                ids.splice(toIdx, 0, fromId)
                                reorderMaps(campaign.id, chapter.id, ids)
                              }}>
                              <div className="dnd-map-row">
                                <span className="dnd-map-drag-handle" title="Arrastrar para reordenar">⠿</span>
                                <span className="dnd-map-icon">🗺️</span>
                                <span className="dnd-map-name">{map.name}</span>
                                <div className="dnd-map-actions">
                                  <button className="dnd-btn-sm" onClick={() => window.open(`/dnd/editor/${map.id}`, '_blank')}>Editar</button>
                                  <button className="dnd-btn-sm dnd-btn-viewer" title="Enviar a Main" onClick={() => sendMapToViewer(map.id, map.name, 'main')}>📺</button>
                                  <button className="dnd-btn-sm dnd-btn-viewer" title="Enviar a Tablet" onClick={() => sendMapToViewer(map.id, map.name, 'tablet')}>📱</button>
                                  <button className="dnd-btn-sm dnd-btn-danger" title="Borrar mapa" onClick={() => deleteMap(campaign.id, chapter.id, map.id)}>✕</button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {chapter.maps.length === 0 && <div className="dnd-empty-sm">Sin mapas</div>}

                          {/* ── Imágenes del capítulo ── */}
                          <div className="dnd-images-section">
                            <div className="dnd-images-toggle" onClick={() => toggleExpand(`img-${chapter.id}`)}>
                              <span className="dnd-chevron">{expanded[`img-${chapter.id}`] ? '▾' : '▸'}</span>
                              <span>🖼️ Imágenes {(chapter.images||[]).length > 0 ? `(${chapter.images.length})` : ''}</span>
                            </div>
                            {expanded[`img-${chapter.id}`] && (
                              <div className="dnd-chapter-images">
                                {(chapter.images||[]).length === 0 && <div className="dnd-empty-sm">Sin imágenes — asígnalas desde el Gestor de Imágenes</div>}
                                <div className="dnd-image-grid">
                                  {(chapter.images||[]).map(img => (
                                    <div key={img.url} className="dnd-image-thumb" title={img.name}>
                                      <img src={img.url} alt={img.name} loading="lazy" />
                                      <div className="dnd-image-overlay">
                                        <button className="dnd-image-send" onClick={() => sendImageToViewer(img, 'main')} title="Enviar a Main">📺</button>
                                        <button className="dnd-image-send dnd-image-send-tablet" onClick={() => sendImageToViewer(img, 'tablet')} title="Enviar a Tablet">📱</button>
                                        <button className="dnd-image-send dnd-image-remove" onClick={() => removeImageFromChapter(campaign.id, chapter.id, img.url)} title="Quitar">✕</button>
                                        <span className="dnd-image-name">{img.name}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {campaign.chapters.length === 0 && <div className="dnd-empty-sm">Sin capítulos</div>}
                </div>
              )}
            </div>
          ))}
        </div>}
        </div>}

        {/* ── Soundboard ── */}
        {isMaster && <div className="dnd-glossary-section">
          <div className="dnd-glossary-header" onClick={() => toggleExpand('soundboard')}>
            <span className="dnd-chevron">{expanded.soundboard ? '▾' : '▸'}</span>
            <span className="dnd-glossary-title">🔊 Soundboard</span>
            <button className="dnd-btn-primary" style={{marginLeft:'auto'}} onClick={e => { e.stopPropagation(); setSoundModal({ mode: 'create' }); fetchSoundFiles('') }}>+ Sonido</button>
          </div>
          {expanded.soundboard && <div className="dnd-soundboard">
            {soundboard.length === 0 && <div className="dnd-empty-sm">Sin sonidos — ¡añade el primero!</div>}
            {(() => {
              const categories = [...new Set(soundboard.map(s => s.category || 'Sin categoría'))].sort()
              return categories.map(cat => (
                <div key={cat} className="sb-category">
                  <div className="sb-category-label">{cat}</div>
                  <div className="sb-grid">
                    {soundboard.filter(s => (s.category || 'Sin categoría') === cat).map(s => (
                      <div key={s.id} className="sb-btn-wrap">
                        <button
                          className={`sb-btn ${soundPlaying === s.id ? 'sb-btn-playing' : ''}`}
                          onClick={() => playSound(s)}
                          title={s.name}>
                          <span className="sb-btn-icon">{s.icon || '🔈'}</span>
                          <span className="sb-btn-name">{s.name}</span>
                        </button>
                        <div className="sb-btn-actions">
                          <button className="sb-action-btn" onClick={() => setSoundModal({ mode: 'edit', sound: s })} title="Editar">✏️</button>
                          <button className="sb-action-btn sb-action-delete" onClick={() => { if (confirm(`¿Eliminar "${s.name}"?`)) deleteSound(s.id) }} title="Eliminar">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            })()}
            <div className="sb-volume-row">
              <span className="sb-volume-label">🔉</span>
              <input type="range" min="0" max="1" step="0.05" value={soundVolume}
                onChange={e => { const v = parseFloat(e.target.value); setSoundVolume(v); if (audioRef.current) audioRef.current.volume = v }}
                className="sb-volume-slider" />
              <span className="sb-volume-val">{Math.round(soundVolume * 100)}%</span>
            </div>
          </div>}
        </div>}

        {/* ── Sound Modal (crear/editar/explorar) ── */}
        {soundModal && (
          <SoundModal
            mode={soundModal.mode}
            sound={soundModal.sound}
            browsePath={soundBrowsePath}
            browseData={soundBrowseData}
            onBrowse={fetchSoundFiles}
            onSave={(data) => {
              if (soundModal.mode === 'edit' && soundModal.sound) {
                updateSound(soundModal.sound.id, data)
              } else {
                addSound(data)
              }
              setSoundModal(null)
            }}
            onDelete={soundModal.sound ? () => { deleteSound(soundModal.sound.id); setSoundModal(null) } : null}
            onClose={() => setSoundModal(null)}
          />
        )}

        {/* ── Parties ── */}
        {isMaster && <div className="dnd-glossary-section">
          <div className="dnd-glossary-header" onClick={() => toggleExpand('parties')}>
            <span className="dnd-chevron">{expanded.parties ? '▾' : '▸'}</span>
            <span className="dnd-glossary-title">⚔️ Parties</span>
            <div style={{marginLeft:'auto', display:'flex', gap:6}} onClick={e => e.stopPropagation()}>
              <button className="dnd-btn-sm" onClick={() => window.open('/dnd/party','_blank')}>🖥 Ver</button>
              <button className="dnd-btn-primary" onClick={() => setPartyCreateModal(true)}>+ Party</button>
            </div>
          </div>
          {expanded.parties && <>
            {parties.length === 0 && <div className="dnd-empty-sm">Sin parties — ¡crea la primera!</div>}
            {parties.map(p => (
              <div key={p.id} className="dnd-party-block">
                <div className="dnd-party-block-header" onClick={() => toggleExpand(`party-${p.id}`)}>
                  <span className="dnd-chevron">{expanded[`party-${p.id}`] ? '▾' : '▸'}</span>
                  <span className="dnd-party-block-name">{p.name}</span>
                  <span className="dnd-party-block-count">{(p.members||[]).length} PCs · {(p.enemies||[]).length} enemigos</span>
                  <div style={{marginLeft:'auto', display:'flex', gap:6}} onClick={e => e.stopPropagation()}>
                    <button className={`dnd-btn-sm ${visiblePartyId === p.id ? 'dnd-btn-visible-active' : ''}`} onClick={() => setPartyVisible(p.id)} title={visiblePartyId === p.id ? 'Visible en visor (click para mostrar todas)' : 'Mostrar en visor'}>{visiblePartyId === p.id ? '👁' : '👁‍🗨'}</button>
                    <button className="dnd-btn-sm" onClick={() => setPartyAddModal({ partyId: p.id })}>+ Añadir</button>
                    <button className="dnd-btn-sm" onClick={() => renameParty(p.id, p.name)} title="Renombrar">✏️</button>
                    <button className="dnd-btn-sm dnd-btn-danger" onClick={() => deleteParty(p.id)}>✕</button>
                  </div>
                </div>
                {expanded[`party-${p.id}`] && (
                  <div className="dnd-party-block-body">
                    <div className="dnd-party-rest-bar">
                      <button className="dnd-btn-sm" onClick={() => partyRest(p.id, 'short')}>☀️ Descanso corto</button>
                      <button className="dnd-btn-sm" onClick={() => partyRest(p.id, 'long')}>🌙 Descanso largo</button>
                      <span style={{flex:1}} />
                      {(p.enemies||[]).length > 0 && <button className="dnd-btn-sm dnd-btn-danger" onClick={() => clearEnemies(p.id)} title="Eliminar todos los enemigos">💀 Vaciar enemigos</button>}
                      <button className="dnd-btn-sm dnd-btn-danger" onClick={() => clearParty(p.id)} title="Vaciar todo el grupo">🧹 Vaciar todo</button>
                    </div>
                    <PartyTracker
                      party={p}
                      onReorder={(newOrder) => updateInitiative(p.id, newOrder)}
                      onHpChange={(charId, hp) => updatePartyHp(p.id, charId, hp)}
                      onSlotsChange={(charId, slots) => updatePartySlots(p.id, charId, slots)}
                      onRemove={(charId) => removeFromParty(p.id, charId)}
                      onEnemyHpChange={(enemyId, hp) => updateEnemyHp(p.id, enemyId, hp)}
                      onRemoveEnemy={(enemyId) => removeEnemyFromParty(p.id, enemyId)}
                      onEnemyClick={scrollToGlossaryEntry}
                      onConditionsChange={(key, conds) => updateConditions(p.id, key, conds)}
                    />
                  </div>
                )}
              </div>
            ))}
          </>}
          {partyAddModal && (
            <PartyAddModal
              characters={characters}
              partyMembers={(parties.find(p => p.id === partyAddModal.partyId)?.members) || []}
              enemies={glossary.entries.filter(e => e.category === 'enemy')}
              onAddCharacter={(id) => { addToParty(partyAddModal.partyId, id); setPartyAddModal(null) }}
              onAddEnemy={async (glossaryId, label, hpMax, surprised) => { await addEnemyToParty(partyAddModal.partyId, glossaryId, label, hpMax, surprised) }}
              onDone={() => setPartyAddModal(null)}
              onClose={() => setPartyAddModal(null)}
            />
          )}
          {partyCreateModal && (
            <div className="dnd-modal-overlay" onClick={() => setPartyCreateModal(false)}>
              <div className="dnd-modal" onClick={e => e.stopPropagation()}>
                <h3>Nueva Party</h3>
                <input className="dnd-input" placeholder="Nombre de la party..." value={partyCreateName}
                  onChange={e => setPartyCreateName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createParty()} autoFocus />
                <div className="dnd-modal-btns">
                  <button className="dnd-btn-primary" onClick={createParty}>Crear</button>
                  <button className="dnd-btn-cancel" onClick={() => setPartyCreateModal(false)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}
        </div>}

        {/* ── Personajes ── */}
        <div className="dnd-glossary-section">
          <div className="dnd-glossary-header" onClick={() => toggleExpand('characters')}>
            <span className="dnd-chevron">{expanded.characters ? '▾' : '▸'}</span>
            <span className="dnd-glossary-title">🛡️ Personajes</span>
            <button className="dnd-btn-primary" style={{marginLeft:'auto'}} onClick={e => { e.stopPropagation(); setCharacterModal({ mode: 'create', character: null }) }}>+ Personaje</button>
          </div>
          {expanded.characters && <>
            <input className="dnd-glossary-search" placeholder="Buscar por nombre, clase, nivel o jugador..." value={charSearch} onChange={e => setCharSearch(e.target.value)} style={{marginBottom:8}} />
            <div className="dnd-glossary-list">
              {characters.length === 0 && <div className="dnd-empty-sm">Sin personajes — ¡crea el primero!</div>}
              {(() => {
                const q = charSearch.toLowerCase().trim()
                const filtered = q ? characters.filter(ch => {
                  const name = (ch.name||'').toLowerCase()
                  const cls = (ch.class||'').toLowerCase()
                  const sub = (ch.subclass||'').toLowerCase()
                  const race = (ch.race||'').toLowerCase()
                  const player = (ch.player||'').toLowerCase()
                  const lvl = String(ch.level||1)
                  return name.includes(q) || cls.includes(q) || sub.includes(q) || race.includes(q) || player.includes(q) || lvl === q
                }) : characters
                return filtered.length === 0 && q ? (
                  <div className="dnd-empty-sm">Sin resultados para "{charSearch}"</div>
                ) : filtered.map(ch => (
                <CharacterCard key={ch.id} character={ch}
                  expanded={expandedCharacter === ch.id}
                  onToggle={() => setExpandedCharacter(expandedCharacter === ch.id ? null : ch.id)}
                  onEdit={() => setCharacterModal({ mode: 'edit', character: ch })}
                  onDelete={() => deleteCharacter(ch.id)}
                  onSave={quickSaveCharacter}
                  onAddToParty={addToParty}
                  parties={parties}
                  isMaster={isMaster}
                  glossaryEntries={glossary.entries} />
              ))
              })()}
            </div>
          </>}
        </div>

        {/* ── Glosario ── */}
        <div className="dnd-glossary-section">
          <div className="dnd-glossary-header" onClick={() => toggleExpand('glossary')}>
            <span className="dnd-chevron">{expanded.glossary ? '▾' : '▸'}</span>
            <span className="dnd-glossary-title">📖 Glosario</span>
            {isMaster && <button className="dnd-btn-primary" style={{marginLeft:'auto'}} onClick={e => { e.stopPropagation(); setGlossaryModal({ mode: 'create', entry: null }) }}>+ Entrada</button>}
          </div>
          {expanded.glossary && <>
            <div className="dnd-glossary-controls">
              <div className="dnd-glossary-filters">
                {[{id:'all',label:'Todos'},{id:'enemy',label:'⚔️ Enemigos'},{id:'artifact',label:'💎 Artefactos'},{id:'spell',label:'🔮 Hechizos'},{id:'lore',label:'📜 Lore'}].map(f => (
                  <button key={f.id} className={`dnd-glossary-filter ${glossaryFilter===f.id?'active':''}`}
                    onClick={() => { setGlossaryFilter(f.id); setGlossarySubFilter('all'); setGlossaryPage(0) }}>{f.label}</button>
                ))}
              </div>
              <input className="dnd-glossary-search" placeholder="Buscar..." value={glossarySearch} onChange={e => { setGlossarySearch(e.target.value); setGlossaryPage(0) }} />
            </div>
            {glossaryFilter === 'spell' && (
              <div className="dnd-glossary-subfilters">
                {[{id:'all',label:'Todos'},{id:'truco',label:'Truco'},{id:'1',label:'Nv.1'},{id:'2',label:'Nv.2'},{id:'3',label:'Nv.3'},{id:'4',label:'Nv.4'},{id:'5',label:'Nv.5'},{id:'6',label:'Nv.6'},{id:'7',label:'Nv.7'},{id:'8',label:'Nv.8'},{id:'9',label:'Nv.9'}].map(f => (
                  <button key={f.id} className={`dnd-glossary-subfilter ${glossarySubFilter===f.id?'active':''}`}
                    onClick={() => { setGlossarySubFilter(f.id); setGlossaryPage(0) }}>{f.label}</button>
                ))}
              </div>
            )}
            {glossaryFilter === 'enemy' && campaigns.length > 0 && (
              <div className="dnd-glossary-subfilters">
                <button className={`dnd-glossary-subfilter ${glossarySubFilter==='all'?'active':''}`}
                  onClick={() => { setGlossarySubFilter('all'); setGlossaryPage(0) }}>Todos</button>
                {campaigns.map(c => {
                  const favCount = (glossary.favorites[c.id] || []).length
                  return <button key={c.id} className={`dnd-glossary-subfilter ${glossarySubFilter===c.id?'active':''}`}
                    onClick={() => { setGlossarySubFilter(c.id); setGlossaryPage(0) }}>★ {c.name}{favCount > 0 ? ` (${favCount})` : ''}</button>
                })}
              </div>
            )}
            <div className="dnd-glossary-list">
              {glossaryPageItems.length === 0 && <div className="dnd-empty-sm">{glossarySearch ? 'Sin resultados' : 'Sin entradas'}</div>}
              {glossaryPageItems.map(entry => (
                <GlossaryCard key={entry.id} entry={entry} expanded={expandedEntry === entry.id}
                  onToggle={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                  onEdit={() => setGlossaryModal({ mode: 'edit', entry })}
                  onDelete={() => deleteGlossaryEntry(entry.id)}
                  onSendImage={(img, ch) => sendImageToViewer(img, ch)}
                  campaigns={campaigns} favorites={glossary.favorites}
                  onToggleFav={toggleFavorite}
                  isFavorite={isGlobalFavorite(entry.id)}
                  canEdit={isMaster} />
              ))}
            </div>
            {glossaryTotalPages > 1 && (
              <div className="glossary-pagination">
                <button className="dnd-btn-sm" disabled={glossaryPage === 0} onClick={() => setGlossaryPage(p => p - 1)}>← Anterior</button>
                <span className="glossary-page-info">{glossaryPage + 1} / {glossaryTotalPages} ({filteredGlossary.length} entradas)</span>
                <button className="dnd-btn-sm" disabled={glossaryPage >= glossaryTotalPages - 1} onClick={() => setGlossaryPage(p => p + 1)}>Siguiente →</button>
              </div>
            )}
          </>}
        </div>

        {/* ── Gestor Multimedia ── */}
        {isMaster && <div className="dnd-glossary-section">
          <div className="dnd-glossary-header" onClick={() => { toggleExpand('imageManager'); if (!globalImages) loadGlobalImages() }}>
            <span className="dnd-chevron">{expanded.imageManager ? '▾' : '▸'}</span>
            <span className="dnd-glossary-title">📁 Gestor Multimedia</span>
          </div>
          {expanded.imageManager && (
            <ImageManager
              data={globalImages}
              onNavigate={loadGlobalImages}
              onSend={sendImageToViewer}
              onImageClick={img => setImageModal({ img })}
              onSoundAdded={() => fetchSoundboard()}
            />
          )}
        </div>}

        {/* Modal de asignación de imagen */}
        {imageModal && (
          <ImageAssignModal
            img={imageModal.img}
            campaigns={campaigns}
            onAssign={(campaignId, chapterId) => { assignImageToChapter(campaignId, chapterId, imageModal.img); setImageModal(null) }}
            onSend={(channel) => { sendImageToViewer(imageModal.img, channel); setImageModal(null) }}
            onClose={() => setImageModal(null)}
          />
        )}
      </main>

      {modal && (
        <div className="dnd-modal-overlay" onClick={() => setModal(null)}>
          <div className="dnd-modal" onClick={e => e.stopPropagation()}>
            <h3>{modalTitles[modal.type]}</h3>
            <input
              className="dnd-input"
              placeholder="Nombre..."
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && modalActions[modal.type]()}
              autoFocus
            />
            <div className="dnd-modal-btns">
              <button className="dnd-btn-primary" onClick={modalActions[modal.type]}>Crear</button>
              <button className="dnd-btn-cancel" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {glossaryModal && (
        <GlossaryModal
          mode={glossaryModal.mode}
          entry={glossaryModal.entry}
          onSave={saveGlossaryEntry}
          onClose={() => setGlossaryModal(null)}
          templates={{ enemy: newEnemyTemplate, artifact: newArtifactTemplate, lore: newLoreTemplate, spell: newSpellTemplate }}
          glossarySpells={glossary.entries.filter(e => e.category === 'spell')}
        />
      )}

      {characterModal && (
        <CharacterWizard
          mode={characterModal.mode}
          character={characterModal.character}
          onSave={saveCharacter}
          onClose={() => setCharacterModal(null)}
          template={newCharacterTemplate}
          glossarySpells={glossary.entries.filter(e => e.category === 'spell')}
          glossaryItems={glossary.entries.filter(e => e.category === 'artifact' || e.category === 'lore')}
        />
      )}

      {toast && <div className="dnd-toast">{toast}</div>}
    </div>
  )
}

// ── Componente: Gestor Multimedia ─────────────────
function ImageManager({ data, onNavigate, onSend, onImageClick, onSoundAdded }) {
  const { user } = useAuth()
  const headers = { 'Content-Type': 'application/json', 'x-user-id': user?.id }
  const fileInputRef = useRef(null)
  const soundInputRef = useRef(null)
  const [uploads, setUploads] = useState([]) // [{ name, status: 'wait'|'sending'|'success'|'error', progress, error }]

  if (!data) return <div className="dnd-empty-sm">Cargando...</div>

  const crumbs = data.path ? data.path.split('/') : []
  const parentPath = crumbs.length > 1 ? crumbs.slice(0, -1).join('/') : ''

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    // Crear entradas en la tabla
    const entries = files.map(f => ({ name: f.name, status: 'wait', progress: 0, error: '' }))
    setUploads(prev => [...prev, ...entries])
    const startIdx = uploads.length

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const idx = startIdx + i
      // Marcar como sending
      setUploads(prev => prev.map((u, j) => j === idx ? { ...u, status: 'sending', progress: 10 } : u))
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('Error leyendo archivo'))
          reader.onprogress = (ev) => {
            if (ev.lengthComputable) {
              const pct = Math.round((ev.loaded / ev.total) * 40)
              setUploads(prev => prev.map((u, j) => j === idx ? { ...u, progress: pct } : u))
            }
          }
          reader.readAsDataURL(file)
        })
        setUploads(prev => prev.map((u, j) => j === idx ? { ...u, progress: 50 } : u))
        const res = await fetch('/api/dnd/images/upload', {
          method: 'POST', headers,
          body: JSON.stringify({ data: base64, filename: file.name, path: data.path || '' })
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || res.statusText)
        }
        setUploads(prev => prev.map((u, j) => j === idx ? { ...u, status: 'success', progress: 100 } : u))
      } catch (err) {
        setUploads(prev => prev.map((u, j) => j === idx ? { ...u, status: 'error', progress: 0, error: err.message } : u))
      }
    }
    // Refrescar carpeta
    onNavigate(data.path || '')
    // Limpiar input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function clearUploads() {
    setUploads(prev => prev.filter(u => u.status === 'sending'))
  }

  async function handleSoundFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    for (const file of files) {
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('Error leyendo archivo'))
          reader.readAsDataURL(file)
        })
        await fetch('/api/dnd/sounds/upload', {
          method: 'POST', headers,
          body: JSON.stringify({ data: base64, filename: file.name })
        })
      } catch (err) { console.error('Sound upload error:', err) }
    }
    onNavigate(data.path || '')
    if (onSoundAdded) onSoundAdded()
    if (soundInputRef.current) soundInputRef.current.value = ''
  }

  const statusIcons = { wait: '⏳', sending: '📤', success: '✅', error: '❌' }

  return (
    <div className="dnd-image-browser">
      <div className="dnd-breadcrumb">
        <button className="dnd-crumb" onClick={() => onNavigate('')}>🏠 Raíz</button>
        {crumbs.map((c, i) => (
          <span key={i}>
            <span className="dnd-crumb-sep"> / </span>
            <button className="dnd-crumb" onClick={() => onNavigate(crumbs.slice(0, i + 1).join('/'))}>{c}</button>
          </span>
        ))}
        <button className="dnd-btn-sm" style={{marginLeft:'auto'}} onClick={() => fileInputRef.current?.click()}>📤 Subir imágenes</button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{display:'none'}} />
      </div>
      {data.path && <button className="dnd-folder-up" onClick={() => onNavigate(parentPath)}>⬆ Subir</button>}

      {/* Tabla de uploads */}
      {uploads.length > 0 && (
        <div className="img-upload-table">
          <div className="img-upload-table-header">
            <span>Subidas</span>
            <button className="dnd-btn-sm" onClick={clearUploads} title="Limpiar completados">✕ Limpiar</button>
          </div>
          {uploads.map((u, i) => (
            <div key={i} className={`img-upload-row img-upload-${u.status}`}>
              <span className="img-upload-status">{statusIcons[u.status]}</span>
              <span className="img-upload-name">{u.name}</span>
              {u.status === 'sending' && (
                <div className="img-upload-progress-bar">
                  <div className="img-upload-progress-fill" style={{width: `${u.progress}%`}} />
                </div>
              )}
              {u.status === 'success' && <span className="img-upload-pct">100%</span>}
              {u.status === 'error' && <span className="img-upload-error" title={u.error}>Error</span>}
              {u.status === 'wait' && <span className="img-upload-pct">—</span>}
            </div>
          ))}
        </div>
      )}

      {data.folders.length > 0 && (
        <div className="dnd-folder-list">
          {data.folders.map(f => (
            <button key={f.path} className="dnd-folder" onClick={() => onNavigate(f.path)}>📁 {f.name}</button>
          ))}
        </div>
      )}
      {data.images.length > 0 && (
        <div className="dnd-image-grid">
          {data.images.map(img => (
            <div key={img.url} className="dnd-image-thumb" title={img.name} onClick={() => onImageClick(img)}>
              <img src={img.url} alt={img.name} loading="lazy" />
              <div className="dnd-image-overlay">
                <span className="dnd-image-name">{img.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {data.folders.length === 0 && data.images.length === 0 && !data.sounds?.length && (
        <div className="dnd-empty-sm">Carpeta vacía</div>
      )}

      {/* ── Sonidos ── */}
      <div className="mm-sounds-section">
        <div className="mm-sounds-header">
          <span className="mm-sounds-title">🔊 Sonidos ({data.sounds?.length || 0})</span>
          <button className="dnd-btn-sm" onClick={() => soundInputRef.current?.click()}>📤 Subir sonidos</button>
          <input ref={soundInputRef} type="file" accept=".mp3,.wav,.ogg,.m4a,.webm,.aac" multiple onChange={handleSoundFiles} style={{display:'none'}} />
        </div>
        {(data.sounds || []).length > 0 && (
          <div className="mm-sounds-list">
            {data.sounds.map(s => (
              <div key={s.url} className="mm-sound-item">
                <span className="mm-sound-icon">🎵</span>
                <span className="mm-sound-name">{s.name}</span>
                <audio src={s.url} controls preload="none" className="mm-sound-player" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Componente: Modal de asignación de imagen ──────────────
function ImageAssignModal({ img, campaigns, onAssign, onSend, onClose }) {
  const [selectedCampaign, setSelectedCampaign] = useState(campaigns[0]?.id || null)
  const selectedCamp = campaigns.find(c => c.id === selectedCampaign)

  return (
    <div className="dnd-modal-overlay" onClick={onClose}>
      <div className="dnd-modal img-assign-modal" onClick={e => e.stopPropagation()}>
        <div className="img-assign-preview">
          <img src={img.url} alt={img.name} />
        </div>
        <div className="img-assign-name">{img.name}</div>

        <div className="img-assign-actions">
          <button className="dnd-btn-sm dnd-btn-viewer" onClick={() => onSend('main')}>📺 Main</button>
          <button className="dnd-btn-sm dnd-btn-viewer" onClick={() => onSend('tablet')}>📱 Tablet</button>
        </div>

        {campaigns.length > 0 && (
          <div className="img-assign-section">
            <div className="img-assign-label">Asignar a capítulo</div>
            <select className="dnd-input" value={selectedCampaign || ''} onChange={e => setSelectedCampaign(parseInt(e.target.value))}>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {selectedCamp && selectedCamp.chapters.length > 0 ? (
              <div className="img-assign-chapters">
                {selectedCamp.chapters.map(ch => (
                  <button key={ch.id} className="img-assign-chapter-btn" onClick={() => onAssign(selectedCamp.id, ch.id)}>
                    📎 {ch.name}
                    {(ch.images||[]).some(i => i.url === img.url) && <span className="img-assign-already">✔</span>}
                  </button>
                ))}
              </div>
            ) : (
              <div className="dnd-empty-sm">Sin capítulos en esta campaña</div>
            )}
          </div>
        )}

        <div className="dnd-modal-btns">
          <button className="dnd-btn-cancel" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

// ── Componente: Navegador de imágenes (legacy, para capítulos) ──
function ImageBrowser({ data, onNavigate, onSend }) {
  if (!data) return <div className="dnd-empty-sm">Cargando...</div>
  if (data.error) return <div className="dnd-empty-sm">Crea la carpeta <code>/home/jai/apps/jaijur/public/dndImages</code> y sube imágenes ahí (o en subcarpetas).</div>

  const crumbs = data.path ? data.path.split('/') : []
  const parentPath = crumbs.length > 1 ? crumbs.slice(0, -1).join('/') : ''

  return (
    <div className="dnd-image-browser">
      {/* Breadcrumb */}
      <div className="dnd-breadcrumb">
        <button className="dnd-crumb" onClick={() => onNavigate('')}>🏠 Raíz</button>
        {crumbs.map((c, i) => (
          <span key={i}>
            <span className="dnd-crumb-sep"> / </span>
            <button className="dnd-crumb" onClick={() => onNavigate(crumbs.slice(0, i + 1).join('/'))}>{c}</button>
          </span>
        ))}
      </div>

      {/* Botón para subir nivel */}
      {data.path && (
        <button className="dnd-folder-up" onClick={() => onNavigate(parentPath)}>⬆ Subir</button>
      )}

      {/* Carpetas */}
      {data.folders.length > 0 && (
        <div className="dnd-folder-list">
          {data.folders.map(f => (
            <button key={f.path} className="dnd-folder" onClick={() => onNavigate(f.path)}>
              📁 {f.name}
            </button>
          ))}
        </div>
      )}

      {/* Imágenes */}
      {data.images.length > 0 && (
        <div className="dnd-image-grid">
          {data.images.map(img => (
            <div key={img.url} className="dnd-image-thumb" title={img.name}>
              <img src={img.url} alt={img.name} loading="lazy" />
              <div className="dnd-image-overlay">
                <button className="dnd-image-send" onClick={() => onSend(img, 'main')} title="Enviar a Main (TV)">📺</button>
                <button className="dnd-image-send dnd-image-send-tablet" onClick={() => onSend(img, 'tablet')} title="Enviar a Tablet">📱</button>
                <span className="dnd-image-name">{img.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.folders.length === 0 && data.images.length === 0 && (
        <div className="dnd-empty-sm">Carpeta vacía</div>
      )}
    </div>
  )
}


// ── Componente: Auth Gate para D&D ─────────────────────────
function DnDAuthGate() {
  const { login } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    if (password !== confirmPw) { setError('Las contraseñas no coinciden'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/dnd/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Auto-login con el token devuelto
      localStorage.setItem('jaijur_user', JSON.stringify(data.user))
      if (data.rememberToken) localStorage.setItem('jaijur_remember', data.rememberToken)
      window.location.reload()
    } catch (err) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="dnd-root">
      <div className="dnd-bg" />
      <main className="dnd-auth-gate">
        <div className="dnd-auth-card">
          <h1 className="dnd-auth-title">⚔️ D&D</h1>
          <div className="dnd-auth-tabs">
            <button className={`dnd-auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError('') }}>Entrar</button>
            <button className={`dnd-auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setError('') }}>Crear cuenta</button>
          </div>

          {mode === 'login' ? (
            <div className="dnd-auth-form" onKeyDown={e => e.key === 'Enter' && handleLogin(e)}>
              <input className="dnd-input" placeholder="Usuario" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
              <input className="dnd-input" type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />
              {error && <div className="dnd-auth-error">{error}</div>}
              <button className="dnd-btn-primary dnd-auth-submit" onClick={handleLogin} disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          ) : (
            <div className="dnd-auth-form" onKeyDown={e => e.key === 'Enter' && handleRegister(e)}>
              <input className="dnd-input" placeholder="Nombre de usuario (mín. 3)" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
              <input className="dnd-input" type="password" placeholder="Contraseña (mín. 4)" value={password} onChange={e => setPassword(e.target.value)} />
              <input className="dnd-input" type="password" placeholder="Confirmar contraseña" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
              {error && <div className="dnd-auth-error">{error}</div>}
              <button className="dnd-btn-primary dnd-auth-submit" onClick={handleRegister} disabled={loading}>
                {loading ? 'Creando...' : 'Crear personaje'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}


// ── Componente: Ficha del glosario ─────────────────────────
function GlossaryCard({ entry, expanded, onToggle, onEdit, onDelete, onSendImage, campaigns, favorites, onToggleFav, isFavorite, canEdit }) {
  const catIcons = { enemy: '⚔️', artifact: '💎', lore: '📜', spell: '🔮' }
  const catLabel = { enemy: 'Enemigo', artifact: 'Artefacto', lore: 'Lore', spell: 'Hechizo' }
  const s = entry.stats || {}
  const mod = v => { const m = Math.floor((v-10)/2); return m >= 0 ? `+${m}` : `${m}` }
  const [openSections, setOpenSections] = useState({})
  const [actionTab, setActionTab] = useState('melee')
  const toggleSec = key => setOpenSections(p => ({ ...p, [key]: !p[key] }))

  const GlossaryAccordion = ({ id, label, children, count }) => {
    const isOpen = openSections[id]
    return (
      <div className="cc-accordion">
        <div className="cc-accordion-header" onClick={() => toggleSec(id)}>
          <span className="cc-accordion-chevron">{isOpen ? '▾' : '▸'}</span>
          <span className="cc-accordion-label">{label}</span>
          {count != null && <span className="cc-accordion-count">{count}</span>}
        </div>
        {isOpen && <div className="cc-accordion-body">{children}</div>}
      </div>
    )
  }

  const hasSkills = (entry.skills||[]).length > 0
  const hasTraits = (entry.traits||[]).length > 0
  const hasActions = (entry.actions||[]).length > 0
  const hasAbilities = (entry.abilities||[]).length > 0
  const hasSpellSlots = entry.spellSlots && typeof entry.spellSlots === 'object' && Object.values(entry.spellSlots).some(v => v > 0)

  return (
    <div className={`glossary-card ${expanded ? 'expanded' : ''} ${entry.hidden ? 'glossary-card-hidden' : ''}`} data-glossary-id={entry.id}>
      <div className="glossary-card-header" onClick={onToggle}>
        {isFavorite && <span className="glossary-card-fav-star">★</span>}
        {entry.hidden && <span className="glossary-hidden-badge" title="Oculto para jugadores">🙈</span>}
        {entry.category === 'enemy' && (entry.portraits||[]).length > 0 ? (
          <img src={entry.portraits[0]} alt="" className="glossary-card-enemy-thumb" />
        ) : (
          <span className="glossary-card-cat">{catIcons[entry.category] || '📄'}</span>
        )}
        <span className="glossary-card-name">{entry.name || 'Sin nombre'}</span>
        {entry.category === 'enemy' && s.challenge && <span className="glossary-card-cr">CR {s.challenge}</span>}
        {entry.category === 'artifact' && entry.rarity && <span className="glossary-card-rarity">{entry.rarity}</span>}
        {entry.category === 'spell' && <span className="glossary-card-spell-lv">{entry.spellLevel === 'truco' ? 'Truco' : `Nv. ${entry.spellLevel}`}</span>}
        {entry.category === 'spell' && entry.concentration && <span className="glossary-spell-concentration" style={{fontSize:'0.65rem'}}>🔄</span>}
        <span className="glossary-card-chevron">{expanded ? '▾' : '▸'}</span>
      </div>

      {expanded && (
        <div className="glossary-card-body">
          {entry.description && <p className="glossary-desc">{entry.description}</p>}

          {entry.category === 'enemy' && (
            <div className="glossary-stats-block">
              <div className="glossary-stats-row">
                <span className="glossary-stat-badge">CA {s.ca}</span>
                <span className="glossary-stat-badge">PG {s.hp ? `${s.hp.dice}d${s.hp.sides}${s.hp.modifier > 0 ? ` + ${s.hp.modifier}` : s.hp.modifier < 0 ? ` - ${Math.abs(s.hp.modifier)}` : ''}` : s.pg || '—'}</span>
                <span className="glossary-stat-badge">Vel. {s.speed}</span>
              </div>
              <div className="glossary-attrs">
                {[['FUE',s.str],['DES',s.dex],['CON',s.con],['INT',s.int],['SAB',s.wis],['CAR',s.cha]].map(([label,val]) => (
                  <div key={label} className="glossary-attr">
                    <span className="glossary-attr-label">{label}</span>
                    <span className="glossary-attr-val">{val}</span>
                    <span className="glossary-attr-mod">{mod(val||10)}</span>
                  </div>
                ))}
              </div>

              {hasSkills && (
                <GlossaryAccordion id="skills" label="Habilidades" count={entry.skills.length}>
                  <div className="glossary-skills">
                    {entry.skills.map((sk,i) => (
                      <span key={i} className="glossary-skill-badge">{sk.name} {sk.bonus >= 0 ? '+' : ''}{sk.bonus}</span>
                    ))}
                  </div>
                </GlossaryAccordion>
              )}

              {hasTraits && (
                <GlossaryAccordion id="traits" label="Rasgos" count={entry.traits.length}>
                  {entry.traits.map((t,i) => (
                    <div key={i} className="glossary-trait">
                      <strong>{t.name}.</strong> {t.description}
                    </div>
                  ))}
                </GlossaryAccordion>
              )}

              {(hasActions || hasSpellSlots) && (
                <GlossaryAccordion id="actions" label="Acciones" count={hasActions ? entry.actions.length : undefined}>
                  {hasSpellSlots && (
                    <div className="glossary-spell-slots">
                      <span className="glossary-spell-slots-label">🔮 Huecos de conjuro:</span>
                      <div className="glossary-spell-slots-grid">
                        {[1,2,3,4,5,6,7,8,9].map(lv => {
                          const val = entry.spellSlots[lv] || 0
                          if (!val) return null
                          return <span key={lv} className="glossary-spell-slot-badge">Nv.{lv}: {val}</span>
                        })}
                      </div>
                    </div>
                  )}
                  {entry.spellSlots && typeof entry.spellSlots === 'number' && entry.spellSlots > 0 && (
                    <div className="glossary-spell-slots">🔮 Espacios de conjuro: {entry.spellSlots}</div>
                  )}
                  {hasActions && <ActionsPanel actions={entry.actions} favoriteActions={[]} actionTab={actionTab} setActionTab={setActionTab} onToggleFav={() => {}} />}
                </GlossaryAccordion>
              )}

              {hasAbilities && (
                <GlossaryAccordion id="abilities" label="Habilidades especiales" count={entry.abilities.length}>
                  <div className="trait-cards-grid">
                    {entry.abilities.map((ab,i) => (
                      <TraitCard key={i} trait={{ name: ab.name, description: ab.description, uses: ab.uses }} />
                    ))}
                  </div>
                </GlossaryAccordion>
              )}
            </div>
          )}

          {entry.category === 'spell' && (
            <div className="glossary-spell-card">
              <div className="glossary-spell-meta">
                <span className="glossary-spell-meta-item">⏱ {entry.castTime || '—'}</span>
                <span className="glossary-spell-meta-item">📏 {entry.range || '—'}</span>
                <span className="glossary-spell-meta-item">⏳ {entry.duration || '—'}</span>
                {entry.concentration && <span className="glossary-spell-concentration">🔄 Concentración</span>}
              </div>
              <div className="glossary-spell-meta">
                <span className="glossary-spell-meta-item">
                  🧩 {[entry.components?.v && 'V', entry.components?.s && 'S', entry.components?.m && 'M'].filter(Boolean).join(', ') || '—'}
                  {entry.components?.m && entry.components?.mDesc && <span className="glossary-spell-material"> ({entry.components.mDesc})</span>}
                </span>
              </div>
              {(entry.damage || entry.damageType) && (
                <div className="glossary-spell-damage">
                  {entry.damage && <span className="glossary-damage">⚔ {entry.damage}</span>}
                  {entry.damageType && <span className="glossary-spell-dmg-type">{entry.damageType}</span>}
                </div>
              )}
              {(entry.secondaryDamage || entry.secondaryDamageType) && (
                <div className="glossary-spell-damage">
                  {entry.secondaryDamage && <span className="glossary-damage glossary-damage-secondary">+ {entry.secondaryDamage}</span>}
                  {entry.secondaryDamageType && <span className="glossary-spell-dmg-type">{entry.secondaryDamageType}</span>}
                </div>
              )}
            </div>
          )}

          {entry.category === 'artifact' && entry.properties && (
            <div className="glossary-props-text">{entry.properties}</div>
          )}

          {(entry.images||[]).length > 0 && (
            <div className="lore-detail-images" style={{marginTop:8}}>
              {entry.images.map((url, i) => (
                <img key={i} src={url} alt="" className="lore-detail-img" onClick={() => window.open(url, '_blank')} />
              ))}
            </div>
          )}

          {entry.tags?.length > 0 && (
            <div className="glossary-tags">
              {entry.tags.map((t,i) => <span key={i} className="glossary-tag">{t}</span>)}
            </div>
          )}

          <div className="glossary-card-actions">
            {canEdit && <button className="dnd-btn-sm" onClick={onEdit}>✏ Editar</button>}
            {canEdit && <button className="dnd-btn-sm dnd-btn-danger" onClick={onDelete}>✕</button>}
            {canEdit && campaigns.map(c => {
              const isFav = (favorites[c.id] || []).includes(entry.id)
              return <button key={c.id} className={`dnd-btn-sm ${isFav?'glossary-fav-active':''}`}
                onClick={() => onToggleFav(c.id, entry.id)} title={`${isFav?'Quitar de':'Añadir a'} ${c.name}`}>
                {isFav ? '★' : '☆'} {c.name.slice(0,12)}
              </button>
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helper: convertir hechizo del glosario a acción ────────
function spellToAction(spell) {
  // Mapear castTime a actionType
  let actionType = 'normal'
  if (spell.castTime === 'Acción adicional') actionType = 'bonus'
  else if (spell.castTime === 'Reacción') actionType = 'reaction'
  else if (spell.castTime === 'Ritual') actionType = 'ritual'

  // Mapear range
  let range = 'Distancia'
  if (spell.range?.toLowerCase().includes('toque') || spell.range?.toLowerCase().includes('personal')) range = 'Toque'
  else if (spell.range?.toLowerCase().includes('personal')) range = 'Cuerpo a cuerpo'

  // Construir nota con info del hechizo
  const noteParts = []
  if (spell.duration) noteParts.push(`Duración: ${spell.duration}`)
  if (spell.concentration) noteParts.push('Concentración')
  if (spell.components) {
    const comps = [spell.components.v && 'V', spell.components.s && 'S', spell.components.m && 'M'].filter(Boolean).join(', ')
    if (comps) noteParts.push(`Comp: ${comps}`)
  }
  if (spell.description) noteParts.push(spell.description)

  return {
    name: spell.name,
    range,
    modifier: 0,
    damage: spell.damage || '',
    secondaryDamage: spell.secondaryDamage || '',
    note: noteParts.join(' · '),
    actionType,
    isSpell: true,
    spellLevel: spell.spellLevel || 'truco',
    aoe: '',
    glossarySpellId: spell.id,
    damageType: spell.damageType || '',
    secondaryDamageType: spell.secondaryDamageType || '',
  }
}

// ── Componente: Picker de hechizos del glosario ────────────
function SpellPicker({ spells, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState('all')

  const filtered = spells.filter(s => {
    if (filterLevel !== 'all' && s.spellLevel !== filterLevel) return false
    if (search) {
      const q = search.toLowerCase()
      return s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q) || s.tags?.some(t => t.toLowerCase().includes(q))
    }
    return true
  })

  return (
    <div className="spell-picker">
      <div className="spell-picker-header">
        <span className="spell-picker-title">🔮 Seleccionar hechizo</span>
        <button className="dnd-btn-sm" onClick={onClose}>✕</button>
      </div>
      <input className="dnd-glossary-search" placeholder="Buscar hechizo..." value={search} onChange={e => setSearch(e.target.value)} autoFocus style={{width:'100%',marginBottom:6}} />
      <div className="dnd-glossary-subfilters" style={{margin:'0 0 6px'}}>
        {[{id:'all',label:'Todos'},{id:'truco',label:'Truco'},{id:'1',label:'1'},{id:'2',label:'2'},{id:'3',label:'3'},{id:'4',label:'4'},{id:'5',label:'5'},{id:'6',label:'6'},{id:'7',label:'7'},{id:'8',label:'8'},{id:'9',label:'9'}].map(f => (
          <button key={f.id} className={`dnd-glossary-subfilter ${filterLevel===f.id?'active':''}`}
            onClick={() => setFilterLevel(f.id)}>{f.label}</button>
        ))}
      </div>
      <div className="spell-picker-list">
        {filtered.length === 0 && <div className="dnd-empty-sm">{search ? 'Sin resultados' : 'Sin hechizos en el glosario'}</div>}
        {filtered.map(spell => (
          <button key={spell.id} className="spell-picker-item" onClick={() => onSelect(spell)}>
            <span className="spell-picker-name">{spell.name}</span>
            <span className="spell-picker-info">
              {spell.spellLevel === 'truco' ? 'Truco' : `Nv.${spell.spellLevel}`}
              {spell.damage && ` · ${spell.damage}`}
              {spell.damageType && ` ${spell.damageType}`}
              {spell.concentration && ' · 🔄'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Componente: Modal de creación/edición del glosario ─────
function GlossaryModal({ mode, entry: initialEntry, onSave, onClose, templates, glossarySpells }) {
  const [entry, setEntry] = useState(() => {
    if (mode === 'edit' && initialEntry) return { ...initialEntry, portraits: initialEntry.portraits || [] }
    return templates.enemy()
  })
  const [tagsInput, setTagsInput] = useState((initialEntry?.tags || []).join(', '))
  const [showSpellPicker, setShowSpellPicker] = useState(false)
  const [uploadingPortrait, setUploadingPortrait] = useState(false)
  const portraitInputRef = useRef(null)
  const loreImgRef = useRef(null)

  async function handleLoreImages(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    for (const file of files) {
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('Error leyendo archivo'))
          reader.readAsDataURL(file)
        })
        const res = await fetch('/api/dnd/images/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': '1' },
          body: JSON.stringify({ data: base64, filename: file.name, path: 'lore' })
        })
        if (res.ok) {
          const { url } = await res.json()
          setEntry(en => ({ ...en, images: [...(en.images || []), url] }))
        }
      } catch (err) { console.error('Lore image upload error:', err) }
    }
    if (loreImgRef.current) loreImgRef.current.value = ''
  }

  async function handlePortraitUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploadingPortrait(true)
    for (const file of files) {
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('Error leyendo archivo'))
          reader.readAsDataURL(file)
        })
        const res = await fetch('/api/dnd/portraits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': '1' },
          body: JSON.stringify({ data: base64, filename: file.name })
        })
        if (res.ok) {
          const { url } = await res.json()
          setEntry(en => ({ ...en, portraits: [...(en.portraits || []), url] }))
        }
      } catch (err) { console.error('Portrait upload error:', err) }
    }
    setUploadingPortrait(false)
    if (portraitInputRef.current) portraitInputRef.current.value = ''
  }

  function removePortrait(url) {
    setEntry(en => ({ ...en, portraits: (en.portraits || []).filter(p => p !== url) }))
  }

  function update(field, val) { setEntry(e => ({ ...e, [field]: val })) }
  function updateStat(key, val) { setEntry(e => ({ ...e, stats: { ...e.stats, [key]: val } })) }
  function updateAction(idx, field, val) {
    setEntry(e => ({ ...e, actions: e.actions.map((a,i) => i===idx ? {...a,[field]:val} : a) }))
  }
  function addAction() { setEntry(e => ({ ...e, actions: [...(e.actions||[]), {name:'',range:'Cuerpo a cuerpo',modifier:0,damage:'',secondaryDamage:'',note:'',actionType:'normal',isSpell:false,spellLevel:'truco',aoe:''}] })) }
  function removeAction(idx) { setEntry(e => ({ ...e, actions: e.actions.filter((_,i)=>i!==idx) })) }
  function updateTrait(idx, field, val) {
    setEntry(e => ({ ...e, traits: e.traits.map((t,i) => i===idx ? {...t,[field]:val} : t) }))
  }
  function addTrait() { setEntry(e => ({ ...e, traits: [...(e.traits||[]), {name:'',description:''}] })) }
  function removeTrait(idx) { setEntry(e => ({ ...e, traits: e.traits.filter((_,i)=>i!==idx) })) }
  function updateSkill(idx, field, val) {
    setEntry(e => ({ ...e, skills: e.skills.map((s,i) => i===idx ? {...s,[field]:val} : s) }))
  }
  function addSkill() { setEntry(e => ({ ...e, skills: [...(e.skills||[]), {name:'',bonus:0}] })) }
  function removeSkill(idx) { setEntry(e => ({ ...e, skills: (e.skills||[]).filter((_,i)=>i!==idx) })) }
  function updateAbility(idx, field, val) {
    setEntry(e => ({ ...e, abilities: (e.abilities||[]).map((a,i) => i===idx ? {...a,[field]:val} : a) }))
  }
  function addAbility() { setEntry(e => ({ ...e, abilities: [...(e.abilities||[]), {name:'',description:'',uses:''}] })) }
  function removeAbility(idx) { setEntry(e => ({ ...e, abilities: (e.abilities||[]).filter((_,i)=>i!==idx) })) }

  function handleSave() {
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    onSave({ ...entry, tags })
  }
  function changeCategory(cat) {
    if (cat === 'enemy') setEntry(e => ({ ...templates.enemy(), name: e.name, description: e.description, id: e.id }))
    else if (cat === 'artifact') setEntry(e => ({ ...templates.artifact(), name: e.name, description: e.description, id: e.id }))
    else if (cat === 'spell') setEntry(e => ({ ...templates.spell(), name: e.name, description: e.description, id: e.id }))
    else setEntry(e => ({ ...templates.lore(), name: e.name, description: e.description, id: e.id }))
  }

  return (
    <div className="dnd-modal-overlay" onClick={onClose}>
      <div className="dnd-modal glossary-modal" onClick={e => e.stopPropagation()}>
        <h3>{mode === 'create' ? 'Nueva entrada' : 'Editar entrada'}</h3>

        <div className="glossary-form-row">
          <label>Categoría</label>
          <select className="dnd-input" value={entry.category} onChange={e => changeCategory(e.target.value)}>
            <option value="enemy">⚔️ Enemigo</option>
            <option value="artifact">💎 Artefacto</option>
            <option value="spell">🔮 Hechizo</option>
            <option value="lore">📜 Lore</option>
          </select>
        </div>

        <div className="glossary-form-row">
          <label>Nombre</label>
          <input className="dnd-input" value={entry.name||''} onChange={e => update('name', e.target.value)} placeholder="Nombre..." autoFocus />
        </div>

        <div className="glossary-form-row">
          <label>Descripción</label>
          <textarea className="dnd-input glossary-textarea" value={entry.description||''} onChange={e => update('description', e.target.value)} placeholder="Descripción..." rows={3} />
        </div>

        {(entry.category === 'enemy' || entry.category === 'lore') && (
          <div className="glossary-form-row">
            <label className="glossary-spell-check">
              <input type="checkbox" checked={!!(entry.hidden)}
                onChange={e => update('hidden', e.target.checked)} />
              🙈 Oculto para jugadores
            </label>
          </div>
        )}

        {entry.category === 'enemy' && <>
          <div className="glossary-form-row">
            <label>Fotos de perfil <button className="dnd-btn-sm" onClick={() => portraitInputRef.current?.click()} disabled={uploadingPortrait}>{uploadingPortrait ? '📤...' : '📤 Subir'}</button></label>
            <input ref={portraitInputRef} type="file" accept="image/*" multiple onChange={handlePortraitUpload} style={{display:'none'}} />
            {(entry.portraits||[]).length > 0 ? (
              <div className="enemy-portraits-grid">
                {entry.portraits.map((url, i) => (
                  <div key={i} className="enemy-portrait-thumb">
                    <img src={url} alt={`Retrato ${i+1}`} />
                    <button className="enemy-portrait-remove" onClick={() => removePortrait(url)}>✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dnd-empty-sm">Sin fotos — al añadir al grupo se asignará una aleatoriamente</div>
            )}
          </div>
          <div className="glossary-form-row">
            <label>Stats</label>
            <div className="glossary-stat-grid">
              {[['CA','ca','number'],['Velocidad','speed','text'],['Desafío','challenge','text']].map(([label,key,type]) => (
                <div key={key} className="glossary-stat-input">
                  <span>{label}</span>
                  <input className="dnd-input" type={type} value={entry.stats?.[key]??''} onChange={e => updateStat(key, type==='number'?parseInt(e.target.value)||0:e.target.value)} />
                </div>
              ))}
            </div>
          </div>
          <div className="glossary-form-row">
            <label>Puntos de Golpe</label>
            <div className="glossary-hp-row">
              <input className="dnd-input" type="number" min="1" value={entry.stats?.hp?.dice ?? 1}
                onChange={e => updateStat('hp', { ...(entry.stats?.hp || {}), dice: parseInt(e.target.value) || 1 })}
                style={{width:55,textAlign:'center'}} />
              <span className="glossary-hp-d">d</span>
              <select className="dnd-input" value={entry.stats?.hp?.sides ?? 6}
                onChange={e => updateStat('hp', { ...(entry.stats?.hp || {}), sides: parseInt(e.target.value) })}
                style={{width:65}}>
                {[4,6,8,10,12,20].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <span className="glossary-hp-d">+</span>
              <input className="dnd-input" type="number" value={entry.stats?.hp?.modifier ?? 0}
                onChange={e => updateStat('hp', { ...(entry.stats?.hp || {}), modifier: parseInt(e.target.value) || 0 })}
                style={{width:60,textAlign:'center'}} />
              <span className="glossary-hp-preview">
                = {(() => {
                  const hp = entry.stats?.hp || { dice:1, sides:6, modifier:0 }
                  const avg = Math.floor(hp.dice * (hp.sides + 1) / 2) + hp.modifier
                  return `~${avg} PG`
                })()}
              </span>
            </div>
          </div>
          <div className="glossary-form-row">
            <label>Atributos</label>
            <div className="glossary-attr-grid">
              {[['FUE','str'],['DES','dex'],['CON','con'],['INT','int'],['SAB','wis'],['CAR','cha']].map(([label,key]) => (
                <div key={key} className="glossary-stat-input">
                  <span>{label}</span>
                  <input className="dnd-input" type="number" value={entry.stats?.[key]??10} onChange={e => updateStat(key, parseInt(e.target.value)||10)} />
                </div>
              ))}
            </div>
          </div>

          <div className="glossary-form-row">
            <label className="glossary-spell-check">
              <input type="checkbox" checked={!!(entry.isSpellcaster)}
                onChange={e => setEntry(en => ({...en, isSpellcaster: e.target.checked, spellSlots: e.target.checked ? (en.spellSlots || {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0}) : {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0} }))} />
              🔮 Lanzador de conjuros
            </label>
          </div>
          {entry.isSpellcaster && (
            <div className="glossary-form-row">
              <label>Huecos de conjuro por nivel</label>
              <div className="glossary-spell-grid">
                {[1,2,3,4,5,6,7,8,9].map(lv => (
                  <div key={lv} className="glossary-spell-input">
                    <span>Nv.{lv}</span>
                    <input className="dnd-input" type="number" min="0" value={(entry.spellSlots && typeof entry.spellSlots === 'object') ? (entry.spellSlots[lv] ?? 0) : 0}
                      onChange={e => {
                        const slots = typeof entry.spellSlots === 'object' ? {...entry.spellSlots} : {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0}
                        slots[lv] = parseInt(e.target.value) || 0
                        setEntry(en => ({...en, spellSlots: slots}))
                      }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glossary-form-row">
            <label>Habilidades <button className="dnd-btn-sm" onClick={addSkill}>+</button></label>
            {(entry.skills||[]).map((sk,i) => (
              <div key={i} className="glossary-list-item">
                <select className="dnd-input" value={sk.name} onChange={e=>updateSkill(i,'name',e.target.value)} style={{flex:'0 0 140px'}}>
                  <option value="">— Elegir —</option>
                  {['Acrobacia','Arcanos','Atletismo','Engaño','Historia','Intimidación','Investigación',
                    'Juego de manos','Medicina','Naturaleza','Percepción','Perspicacia','Persuasión',
                    'Religión','Sigilo','Supervivencia','Trato con animales'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <input className="dnd-input" type="number" placeholder="+X" value={sk.bonus} onChange={e=>updateSkill(i,'bonus',parseInt(e.target.value)||0)} style={{maxWidth:70}} />
                <button className="dnd-btn-sm dnd-btn-danger" onClick={()=>removeSkill(i)}>✕</button>
              </div>
            ))}
          </div>
          <div className="glossary-form-row">
            <label>Rasgos <button className="dnd-btn-sm" onClick={addTrait}>+</button></label>
            {(entry.traits||[]).map((t,i) => (
              <div key={i} className="glossary-list-item">
                <input className="dnd-input" placeholder="Nombre" value={t.name} onChange={e=>updateTrait(i,'name',e.target.value)} />
                <input className="dnd-input" placeholder="Descripción" value={t.description} onChange={e=>updateTrait(i,'description',e.target.value)} />
                <button className="dnd-btn-sm dnd-btn-danger" onClick={()=>removeTrait(i)}>✕</button>
              </div>
            ))}
          </div>
          <div className="glossary-form-row">
            <label>Acciones <button className="dnd-btn-sm" onClick={addAction}>+</button> <button className="dnd-btn-sm spell-picker-btn" onClick={() => setShowSpellPicker(!showSpellPicker)}>🔮 Hechizo</button></label>
            {showSpellPicker && (
              <SpellPicker spells={glossarySpells || []} onClose={() => setShowSpellPicker(false)}
                onSelect={spell => { setEntry(e => ({ ...e, actions: [...(e.actions||[]), spellToAction(spell)] })); setShowSpellPicker(false) }} />
            )}
            {(entry.actions||[]).map((a,i) => (
              <div key={i} className={`glossary-action-form ${a.glossarySpellId ? 'glossary-action-from-spell' : ''}`}>
                {a.glossarySpellId && <div className="glossary-action-spell-badge">🔮 Hechizo del glosario</div>}
                <div className="glossary-action-form-row">
                  <input className="dnd-input" placeholder="Nombre (ej: Cimitarra)" value={a.name} onChange={e=>updateAction(i,'name',e.target.value)} style={{flex:1}} />
                  <select className="dnd-input" value={a.actionType||'normal'} onChange={e=>updateAction(i,'actionType',e.target.value)} style={{flex:'0 0 110px'}}>
                    <option value="normal">Normal</option>
                    <option value="bonus">Adicional</option>
                    <option value="reaction">Reacción</option>
                    <option value="ritual">Ritual</option>
                  </select>
                  <button className="dnd-btn-sm dnd-btn-danger" onClick={()=>removeAction(i)}>✕</button>
                </div>
                <div className="glossary-action-form-row">
                  <select className="dnd-input" value={a.range||'Cuerpo a cuerpo'} onChange={e=>updateAction(i,'range',e.target.value)} style={{flex:'0 0 140px'}}>
                    <option value="Cuerpo a cuerpo">Cuerpo a cuerpo</option>
                    <option value="Toque">Toque</option>
                    <option value="Distancia">Distancia</option>
                  </select>
                  <label className="glossary-spell-check">
                    <input type="checkbox" checked={a.isSpell||false} onChange={e=>updateAction(i,'isSpell',e.target.checked)} /> 🔮 Hechizo
                  </label>
                  {a.isSpell && (
                    <select className="dnd-input" value={a.spellLevel||'truco'} onChange={e=>updateAction(i,'spellLevel',e.target.value)} style={{flex:'0 0 85px'}}>
                      <option value="truco">Truco</option>
                      {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>Nv. {n}</option>)}
                    </select>
                  )}
                  <input className="dnd-input" placeholder="Área de efecto (ej: Cono 15 pies)" value={a.aoe||''} onChange={e=>updateAction(i,'aoe',e.target.value)} style={{flex:1}} />
                </div>
                <div className="glossary-action-form-row">
                  <div className="glossary-stat-input" style={{flex:'0 0 70px'}}>
                    <span>Mod.</span>
                    <input className="dnd-input" type="number" value={a.modifier??0} onChange={e=>updateAction(i,'modifier',parseInt(e.target.value)||0)} />
                  </div>
                  <div className="glossary-stat-input" style={{flex:1}}>
                    <span>Daño</span>
                    <input className="dnd-input" placeholder="1d6+2 cortante" value={a.damage||''} onChange={e=>updateAction(i,'damage',e.target.value)} />
                  </div>
                  <div className="glossary-stat-input" style={{flex:1}}>
                    <span>Daño sec.</span>
                    <input className="dnd-input" placeholder="1d6 fuego" value={a.secondaryDamage||''} onChange={e=>updateAction(i,'secondaryDamage',e.target.value)} />
                  </div>
                </div>
                <input className="dnd-input" placeholder="Nota adicional (ej: CD 12 CON o envenenado)" value={a.note||''} onChange={e=>updateAction(i,'note',e.target.value)} style={{marginTop:4}} />
              </div>
            ))}
          </div>
          <div className="glossary-form-row">
            <label>Habilidades especiales <button className="dnd-btn-sm" onClick={addAbility}>+</button></label>
            {(entry.abilities||[]).map((ab,i) => (
              <div key={i} className="glossary-list-item" style={{flexWrap:'wrap'}}>
                <input className="dnd-input" placeholder="Nombre (ej: Escape Ágil)" value={ab.name} onChange={e=>updateAbility(i,'name',e.target.value)} style={{flex:1}} />
                <select className="dnd-input" value={ab.uses||''} onChange={e=>updateAbility(i,'uses',e.target.value)} style={{flex:'0 0 130px'}}>
                  <option value="">Sin límite</option>
                  <option value="1/día">1/día</option>
                  <option value="2/día">2/día</option>
                  <option value="3/día">3/día</option>
                  <option value="1/descanso corto">1/descanso corto</option>
                  <option value="2/descanso corto">2/descanso corto</option>
                  <option value="1/descanso largo">1/descanso largo</option>
                  <option value="A voluntad">A voluntad</option>
                </select>
                <button className="dnd-btn-sm dnd-btn-danger" onClick={()=>removeAbility(i)}>✕</button>
                <input className="dnd-input" placeholder="Descripción" value={ab.description} onChange={e=>updateAbility(i,'description',e.target.value)} style={{width:'100%',marginTop:3}} />
              </div>
            ))}
          </div>
        </>}

        {entry.category === 'artifact' && <>
          <div className="glossary-form-row">
            <label>Rareza</label>
            <select className="dnd-input" value={entry.rarity||'Común'} onChange={e => update('rarity', e.target.value)}>
              {['Común','Poco común','Raro','Muy raro','Legendario','Artefacto'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="glossary-form-row">
            <label>Propiedades</label>
            <textarea className="dnd-input glossary-textarea" value={entry.properties||''} onChange={e => update('properties', e.target.value)} placeholder="Propiedades mágicas, efectos..." rows={4} />
          </div>
        </>}

        {entry.category === 'spell' && <>
          <div className="glossary-form-row">
            <label>Nivel</label>
            <select className="dnd-input" value={entry.spellLevel||'truco'} onChange={e => update('spellLevel', e.target.value)}>
              <option value="truco">Truco</option>
              {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>Nivel {n}</option>)}
            </select>
          </div>
          <div className="glossary-form-row">
            <label>Tiempo de casteo</label>
            <select className="dnd-input" value={entry.castTime||'Acción'} onChange={e => update('castTime', e.target.value)}>
              {['Acción','Acción adicional','Reacción','1 minuto','10 minutos','1 hora','Ritual'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="glossary-form-row">
            <label>Alcance</label>
            <input className="dnd-input" value={entry.range||''} onChange={e => update('range', e.target.value)} placeholder="Toque, Personal, 30 pies, 120 pies..." />
          </div>
          <div className="glossary-form-row">
            <label>Componentes</label>
            <div className="glossary-components-row">
              {[['v','V (Verbal)'],['s','S (Somático)'],['m','M (Material)']].map(([key,label]) => (
                <label key={key} className="glossary-comp-check">
                  <input type="checkbox" checked={entry.components?.[key]||false}
                    onChange={e => update('components', {...(entry.components||{}), [key]: e.target.checked})} />
                  {label}
                </label>
              ))}
            </div>
            {entry.components?.m && (
              <input className="dnd-input" value={entry.components?.mDesc||''} placeholder="Materiales necesarios..."
                onChange={e => update('components', {...(entry.components||{}), mDesc: e.target.value})} style={{marginTop:4}} />
            )}
          </div>
          <div className="glossary-form-row">
            <div className="glossary-components-row">
              <label className="glossary-comp-check">
                <input type="checkbox" checked={entry.concentration||false}
                  onChange={e => update('concentration', e.target.checked)} />
                🔄 Concentración
              </label>
            </div>
          </div>
          <div className="glossary-form-row">
            <label>Duración</label>
            <input className="dnd-input" value={entry.duration||''} onChange={e => update('duration', e.target.value)} placeholder="Instantáneo, 1 minuto, 1 hora..." />
          </div>
          <div className="glossary-form-row">
            <label>Daño principal</label>
            <div className="glossary-action-form-row">
              <input className="dnd-input" value={entry.damage||''} onChange={e => update('damage', e.target.value)} placeholder="1d10, 2d6..." style={{flex:1}} />
              <select className="dnd-input" value={entry.damageType||''} onChange={e => update('damageType', e.target.value)} style={{flex:1}}>
                <option value="">— Tipo —</option>
                {['Ácido','Contundente','Cortante','Perforante','Fuego','Frío','Veneno','Necrótico','Radiante','Relámpago','Trueno','Fuerza','Psíquico','Curación'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="glossary-form-row">
            <label>Daño secundario</label>
            <div className="glossary-action-form-row">
              <input className="dnd-input" value={entry.secondaryDamage||''} onChange={e => update('secondaryDamage', e.target.value)} placeholder="1d6, 2d4..." style={{flex:1}} />
              <select className="dnd-input" value={entry.secondaryDamageType||''} onChange={e => update('secondaryDamageType', e.target.value)} style={{flex:1}}>
                <option value="">— Tipo —</option>
                {['Ácido','Contundente','Cortante','Perforante','Fuego','Frío','Veneno','Necrótico','Radiante','Relámpago','Trueno','Fuerza','Psíquico','Curación'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </>}

        {entry.category === 'lore' && (
          <div className="glossary-form-row">
            <label>Imágenes <button className="dnd-btn-sm" onClick={() => loreImgRef.current?.click()}>📤 Subir</button></label>
            <input ref={loreImgRef} type="file" accept="image/*" multiple onChange={handleLoreImages} style={{display:'none'}} />
            {(entry.images||[]).length > 0 && (
              <div className="lore-images-grid">
                {entry.images.map((url, i) => (
                  <div key={i} className="lore-image-thumb">
                    <img src={url} alt="" />
                    <button className="lore-image-remove" onClick={() => setEntry(e => ({...e, images: e.images.filter((_,j) => j !== i)}))}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="glossary-form-row">
          <label>Tags (separados por coma)</label>
          <input className="dnd-input" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="goblin, bosque, CR1..." />
        </div>

        <div className="dnd-modal-btns">
          <button className="dnd-btn-primary" onClick={handleSave}>Guardar</button>
          <button className="dnd-btn-cancel" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}




// ── Componente: Action Card individual ─────────────────────
function ActionCard({ a, isFav, onToggleFav }) {
  const [isOpen, setIsOpen] = useState(false)

  const cardContent = () => (
    <>
      <div className="action-card-top">
        <button className={`action-card-fav ${isFav ? 'active' : ''}`} onClick={e => { e.stopPropagation(); onToggleFav(a._idx) }}>
          {isFav ? '★' : '☆'}
        </button>
        <span className="action-card-name">{a.name}</span>
        {a.actionType && a.actionType !== 'normal' && (
          <span className="action-card-type">{a.actionType === 'bonus' ? 'Adic.' : a.actionType === 'reaction' ? 'Reacción' : 'Ritual'}</span>
        )}
      </div>
      <div className="action-card-body">
        {a.isSpell && <span className="action-card-spell">🔮 {a.spellLevel === 'truco' ? 'Truco' : `Nv.${a.spellLevel}`}</span>}
        {a.range && <span className="action-card-range">📏 {a.range}</span>}
        {a.aoe && <span className="action-card-aoe">◎ {a.aoe}</span>}
        {a.modifier != null && a.modifier !== '' && a.modifier !== 0 && (
          <span className="action-card-mod">{a.modifier >= 0 ? '+' : ''}{a.modifier}</span>
        )}
      </div>
      {(a.damage || a.secondaryDamage) && (
        <div className="action-card-dmg">
          {a.damage && <span className="action-card-dmg-main">⚔ {a.damage}</span>}
          {a.secondaryDamage && <span className="action-card-dmg-sec">+ {a.secondaryDamage}</span>}
        </div>
      )}
      {a.concentration && <div className="action-card-conc">🎯 Concentración</div>}
      {a.note && <div className="action-card-note">{a.note}</div>}
    </>
  )

  return (
    <>
      <div className="action-card" onClick={e => { e.stopPropagation(); setIsOpen(true) }}>
        {cardContent()}
      </div>
      {isOpen && (
        <div className="action-card-overlay" onClick={e => { e.stopPropagation(); setIsOpen(false) }}>
          <div className="action-card-modal" onClick={e => e.stopPropagation()}>
            {cardContent()}
          </div>
        </div>
      )}
    </>
  )
}

// ── Componente: Panel de acciones con categorías y cards ───
function ActionsPanel({ actions, favoriteActions, actionTab, setActionTab, onToggleFav, openActionIdx, setOpenActionIdx }) {
  const favSet = new Set(favoriteActions || [])

  const melee = []
  const spells = []
  const favs = []
  actions.forEach((a, i) => {
    if (favSet.has(i)) favs.push({ ...a, _idx: i })
    if (a.isSpell) spells.push({ ...a, _idx: i })
    else melee.push({ ...a, _idx: i })
  })

  // Si no hay favoritos y tab es fav, auto-switch
  const activeTab = actionTab === 'fav' && favs.length === 0 ? 'melee' : actionTab

  const tabActions = activeTab === 'fav' ? favs : activeTab === 'spell' ? spells : melee

  return (
    <div className="actions-panel">
      <div className="actions-tabs">
        <button className={`actions-tab ${activeTab === 'fav' ? 'active' : ''}`} onClick={() => setActionTab('fav')}>
          ★ Favoritos {favs.length > 0 && <span className="actions-tab-count">{favs.length}</span>}
        </button>
        <button className={`actions-tab ${activeTab === 'melee' ? 'active' : ''}`} onClick={() => setActionTab('melee')}>
          ⚔ Cuerpo {melee.length > 0 && <span className="actions-tab-count">{melee.length}</span>}
        </button>
        <button className={`actions-tab ${activeTab === 'spell' ? 'active' : ''}`} onClick={() => setActionTab('spell')}>
          🔮 Hechizos {spells.length > 0 && <span className="actions-tab-count">{spells.length}</span>}
        </button>
      </div>
      <div className="actions-grid">
        {tabActions.length === 0 && (
          <div className="dnd-empty-sm" style={{gridColumn:'1/-1'}}>
            {activeTab === 'fav' ? 'Sin favoritos — marca acciones con ★' : 'Sin acciones en esta categoría'}
          </div>
        )}
        {tabActions.map(a => <ActionCard key={a._idx} a={a} isFav={favSet.has(a._idx)} onToggleFav={onToggleFav} />)}
      </div>
    </div>
  )
}

// ── Componente: Trait Card con modal ─────────────────────────
function TraitCard({ trait }) {
  const [open, setOpen] = useState(false)
  const desc = trait.description || ''
  return (
    <>
      <div className="trait-card" onClick={e => { e.stopPropagation(); setOpen(true) }}>
        <div className="trait-card-name">
          {trait.name}
          {trait.uses && <span className="trait-card-uses">({trait.uses})</span>}
        </div>
        <div className="trait-card-preview">{desc}</div>
      </div>
      {open && (
        <div className="dnd-modal-overlay" onClick={e => { e.stopPropagation(); setOpen(false) }}>
          <div className="dnd-modal lore-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="lore-detail-header">
              <span className="lore-detail-icon">📋</span>
              <h3 className="lore-detail-title">{trait.name}</h3>
              {trait.uses && <span className="glossary-linked-rarity">{trait.uses}</span>}
            </div>
            <div className="lore-detail-body">
              <p className="lore-detail-text">{desc}</p>
            </div>
            <button className="dnd-btn-cancel lore-detail-close" onClick={e => { e.stopPropagation(); setOpen(false) }}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  )
}

// ── Componente: Accordion reutilizable para secciones ──────
function SectionAccordion({ id, label, count, openSections, toggleSec, children }) {
  const isOpen = openSections[id]
  return (
    <div className="cc-accordion">
      <div className="cc-accordion-header" onClick={() => toggleSec(id)}>
        <span className="cc-accordion-chevron">{isOpen ? '▾' : '▸'}</span>
        <span className="cc-accordion-label">{label}</span>
        {count != null && <span className="cc-accordion-count">{count}</span>}
      </div>
      {isOpen && <div className="cc-accordion-body">{children}</div>}
    </div>
  )
}

// ── Componente: Ficha de personaje ─────────────────────────
function CharacterCard({ character, expanded, onToggle, onEdit, onDelete, onSave, onAddToParty, parties, isMaster, glossaryEntries }) {
  const s = character.stats || {}
  const mod = v => { const m = Math.floor((v-10)/2); return m >= 0 ? `+${m}` : `${m}` }
  const [openSections, setOpenSections] = useState({})
  const [actionTab, setActionTab] = useState('fav')
  const [openActionIdx, setOpenActionIdx] = useState(null)
  const [loreModal, setLoreModal] = useState(null)
  const toggleSec = key => setOpenSections(p => ({ ...p, [key]: !p[key] }))

  const hasSaves = character.savingThrows && Object.values(character.savingThrows).some(v => v)
  const hasSkills = (character.skills||[]).length > 0
  const allTraits = [...(character.traits||[]), ...(character.bgTraits||[])]
  const hasTraits = allTraits.length > 0
  const hasActions = (character.actions||[]).length > 0
  const hasAbilities = (character.abilities||[]).length > 0
  const hasSpellSlots = character.spellSlots && typeof character.spellSlots === 'object' && Object.values(character.spellSlots).some(v => v > 0)
  const hasProficiencies = [...(character.proficiencies||[]), ...(character.bgTools||[])].length > 0
  const allEquipment = [...(character.equipment||[]), ...(character.bgEquipment||[])]
  const hasEquipment = allEquipment.length > 0
  const hasConsumables = (character.consumables||[]).length > 0

  return (
    <div className={`glossary-card ${expanded ? 'expanded' : ''}`}>
      <div className="glossary-card-header" onClick={onToggle}>
        <span className="glossary-card-cat">🛡️</span>
        <span className="glossary-card-name">{character.name || 'Sin nombre'}</span>
        {character.player && <span className="glossary-card-player">🎮 {character.player}</span>}
        {character.race && <span className="glossary-card-cr">{character.race}</span>}
        {character.class && <span className="glossary-card-rarity">{character.class}{character.subclass ? ` (${character.subclass})` : ''} Nv.{character.level || 1}</span>}
        <span className="glossary-card-chevron">{expanded ? '▾' : '▸'}</span>
      </div>

      {expanded && (
        <div className="glossary-card-body">
          {character.description && <p className="glossary-desc">{character.description}</p>}

          <div className="cc-profile-layout">
            {character.portrait && (
              <div className="cc-profile-portrait">
                <img src={character.portrait} alt="" />
              </div>
            )}
            <div className="cc-profile-stats">
              <div className="glossary-stats-row">
                <span className="glossary-stat-badge">CA {s.ca}</span>
                <span className="glossary-stat-badge">PG {s.hp?.current ?? '?'} / {s.hp?.max ?? '?'}</span>
                <span className="glossary-stat-badge">Vel. {s.speed}</span>
                <span className="glossary-stat-badge">Comp. +{s.proficiencyBonus || 2}</span>
                {s.passivePerception != null && <span className="glossary-stat-badge">PP {s.passivePerception}</span>}
                {s.hitDice && <span className="glossary-stat-badge">DG {s.hitDice.count}d{s.hitDice.die}</span>}
              </div>
              <div className="glossary-attrs">
                {[['FUE',s.str],['DES',s.dex],['CON',s.con],['INT',s.int],['SAB',s.wis],['CAR',s.cha]].map(([label,val]) => (
                  <div key={label} className="glossary-attr">
                    <span className="glossary-attr-label">{label}</span>
                    <span className="glossary-attr-val">{val}</span>
                  <span className="glossary-attr-mod">{mod(val||10)}</span>
                </div>
              ))}
              </div>
            </div>
          </div>

            {hasSaves && (
              <SectionAccordion id="saves" label="Tiradas de salvación" count={[['FUE','str'],['DES','dex'],['CON','con'],['INT','int'],['SAB','wis'],['CAR','cha']].filter(([,k]) => character.savingThrows[k]).length} openSections={openSections} toggleSec={toggleSec}>
                <div className="glossary-skills">
                  {[['FUE','str'],['DES','dex'],['CON','con'],['INT','int'],['SAB','wis'],['CAR','cha']]
                    .filter(([,key]) => character.savingThrows[key])
                    .map(([label,key]) => {
                      const bonus = Math.floor(((s[key]||10)-10)/2) + (s.proficiencyBonus || 2)
                      return <span key={key} className="glossary-skill-badge">{label} {bonus >= 0 ? '+' : ''}{bonus}</span>
                    })}
                </div>
              </SectionAccordion>
            )}

            {hasSkills && (
              <SectionAccordion id="skills" label="Habilidades" count={character.skills.length} openSections={openSections} toggleSec={toggleSec}>
                <div className="glossary-skills">
                  {character.skills.map((sk,i) => (
                    <span key={i} className="glossary-skill-badge">{sk.name} {sk.bonus >= 0 ? '+' : ''}{sk.bonus}</span>
                  ))}
                </div>
              </SectionAccordion>
            )}

            {hasProficiencies && (() => {
              const allProfs = [...(character.proficiencies||[]), ...(character.bgTools||[])]
              return (
              <SectionAccordion id="profs" label="Competencias" count={allProfs.length} openSections={openSections} toggleSec={toggleSec}>
                <div className="glossary-skills">
                  {allProfs.map((p,i) => (
                    <span key={i} className="glossary-skill-badge">{p}</span>
                  ))}
                </div>
              </SectionAccordion>
            )})()}

            {(character.languages||[]).length > 0 && (
              <SectionAccordion id="languages" label="Idiomas" count={character.languages.length} openSections={openSections} toggleSec={toggleSec}>
                <div className="glossary-skills">
                  {character.languages.map((l,i) => (
                    <span key={i} className="glossary-skill-badge">{l}</span>
                  ))}
                </div>
              </SectionAccordion>
            )}

            {hasTraits && (
              <SectionAccordion id="traits" label="Rasgos" count={allTraits.length} openSections={openSections} toggleSec={toggleSec}>
                <div className="trait-cards-grid">
                  {allTraits.map((t,i) => (
                    <TraitCard key={i} trait={t} />
                  ))}
                </div>
              </SectionAccordion>
            )}

            {(hasActions || hasSpellSlots) && (
              <SectionAccordion id="actions" label="Acciones" count={hasActions ? character.actions.length : undefined} openSections={openSections} toggleSec={toggleSec}>
                {hasSpellSlots && (
                  <div className="glossary-spell-slots">
                    <span className="glossary-spell-slots-label">🔮 Huecos de conjuro:</span>
                    <div className="glossary-spell-slots-grid">
                      {[1,2,3,4,5,6,7,8,9].map(lv => {
                        const val = character.spellSlots[lv] || 0
                        if (!val) return null
                        return <span key={lv} className="glossary-spell-slot-badge">Nv.{lv}: {val}</span>
                      })}
                    </div>
                  </div>
                )}
                <ActionsPanel actions={character.actions||[]} favoriteActions={character.favoriteActions||[]}
                  actionTab={actionTab} setActionTab={setActionTab}
                  openActionIdx={openActionIdx} setOpenActionIdx={setOpenActionIdx}
                  onToggleFav={idx => {
                    const favs = [...(character.favoriteActions||[])]
                    const pos = favs.indexOf(idx)
                    if (pos >= 0) favs.splice(pos, 1); else favs.push(idx)
                    onSave({ ...character, favoriteActions: favs })
                  }} />
              </SectionAccordion>
            )}

            {hasAbilities && (
              <SectionAccordion id="abilities" label="Habilidades especiales" count={character.abilities.length} openSections={openSections} toggleSec={toggleSec}>
                <div className="trait-cards-grid">
                  {character.abilities.map((ab,i) => (
                    <TraitCard key={i} trait={{ name: ab.name, description: ab.description, uses: ab.uses }} />
                  ))}
                </div>
              </SectionAccordion>
            )}

            {hasEquipment && (
              <SectionAccordion id="equipment" label="Equipo" count={allEquipment.length} openSections={openSections} toggleSec={toggleSec}>
                <div className="glossary-skills">
                  {allEquipment.map((eq,i) => (
                    <span key={i} className="glossary-skill-badge">{typeof eq === 'string' ? eq : eq.name}{eq.quantity > 1 ? ` ×${eq.quantity}` : ''}</span>
                  ))}
                </div>
                {(character.glossaryItems||[]).length > 0 && (
                  <div className="glossary-linked-items" style={{marginTop:6}}>
                    {character.glossaryItems.map(gId => {
                      const g = (glossaryEntries || []).find(x => x.id === gId)
                      if (!g) return null
                      return (
                        <div key={gId} className="glossary-linked-item glossary-linked-clickable" onClick={() => setLoreModal(g)}>
                          <span>{g.category === 'artifact' ? '💎' : '📜'}</span>
                          <span className="glossary-linked-name">{g.name}</span>
                          {g.rarity && <span className="glossary-linked-rarity">{g.rarity}</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </SectionAccordion>
            )}
            {!hasEquipment && (character.glossaryItems||[]).length > 0 && (
              <SectionAccordion id="equipment" label="Equipo" count={(character.glossaryItems||[]).length} openSections={openSections} toggleSec={toggleSec}>
                <div className="glossary-linked-items">
                  {character.glossaryItems.map(gId => {
                    const g = (glossaryEntries || []).find(x => x.id === gId)
                    if (!g) return null
                    return (
                      <div key={gId} className="glossary-linked-item glossary-linked-clickable" onClick={() => setLoreModal(g)}>
                        <span>{g.category === 'artifact' ? '💎' : '📜'}</span>
                        <span className="glossary-linked-name">{g.name}</span>
                        {g.rarity && <span className="glossary-linked-rarity">{g.rarity}</span>}
                      </div>
                    )
                  })}
                </div>
              </SectionAccordion>
            )}

            {hasConsumables && (
              <SectionAccordion id="consumables" label="Consumibles" count={character.consumables.length} openSections={openSections} toggleSec={toggleSec}>
                <div className="cc-consumables-list">
                  {character.consumables.map((c,i) => (
                    <div key={i} className="cc-consumable-item">
                      <span className="cc-consumable-name">{c.name}</span>
                      <span className="cc-consumable-qty">×{c.quantity}</span>
                      {c.notes && <span className="cc-consumable-notes">{c.notes}</span>}
                    </div>
                  ))}
                </div>
              </SectionAccordion>
            )}

          {character.tags?.length > 0 && (
            <div className="glossary-tags">
              {character.tags.map((t,i) => <span key={i} className="glossary-tag">{t}</span>)}
            </div>
          )}

          <div className="glossary-card-actions">
            <button className="dnd-btn-sm" onClick={onEdit}>✏ Editar</button>
            {isMaster && parties && parties.length > 0 && (
              <div className="char-party-assign">
                {parties.map(p => {
                  const isIn = (p.members || []).includes(character.id)
                  return <button key={p.id} className={`dnd-btn-sm ${isIn ? 'dnd-btn-in-party' : 'dnd-btn-party'}`}
                    onClick={() => !isIn && onAddToParty(p.id, character.id)}
                    style={isIn ? {cursor:'default', opacity:0.6} : {}}>
                    {isIn ? '✔' : '⚔'} {p.name.length > 14 ? p.name.slice(0,14) + '…' : p.name}
                  </button>
                })}
              </div>
            )}
            <button className="dnd-btn-sm dnd-btn-danger" onClick={onDelete}>✕ Borrar</button>
          </div>
        </div>
      )}

      {loreModal && (
        <div className="dnd-modal-overlay" onClick={() => setLoreModal(null)}>
          <div className="dnd-modal lore-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="lore-detail-header">
              <span className="lore-detail-icon">{loreModal.category === 'artifact' ? '💎' : '📜'}</span>
              <h3 className="lore-detail-title">{loreModal.name}</h3>
              {loreModal.rarity && <span className="glossary-linked-rarity">{loreModal.rarity}</span>}
            </div>
            <div className="lore-detail-body">
              {loreModal.description && <p className="lore-detail-text">{loreModal.description}</p>}
              {loreModal.properties && <p className="lore-detail-text">{loreModal.properties}</p>}
              {(loreModal.images||[]).length > 0 && (
                <div className="lore-detail-images">
                  {loreModal.images.map((url, i) => (
                    <img key={i} src={url} alt="" className="lore-detail-img" onClick={() => window.open(url, '_blank')} />
                  ))}
                </div>
              )}
              {loreModal.tags?.length > 0 && (
                <div className="glossary-tags" style={{marginTop:8}}>
                  {loreModal.tags.map((t,i) => <span key={i} className="glossary-tag">{t}</span>)}
                </div>
              )}
            </div>
            <button className="dnd-btn-cancel lore-detail-close" onClick={() => setLoreModal(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}


// ── Componente: Modal de creación/edición de personaje ─────
function CharacterModal({ mode, character: initialChar, onSave, onClose, template, glossarySpells, glossaryItems: availableGlossaryItems }) {
  const [ch, setCh] = useState(() => {
    if (mode === 'edit' && initialChar) return { ...initialChar, glossaryItems: initialChar.glossaryItems || [] }
    return { ...template(), glossaryItems: [] }
  })
  const [tagsInput, setTagsInput] = useState((initialChar?.tags || []).join(', '))
  const [showSpellPicker, setShowSpellPicker] = useState(false)
  const [showGlossaryPicker, setShowGlossaryPicker] = useState(false)

  function update(field, val) { setCh(e => ({ ...e, [field]: val })) }
  function updateStat(key, val) { setCh(e => ({ ...e, stats: { ...e.stats, [key]: val } })) }
  function updateAction(idx, field, val) {
    setCh(e => ({ ...e, actions: e.actions.map((a,i) => i===idx ? {...a,[field]:val} : a) }))
  }
  function addAction() { setCh(e => ({ ...e, actions: [...(e.actions||[]), {name:'',range:'Cuerpo a cuerpo',modifier:0,damage:'',secondaryDamage:'',note:'',actionType:'normal',isSpell:false,spellLevel:'truco',aoe:''}] })) }
  function removeAction(idx) { setCh(e => ({ ...e, actions: e.actions.filter((_,i)=>i!==idx) })) }
  function updateTrait(idx, field, val) {
    setCh(e => ({ ...e, traits: e.traits.map((t,i) => i===idx ? {...t,[field]:val} : t) }))
  }
  function addTrait() { setCh(e => ({ ...e, traits: [...(e.traits||[]), {name:'',description:''}] })) }
  function removeTrait(idx) { setCh(e => ({ ...e, traits: e.traits.filter((_,i)=>i!==idx) })) }
  function updateSkill(idx, field, val) {
    setCh(e => ({ ...e, skills: e.skills.map((s,i) => i===idx ? {...s,[field]:val} : s) }))
  }
  function addSkill() { setCh(e => ({ ...e, skills: [...(e.skills||[]), {name:'',bonus:0}] })) }
  function removeSkill(idx) { setCh(e => ({ ...e, skills: (e.skills||[]).filter((_,i)=>i!==idx) })) }
  function updateAbility(idx, field, val) {
    setCh(e => ({ ...e, abilities: (e.abilities||[]).map((a,i) => i===idx ? {...a,[field]:val} : a) }))
  }
  function addAbility() { setCh(e => ({ ...e, abilities: [...(e.abilities||[]), {name:'',description:'',uses:''}] })) }
  function removeAbility(idx) { setCh(e => ({ ...e, abilities: (e.abilities||[]).filter((_,i)=>i!==idx) })) }

  function handleSave() {
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    onSave({ ...ch, tags })
  }

  return (
    <div className="dnd-modal-overlay" onClick={onClose}>
      <div className="dnd-modal glossary-modal" onClick={e => e.stopPropagation()}>
        <h3>{mode === 'create' ? 'Nuevo personaje' : 'Editar personaje'}</h3>

        <div className="glossary-form-row">
          <label>Nombre</label>
          <input className="dnd-input" value={ch.name||''} onChange={e => update('name', e.target.value)} placeholder="Nombre..." autoFocus />
        </div>

        <div className="glossary-form-row">
          <label>Raza</label>
          <input className="dnd-input" value={ch.race||''} onChange={e => update('race', e.target.value)} placeholder="Humano, Elfo, Enano..." />
        </div>

        <div className="glossary-form-row">
          <label>Clase</label>
          <input className="dnd-input" value={ch.class||''} onChange={e => update('class', e.target.value)} placeholder="Guerrero, Mago, Pícaro..." />
        </div>

        <div className="glossary-form-row">
          <label>Nivel</label>
          <input className="dnd-input" type="number" min="1" max="20" value={ch.level||1} onChange={e => update('level', parseInt(e.target.value)||1)} />
        </div>

        <div className="glossary-form-row">
          <label>Descripción</label>
          <textarea className="dnd-input glossary-textarea" value={ch.description||''} onChange={e => update('description', e.target.value)} placeholder="Descripción del personaje..." rows={3} />
        </div>

        <div className="glossary-form-row">
          <label>Stats</label>
          <div className="glossary-stat-grid">
            {[['CA','ca','number'],['Velocidad','speed','text'],['Bonificador de competencia','proficiencyBonus','number']].map(([label,key,type]) => (
              <div key={key} className="glossary-stat-input">
                <span>{label}</span>
                <input className="dnd-input" type={type} value={ch.stats?.[key]??''} onChange={e => updateStat(key, type==='number'?parseInt(e.target.value)||0:e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        <div className="glossary-form-row">
          <label>Puntos de Golpe</label>
          <div className="glossary-hp-row">
            <div className="glossary-stat-input" style={{flex:1}}>
              <span>PG Máx.</span>
              <input className="dnd-input" type="number" min="1" value={ch.stats?.hp?.max ?? 10}
                onChange={e => updateStat('hp', { ...(ch.stats?.hp || {}), max: parseInt(e.target.value) || 1, current: Math.min(ch.stats?.hp?.current || 10, parseInt(e.target.value) || 1) })} />
            </div>
            <div className="glossary-stat-input" style={{flex:1}}>
              <span>PG Actual</span>
              <input className="dnd-input" type="number" min="0" value={ch.stats?.hp?.current ?? 10}
                onChange={e => updateStat('hp', { ...(ch.stats?.hp || {}), current: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
        </div>

        <div className="glossary-form-row">
          <label>Atributos</label>
          <div className="glossary-attr-grid">
            {[['FUE','str'],['DES','dex'],['CON','con'],['INT','int'],['SAB','wis'],['CAR','cha']].map(([label,key]) => (
              <div key={key} className="glossary-stat-input">
                <span>{label}</span>
                <input className="dnd-input" type="number" value={ch.stats?.[key]??10} onChange={e => updateStat(key, parseInt(e.target.value)||10)} />
              </div>
            ))}
          </div>
        </div>

        <div className="glossary-form-row">
          <label>Tiradas de salvación</label>
          <div className="glossary-components-row">
            {[['FUE','str'],['DES','dex'],['CON','con'],['INT','int'],['SAB','wis'],['CAR','cha']].map(([label,key]) => (
              <label key={key} className="glossary-comp-check">
                <input type="checkbox" checked={ch.savingThrows?.[key]||false}
                  onChange={e => setCh(prev => ({...prev, savingThrows: {...(prev.savingThrows||{}), [key]: e.target.checked}}))} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="glossary-form-row">
          <label className="glossary-spell-check">
            <input type="checkbox" checked={!!(ch.isSpellcaster)}
              onChange={e => setCh(prev => ({...prev, isSpellcaster: e.target.checked, spellSlots: e.target.checked ? (prev.spellSlots || {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0}) : {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0} }))} />
            🔮 Lanzador de conjuros
          </label>
        </div>
        {ch.isSpellcaster && (
          <div className="glossary-form-row">
            <label>Huecos de conjuro por nivel</label>
            <div className="glossary-spell-grid">
              {[1,2,3,4,5,6,7,8,9].map(lv => (
                <div key={lv} className="glossary-spell-input">
                  <span>Nv.{lv}</span>
                  <input className="dnd-input" type="number" min="0" value={(ch.spellSlots && typeof ch.spellSlots === 'object') ? (ch.spellSlots[lv] ?? 0) : 0}
                    onChange={e => {
                      const slots = typeof ch.spellSlots === 'object' ? {...ch.spellSlots} : {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0}
                      slots[lv] = parseInt(e.target.value) || 0
                      setCh(prev => ({...prev, spellSlots: slots}))
                    }} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="glossary-form-row">
          <label>Habilidades <button className="dnd-btn-sm" onClick={addSkill}>+</button></label>
          {(ch.skills||[]).map((sk,i) => (
            <div key={i} className="glossary-list-item">
              <select className="dnd-input" value={sk.name} onChange={e=>updateSkill(i,'name',e.target.value)} style={{flex:'0 0 140px'}}>
                <option value="">— Elegir —</option>
                {['Acrobacia','Arcanos','Atletismo','Engaño','Historia','Intimidación','Investigación',
                  'Juego de manos','Medicina','Naturaleza','Percepción','Perspicacia','Persuasión',
                  'Religión','Sigilo','Supervivencia','Trato con animales'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input className="dnd-input" type="number" placeholder="+X" value={sk.bonus} onChange={e=>updateSkill(i,'bonus',parseInt(e.target.value)||0)} style={{maxWidth:70}} />
              <button className="dnd-btn-sm dnd-btn-danger" onClick={()=>removeSkill(i)}>✕</button>
            </div>
          ))}
        </div>

        <div className="glossary-form-row">
          <label>Rasgos <button className="dnd-btn-sm" onClick={addTrait}>+</button></label>
          {(ch.traits||[]).map((t,i) => (
            <div key={i} className="glossary-list-item">
              <input className="dnd-input" placeholder="Nombre" value={t.name} onChange={e=>updateTrait(i,'name',e.target.value)} />
              <input className="dnd-input" placeholder="Descripción" value={t.description} onChange={e=>updateTrait(i,'description',e.target.value)} />
              <button className="dnd-btn-sm dnd-btn-danger" onClick={()=>removeTrait(i)}>✕</button>
            </div>
          ))}
        </div>

        <div className="glossary-form-row">
          <label>Acciones <button className="dnd-btn-sm" onClick={addAction}>+</button> <button className="dnd-btn-sm spell-picker-btn" onClick={() => setShowSpellPicker(!showSpellPicker)}>🔮 Hechizo</button></label>
          {showSpellPicker && (
            <SpellPicker spells={glossarySpells || []} onClose={() => setShowSpellPicker(false)}
              onSelect={spell => { setCh(e => ({ ...e, actions: [...(e.actions||[]), spellToAction(spell)] })); setShowSpellPicker(false) }} />
          )}
          {(ch.actions||[]).map((a,i) => (
            <div key={i} className={`glossary-action-form ${a.glossarySpellId ? 'glossary-action-from-spell' : ''}`}>
              {a.glossarySpellId && <div className="glossary-action-spell-badge">🔮 Hechizo del glosario</div>}
              <div className="glossary-action-form-row">
                <input className="dnd-input" placeholder="Nombre (ej: Espada larga)" value={a.name} onChange={e=>updateAction(i,'name',e.target.value)} style={{flex:1}} />
                <select className="dnd-input" value={a.actionType||'normal'} onChange={e=>updateAction(i,'actionType',e.target.value)} style={{flex:'0 0 110px'}}>
                  <option value="normal">Normal</option>
                  <option value="bonus">Adicional</option>
                  <option value="reaction">Reacción</option>
                  <option value="ritual">Ritual</option>
                </select>
                <button className="dnd-btn-sm dnd-btn-danger" onClick={()=>removeAction(i)}>✕</button>
              </div>
              <div className="glossary-action-form-row">
                <select className="dnd-input" value={a.range||'Cuerpo a cuerpo'} onChange={e=>updateAction(i,'range',e.target.value)} style={{flex:'0 0 140px'}}>
                  <option value="Cuerpo a cuerpo">Cuerpo a cuerpo</option>
                  <option value="Toque">Toque</option>
                  <option value="Distancia">Distancia</option>
                </select>
                <label className="glossary-spell-check">
                  <input type="checkbox" checked={a.isSpell||false} onChange={e=>updateAction(i,'isSpell',e.target.checked)} /> 🔮 Hechizo
                </label>
                {a.isSpell && (
                  <select className="dnd-input" value={a.spellLevel||'truco'} onChange={e=>updateAction(i,'spellLevel',e.target.value)} style={{flex:'0 0 85px'}}>
                    <option value="truco">Truco</option>
                    {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>Nv. {n}</option>)}
                  </select>
                )}
                <input className="dnd-input" placeholder="Área de efecto" value={a.aoe||''} onChange={e=>updateAction(i,'aoe',e.target.value)} style={{flex:1}} />
              </div>
              <div className="glossary-action-form-row">
                <div className="glossary-stat-input" style={{flex:'0 0 70px'}}>
                  <span>Mod.</span>
                  <input className="dnd-input" type="number" value={a.modifier??0} onChange={e=>updateAction(i,'modifier',parseInt(e.target.value)||0)} />
                </div>
                <div className="glossary-stat-input" style={{flex:1}}>
                  <span>Daño</span>
                  <input className="dnd-input" placeholder="1d8+3 cortante" value={a.damage||''} onChange={e=>updateAction(i,'damage',e.target.value)} />
                </div>
                <div className="glossary-stat-input" style={{flex:1}}>
                  <span>Daño sec.</span>
                  <input className="dnd-input" placeholder="1d6 fuego" value={a.secondaryDamage||''} onChange={e=>updateAction(i,'secondaryDamage',e.target.value)} />
                </div>
              </div>
              <input className="dnd-input" placeholder="Nota adicional" value={a.note||''} onChange={e=>updateAction(i,'note',e.target.value)} style={{marginTop:4}} />
            </div>
          ))}
        </div>

        <div className="glossary-form-row">
          <label>Habilidades especiales <button className="dnd-btn-sm" onClick={addAbility}>+</button></label>
          {(ch.abilities||[]).map((ab,i) => (
            <div key={i} className="glossary-list-item" style={{flexWrap:'wrap'}}>
              <input className="dnd-input" placeholder="Nombre (ej: Segundo aliento)" value={ab.name} onChange={e=>updateAbility(i,'name',e.target.value)} style={{flex:1}} />
              <select className="dnd-input" value={ab.uses||''} onChange={e=>updateAbility(i,'uses',e.target.value)} style={{flex:'0 0 130px'}}>
                <option value="">Sin límite</option>
                <option value="1/día">1/día</option>
                <option value="2/día">2/día</option>
                <option value="3/día">3/día</option>
                <option value="1/descanso corto">1/descanso corto</option>
                <option value="2/descanso corto">2/descanso corto</option>
                <option value="1/descanso largo">1/descanso largo</option>
                <option value="A voluntad">A voluntad</option>
              </select>
              <button className="dnd-btn-sm dnd-btn-danger" onClick={()=>removeAbility(i)}>✕</button>
              <input className="dnd-input" placeholder="Descripción" value={ab.description} onChange={e=>updateAbility(i,'description',e.target.value)} style={{width:'100%',marginTop:3}} />
            </div>
          ))}
        </div>

        <div className="glossary-form-row">
          <label>Tags (separados por coma)</label>
          <input className="dnd-input" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="guerrero, tanque, sanador..." />
        </div>

        <div className="glossary-form-row">
          <label>Equipo (Lore / Artefactos) <button className="dnd-btn-sm" onClick={() => setShowGlossaryPicker(!showGlossaryPicker)}>+ Vincular</button></label>
          {showGlossaryPicker && (() => {
            const linked = new Set(ch.glossaryItems || [])
            const items = (availableGlossaryItems || []).filter(g => !linked.has(g.id))
            return (
              <div className="glossary-picker-list">
                {items.length === 0 && <div className="dnd-empty-sm">No hay items disponibles</div>}
                {items.map(g => (
                  <button key={g.id} className="glossary-picker-item" onClick={() => {
                    setCh(e => ({ ...e, glossaryItems: [...(e.glossaryItems||[]), g.id] }))
                    setShowGlossaryPicker(false)
                  }}>
                    <span>{g.category === 'artifact' ? '💎' : '📜'}</span>
                    <span>{g.name}</span>
                    {g.rarity && <span className="glossary-picker-rarity">{g.rarity}</span>}
                  </button>
                ))}
              </div>
            )
          })()}
          {(ch.glossaryItems||[]).length > 0 ? (
            <div className="glossary-linked-items">
              {ch.glossaryItems.map(gId => {
                const g = (availableGlossaryItems || []).find(x => x.id === gId)
                if (!g) return null
                return (
                  <div key={gId} className="glossary-linked-item">
                    <span>{g.category === 'artifact' ? '💎' : '📜'}</span>
                    <span className="glossary-linked-name">{g.name}</span>
                    {g.rarity && <span className="glossary-linked-rarity">{g.rarity}</span>}
                    <button className="dnd-btn-sm dnd-btn-danger" onClick={() => setCh(e => ({ ...e, glossaryItems: (e.glossaryItems||[]).filter(id => id !== gId) }))}>✕</button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="dnd-empty-sm">Sin equipo vinculado del glosario</div>
          )}
        </div>

        <div className="dnd-modal-btns">
          <button className="dnd-btn-primary" onClick={handleSave}>Guardar</button>
          <button className="dnd-btn-cancel" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}


// ── Componente: Party Tracker con drag & drop ──────────────
function PartyTracker({ party, onReorder, onHpChange, onSlotsChange, onRemove, onEnemyHpChange, onRemoveEnemy, onEnemyClick, onConditionsChange }) {
  const [dragId, setDragId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [expandedCard, setExpandedCard] = useState(null)

  const chars = party.memberChars || []
  const enemies = party.enemies || []
  const allItems = []
  chars.forEach(c => allItems.push({ type: 'pc', key: c.id, data: c }))
  enemies.forEach(e => allItems.push({ type: 'enemy', key: `e${e.id}`, data: e }))

  const initOrder = party.initiative || []
  const allKeys = allItems.map(i => i.key)
  const orderedKeys = initOrder.filter(k => allKeys.includes(k) || allKeys.includes(Number(k)))
  const extraKeys = allKeys.filter(k => !orderedKeys.includes(k))
  const sortedKeys = [...orderedKeys, ...extraKeys]
  const sortedItems = sortedKeys.map(k => allItems.find(i => i.key === k || String(i.key) === String(k))).filter(Boolean)

  function handleDragStart(e, key) { setDragId(key); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(key)) }
  function handleDragOver(e, key) { e.preventDefault(); if (key !== dragOverId) setDragOverId(key) }
  function handleDragEnd() { setDragId(null); setDragOverId(null) }
  function handleDrop(e, targetKey) {
    e.preventDefault()
    if (!dragId || dragId === targetKey) { handleDragEnd(); return }
    const newOrder = sortedKeys.map(k => typeof k === 'number' ? k : String(k))
    const dragStr = typeof dragId === 'number' ? dragId : String(dragId)
    const targetStr = typeof targetKey === 'number' ? targetKey : String(targetKey)
    const fromIdx = newOrder.indexOf(dragStr)
    const toIdx = newOrder.indexOf(targetStr)
    if (fromIdx === -1 || toIdx === -1) { handleDragEnd(); return }
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, dragStr)
    onReorder(newOrder)
    handleDragEnd()
  }

  const mod = v => { const m = Math.floor(((v||10)-10)/2); return m >= 0 ? `+${m}` : `${m}` }

  // Obtener initiative de un item
  function getInitiative(item) {
    if (item.type === 'enemy') return item.data.initiative ?? '?'
    // PCs: buscar en party.initiative no tiene valor numérico, usar la posición
    return '—'
  }

  // Obtener condiciones de un key
  function getConditions(key) { return (party.conditions || {})[key] || [] }

  if (sortedItems.length === 0) return <div className="dnd-empty-sm" style={{padding:12}}>Sin miembros — usa «+ Añadir» para incluir personajes o enemigos</div>

  return (
    <div className="party-tracker">
      <div className="party-grid">
        {sortedItems.map((item, idx) => {
          const isDragging = dragId === item.key
          const isDragOver = dragOverId === item.key
          const isEnemy = item.type === 'enemy'
          const d = item.data
          const portrait = isEnemy ? (d.portrait || null) : d.portrait
          const name = isEnemy ? (d.label || d.glossaryData?.name || 'Enemigo') : d.name
          const subtitle = isEnemy ? (d.glossaryData?.stats?.challenge ? `CR ${d.glossaryData.stats.challenge}` : '💀') : `${d.class || ''} Nv.${d.level || 1}`
          const hp = isEnemy ? (d.hpCurrent ?? 0) : (d.stats?.hp?.current ?? 0)
          const hpMax = isEnemy ? (d.hpMax ?? 1) : (d.stats?.hp?.max ?? 1)
          const hpPct = Math.round((hp / hpMax) * 100)
          const hpColor = hpPct > 50 ? 'var(--party-hp-good)' : hpPct > 25 ? 'var(--party-hp-mid)' : 'var(--party-hp-low)'
          const init = isEnemy ? (d.initiative ?? '?') : '—'
          const pp = isEnemy ? (d.glossaryData?.stats?.passivePerception ?? '—') : (d.stats?.passivePerception ?? '—')
          const conditions = getConditions(item.key)

          return (
            <div key={item.key}
              className={`party-mini-card ${isEnemy ? 'party-mini-enemy' : ''} ${isDragging ? 'party-card-dragging' : ''} ${isDragOver ? 'party-card-dragover' : ''}`}
              draggable onDragStart={e => handleDragStart(e, item.key)} onDragOver={e => handleDragOver(e, item.key)}
              onDragEnd={handleDragEnd} onDrop={e => handleDrop(e, item.key)}
              onClick={() => setExpandedCard(expandedCard === item.key ? null : item.key)}>
              <div className="party-mini-order">{idx + 1}</div>
              {portrait ? <img src={portrait} alt="" className="party-mini-portrait" /> : <div className="party-mini-placeholder">{isEnemy ? '💀' : '🛡️'}</div>}
              <div className="party-mini-info">
                <span className="party-mini-name">{name}</span>
                <span className="party-mini-sub">{subtitle}</span>
              </div>
              <div className="party-mini-stats-row">
                {init !== '—' && <span className="party-mini-stat" title="Iniciativa">⚡{init}</span>}
                {pp !== '—' && <span className="party-mini-stat" title="Percepción pasiva">👁{pp}</span>}
              </div>
              <div className="party-mini-hp-bar">
                <div className="party-mini-hp-fill" style={{ width: `${hpPct}%`, background: hpColor }} />
                <span className="party-mini-hp-text">{hp}/{hpMax}</span>
              </div>
              {conditions.length > 0 && (
                <div className="party-mini-conditions">
                  {conditions.map((c,i) => {
                    const def = CONDITION_LIST.find(x => x.id === (c.id || c))
                    if (!def) return null
                    const label = def.levels ? `${def.label}${c.level || 1}` : def.label
                    return <span key={i} className="condition-pill">{label}</span>
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {expandedCard && (() => {
        const item = sortedItems.find(i => i.key === expandedCard)
        if (!item) return null
        const conditions = getConditions(item.key)
        if (item.type === 'pc') return (
          <div className="action-card-overlay" onClick={() => setExpandedCard(null)}>
            <div className="party-detail-modal" onClick={e => e.stopPropagation()}>
              <PCDetailModal ch={item.data} party={party} onHpChange={onHpChange} onSlotsChange={onSlotsChange} onRemove={onRemove} mod={mod}
                conditions={conditions} onConditionsChange={conds => onConditionsChange(item.key, conds)} />
            </div>
          </div>
        )
        return (
          <div className="action-card-overlay" onClick={() => setExpandedCard(null)}>
            <div className="party-detail-modal" onClick={e => e.stopPropagation()}>
              <EnemyDetailModal enemy={item.data} onEnemyHpChange={onEnemyHpChange} onRemoveEnemy={onRemoveEnemy} onEnemyClick={onEnemyClick} mod={mod} onClose={() => setExpandedCard(null)}
                conditions={conditions} onConditionsChange={conds => onConditionsChange(item.key, conds)} />
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── Sub: Editor de estados ─────────────────────────────
function ConditionsEditor({ conditions, onChange }) {
  function toggleCondition(id) {
    const def = CONDITION_LIST.find(c => c.id === id)
    const existing = conditions.find(c => (c.id || c) === id)
    if (existing) {
      onChange(conditions.filter(c => (c.id || c) !== id))
    } else {
      onChange([...conditions, def.levels ? { id, level: 1 } : id])
    }
  }
  function setLevel(id, level) {
    onChange(conditions.map(c => (c.id || c) === id ? { id, level } : c))
  }
  return (
    <div className="conditions-editor">
      <div className="party-expanded-label">Estados</div>
      <div className="conditions-grid">
        {CONDITION_LIST.map(def => {
          const active = conditions.find(c => (c.id || c) === def.id)
          return (
            <div key={def.id} className={`condition-toggle ${active ? 'active' : ''}`}>
              <button className="condition-toggle-btn" onClick={() => toggleCondition(def.id)}>
                <span className="condition-toggle-label">{def.label}</span>
                <span className="condition-toggle-name">{def.id}</span>
              </button>
              {active && def.levels && (
                <select className="condition-level-select" value={active.level || 1} onClick={e => e.stopPropagation()}
                  onChange={e => setLevel(def.id, parseInt(e.target.value))}>
                  {Array.from({length: def.levels}, (_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                </select>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Sub: Modal detalle PC ──────────────────────────────
function PCDetailModal({ ch, party, onHpChange, onSlotsChange, onRemove, mod, conditions, onConditionsChange }) {
  const s = ch.stats || {}
  const hp = s.hp?.current ?? 0
  const hpMax = s.hp?.max ?? 1
  const hpPct = Math.round((hp / hpMax) * 100)
  const hpColor = hpPct > 50 ? 'var(--party-hp-good)' : hpPct > 25 ? 'var(--party-hp-mid)' : 'var(--party-hp-low)'
  const usedSlots = party.usedSlots?.[ch.id] || {}
  const hasSpells = ch.isSpellcaster && ch.spellSlots && Object.values(ch.spellSlots).some(v => v > 0)
  const [openSec, setOpenSec] = useState({})
  const toggleSec = k => setOpenSec(p => ({ ...p, [k]: !p[k] }))
  const Acc = ({ id, label, children, count }) => (
    <div className="cc-accordion">
      <div className="cc-accordion-header" onClick={() => toggleSec(id)}>
        <span className="cc-accordion-chevron">{openSec[id] ? '▾' : '▸'}</span>
        <span className="cc-accordion-label">{label}</span>
        {count != null && <span className="cc-accordion-count">{count}</span>}
      </div>
      {openSec[id] && <div className="cc-accordion-body">{children}</div>}
    </div>
  )
  function toggleSlot(level) {
    const used = { ...(party.usedSlots?.[ch.id] || {}) }
    const maxSlots = ch.spellSlots?.[level] || 0
    used[level] = (used[level] || 0) >= maxSlots ? 0 : (used[level] || 0) + 1
    onSlotsChange(ch.id, used)
  }
  return (
    <>
      {/* Imagen arriba, ancho completo */}
      {ch.portrait ? <img src={ch.portrait} alt="" className="party-detail-portrait-wide" /> : <div className="party-detail-portrait-ph" style={{width:'100%',height:120,fontSize:'2.5rem'}}>🛡️</div>}

      {/* Nombre + clase */}
      <div className="party-detail-nameblock">
        <div className="party-detail-name">{ch.name}</div>
        <div className="party-detail-meta">{ch.race} · {ch.class}{ch.subclass ? ` (${ch.subclass})` : ''} Nv.{ch.level || 1}</div>
      </div>

      {/* Estados */}
      {conditions.length > 0 && <div className="party-mini-conditions" style={{justifyContent:'flex-start'}}>{conditions.map((c,i) => { const def = CONDITION_LIST.find(x => x.id === (c.id||c)); return def ? <span key={i} className="condition-pill">{def.levels ? `${def.label}${c.level||1}` : def.label}</span> : null })}</div>}

      {/* Vida */}
      <div className="party-detail-hp">
        <div className="party-hp-bar" style={{height:22}}><div className="party-hp-fill" style={{ width: `${hpPct}%`, background: hpColor }} /><span className="party-hp-text">{hp} / {hpMax}</span></div>
        <div className="party-hp-controls">
          <button className="party-hp-btn party-hp-minus" onClick={() => onHpChange(ch.id, Math.max(0, hp - 1))}>−</button>
          <input className="party-hp-input" type="number" value={hp} onChange={e => onHpChange(ch.id, Math.max(0, Math.min(hpMax, parseInt(e.target.value)||0)))} />
          <button className="party-hp-btn party-hp-plus" onClick={() => onHpChange(ch.id, Math.min(hpMax, hp + 1))}>+</button>
        </div>
      </div>

      {/* CA, Velocidad, PP */}
      <div className="party-card-stats">
        <span className="party-stat">🛡 CA {s.ca}</span>
        <span className="party-stat">👟 {s.speed}</span>
        {s.passivePerception != null && <span className="party-stat">👁 PP {s.passivePerception}</span>}
      </div>
      <div className="party-card-attrs">
        {[['F',s.str],['D',s.dex],['C',s.con],['I',s.int],['S',s.wis],['Ca',s.cha]].map(([l,v]) => (
          <div key={l} className="party-attr"><span className="party-attr-label">{l}</span><span className="party-attr-mod">{mod(v)}</span></div>
        ))}
      </div>
      {hasSpells && (
        <Acc id="slots" label="Huecos de conjuro">
          <div className="party-slots-grid">
            {[1,2,3,4,5,6,7,8,9].map(lv => {
              const total = ch.spellSlots[lv] || 0; if (!total) return null
              return (<button key={lv} className="party-slot-btn" onClick={e => { e.stopPropagation(); toggleSlot(lv) }} title={`Nv.${lv}: ${usedSlots[lv]||0}/${total}`}>
                <span className="party-slot-level">{lv}</span>
                <span className="party-slot-dots">{Array.from({length: total}, (_, i) => <span key={i} className={`party-slot-dot ${i < (usedSlots[lv]||0) ? 'used' : ''}`} />)}</span>
              </button>)
            })}
          </div>
        </Acc>
      )}
      {(ch.skills||[]).length > 0 && <Acc id="skills" label="Habilidades" count={ch.skills.length}><div className="party-skills-list">{ch.skills.map((sk,i) => <span key={i} className="party-skill-badge">{sk.name} {sk.bonus >= 0 ? '+' : ''}{sk.bonus}</span>)}</div></Acc>}
      {ch.savingThrows && Object.values(ch.savingThrows).some(v => v) && (
        <Acc id="saves" label="Salvaciones"><div className="party-skills-list">
          {[['FUE','str'],['DES','dex'],['CON','con'],['INT','int'],['SAB','wis'],['CAR','cha']].filter(([,k]) => ch.savingThrows[k]).map(([l,k]) => {
            const bonus = Math.floor(((s[k]||10)-10)/2) + (s.proficiencyBonus || 2)
            return <span key={k} className="party-skill-badge">{l} {bonus >= 0 ? '+' : ''}{bonus}</span>
          })}
        </div></Acc>
      )}
      {(ch.abilities||[]).length > 0 && <Acc id="abilities" label="Habilidades especiales" count={ch.abilities.length}>{ch.abilities.map((ab,i) => <div key={i} className="party-ability"><strong>{ab.name}</strong>{ab.uses && <span className="party-ability-uses"> ({ab.uses})</span>}{ab.description && <span> — {ab.description}</span>}</div>)}</Acc>}
      {(ch.actions||[]).length > 0 && <Acc id="actions" label="Acciones" count={ch.actions.length}>{ch.actions.map((a,i) => <div key={i} className="party-action"><span className="party-action-name">{a.name}</span>{a.isSpell && <span className="party-action-spell">🔮{a.spellLevel === 'truco' ? 'T' : a.spellLevel}</span>}{a.damage && <span className="party-action-dmg">⚔ {a.damage}</span>}{a.modifier != null && a.modifier !== 0 && <span className="party-action-mod">{a.modifier >= 0 ? '+' : ''}{a.modifier}</span>}</div>)}</Acc>}
      <Acc id="conditions" label="Estados" count={conditions.length || undefined}>
        <ConditionsEditor conditions={conditions} onChange={onConditionsChange} />
      </Acc>
      <button className="dnd-btn-sm dnd-btn-danger" style={{marginTop:10}} onClick={() => onRemove(ch.id)}>✕ Quitar del grupo</button>
    </>
  )
}

// ── Sub: Modal detalle Enemigo ─────────────────────────
function EnemyDetailModal({ enemy, onEnemyHpChange, onRemoveEnemy, onEnemyClick, mod, onClose, conditions, onConditionsChange }) {
  const g = enemy.glossaryData || {}
  const s = g.stats || {}
  const hp = enemy.hpCurrent ?? 0
  const hpMax = enemy.hpMax ?? 1
  const hpPct = Math.round((hp / hpMax) * 100)
  const hpColor = hpPct > 50 ? 'var(--party-hp-good)' : hpPct > 25 ? 'var(--party-hp-mid)' : 'var(--party-hp-low)'
  const displayName = enemy.label || g.name || 'Enemigo'
  const [openSec, setOpenSec] = useState({})
  const toggleSec = k => setOpenSec(p => ({ ...p, [k]: !p[k] }))
  const Acc = ({ id, label, children, count }) => (
    <div className="cc-accordion">
      <div className="cc-accordion-header" onClick={() => toggleSec(id)}>
        <span className="cc-accordion-chevron">{openSec[id] ? '▾' : '▸'}</span>
        <span className="cc-accordion-label">{label}</span>
        {count != null && <span className="cc-accordion-count">{count}</span>}
      </div>
      {openSec[id] && <div className="cc-accordion-body">{children}</div>}
    </div>
  )
  return (
    <>
      <div className="party-detail-header">
        {enemy.portrait ? <img src={enemy.portrait} alt="" className="party-detail-portrait-sm" /> : <div className="party-detail-portrait-ph party-enemy-icon" style={{width:56,height:56}}>💀</div>}
        <div>
          <div className="party-detail-name">{displayName}</div>
          <div className="party-detail-meta">{s.challenge ? `CR ${s.challenge}` : ''}{s.speed ? ` · Vel. ${s.speed}` : ''}</div>
          <div className="party-detail-extra">
            <span className="party-stat">⚡ Init {enemy.initiative ?? '?'}</span>
            {s.passivePerception != null && <span className="party-stat">👁 PP {s.passivePerception}</span>}
          </div>
        </div>
      </div>
      {conditions.length > 0 && <div className="party-mini-conditions" style={{justifyContent:'flex-start'}}>{conditions.map((c,i) => { const def = CONDITION_LIST.find(x => x.id === (c.id||c)); return def ? <span key={i} className="condition-pill">{def.levels ? `${def.label}${c.level||1}` : def.label}</span> : null })}</div>}
      <div className="party-detail-hp">
        <div className="party-hp-bar" style={{height:22}}><div className="party-hp-fill" style={{ width: `${hpPct}%`, background: hpColor }} /><span className="party-hp-text">{hp} / {hpMax}</span></div>
        <div className="party-hp-controls">
          <button className="party-hp-btn party-hp-minus" onClick={() => onEnemyHpChange(enemy.id, Math.max(0, hp - 1))}>−</button>
          <input className="party-hp-input" type="number" value={hp} onChange={e => onEnemyHpChange(enemy.id, Math.max(0, Math.min(hpMax, parseInt(e.target.value)||0)))} />
          <button className="party-hp-btn party-hp-plus" onClick={() => onEnemyHpChange(enemy.id, Math.min(hpMax, hp + 1))}>+</button>
        </div>
      </div>
      <div className="party-card-stats"><span className="party-stat">🛡 {s.ca ?? '?'}</span>{s.speed && <span className="party-stat">👟 {s.speed}</span>}</div>
      <div className="party-card-attrs">
        {[['F',s.str],['D',s.dex],['C',s.con],['I',s.int],['S',s.wis],['Ca',s.cha]].map(([l,v]) => (
          <div key={l} className="party-attr"><span className="party-attr-label">{l}</span><span className="party-attr-mod">{mod(v)}</span></div>
        ))}
      </div>
      {g.description && <p className="party-ability" style={{marginBottom:6}}>{g.description}</p>}
      {(g.traits||[]).length > 0 && <Acc id="traits" label="Rasgos" count={g.traits.length}>{g.traits.map((t,i) => <div key={i} className="party-ability"><strong>{t.name}.</strong> {t.description}</div>)}</Acc>}
      {(g.skills||[]).length > 0 && <Acc id="skills" label="Habilidades" count={g.skills.length}><div className="party-skills-list">{g.skills.map((sk,i) => <span key={i} className="party-skill-badge">{sk.name} {sk.bonus >= 0 ? '+' : ''}{sk.bonus}</span>)}</div></Acc>}
      {(g.abilities||[]).length > 0 && <Acc id="abilities" label="Habilidades especiales" count={g.abilities.length}>{g.abilities.map((ab,i) => <div key={i} className="party-ability"><strong>{ab.name}</strong>{ab.uses && <span className="party-ability-uses"> ({ab.uses})</span>}{ab.description && <span> — {ab.description}</span>}</div>)}</Acc>}
      {(g.actions||[]).length > 0 && <Acc id="actions" label="Acciones" count={g.actions.length}>{g.actions.map((a,i) => <div key={i} className="party-action"><span className="party-action-name">{a.name}</span>{a.isSpell && <span className="party-action-spell">🔮{a.spellLevel === 'truco' ? 'T' : a.spellLevel}</span>}{a.damage && <span className="party-action-dmg">⚔ {a.damage}</span>}{a.modifier != null && a.modifier !== 0 && <span className="party-action-mod">{a.modifier >= 0 ? '+' : ''}{a.modifier}</span>}</div>)}</Acc>}
      <Acc id="conditions" label="Estados" count={conditions.length || undefined}>
        <ConditionsEditor conditions={conditions} onChange={onConditionsChange} />
      </Acc>
      <div className="party-enemy-actions">
        {enemy.glossaryId && <button className="dnd-btn-sm" onClick={() => { onEnemyClick(enemy.glossaryId); onClose() }}>📖 Ver en glosario</button>}
        <button className="dnd-btn-sm dnd-btn-danger" onClick={() => onRemoveEnemy(enemy.id)}>✕ Eliminar</button>
      </div>
    </>
  )
}

// ── Componente: Modal para añadir PCs o Enemigos al grupo ──
function PartyAddModal({ characters, partyMembers, enemies, onAddCharacter, onAddEnemy, onDone, onClose }) {
  const [tab, setTab] = useState('pc') // 'pc' | 'enemy'
  const [search, setSearch] = useState('')
  const [labelValue, setLabelValue] = useState('')
  const [selectedEnemy, setSelectedEnemy] = useState(null)
  const [maxHpCheck, setMaxHpCheck] = useState(false)
  const [surprisedCheck, setSurprisedCheck] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)

  const availablePCs = characters.filter(c => !partyMembers.includes(c.id))
  const filteredEnemies = enemies.filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    return e.name?.toLowerCase().includes(q) || e.tags?.some(t => t.toLowerCase().includes(q))
  })

  async function handleAddEnemy() {
    if (!selectedEnemy || adding) return
    setAdding(true)
    const hp = selectedEnemy.stats?.hp || {}
    const calcMax = maxHpCheck && hp.dice && hp.sides ? (hp.dice * hp.sides + (hp.modifier || 0)) : undefined
    const baseName = labelValue.trim() || selectedEnemy.name || 'Enemigo'
    const count = Math.max(1, Math.min(20, quantity))
    for (let i = 0; i < count; i++) {
      const label = count > 1 ? `${baseName} ${i + 1}` : baseName
      await onAddEnemy(selectedEnemy.id, label, calcMax, surprisedCheck)
    }
    setAdding(false)
    onDone()
  }

  return (
    <div className="dnd-modal-overlay" onClick={onClose}>
      <div className="dnd-modal glossary-modal" onClick={e => e.stopPropagation()}>
        <h3>Añadir al combate</h3>
        <div className="party-add-tabs">
          <button className={`dnd-auth-tab ${tab === 'pc' ? 'active' : ''}`} onClick={() => setTab('pc')}>🛡️ Personajes</button>
          <button className={`dnd-auth-tab ${tab === 'enemy' ? 'active' : ''}`} onClick={() => setTab('enemy')}>💀 Enemigos</button>
        </div>

        {tab === 'pc' && (
          <div className="party-add-list">
            {availablePCs.length === 0 && <div className="dnd-empty-sm">Todos los personajes ya están en el grupo</div>}
            {availablePCs.map(ch => (
              <button key={ch.id} className="party-add-item" onClick={() => onAddCharacter(ch.id)}>
                {ch.portrait && <img src={ch.portrait} alt="" className="party-add-portrait" />}
                <span className="party-add-name">{ch.name}</span>
                <span className="party-add-info">{ch.race} · {ch.class} Nv.{ch.level || 1}</span>
              </button>
            ))}
          </div>
        )}

        {tab === 'enemy' && (
          <div className="party-add-enemy-section">
            <input className="dnd-glossary-search" placeholder="Buscar enemigo..." value={search} onChange={e => setSearch(e.target.value)} autoFocus style={{width:'100%', marginBottom:8}} />
            {!selectedEnemy ? (
              <div className="party-add-list">
                {filteredEnemies.length === 0 && <div className="dnd-empty-sm">Sin enemigos en el glosario</div>}
                {filteredEnemies.map(e => (
                  <button key={e.id} className="party-add-item" onClick={() => { setSelectedEnemy(e); setLabelValue(e.name || '') }}>
                    {(e.portraits||[]).length > 0 ? <img src={e.portraits[0]} alt="" className="party-add-portrait" /> : <span className="party-add-enemy-icon">💀</span>}
                    <span className="party-add-name">{e.name}</span>
                    <span className="party-add-info">
                      CR {e.stats?.challenge || '?'} · CA {e.stats?.ca ?? '?'}
                      {e.stats?.hp ? ` · ${e.stats.hp.dice}d${e.stats.hp.sides}${e.stats.hp.modifier ? (e.stats.hp.modifier > 0 ? '+' : '') + e.stats.hp.modifier : ''}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="party-add-enemy-config">
                <div className="party-add-enemy-selected">
                  <span className="party-add-enemy-icon">💀</span>
                  <span className="party-add-name">{selectedEnemy.name}</span>
                  <button className="dnd-btn-sm" onClick={() => setSelectedEnemy(null)}>✕ Cambiar</button>
                </div>
                <div className="glossary-form-row">
                  <label>Etiqueta (nombre en combate)</label>
                  <input className="dnd-input" value={labelValue} onChange={e => setLabelValue(e.target.value)} placeholder={selectedEnemy.name} />
                </div>
                <div className="glossary-form-row">
                  <label>Cantidad</label>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <button className="dnd-btn-sm" onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                    <input className="dnd-input" type="number" min="1" max="20" value={quantity}
                      onChange={e => setQuantity(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                      style={{width:50,textAlign:'center'}} />
                    <button className="dnd-btn-sm" onClick={() => setQuantity(q => Math.min(20, q + 1))}>+</button>
                    {quantity > 1 && <span style={{fontSize:'0.75rem',color:'#a58b55'}}>Se nombrarán {labelValue.trim() || selectedEnemy.name} 1, 2, 3…</span>}
                  </div>
                </div>
                <label className="glossary-add-party-check" style={{marginTop:8}}>
                  <input type="checkbox" checked={maxHpCheck} onChange={e => setMaxHpCheck(e.target.checked)} />
                  <span>PG máximos {selectedEnemy.stats?.hp ? `(${selectedEnemy.stats.hp.dice * selectedEnemy.stats.hp.sides + (selectedEnemy.stats.hp.modifier || 0)} PG)` : ''}</span>
                </label>
                <label className="glossary-add-party-check" style={{marginTop:4}}>
                  <input type="checkbox" checked={surprisedCheck} onChange={e => setSurprisedCheck(e.target.checked)} />
                  <span>Sorprendido</span>
                </label>
                <button className="dnd-btn-primary" style={{width:'100%', marginTop:8}} onClick={handleAddEnemy} disabled={adding}>
                  {adding ? '⏳ Añadiendo...' : `💀 Añadir ${quantity > 1 ? quantity + ' enemigos' : 'al combate'}`}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="dnd-modal-btns" style={{marginTop:10}}>
          <button className="dnd-btn-cancel" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
