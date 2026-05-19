import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AppHeader from '../../components/AppHeader'
import CharacterWizard from './CharacterWizard'
import './DnD.css'

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

  // Encounter (combate por mapa)
  const [encounters, setEncounters] = useState({}) // { [mapId]: [enemy, ...] }
  const [addEnemyModal, setAddEnemyModal] = useState(null) // { mapId }

  // Characters
  const [characters, setCharacters] = useState([])
  const [characterModal, setCharacterModal] = useState(null) // null | { mode: 'create'|'edit', character }
  const [expandedCharacter, setExpandedCharacter] = useState(null)

  const headers = { 'Content-Type': 'application/json', 'x-user-id': user?.id }

  useEffect(() => { if (!user) return; if (isMaster) fetchCampaigns(); fetchViewer(); fetchGlossary(); fetchCharacters() }, [user])
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
    return { category: 'lore', name: '', description: '', tags: [] }
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
  async function deleteCharacter(id) {
    if (!confirm('¿Borrar este personaje?')) return
    await fetch(`/api/dnd/characters/${id}`, { method: 'DELETE', headers })
    fetchCharacters()
    showToast('🗑 Personaje eliminado')
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
        str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      // Paso 4: Trasfondo
      background: '', backgroundTraits: [],
      bgSkills: [], bgTools: [], bgEquipment: [], gold: 0,
      // Paso 5: Habilidades (skills)
      skills: [],
      // Paso 6: Equipo
      equipment: [],
      // Paso 7: Conjuros
      isSpellcaster: false,
      spellSlots: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0 },
      actions: [],
      // Misc
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

  // ── Encounter (combate por mapa) ─────────────────────
  function rollDice(dice, sides, modifier = 0) {
    let total = modifier
    for (let i = 0; i < dice; i++) total += Math.floor(Math.random() * sides) + 1
    return total
  }

  async function loadEncounter(mapId) {
    try {
      const r = await fetch(`/api/dnd/maps/${mapId}/encounter`, { headers })
      if (r.ok) {
        const data = await r.json()
        setEncounters(prev => ({ ...prev, [mapId]: data }))
      }
    } catch {}
  }

  function toggleEncounter(mapId) {
    const key = `enc-${mapId}`
    setExpanded(prev => {
      const next = { ...prev, [key]: !prev[key] }
      if (next[key] && !encounters[mapId]) loadEncounter(mapId)
      return next
    })
  }

  async function addEnemyFromGlossary(mapId, entry) {
    const hp = entry.stats?.hp
    const rolledHp = hp ? rollDice(hp.dice, hp.sides, hp.modifier) : (entry.stats?.pg || 10)
    const maxHp = rolledHp
    const initiative = rollDice(1, 20)
    const enemy = {
      glossaryId: entry.id,
      name: entry.name,
      hp: rolledHp,
      maxHp,
      initiative,
      ca: entry.stats?.ca || 10,
      stats: entry.stats,
      actions: entry.actions,
      abilities: entry.abilities,
      traits: entry.traits,
      skills: entry.skills,
    }
    await fetch(`/api/dnd/maps/${mapId}/encounter`, {
      method: 'POST', headers, body: JSON.stringify(enemy)
    })
    loadEncounter(mapId)
    setAddEnemyModal(null)
    showToast(`⚔️ ${entry.name} añadido (PG: ${rolledHp}, Init: ${initiative})`)
  }

  async function updateEnemy(mapId, enemyId, updates) {
    await fetch(`/api/dnd/maps/${mapId}/encounter/${enemyId}`, {
      method: 'PUT', headers, body: JSON.stringify(updates)
    })
    loadEncounter(mapId)
  }

  async function removeEnemy(mapId, enemyId) {
    await fetch(`/api/dnd/maps/${mapId}/encounter/${enemyId}`, { method: 'DELETE', headers })
    loadEncounter(mapId)
  }

  async function clearEncounter(mapId) {
    if (!confirm('¿Limpiar todos los enemigos de este mapa?')) return
    await fetch(`/api/dnd/maps/${mapId}/encounter`, { method: 'DELETE', headers })
    loadEncounter(mapId)
    showToast('🗑 Combate limpiado')
  }

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
      navigate(`/dnd/editor/${map.id}`)
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
            <span className="dnd-glossary-title">🗡️ Campañas ({campaigns.length})</span>
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
                          {chapter.maps.map(map => (
                            <div key={map.id} className="dnd-map-block">
                              <div className="dnd-map-row">
                                <span className="dnd-map-icon">🗺️</span>
                                <span className="dnd-map-name">{map.name}</span>
                                <div className="dnd-map-actions">
                                  <button className="dnd-btn-sm" onClick={() => navigate(`/dnd/editor/${map.id}`)}>Editar</button>
                                  <button className="dnd-btn-sm dnd-btn-viewer" title="Enviar a Main" onClick={() => sendMapToViewer(map.id, map.name, 'main')}>📺</button>
                                  <button className="dnd-btn-sm dnd-btn-viewer" title="Enviar a Tablet" onClick={() => sendMapToViewer(map.id, map.name, 'tablet')}>📱</button>
                                </div>
                              </div>
                              {/* Combate */}
                              <div className="dnd-encounter-toggle" onClick={() => toggleEncounter(map.id)}>
                                <span className="dnd-chevron">{expanded[`enc-${map.id}`] ? '▾' : '▸'}</span>
                                <span>⚔️ Combate {encounters[map.id]?.length ? `(${encounters[map.id].length})` : ''}</span>
                              </div>
                              {expanded[`enc-${map.id}`] && (
                                <EncounterPanel
                                  mapId={map.id}
                                  enemies={encounters[map.id] || []}
                                  glossaryEnemies={glossary.entries.filter(e => e.category === 'enemy')}
                                  glossaryFavorites={glossary.favorites}
                                  onAddEnemy={(entry) => addEnemyFromGlossary(map.id, entry)}
                                  onUpdate={(enemyId, updates) => updateEnemy(map.id, enemyId, updates)}
                                  onRemove={(enemyId) => removeEnemy(map.id, enemyId)}
                                  onClear={() => clearEncounter(map.id)}
                                />
                              )}
                            </div>
                          ))}
                          {chapter.maps.length === 0 && <div className="dnd-empty-sm">Sin mapas</div>}

                          {/* ── Imágenes del capítulo ── */}
                          <div className="dnd-images-section">
                            <div className="dnd-images-toggle" onClick={() => toggleImageBrowser(chapter.id)}>
                              <span className="dnd-chevron">{expanded[`img-${chapter.id}`] ? '▾' : '▸'}</span>
                              <span>🖼️ Imágenes</span>
                            </div>
                            {expanded[`img-${chapter.id}`] && (
                              <ImageBrowser
                                data={imageBrowser[chapter.id]}
                                onNavigate={(path) => loadImages(chapter.id, path)}
                                onSend={sendImageToViewer}
                              />
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

        {/* ── Personajes ── */}
        <div className="dnd-glossary-section">
          <div className="dnd-glossary-header" onClick={() => toggleExpand('characters')}>
            <span className="dnd-chevron">{expanded.characters ? '▾' : '▸'}</span>
            <span className="dnd-glossary-title">🛡️ Personajes ({characters.length})</span>
            <button className="dnd-btn-primary" style={{marginLeft:'auto'}} onClick={e => { e.stopPropagation(); setCharacterModal({ mode: 'create', character: null }) }}>+ Personaje</button>
          </div>
          {expanded.characters && <>
            <div className="dnd-glossary-list">
              {characters.length === 0 && <div className="dnd-empty-sm">Sin personajes — ¡crea el primero!</div>}
              {characters.map(ch => (
                <CharacterCard key={ch.id} character={ch}
                  expanded={expandedCharacter === ch.id}
                  onToggle={() => setExpandedCharacter(expandedCharacter === ch.id ? null : ch.id)}
                  onEdit={() => setCharacterModal({ mode: 'edit', character: ch })}
                  onDelete={() => deleteCharacter(ch.id)} />
              ))}
            </div>
          </>}
        </div>

        {/* ── Glosario ── */}
        <div className="dnd-glossary-section">
          <div className="dnd-glossary-header" onClick={() => toggleExpand('glossary')}>
            <span className="dnd-chevron">{expanded.glossary ? '▾' : '▸'}</span>
            <span className="dnd-glossary-title">📖 Glosario ({glossary.entries.length})</span>
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
        />
      )}

      {toast && <div className="dnd-toast">{toast}</div>}
    </div>
  )
}

