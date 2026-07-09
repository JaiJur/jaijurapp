import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AppHeader from '../../components/AppHeader'
import CharacterWizard from './CharacterWizard'
import CharacterWizardV2 from './CharacterWizardV2'
import { CONDITION_LIST, SOUND_CATEGORIES, SOUND_ICONS, ConditionPills, ConditionManager, spellToAction, TraitCard, SectionAccordion, ActionCard, ActionsPanel } from './components/shared'
import SoundModal from './components/SoundModal'
import DnDAuthGate from './components/DnDAuthGate'
import SpellPicker from './components/SpellPicker'
import { ImageManager, ImageAssignModal } from './components/ImageManager'
import GlossaryCard from './components/GlossaryCard'
import GlossaryModal from './components/GlossaryModal'
import CharacterCard from './components/CharacterCard'
import CharacterModal from './components/CharacterModal'
import PartyTracker from './components/PartyTracker'
import PartyAddModal from './components/PartyAddModal'
import PlayerView from './components/PlayerView'
import { useTokenSocket } from '../../hooks/useTokenSocket'
import TokenManager from './components/TokenManager'
import useIsMobile from './components/useIsMobile'
import './DnD.css'

export default function DnD() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isMaster = user?.role === 'master' || user?.role === 'dndMaster'
  const isPlayer = user?.role === 'dnd' || user?.role === 'dndPlayer'
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
  const [showWizardV2, setShowWizardV2] = useState(false)
  const [expandedCharacter, setExpandedCharacter] = useState(null)
  const [charSearch, setCharSearch] = useState('')
  const [charPlayerFilter, setCharPlayerFilter] = useState('all')
  const [charPage, setCharPage] = useState(0)
  const CHAR_PAGE_SIZE = 10

  // Parties (multi-party)
  const [parties, setParties] = useState([])
  const [partyAddModal, setPartyAddModal] = useState(null) // null | { partyId }
  const [partyCreateModal, setPartyCreateModal] = useState(false)
  const [partyCreateName, setPartyCreateName] = useState('')
  const [visiblePartyId, setVisiblePartyId] = useState(null)

  // ── WebSocket tokens (DM) ──
  const { tokens: dmTokens, connected: wsConnected, initToken, removeToken, setTokenVisible } =
    useTokenSocket(visiblePartyId, user?.id, isMaster && !!visiblePartyId)

  // Gestor de Imágenes global
  const [globalImages, setGlobalImages] = useState(null)
  const [imageModal, setImageModal] = useState(null)

  // Jugadores D&D (para selector en CharacterWizard)
  const [dndPlayers, setDndPlayers] = useState([])

  // Soundboard
  const [soundboard, setSoundboard] = useState([])
  const [soundModal, setSoundModal] = useState(null) // null | { mode: 'create'|'edit'|'browse', sound? }
  const [soundBrowsePath, setSoundBrowsePath] = useState('')
  const [soundBrowseData, setSoundBrowseData] = useState({ folders: [], files: [] })
  const [soundVolume, setSoundVolume] = useState(1)
  const [soundPlaying, setSoundPlaying] = useState(null) // id del sonido reproduciéndose

  // Notas del Master
  const [noteModal, setNoteModal] = useState(null) // null | { campaignId, chapterId, mode: 'create'|'edit', note? }
  const [noteImgPicker, setNoteImgPicker] = useState(null) // null | { path, folders, images }

  const headers = { 'Content-Type': 'application/json', 'x-user-id': user?.id }

  async function updateConditions(partyId, key, conditions) {
    await fetch(`/api/dnd/parties/${partyId}/conditions/${key}`, { method: 'PATCH', headers, body: JSON.stringify({ conditions }) })
    setParties(ps => ps.map(p => p.id === partyId ? { ...p, conditions: { ...(p.conditions || {}), [key]: conditions } } : p))
  }

  useEffect(() => {
    if (!user) return
    if (isMaster) { fetchCampaigns(); fetchSoundboard(); fetchViewer(); fetchDndPlayers() }
    fetchGlossary(); fetchCharacters(); fetchParties()
    if (isPlayer) { setExpanded({ characters: true, parties: true, glossary: true }); setGlossaryFilter('spell') }
  }, [user])

  // Auto-expandir parties individuales para jugadores
  useEffect(() => {
    if (isPlayer && parties.length > 0) {
      setExpanded(prev => {
        const next = { ...prev }
        parties.forEach(p => { next[`party-${p.id}`] = true })
        return next
      })
    }
  }, [parties, isPlayer])
  // Refrescar estado del visor cada 5s (solo master)
  useEffect(() => {
    if (!isMaster) return
    const iv = setInterval(fetchViewer, 5000)
    return () => clearInterval(iv)
  }, [isMaster])

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

  async function fetchDndPlayers() {
    try {
      const r = await fetch('/api/dnd/players', { headers })
      if (r.ok) setDndPlayers(await r.json())
    } catch {}
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
  async function toggleUnlocked(entryId, unlocked) {
    const entry = glossary.entries.find(e => e.id === entryId)
    if (!entry) return
    await fetch(`/api/dnd/glossary/${entryId}`, { method: 'PUT', headers, body: JSON.stringify({ ...entry, unlocked }) })
    fetchGlossary()
    showToast(unlocked ? '🔓 Desbloqueado para jugadores' : '🔒 Bloqueado para jugadores')
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
  async function updateInitiativeValue(partyId, key, value) {
    const res = await fetch(`/api/dnd/parties/${partyId}/initiative-value`, { method: 'PATCH', headers, body: JSON.stringify({ key, value }) })
    const data = await res.json()
    if (data.ok) {
      setParties(ps => ps.map(p => p.id === partyId ? { ...p, initiative: data.initiative, initiativeValues: data.initiativeValues } : p))
    }
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
  async function updatePartyAbilitySlots(partyId, charId, usedAbilities) {
    await fetch(`/api/dnd/parties/${partyId}/ability-slots/${charId}`, { method: 'PATCH', headers, body: JSON.stringify({ usedAbilities }) })
    setParties(ps => ps.map(p => p.id === partyId ? { ...p, usedAbilities: { ...p.usedAbilities, [charId]: usedAbilities } } : p))
  }
  async function updatePartyClassResources(partyId, charId, usedClassResources) {
    await fetch(`/api/dnd/parties/${partyId}/class-resources/${charId}`, { method: 'PATCH', headers, body: JSON.stringify({ usedClassResources }) })
    setParties(ps => ps.map(p => p.id === partyId ? { ...p, usedClassResources: { ...p.usedClassResources, [charId]: usedClassResources } } : p))
  }
  async function partyRest(partyId, type) {
    if (!confirm(type === 'long' ? '¿Descanso largo? Se restaurarán PG, huecos de conjuro y habilidades.' : '¿Descanso corto? Se restaurarán los PG.')) return
    await fetch(`/api/dnd/parties/${partyId}/rest`, { method: 'POST', headers, body: JSON.stringify({ type }) })
    fetchParties()
    showToast(type === 'long' ? '🌙 Descanso largo completado' : '☀️ Descanso corto completado')
  }
  async function resetInitiative(partyId) {
    if (!confirm('¿Resetear la iniciativa de todos los integrantes?')) return
    await fetch(`/api/dnd/parties/${partyId}/reset-initiative`, { method: 'POST', headers })
    fetchParties()
    showToast('🎲 Iniciativa reseteada')
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
  async function updateEnemyDisposition(partyId, enemyId, disposition) {
    await fetch(`/api/dnd/parties/${partyId}/enemy/${enemyId}/disposition`, { method: 'PATCH', headers, body: JSON.stringify({ disposition }) })
    setParties(ps => ps.map(p => p.id === partyId ? {
      ...p, enemies: (p.enemies || []).map(e => e.id === enemyId ? { ...e, disposition } : e)
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
      // Jugadores solo ven hechizos y lore desbloqueado
      if (isPlayer) {
        if (e.category !== 'spell' && e.category !== 'lore') return false
        if (e.category === 'lore' && !e.unlocked) return false
      }
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
      body: JSON.stringify({ mode: 'map', mapId, partyId: visiblePartyId ?? null })
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

  // ── Notas del Master ─────────────────────────────────────
  async function saveNote(campaignId, chapterId, note) {
    const isNew = !note.id
    const url = isNew
      ? `/api/dnd/campaigns/${campaignId}/chapters/${chapterId}/notes`
      : `/api/dnd/campaigns/${campaignId}/chapters/${chapterId}/notes/${note.id}`
    const method = isNew ? 'POST' : 'PUT'
    await fetch(url, { method, headers, body: JSON.stringify(note) })
    fetchCampaigns()
    setNoteModal(null)
    setNoteImgPicker(null)
    showToast(isNew ? '📝 Nota creada' : '📝 Nota actualizada')
  }

  async function deleteNote(campaignId, chapterId, noteId) {
    if (!confirm('¿Eliminar esta nota?')) return
    await fetch(`/api/dnd/campaigns/${campaignId}/chapters/${chapterId}/notes/${noteId}`, { method: 'DELETE', headers })
    fetchCampaigns()
    setNoteModal(null)
    setNoteImgPicker(null)
    showToast('🗑 Nota eliminada')
  }

  async function loadNoteImages(path = '') {
    try {
      const q = path ? `?path=${encodeURIComponent(path)}` : ''
      const r = await fetch(`/api/dnd/images${q}`)
      if (r.ok) {
        const data = await r.json()
        setNoteImgPicker({ path, folders: data.folders || [], images: data.images || [] })
      }
    } catch {}
  }

  async function createNoteFolder(campaignId, chapterId, parentId = null) {
    const name = prompt('Nombre de la carpeta:')
    if (!name || !name.trim()) return
    await fetch(`/api/dnd/campaigns/${campaignId}/chapters/${chapterId}/noteFolders`, {
      method: 'POST', headers, body: JSON.stringify({ name: name.trim(), parentId })
    })
    fetchCampaigns()
    showToast('📁 Carpeta creada')
  }

  async function renameNoteFolder(campaignId, chapterId, folderId, currentName) {
    const name = prompt('Nuevo nombre:', currentName)
    if (!name || !name.trim() || name.trim() === currentName) return
    await fetch(`/api/dnd/campaigns/${campaignId}/chapters/${chapterId}/noteFolders/${folderId}`, {
      method: 'PUT', headers, body: JSON.stringify({ name: name.trim() })
    })
    fetchCampaigns()
    showToast('✏️ Carpeta renombrada')
  }

  async function deleteNoteFolder(campaignId, chapterId, folderId) {
    if (!confirm('¿Eliminar esta carpeta y sus subcarpetas? Las notas volverán a la raíz.')) return
    await fetch(`/api/dnd/campaigns/${campaignId}/chapters/${chapterId}/noteFolders/${folderId}`, {
      method: 'DELETE', headers
    })
    fetchCampaigns()
    showToast('🗑 Carpeta eliminada')
  }

  async function moveNoteFolder(campaignId, chapterId, folderId, parentId) {
    await fetch(`/api/dnd/campaigns/${campaignId}/chapters/${chapterId}/noteFolders/${folderId}/move`, {
      method: 'PATCH', headers, body: JSON.stringify({ parentId })
    })
    fetchCampaigns()
  }

  async function moveNote(campaignId, chapterId, noteId, folderId) {
    await fetch(`/api/dnd/campaigns/${campaignId}/chapters/${chapterId}/notes/${noteId}/move`, {
      method: 'PATCH', headers, body: JSON.stringify({ folderId })
    })
    fetchCampaigns()
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

  // ── Vista jugador ──────────────────────────────────────────────────────────
  if (isPlayer) {
    return (
      <div className="dnd-root">
        <div className="dnd-bg" />
        <AppHeader />
        <main className="dnd-main dnd-main-player">
          <PlayerView user={user} characters={characters} onCharacterSaved={fetchCharacters} />
        </main>
      </div>
    )
  }

  // ── Tarjetas de los 4 canales/visores (reutilizadas en escritorio y en el acordeón móvil) ──
  const channelCards = (
    <>
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
      <div className="dnd-channel-card" title="Canal secundario (tablet u otra pantalla)">
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
      <div className="dnd-channel-card" title="Vista multijugador — mapa con tokens en tiempo real (canal principal)">
        <div className="dnd-channel-head">
          <span className="dnd-channel-icon">🎮</span>
          <span className="dnd-channel-label">Multijugador</span>
        </div>
        <div className="dnd-channel-btns">
          <button className="dnd-btn-sm" onClick={() => window.open('/dnd/viewer/main/multi','_blank')} title="Abrir vista multijugador (canal principal)">🖥</button>
          <button className="dnd-btn-sm" onClick={() => window.open('/dnd/viewer/tablet/multi','_blank')} title="Abrir vista multijugador (canal secundario)">📱</button>
        </div>
      </div>
      <div className="dnd-channel-card" title="Vista de la party para los jugadores">
        <div className="dnd-channel-head">
          <span className="dnd-channel-icon">⚔️</span>
          <span className="dnd-channel-label">Party</span>
        </div>
        <div className="dnd-channel-btns">
          <button className="dnd-btn-sm" onClick={() => window.open('/dnd/party','_blank')} title="Abrir vista de party">🖥</button>
        </div>
      </div>
    </>
  )

  return (
    <div className="dnd-root">
      <div className="dnd-bg" />
      <AppHeader />
      <main className="dnd-main">
        <div className="dnd-header">
          <h1 className="dnd-title">⚔️ D&amp;D</h1>
          {isMaster && (isMobile ? (
            <div className="dnd-visores-accordion">
              <div className="dnd-glossary-header" onClick={() => toggleExpand('visores')}>
                <span className="dnd-chevron">{expanded.visores ? '▾' : '▸'}</span>
                <span className="dnd-glossary-title">📺 Visores</span>
              </div>
              {expanded.visores && <div className="dnd-header-actions">{channelCards}</div>}
            </div>
          ) : (
            <div className="dnd-header-actions">{channelCards}</div>
          ))}
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
                  <button className="dnd-btn-sm" onClick={e => { e.stopPropagation(); window.open(`/dnd/docs/${campaign.slug}`, '_blank') }} title="Documentación de la campaña">📄 Docs</button>
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
                          <button className="dnd-btn-sm" onClick={e => { e.stopPropagation(); window.open(`/dnd/docs/${chapter.slug}`, '_blank') }} title="Documentación del acto">📄 Docs</button>
                          <button className="dnd-btn-sm" onClick={e => { e.stopPropagation(); openModal('map', campaign.id, chapter.id) }}>+ Mapa</button>
                          <button className="dnd-btn-sm" onClick={e => { e.stopPropagation(); renameChapter(campaign.id, chapter.id, chapter.name) }} title="Renombrar">✏️</button>
                          <button className="dnd-btn-danger" onClick={e => deleteChapter(e, campaign.id, chapter.id)} title="Borrar capítulo">✕</button>
                        </div>
                      </div>

                      {expanded[`ch-${chapter.id}`] && (
                        <div className="dnd-maps">
                          {chapter.maps.map((map, mapIdx) => (
                            <div key={map.id} className="dnd-map-block"
                              {...(!isMobile ? {
                                draggable: true,
                                onDragStart: e => { e.dataTransfer.setData('text/plain', String(map.id)); e.dataTransfer.effectAllowed = 'move' },
                                onDragOver: e => { e.preventDefault(); e.currentTarget.classList.add('dnd-map-dragover') },
                                onDragLeave: e => e.currentTarget.classList.remove('dnd-map-dragover'),
                                onDrop: e => {
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
                                }
                              } : {})}>
                              <div className="dnd-map-row">
                                {!isMobile && <span className="dnd-map-drag-handle" title="Arrastrar para reordenar">⠿</span>}
                                {!isMobile && <span className="dnd-map-icon">🗺️</span>}
                                <span className="dnd-map-name">{map.name}</span>
                                <div className="dnd-map-actions">
                                  {!isMobile && <button className="dnd-btn-sm" onClick={() => window.open(`/dnd/editor/${map.id}`, '_blank')}>Editar</button>}
                                  <button className="dnd-btn-sm dnd-btn-viewer" title="Enviar a Main" onClick={() => sendMapToViewer(map.id, map.name, 'main')}>📺</button>
                                  <button className="dnd-btn-sm dnd-btn-viewer" title="Enviar a Secundaria" onClick={() => sendMapToViewer(map.id, map.name, 'tablet')}>📱</button>
                                  {!isMobile && <button className="dnd-btn-sm dnd-btn-danger" title="Borrar mapa" onClick={() => deleteMap(campaign.id, chapter.id, map.id)}>✕</button>}
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
                                        <button className="dnd-image-send dnd-image-send-tablet" onClick={() => sendImageToViewer(img, 'tablet')} title="Enviar a Secundaria">📱</button>
                                        <button className="dnd-image-send dnd-image-remove" onClick={() => removeImageFromChapter(campaign.id, chapter.id, img.url)} title="Quitar">✕</button>
                                        <span className="dnd-image-name">{img.name}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ── Notas del Master ── */}
                          <div className="dnd-notes-section">
                            <div className="dnd-images-toggle" onClick={() => toggleExpand(`notes-${chapter.id}`)}>
                              <span className="dnd-chevron">{expanded[`notes-${chapter.id}`] ? '▾' : '▸'}</span>
                              <span>📝 Notas del Master {(chapter.notes||[]).length > 0 ? `(${chapter.notes.length})` : ''}</span>
                              <div style={{marginLeft:'auto', display:'flex', gap:4}} onClick={e => e.stopPropagation()}>
                                <button className="dnd-btn-sm" onClick={() => createNoteFolder(campaign.id, chapter.id)}>+ Carpeta</button>
                                <button className="dnd-btn-sm" onClick={() => setNoteModal({ campaignId: campaign.id, chapterId: chapter.id, mode: 'create', note: { title: '', subtitle: '', body: '', folderId: null } })}>+ Nota</button>
                              </div>
                            </div>
                            {expanded[`notes-${chapter.id}`] && (() => {
                              const allNotes = chapter.notes || []
                              const folders = chapter.noteFolders || []
                              const rootNotes = allNotes.filter(n => !n.folderId)

                              const NoteCard = ({ note, cId, chId }) => (
                                <div className="dnd-note-card"
                                  draggable
                                  onDragStart={e => { e.dataTransfer.setData('application/note-id', String(note.id)); e.dataTransfer.effectAllowed = 'move' }}
                                  onClick={() => setNoteModal({ campaignId: cId, chapterId: chId, mode: 'view', note: { ...note } })}>
                                  <span className="dnd-note-drag-handle" title="Arrastrar">⠿</span>
                                  <div className="dnd-note-card-content">
                                    <div className="dnd-note-card-title">{note.title}</div>
                                    {note.subtitle && <div className="dnd-note-card-subtitle">{note.subtitle}</div>}
                                    {note.body && <div className="dnd-note-card-body">{note.body.length > 120 ? note.body.slice(0, 120) + '…' : note.body}</div>}
                                  </div>
                                </div>
                              )

                              const handleFolderDrop = (e, folderId) => {
                                e.preventDefault(); e.currentTarget.classList.remove('dnd-folder-dragover')
                                const noteId = parseInt(e.dataTransfer.getData('application/note-id'))
                                if (!noteId) return
                                moveNote(campaign.id, chapter.id, noteId, folderId)
                              }
                              const handleFolderDragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add('dnd-folder-dragover') }
                              const handleFolderDragLeave = (e) => { e.currentTarget.classList.remove('dnd-folder-dragover') }

                              return (
                                <div className="dnd-notes-container">
                                  {/* Carpetas */}
                                  {folders.map(folder => {
                                    const folderNotes = allNotes.filter(n => n.folderId === folder.id)
                                    const isOpen = expanded[`nf-${folder.id}`]
                                    return (
                                      <div key={folder.id} className={`dnd-note-folder ${isOpen ? 'open' : ''}`}
                                        onDragOver={handleFolderDragOver} onDragLeave={handleFolderDragLeave}
                                        onDrop={e => handleFolderDrop(e, folder.id)}>
                                        <div className="dnd-note-folder-header" onClick={() => toggleExpand(`nf-${folder.id}`)}>
                                          <span className="dnd-chevron">{isOpen ? '▾' : '▸'}</span>
                                          <span className="dnd-note-folder-icon">📁</span>
                                          <span className="dnd-note-folder-name">{folder.name}</span>
                                          <span className="dnd-note-folder-count">{folderNotes.length}</span>
                                          <div className="dnd-note-folder-actions" onClick={e => e.stopPropagation()}>
                                            <button className="dnd-btn-sm" onClick={() => setNoteModal({ campaignId: campaign.id, chapterId: chapter.id, mode: 'create', note: { title: '', subtitle: '', body: '', folderId: folder.id } })} title="Nota en esta carpeta">+</button>
                                            <button className="dnd-btn-sm" onClick={() => renameNoteFolder(campaign.id, chapter.id, folder.id, folder.name)} title="Renombrar">✏️</button>
                                            <button className="dnd-btn-sm dnd-btn-danger" onClick={() => deleteNoteFolder(campaign.id, chapter.id, folder.id)} title="Eliminar carpeta">✕</button>
                                          </div>
                                        </div>
                                        {isOpen && (
                                          <div className="dnd-note-folder-content">
                                            {folderNotes.length === 0 && <div className="dnd-empty-sm">Arrastra notas aquí</div>}
                                            {folderNotes.map(note => <NoteCard key={note.id} note={note} cId={campaign.id} chId={chapter.id} />)}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}

                                  {/* Notas sueltas (raíz) */}
                                  <div className="dnd-notes-root-zone"
                                    onDragOver={handleFolderDragOver} onDragLeave={handleFolderDragLeave}
                                    onDrop={e => handleFolderDrop(e, null)}>
                                    {allNotes.length === 0 && folders.length === 0 && <div className="dnd-empty-sm">Sin notas — ¡añade la primera!</div>}
                                    {rootNotes.length > 0 && <div className="dnd-notes-grid">
                                      {rootNotes.map(note => <NoteCard key={note.id} note={note} cId={campaign.id} chId={chapter.id} />)}
                                    </div>}
                                    {rootNotes.length === 0 && folders.length > 0 && allNotes.length > 0 && (
                                      <div className="dnd-empty-sm dnd-drop-hint">Suelta aquí para sacar de carpeta</div>
                                    )}
                                  </div>
                                </div>
                              )
                            })()}
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

        {/* ── Note Modal (ver/crear/editar) ── */}
        {noteModal && (
          <div className="dnd-modal-overlay" onClick={() => setNoteModal(null)}>
            <div className="dnd-note-modal" onClick={e => e.stopPropagation()}>
              {noteModal.mode === 'view' ? (
                <>
                  <div className="dnd-note-view-header">
                    <h3>{noteModal.note.title}</h3>
                    <div style={{display:'flex',gap:6,flexShrink:0}}>
                      <button className="dnd-note-edit-icon" onClick={() => setNoteModal(prev => ({ ...prev, mode: 'edit' }))} title="Editar nota">✏️</button>
                      <button className="dnd-note-edit-icon" onClick={() => setNoteModal(null)} title="Cerrar">✕</button>
                    </div>
                  </div>
                  {noteModal.note.subtitle && <div className="dnd-note-view-subtitle">{noteModal.note.subtitle}</div>}
                  {(noteModal.note.imageShortcuts||[]).length > 0 && (
                    <div className="dnd-note-shortcuts">
                      {(noteModal.note.imageShortcuts||[]).map((img, i) => (
                        <div key={i} className="dnd-note-shortcut">
                          <img src={img.url} alt={img.name} />
                          <span className="dnd-note-shortcut-name">{img.name}</span>
                          <div className="dnd-note-shortcut-btns">
                            <button onClick={() => sendImageToViewer(img, 'main')} title="Enviar a Main">📺</button>
                            <button onClick={() => sendImageToViewer(img, 'tablet')} title="Enviar a Secundaria">📱</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {noteModal.note.body && <div className="dnd-note-view-body">{noteModal.note.body}</div>}
                </>
              ) : (
                <>
                  <div className="dnd-note-view-header">
                    <h3>{noteModal.mode === 'create' ? '📝 Nueva Nota' : '📝 Editar Nota'}</h3>
                    <button className="dnd-note-edit-icon" onClick={() => {
                      if (noteModal.mode === 'edit') setNoteModal(prev => ({ ...prev, mode: 'view' }))
                      else setNoteModal(null)
                    }} title="Cerrar">✕</button>
                  </div>
                  <div className="dnd-note-field-row">
                    <input
                      className="dnd-input"
                      placeholder="Título *"
                      value={noteModal.note.title}
                      onChange={e => setNoteModal(prev => ({ ...prev, note: { ...prev.note, title: e.target.value } }))}
                      autoFocus={noteModal.mode === 'create'}
                    />
                  </div>
                  <div className="dnd-note-field-row">
                    <input
                      className="dnd-input"
                      placeholder="Subtítulo (opcional)"
                      value={noteModal.note.subtitle}
                      onChange={e => setNoteModal(prev => ({ ...prev, note: { ...prev.note, subtitle: e.target.value } }))}
                    />
                  </div>
                  <div className="dnd-note-field-row" style={{flex:1,display:'flex',flexDirection:'column'}}>
                    <textarea
                      className="dnd-textarea"
                      placeholder="Contenido de la nota..."
                      rows={8}
                      value={noteModal.note.body}
                      onChange={e => setNoteModal(prev => ({ ...prev, note: { ...prev.note, body: e.target.value } }))}
                    />
                  </div>
                  {/* Atajos de imagen adjuntos */}
                  <div className="dnd-note-shortcuts-edit">
                    <div className="dnd-note-shortcuts-label" onClick={() => { if (!noteImgPicker) loadNoteImages('') }}>
                      🖼️ Atajos de imagen ({(noteModal.note.imageShortcuts||[]).length})
                    </div>
                    {(noteModal.note.imageShortcuts||[]).length > 0 && (
                      <div className="dnd-note-shortcuts">
                        {(noteModal.note.imageShortcuts||[]).map((img, i) => (
                          <div key={i} className="dnd-note-shortcut">
                            <img src={img.url} alt={img.name} />
                            <span className="dnd-note-shortcut-name">{img.name}</span>
                            <button className="dnd-note-shortcut-remove" onClick={() => {
                              setNoteModal(prev => ({ ...prev, note: { ...prev.note, imageShortcuts: (prev.note.imageShortcuts||[]).filter((_, j) => j !== i) } }))
                            }} title="Quitar">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button className="dnd-btn-sm" style={{marginTop:4}} onClick={() => {
                      if (noteImgPicker) { setNoteImgPicker(null) } else { loadNoteImages('') }
                    }}>
                      {noteImgPicker ? '▾ Cerrar explorador' : '+ Añadir imagen'}
                    </button>
                    {noteImgPicker && (
                      <div className="dnd-note-img-picker">
                        {noteImgPicker.path && (
                          <button className="dnd-btn-sm" onClick={() => {
                            const parts = noteImgPicker.path.split('/')
                            parts.pop()
                            loadNoteImages(parts.join('/'))
                          }}>← Atrás</button>
                        )}
                        <div className="dnd-note-img-picker-grid">
                          {(noteImgPicker.folders||[]).map(f => (
                            <div key={f.path || f.name} className="dnd-note-img-picker-folder" onClick={() => loadNoteImages(f.path || f.name)}>
                              📁 {f.name}
                            </div>
                          ))}
                          {(noteImgPicker.images||[]).map(img => (
                            <div key={img.url} className="dnd-note-img-picker-item" onClick={() => {
                              const already = (noteModal.note.imageShortcuts||[]).some(s => s.url === img.url)
                              if (!already) {
                                setNoteModal(prev => ({ ...prev, note: { ...prev.note, imageShortcuts: [...(prev.note.imageShortcuts||[]), { url: img.url, name: img.name }] } }))
                                showToast(`🖼️ "${img.name}" adjuntada`)
                              }
                            }}>
                              <img src={img.url} alt={img.name} loading="lazy" />
                              <span>{img.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="dnd-modal-btns">
                    <button className="dnd-btn-primary" onClick={() => saveNote(noteModal.campaignId, noteModal.chapterId, noteModal.note)} disabled={!noteModal.note.title.trim()}>
                      {noteModal.mode === 'create' ? 'Crear' : 'Guardar'}
                    </button>
                    {noteModal.mode === 'edit' && (
                      <button className="dnd-btn-danger" onClick={() => deleteNote(noteModal.campaignId, noteModal.chapterId, noteModal.note.id)}>Eliminar</button>
                    )}
                    <button className="dnd-btn-cancel" onClick={() => {
                      if (noteModal.mode === 'edit') setNoteModal(prev => ({ ...prev, mode: 'view' }))
                      else setNoteModal(null)
                    }}>{noteModal.mode === 'edit' ? 'Volver' : 'Cancelar'}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Parties ── */}
        {(isMaster || isPlayer) && <div className="dnd-glossary-section">
          <div className="dnd-glossary-header" onClick={() => toggleExpand('parties')}>
            <span className="dnd-chevron">{expanded.parties ? '▾' : '▸'}</span>
            <span className="dnd-glossary-title">⚔️ Parties</span>
            {isMaster && <div style={{marginLeft:'auto', display:'flex', gap:6}} onClick={e => e.stopPropagation()}>
              <button className="dnd-btn-sm" onClick={() => window.open('/dnd/party','_blank')}>🖥 Ver</button>
              <button className="dnd-btn-primary" onClick={() => setPartyCreateModal(true)}>+ Party</button>
            </div>}
          </div>
          {expanded.parties && <>
            {parties.length === 0 && <div className="dnd-empty-sm">Sin parties — ¡crea la primera!</div>}
            {parties.map(p => (
              <div key={p.id} className="dnd-party-block">
                <div className="dnd-party-block-header" onClick={() => toggleExpand(`party-${p.id}`)}>
                  <span className="dnd-chevron">{expanded[`party-${p.id}`] ? '▾' : '▸'}</span>
                  <span className="dnd-party-block-name">{p.name}</span>
                  <span className="dnd-party-block-count">{(p.members||[]).length} PCs · {(p.enemies||[]).length} enemigos</span>
                  {isMaster && <div style={{marginLeft:'auto', display:'flex', gap:6}} onClick={e => e.stopPropagation()}>
                    <button className={`dnd-btn-sm ${visiblePartyId === p.id ? 'dnd-btn-visible-active' : ''}`} onClick={() => setPartyVisible(p.id)} title={visiblePartyId === p.id ? 'Visible en visor (click para mostrar todas)' : 'Mostrar en visor'}>{visiblePartyId === p.id ? '👁' : '👁‍🗨'}</button>
                    <button className="dnd-btn-sm" onClick={() => setPartyAddModal({ partyId: p.id })}>+ Añadir</button>
                    <button className="dnd-btn-sm" onClick={() => renameParty(p.id, p.name)} title="Renombrar">✏️</button>
                    <button className="dnd-btn-sm dnd-btn-danger" onClick={() => deleteParty(p.id)}>✕</button>
                  </div>}
                </div>
                {expanded[`party-${p.id}`] && (
                  <div className="dnd-party-block-body">
                    {isMaster && <div className="dnd-party-rest-bar">
                      <button className="dnd-btn-sm" onClick={() => partyRest(p.id, 'short')}>☀️ Descanso corto</button>
                      <button className="dnd-btn-sm" onClick={() => partyRest(p.id, 'long')}>🌙 Descanso largo</button>
                      <button className="dnd-btn-sm" onClick={() => resetInitiative(p.id)}>🎲 Reset iniciativa</button>
                      <span style={{flex:1}} />
                      {(p.enemies||[]).length > 0 && <button className="dnd-btn-sm dnd-btn-danger" onClick={() => clearEnemies(p.id)} title="Eliminar todos los enemigos">💀 Vaciar enemigos</button>}
                      <button className="dnd-btn-sm dnd-btn-danger" onClick={() => clearParty(p.id)} title="Vaciar todo el grupo">🧹 Vaciar todo</button>
                    </div>}
                    <PartyTracker
                      party={p}
                      isMaster={isMaster}
                      userId={user?.id}
                      onReorder={(newOrder) => updateInitiative(p.id, newOrder)}
                      onInitiativeChange={(key, value) => updateInitiativeValue(p.id, key, value)}
                      onHpChange={(charId, hp) => updatePartyHp(p.id, charId, hp)}
                      onSlotsChange={(charId, slots) => updatePartySlots(p.id, charId, slots)}
                      onAbilitySlotsChange={(charId, used) => updatePartyAbilitySlots(p.id, charId, used)}
                      onClassResourceChange={(charId, used) => updatePartyClassResources(p.id, charId, used)}
                      onRemove={(charId) => removeFromParty(p.id, charId)}
                      onEnemyHpChange={(enemyId, hp) => updateEnemyHp(p.id, enemyId, hp)}
                      onEnemyDispositionChange={(enemyId, disposition) => updateEnemyDisposition(p.id, enemyId, disposition)}
                      onRemoveEnemy={(enemyId) => removeEnemyFromParty(p.id, enemyId)}
                      onEnemyClick={scrollToGlossaryEntry}
                      onConditionsChange={(key, conds) => updateConditions(p.id, key, conds)}
                    />
                    {visiblePartyId === p.id && (
                      <TokenManager
                        party={p}
                        characters={characters}
                        tokens={dmTokens}
                        connected={wsConnected}
                        onInit={initToken}
                        onRemove={removeToken}
                        onSetVisible={setTokenVisible}
                      />
                    )}
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
            {isMaster && <button className="dnd-btn-primary" style={{marginLeft:'auto'}} onClick={e => { e.stopPropagation(); setCharacterModal({ mode: 'create', character: null }) }}>+ Personaje</button>}
            {isMaster && <button className="dnd-btn-sm" style={{marginLeft:4, background:'#c8a96e22', borderColor:'#c8a96e44', color:'#c8a96e'}} onClick={e => { e.stopPropagation(); setShowWizardV2(true) }}>✦ Nuevo v2</button>}
          </div>
          {expanded.characters && <>
            <input className="dnd-glossary-search" placeholder="Buscar por nombre, clase, nivel o jugador..." value={charSearch} onChange={e => { setCharSearch(e.target.value); setCharPage(0) }} style={{marginBottom:8}} />
            {isMaster && (() => {
              const players = [...new Set(characters.map(ch => ch.player).filter(Boolean))].sort((a,b) => a.localeCompare(b,'es'))
              if (players.length === 0) return null
              return (
                <div className="dnd-glossary-subfilters" style={{marginBottom:8}}>
                  <button className={`dnd-glossary-subfilter ${charPlayerFilter==='all'?'active':''}`}
                    onClick={() => { setCharPlayerFilter('all'); setCharPage(0) }}>Todos</button>
                  {players.map(p => (
                    <button key={p} className={`dnd-glossary-subfilter ${charPlayerFilter===p?'active':''}`}
                      onClick={() => { setCharPlayerFilter(p); setCharPage(0) }}>🎮 {p}</button>
                  ))}
                </div>
              )
            })()}
            {(() => {
              const q = charSearch.toLowerCase().trim()
              const filtered = characters.filter(ch => {
                if (charPlayerFilter !== 'all' && ch.player !== charPlayerFilter) return false
                if (!q) return true
                const name = (ch.name||'').toLowerCase()
                const cls = (ch.class||'').toLowerCase()
                const sub = (ch.subclass||'').toLowerCase()
                const race = (ch.race||'').toLowerCase()
                const player = (ch.player||'').toLowerCase()
                const lvl = String(ch.level||1)
                return name.includes(q) || cls.includes(q) || sub.includes(q) || race.includes(q) || player.includes(q) || lvl === q
              })
              const totalPages = Math.ceil(filtered.length / CHAR_PAGE_SIZE)
              const pageItems = filtered.slice(charPage * CHAR_PAGE_SIZE, (charPage + 1) * CHAR_PAGE_SIZE)
              return <>
                <div className="dnd-glossary-list">
                  {filtered.length === 0 && (
                    <div className="dnd-empty-sm">{characters.length === 0 ? 'Sin personajes — ¡crea el primero!' : 'Sin resultados'}</div>
                  )}
                  {pageItems.map(ch => (
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
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="glossary-pagination">
                    <button className="dnd-btn-sm" disabled={charPage === 0} onClick={() => setCharPage(p => p - 1)}>← Anterior</button>
                    <span className="glossary-page-info">{charPage + 1} / {totalPages} ({filtered.length} personajes)</span>
                    <button className="dnd-btn-sm" disabled={charPage >= totalPages - 1} onClick={() => setCharPage(p => p + 1)}>Siguiente →</button>
                  </div>
                )}
              </>
            })()}
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
                {(isPlayer
                  ? [{id:'spell',label:'🔮 Hechizos'},{id:'lore',label:'📜 Lore'}]
                  : [{id:'all',label:'Todos'},{id:'enemy',label:'⚔️ Enemigos'},{id:'artifact',label:'💎 Artefactos'},{id:'spell',label:'🔮 Hechizos'},{id:'lore',label:'📜 Lore'}]
                ).map(f => (
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
                  canEdit={isMaster}
                  onToggleUnlocked={toggleUnlocked} />
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
          dndPlayers={dndPlayers}
        />
      )}

      {showWizardV2 && (
        <CharacterWizardV2
          onSave={saveCharacter}
          onClose={() => setShowWizardV2(false)}
          dndPlayers={dndPlayers}
          glossarySpells={glossary.entries.filter(e => e.spellLevel !== undefined)}
        />
      )}

      {toast && <div className="dnd-toast">{toast}</div>}
    </div>
  )

}