// ── Componente: Navegador de imágenes ──────────────────────
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

  return (
    <div className={`glossary-card ${expanded ? 'expanded' : ''} ${entry.hidden ? 'glossary-card-hidden' : ''}`}>
      <div className="glossary-card-header" onClick={onToggle}>
        {isFavorite && <span className="glossary-card-fav-star">★</span>}
        {entry.hidden && <span className="glossary-hidden-badge" title="Oculto para jugadores">🙈</span>}
        <span className="glossary-card-cat">{catIcons[entry.category] || '📄'}</span>
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

              {(entry.skills||[]).length > 0 && (
                <div className="glossary-section-label">Habilidades</div>
              )}
              {(entry.skills||[]).length > 0 && (
                <div className="glossary-skills">
                  {entry.skills.map((sk,i) => (
                    <span key={i} className="glossary-skill-badge">{sk.name} {sk.bonus >= 0 ? '+' : ''}{sk.bonus}</span>
                  ))}
                </div>
              )}

              {(entry.traits||[]).length > 0 && (
                <div className="glossary-section-label">Rasgos</div>
              )}
              {(entry.traits||[]).map((t,i) => (
                <div key={i} className="glossary-trait">
                  <strong>{t.name}.</strong> {t.description}
                </div>
              ))}
              {(entry.actions||[]).length > 0 && (
                <div className="glossary-section-label">Acciones</div>
              )}
              {entry.spellSlots && typeof entry.spellSlots === 'object' && Object.values(entry.spellSlots).some(v => v > 0) && (
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
              {(entry.actions||[]).map((a,i) => (
                <div key={i} className="glossary-action">
                  <div className="glossary-action-header">
                    <strong>{a.name}</strong>
                    {a.actionType && a.actionType !== 'normal' && <span className="glossary-action-type">{a.actionType === 'bonus' ? 'Adic.' : a.actionType === 'reaction' ? 'Reacción' : 'Ritual'}</span>}
                    {a.isSpell && <span className="glossary-action-spell">🔮 {a.spellLevel === 'truco' ? 'Truco' : `Nv.${a.spellLevel}`}</span>}
                    {a.range && <span className="glossary-action-range">{a.range}</span>}
                    {a.aoe && <span className="glossary-action-aoe">◎ {a.aoe}</span>}
                    {a.modifier != null && a.modifier !== '' && <span className="glossary-action-mod">{a.modifier >= 0 ? '+' : ''}{a.modifier}</span>}
                  </div>
                  <div className="glossary-action-dmg">
                    {a.damage && <span className="glossary-damage">⚔ {a.damage}</span>}
                    {a.secondaryDamage && <span className="glossary-damage glossary-damage-secondary">+ {a.secondaryDamage}</span>}
                  </div>
                  {a.note && <div className="glossary-action-note">{a.note}</div>}
                </div>
              ))}
            </div>
          )}

          {entry.category === 'enemy' && (entry.abilities||[]).length > 0 && (
            <div className="glossary-abilities-block">
              <div className="glossary-section-label">Habilidades especiales</div>
              {entry.abilities.map((ab,i) => (
                <div key={i} className="glossary-ability">
                  <strong>{ab.name}</strong>
                  {ab.uses && <span className="glossary-ability-uses">({ab.uses})</span>}
                  <span className="glossary-ability-desc">. {ab.description}</span>
                </div>
              ))}
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
    if (mode === 'edit' && initialEntry) return { ...initialEntry }
    return templates.enemy()
  })
  const [tagsInput, setTagsInput] = useState((initialEntry?.tags || []).join(', '))
  const [showSpellPicker, setShowSpellPicker] = useState(false)

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


// ── Componente: Panel de combate ───────────────────────────
function EncounterPanel({ mapId, enemies, glossaryEnemies, onAddEnemy, onUpdate, onRemove, onClear, glossaryFavorites }) {
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')
  const [pickerPage, setPickerPage] = useState(0)
  const PICKER_PAGE_SIZE = 10

  const sorted = [...enemies].sort((a, b) => (b.initiative || 0) - (a.initiative || 0))

  const isAnyFav = (id) => Object.values(glossaryFavorites || {}).some(ids => ids.includes(id))
  const filtered = glossaryEnemies
    .filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aF = isAnyFav(a.id) ? 1 : 0
      const bF = isAnyFav(b.id) ? 1 : 0
      return bF - aF
    })
  const pickerTotalPages = Math.ceil(filtered.length / PICKER_PAGE_SIZE)
  const pickerPageItems = filtered.slice(pickerPage * PICKER_PAGE_SIZE, (pickerPage + 1) * PICKER_PAGE_SIZE)

  return (
    <div className="encounter-panel">
      <div className="encounter-actions-bar">
        <button className="dnd-btn-sm" onClick={() => setShowPicker(!showPicker)}>
          {showPicker ? '✕ Cerrar' : '+ Añadir enemigo'}
        </button>
        {enemies.length > 0 && <button className="dnd-btn-sm dnd-btn-danger" onClick={onClear}>🗑 Limpiar</button>}
      </div>

      {showPicker && (
        <div className="encounter-picker">
          <input className="dnd-glossary-search" placeholder="Buscar enemigo..." value={search} onChange={e => { setSearch(e.target.value); setPickerPage(0) }} autoFocus />
          <div className="encounter-picker-list">
            {pickerPageItems.length === 0 && <div className="dnd-empty-sm">{search ? 'Sin resultados' : 'Sin enemigos en el glosario'}</div>}
            {pickerPageItems.map(entry => {
              const hp = entry.stats?.hp
              const hpLabel = hp ? `${hp.dice}d${hp.sides}${hp.modifier ? (hp.modifier > 0 ? `+${hp.modifier}` : hp.modifier) : ''}` : '?'
              const fav = isAnyFav(entry.id)
              return (
                <button key={entry.id} className="encounter-picker-item" onClick={() => { onAddEnemy(entry); setSearch('') }}>
                  {fav && <span className="glossary-card-fav-star">★</span>}
                  <span className="encounter-picker-name">{entry.name}</span>
                  <span className="encounter-picker-info">PG {hpLabel} · CA {entry.stats?.ca || '?'} · CR {entry.stats?.challenge || '?'}</span>
                </button>
              )
            })}
          </div>
          {pickerTotalPages > 1 && (
            <div className="glossary-pagination" style={{marginTop:6}}>
              <button className="dnd-btn-sm" disabled={pickerPage === 0} onClick={() => setPickerPage(p => p - 1)}>←</button>
              <span className="glossary-page-info">{pickerPage + 1}/{pickerTotalPages}</span>
              <button className="dnd-btn-sm" disabled={pickerPage >= pickerTotalPages - 1} onClick={() => setPickerPage(p => p + 1)}>→</button>
            </div>
          )}
        </div>
      )}

      {enemies.length === 0 && !showPicker && <div className="dnd-empty-sm">Sin enemigos — añade desde el glosario</div>}

      {sorted.length > 0 && (
        <div className="encounter-list">
          {sorted.map((enemy, idx) => (
            <EnemyCard key={enemy.id} enemy={enemy} index={idx}
              onUpdate={(updates) => onUpdate(enemy.id, updates)}
              onRemove={() => onRemove(enemy.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Componente: Card de enemigo en combate ─────────────────
function EnemyCard({ enemy, index, onUpdate, onRemove }) {
  const [dmg, setDmg] = useState('')
  const hpPct = enemy.maxHp ? Math.max(0, (enemy.hp / enemy.maxHp) * 100) : 100
  const hpColor = hpPct > 50 ? '#6ee7b7' : hpPct > 25 ? '#fbbf24' : '#f87171'
  const isDead = enemy.hp <= 0

  function applyDamage(amount) {
    const val = amount || parseInt(dmg) || 1
    onUpdate({ hp: Math.max(0, enemy.hp - val) })
    if (!amount) setDmg('')
  }
  function applyHeal(amount) {
    const val = amount || parseInt(dmg) || 1
    onUpdate({ hp: Math.min(enemy.maxHp || 999, enemy.hp + val) })
    if (!amount) setDmg('')
  }

  return (
    <div className={`enemy-card ${isDead ? 'enemy-dead' : ''}`}>
      <div className="enemy-card-header">
        <span className="enemy-init-badge" title="Iniciativa">{enemy.initiative}</span>
        <span className="enemy-card-name">{enemy.name}</span>
        <span className="enemy-card-ca" title="Clase de Armadura">CA {enemy.ca}</span>
        <button className="dnd-btn-sm dnd-btn-danger enemy-card-remove" onClick={onRemove}>✕</button>
      </div>

      <div className="enemy-hp-section">
        <div className="enemy-hp-bar-bg">
          <div className="enemy-hp-bar" style={{width:`${hpPct}%`, background: hpColor}} />
        </div>
        <span className="enemy-hp-text" style={{color: hpColor}}>
          {isDead ? '💀 Muerto' : `${enemy.hp} / ${enemy.maxHp} PG`}
        </span>
      </div>

      {!isDead && (
        <div className="enemy-dmg-row">
          <button className="dnd-btn-sm enemy-btn-dmg" onClick={() => applyDamage(1)} title="−1 PG">−💔</button>
          <input className="dnd-input enemy-dmg-input" type="number" min="1" placeholder="±" value={dmg}
            onChange={e => setDmg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') applyDamage() }} />
          <button className="dnd-btn-sm enemy-btn-heal" onClick={() => applyHeal(1)} title="+1 PG">+💚</button>
        </div>
      )}
    </div>
  )
}


// ── Componente: Ficha de personaje ─────────────────────────
function CharacterCard({ character, expanded, onToggle, onEdit, onDelete }) {
  const s = character.stats || {}
  const mod = v => { const m = Math.floor((v-10)/2); return m >= 0 ? `+${m}` : `${m}` }

  return (
    <div className={`glossary-card ${expanded ? 'expanded' : ''}`}>
      <div className="glossary-card-header" onClick={onToggle}>
        <span className="glossary-card-cat">🛡️</span>
        <span className="glossary-card-name">{character.name || 'Sin nombre'}</span>
        {character.race && <span className="glossary-card-cr">{character.race}</span>}
        {character.class && <span className="glossary-card-rarity">{character.class} Nv.{character.level || 1}</span>}
        <span className="glossary-card-chevron">{expanded ? '▾' : '▸'}</span>
      </div>

      {expanded && (
        <div className="glossary-card-body">
          {character.description && <p className="glossary-desc">{character.description}</p>}

          <div className="glossary-stats-block">
            <div className="glossary-stats-row">
              <span className="glossary-stat-badge">CA {s.ca}</span>
              <span className="glossary-stat-badge">PG {s.hp?.current ?? '?'} / {s.hp?.max ?? '?'}</span>
              <span className="glossary-stat-badge">Vel. {s.speed}</span>
              <span className="glossary-stat-badge">Comp. +{s.proficiencyBonus || 2}</span>
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

            {character.savingThrows && Object.values(character.savingThrows).some(v => v) && (
              <>
                <div className="glossary-section-label">Tiradas de salvación</div>
                <div className="glossary-skills">
                  {[['FUE','str'],['DES','dex'],['CON','con'],['INT','int'],['SAB','wis'],['CAR','cha']]
                    .filter(([,key]) => character.savingThrows[key])
                    .map(([label,key]) => {
                      const bonus = Math.floor(((s[key]||10)-10)/2) + (s.proficiencyBonus || 2)
                      return <span key={key} className="glossary-skill-badge">{label} {bonus >= 0 ? '+' : ''}{bonus}</span>
                    })}
                </div>
              </>
            )}

            {(character.skills||[]).length > 0 && (
              <div className="glossary-section-label">Habilidades</div>
            )}
            {(character.skills||[]).length > 0 && (
              <div className="glossary-skills">
                {character.skills.map((sk,i) => (
                  <span key={i} className="glossary-skill-badge">{sk.name} {sk.bonus >= 0 ? '+' : ''}{sk.bonus}</span>
                ))}
              </div>
            )}

            {(character.traits||[]).length > 0 && (
              <div className="glossary-section-label">Rasgos</div>
            )}
            {(character.traits||[]).map((t,i) => (
              <div key={i} className="glossary-trait">
                <strong>{t.name}.</strong> {t.description}
              </div>
            ))}

            {(character.actions||[]).length > 0 && (
              <div className="glossary-section-label">Acciones</div>
            )}
            {character.spellSlots && typeof character.spellSlots === 'object' && Object.values(character.spellSlots).some(v => v > 0) && (
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
            {(character.actions||[]).map((a,i) => (
              <div key={i} className="glossary-action">
                <div className="glossary-action-header">
                  <strong>{a.name}</strong>
                  {a.actionType && a.actionType !== 'normal' && <span className="glossary-action-type">{a.actionType === 'bonus' ? 'Adic.' : a.actionType === 'reaction' ? 'Reacción' : 'Ritual'}</span>}
                  {a.isSpell && <span className="glossary-action-spell">🔮 {a.spellLevel === 'truco' ? 'Truco' : `Nv.${a.spellLevel}`}</span>}
                  {a.range && <span className="glossary-action-range">{a.range}</span>}
                  {a.aoe && <span className="glossary-action-aoe">◎ {a.aoe}</span>}
                  {a.modifier != null && a.modifier !== '' && <span className="glossary-action-mod">{a.modifier >= 0 ? '+' : ''}{a.modifier}</span>}
                </div>
                <div className="glossary-action-dmg">
                  {a.damage && <span className="glossary-damage">⚔ {a.damage}</span>}
                  {a.secondaryDamage && <span className="glossary-damage glossary-damage-secondary">+ {a.secondaryDamage}</span>}
                </div>
                {a.note && <div className="glossary-action-note">{a.note}</div>}
              </div>
            ))}
          </div>

          {(character.abilities||[]).length > 0 && (
            <div className="glossary-abilities-block">
              <div className="glossary-section-label">Habilidades especiales</div>
              {character.abilities.map((ab,i) => (
                <div key={i} className="glossary-ability">
                  <strong>{ab.name}</strong>
                  {ab.uses && <span className="glossary-ability-uses">({ab.uses})</span>}
                  <span className="glossary-ability-desc">. {ab.description}</span>
                </div>
              ))}
            </div>
          )}

          {character.tags?.length > 0 && (
            <div className="glossary-tags">
              {character.tags.map((t,i) => <span key={i} className="glossary-tag">{t}</span>)}
            </div>
          )}

          <div className="glossary-card-actions">
            <button className="dnd-btn-sm" onClick={onEdit}>✏ Editar</button>
            <button className="dnd-btn-sm dnd-btn-danger" onClick={onDelete}>✕ Borrar</button>
          </div>
        </div>
      )}
    </div>
  )
}


// ── Componente: Modal de creación/edición de personaje ─────
function CharacterModal({ mode, character: initialChar, onSave, onClose, template, glossarySpells }) {
  const [ch, setCh] = useState(() => {
    if (mode === 'edit' && initialChar) return { ...initialChar }
    return template()
  })
  const [tagsInput, setTagsInput] = useState((initialChar?.tags || []).join(', '))
  const [showSpellPicker, setShowSpellPicker] = useState(false)

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

        <div className="dnd-modal-btns">
          <button className="dnd-btn-primary" onClick={handleSave}>Guardar</button>
          <button className="dnd-btn-cancel" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
