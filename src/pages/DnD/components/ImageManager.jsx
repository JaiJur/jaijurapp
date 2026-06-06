import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'

// ── Componente de Datos de Referencia (SRD) ──
function RefDataSection() {
  const { user } = useAuth()
  const headers = { 'Content-Type': 'application/json', 'x-user-id': user?.id }
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('weapons')
  const [data, setData] = useState(null)
  const [expandedItem, setExpandedItem] = useState(null)
  const [editItem, setEditItem] = useState(null) // null | 'new' | item object
  const [editDraft, setEditDraft] = useState({})

  async function loadData() {
    try { const r = await fetch('/api/dnd/refdata', { headers }); if (r.ok) setData(await r.json()) } catch {}
  }
  useEffect(() => { if (open && !data) loadData() }, [open])

  async function saveItem() {
    const type = tab
    const isNew = !editDraft.id
    const url = isNew ? `/api/dnd/refdata/${type}` : `/api/dnd/refdata/${type}/${editDraft.id}`
    const method = isNew ? 'POST' : 'PUT'
    // Limpiar campos según tipo
    const body = { ...editDraft }
    if (type === 'weapons' && typeof body.properties === 'string') body.properties = body.properties.split(',').map(s => s.trim()).filter(Boolean)
    if (type === 'backgrounds' && typeof body.skillProficiencies === 'string') body.skillProficiencies = body.skillProficiencies.split(',').map(s => s.trim()).filter(Boolean)
    if (type === 'backgrounds' && typeof body.toolProficiencies === 'string') body.toolProficiencies = body.toolProficiencies.split(',').map(s => s.trim()).filter(Boolean)
    try {
      const r = await fetch(url, { method, headers, body: JSON.stringify(body) })
      if (r.ok) { setEditItem(null); loadData() }
    } catch {}
  }

  async function deleteItem(type, id) {
    if (!confirm('¿Eliminar este elemento?')) return
    try { await fetch(`/api/dnd/refdata/${type}/${id}`, { method: 'DELETE', headers }); loadData() } catch {}
  }

  function openNew() {
    const defaults = tab === 'weapons'
      ? { name:'',damage:'',damageType:'Cortante',mastery:'',masteryDesc:'',properties:[],category:'Simple cuerpo a cuerpo',simple:true }
      : tab === 'armor'
      ? { name:'',ac:'',acBase:10,category:'Ligera',stealthDisadv:false,strReq:null }
      : { name:'',desc:'',skillProficiencies:[],toolProficiencies:[],languages:0,equipment:'',feat:'',featDesc:'',abilityScores:'+2/+1',source:'Homebrew' }
    setEditDraft(defaults)
    setEditItem('new')
  }

  function openEdit(item) {
    const draft = { ...item }
    if (tab === 'weapons' && Array.isArray(draft.properties)) draft.properties = draft.properties.join(', ')
    if (tab === 'backgrounds' && Array.isArray(draft.skillProficiencies)) draft.skillProficiencies = draft.skillProficiencies.join(', ')
    if (tab === 'backgrounds' && Array.isArray(draft.toolProficiencies)) draft.toolProficiencies = draft.toolProficiencies.join(', ')
    setEditDraft(draft)
    setEditItem(item)
  }

  function field(key, label, opts = {}) {
    const val = editDraft[key] ?? ''
    const inputProps = { className:'dnd-input', style:{fontSize:'.82rem',padding:'6px 8px',...(opts.style||{})}, value: val,
      onChange: e => setEditDraft(d => ({...d, [key]: opts.type === 'number' ? (parseInt(e.target.value)||0) : opts.type === 'bool' ? e.target.checked : e.target.value}))
    }
    if (opts.type === 'bool') return <label style={{display:'flex',gap:6,alignItems:'center',fontSize:'.8rem',color:'#a09880'}}><input type="checkbox" checked={!!val} onChange={inputProps.onChange} />{label}</label>
    if (opts.type === 'textarea') return <div style={{marginBottom:4}}><span style={{fontSize:'.72rem',color:'#8b7d5c'}}>{label}</span><textarea {...inputProps} rows={3} style={{...inputProps.style,width:'100%',resize:'vertical'}} /></div>
    if (opts.type === 'select') return <div style={{marginBottom:4}}><span style={{fontSize:'.72rem',color:'#8b7d5c'}}>{label}</span><select {...inputProps} style={{...inputProps.style,width:'100%'}}>{opts.options.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
    return <div style={{marginBottom:4}}><span style={{fontSize:'.72rem',color:'#8b7d5c'}}>{label}</span><input {...inputProps} type={opts.type === 'number' ? 'number' : 'text'} style={{...inputProps.style,width:'100%'}} /></div>
  }

  const tabs = [
    { id: 'weapons', icon: '⚔️', label: 'Armas' },
    { id: 'armor', icon: '🛡️', label: 'Armaduras' },
    { id: 'backgrounds', icon: '📜', label: 'Trasfondos' },
  ]

  return (
    <div className="mm-sounds-section">
      <div className="mm-sounds-header" onClick={() => setOpen(o => !o)} style={{cursor:'pointer'}}>
        <span className="mm-sounds-title">{open ? '▼' : '▶'} 📚 Datos de Referencia (SRD 2024)</span>
      </div>
      {open && (
        <div className="ref-data-browser">
          <div className="ref-data-tabs">
            {tabs.map(t => (
              <button key={t.id} className={`ref-data-tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => { setTab(t.id); setExpandedItem(null); setEditItem(null) }}>{t.icon} {t.label}</button>
            ))}
            <button className="dnd-btn-sm" style={{marginLeft:'auto'}} onClick={openNew}>+ {tabs.find(t=>t.id===tab)?.icon}</button>
          </div>

          {/* ── Modal edición ── */}
          {editItem && (
            <div className="ref-data-edit-form">
              <div style={{fontWeight:600,fontSize:'.85rem',color:'#c8a96e',marginBottom:8}}>{editDraft.id ? '✏️ Editar' : '➕ Nuevo'} — {tabs.find(t=>t.id===tab)?.label}</div>
              {tab === 'weapons' && <>
                {field('name','Nombre')}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                  {field('damage','Daño')}
                  {field('damageType','Tipo de daño',{type:'select',options:['Cortante','Perforante','Contundente']})}
                </div>
                {field('mastery','Maestría')}
                {field('masteryDesc','Descripción maestría',{type:'textarea'})}
                {field('properties','Propiedades (separadas por coma)')}
                {field('category','Categoría',{type:'select',options:['Simple cuerpo a cuerpo','Simple a distancia','Marcial cuerpo a cuerpo','Marcial a distancia','Marcial a distancia (Fuego)']})}
                {field('simple','Arma simple',{type:'bool'})}
              </>}
              {tab === 'armor' && <>
                {field('name','Nombre')}
                {field('ac','CA (texto)')}
                {field('acBase','CA base',{type:'number'})}
                {field('category','Categoría',{type:'select',options:['Ligera','Media','Pesada','Escudo']})}
                {field('stealthDisadv','Desventaja en Sigilo',{type:'bool'})}
                {field('strReq','Requisito FUE',{type:'number'})}
              </>}
              {tab === 'backgrounds' && <>
                {field('name','Nombre')}
                {field('desc','Descripción',{type:'textarea'})}
                {field('skillProficiencies','Competencias (separadas por coma)')}
                {field('toolProficiencies','Herramientas (separadas por coma)')}
                {field('languages','Idiomas',{type:'number'})}
                {field('equipment','Equipo')}
                {field('feat','Dote')}
                {field('featDesc','Descripción de la dote',{type:'textarea'})}
                {field('abilityScores','Características')}
              </>}
              <div style={{display:'flex',gap:6,marginTop:8}}>
                <button className="dnd-btn-sm" style={{color:'#4ade80',borderColor:'rgba(74,222,128,0.3)'}} onClick={saveItem}>✓ Guardar</button>
                <button className="dnd-btn-sm" onClick={() => setEditItem(null)}>✕ Cancelar</button>
              </div>
            </div>
          )}

          {tab === 'weapons' && data && !editItem && (
            <div className="ref-data-list">
              {['Simple cuerpo a cuerpo','Simple a distancia','Marcial cuerpo a cuerpo','Marcial a distancia','Marcial a distancia (Fuego)'].map(cat => {
                const items = data.weapons.filter(w => w.category === cat)
                if (!items.length) return null
                return (
                  <div key={cat} className="ref-data-group">
                    <div className="ref-data-group-title">{cat}</div>
                    {items.map(w => (
                      <div key={w.id} className={`ref-data-item ${expandedItem === w.id ? 'expanded' : ''}`}
                        onClick={() => setExpandedItem(expandedItem === w.id ? null : w.id)}>
                        <div className="ref-data-item-row">
                          <span className="ref-data-item-name">{w.name}</span>
                          <span className="ref-data-item-meta">{w.damage} {w.damageType}</span>
                          {w.mastery && <span className="ref-data-item-mastery">{w.mastery}</span>}
                        </div>
                        {expandedItem === w.id && (
                          <div className="ref-data-item-detail">
                            {w.properties?.length > 0 && <div className="ref-data-props">{(Array.isArray(w.properties) ? w.properties : []).join(' · ')}</div>}
                            {w.masteryDesc && <div className="ref-data-mastery-desc"><strong>🎯 {w.mastery}:</strong> {w.masteryDesc}</div>}
                            <div className="ref-data-item-actions">
                              <button className="dnd-btn-sm" onClick={e => { e.stopPropagation(); openEdit(w) }}>✏️</button>
                              <button className="dnd-btn-sm" style={{color:'#f87171',borderColor:'rgba(248,113,113,0.3)'}} onClick={e => { e.stopPropagation(); deleteItem('weapons', w.id) }}>🗑</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'armor' && data && !editItem && (
            <div className="ref-data-list">
              {['Ligera','Media','Pesada','Escudo'].map(cat => {
                const items = data.armor.filter(a => a.category === cat)
                if (!items.length) return null
                return (
                  <div key={cat} className="ref-data-group">
                    <div className="ref-data-group-title">{cat}</div>
                    {items.map(a => (
                      <div key={a.id} className={`ref-data-item ${expandedItem === a.id ? 'expanded' : ''}`}
                        onClick={() => setExpandedItem(expandedItem === a.id ? null : a.id)}>
                        <div className="ref-data-item-row">
                          <span className="ref-data-item-name">{a.name}</span>
                          <span className="ref-data-item-meta">CA {a.ac}</span>
                          {a.stealthDisadv && <span className="ref-data-item-tag ref-data-tag-warn">Sigilo ⚠</span>}
                          {a.strReq && <span className="ref-data-item-tag">FUE {a.strReq}</span>}
                        </div>
                        {expandedItem === a.id && (
                          <div className="ref-data-item-detail">
                            <div className="ref-data-item-actions">
                              <button className="dnd-btn-sm" onClick={e => { e.stopPropagation(); openEdit(a) }}>✏️</button>
                              <button className="dnd-btn-sm" style={{color:'#f87171',borderColor:'rgba(248,113,113,0.3)'}} onClick={e => { e.stopPropagation(); deleteItem('armor', a.id) }}>🗑</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'backgrounds' && data && !editItem && (
            <div className="ref-data-list">
              {(data.backgrounds || []).map(bg => (
                <div key={bg.id} className={`ref-data-item ${expandedItem === bg.id ? 'expanded' : ''}`}
                  onClick={() => setExpandedItem(expandedItem === bg.id ? null : bg.id)}>
                  <div className="ref-data-item-row">
                    <span className="ref-data-item-name">{bg.name}</span>
                    <span className="ref-data-item-meta">{(bg.skillProficiencies||[]).join(', ')}</span>
                  </div>
                  {expandedItem === bg.id && (
                    <div className="ref-data-item-detail">
                      <p style={{margin:'0 0 6px',color:'#a09880',fontSize:'.78rem',lineHeight:1.5}}>{bg.desc}</p>
                      <div className="ref-data-props">🎓 Competencias: {(bg.skillProficiencies||[]).join(', ')}</div>
                      <div className="ref-data-props">🔧 Herramientas: {(bg.toolProficiencies||[]).join(', ')}</div>
                      {bg.languages > 0 && <div className="ref-data-props">🗣️ Idiomas: {bg.languages}</div>}
                      <div className="ref-data-props">🎒 Equipo: {bg.equipment}</div>
                      {bg.feat && <div className="ref-data-mastery-desc"><strong>⭐ {bg.feat}:</strong> {bg.featDesc}</div>}
                      <div className="ref-data-props">📊 Características: {bg.abilityScores}</div>
                      <div className="ref-data-item-actions">
                        <button className="dnd-btn-sm" onClick={e => { e.stopPropagation(); openEdit(bg) }}>✏️</button>
                        <button className="dnd-btn-sm" style={{color:'#f87171',borderColor:'rgba(248,113,113,0.3)'}} onClick={e => { e.stopPropagation(); deleteItem('backgrounds', bg.id) }}>🗑</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!data && <div className="dnd-empty-sm">Cargando datos...</div>}
        </div>
      )}
    </div>
  )
}

export function ImageManager({ data, onNavigate, onSend, onImageClick, onSoundAdded }) {
  const { user } = useAuth()
  const headers = { 'Content-Type': 'application/json', 'x-user-id': user?.id }
  const fileInputRef = useRef(null)
  const soundInputRef = useRef(null)
  const propInputRef = useRef(null)
  const [uploads, setUploads] = useState([])
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)

  // ── Props state ──
  const [propsData, setPropsData] = useState(null)
  const [propsPath, setPropsPath] = useState('')
  const [propsCollapsed, setPropsCollapsed] = useState(true)
  const [propUploads, setPropUploads] = useState([])
  const [propNewFolderName, setPropNewFolderName] = useState('')
  const [showPropNewFolder, setShowPropNewFolder] = useState(false)

  // ── Floors (texturas de suelo) state ──
  const [floorsData, setFloorsData] = useState(null)
  const [floorsCollapsed, setFloorsCollapsed] = useState(true)
  const [floorUploads, setFloorUploads] = useState([])
  const floorInputRef = useRef(null)

  useEffect(() => {
    if (!propsCollapsed) loadProps(propsPath)
  }, [propsCollapsed])

  useEffect(() => {
    if (!floorsCollapsed) loadFloors()
  }, [floorsCollapsed])

  async function loadFloors() {
    try {
      const r = await fetch('/api/assets/floors')
      if (r.ok) setFloorsData(await r.json())
    } catch {}
  }

  async function handleFloorFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const entries = files.map(f => ({ name: f.name, status: 'wait', progress: 0, error: '' }))
    setFloorUploads(prev => [...prev, ...entries])
    const startIdx = floorUploads.length
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const idx = startIdx + i
      setFloorUploads(prev => prev.map((u, j) => j === idx ? { ...u, status: 'sending', progress: 10 } : u))
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('Error leyendo archivo'))
          reader.readAsDataURL(file)
        })
        setFloorUploads(prev => prev.map((u, j) => j === idx ? { ...u, progress: 50 } : u))
        const res = await fetch('/api/dnd/floors/upload', {
          method: 'POST', headers,
          body: JSON.stringify({ data: base64, filename: file.name })
        })
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || res.statusText) }
        setFloorUploads(prev => prev.map((u, j) => j === idx ? { ...u, status: 'success', progress: 100 } : u))
      } catch (err) {
        setFloorUploads(prev => prev.map((u, j) => j === idx ? { ...u, status: 'error', progress: 0, error: err.message } : u))
      }
    }
    loadFloors()
    if (floorInputRef.current) floorInputRef.current.value = ''
  }

  async function deleteFloor(file) {
    if (!confirm(`¿Eliminar la textura "${file}"?`)) return
    try {
      await fetch(`/api/dnd/floors/${encodeURIComponent(file)}`, { method: 'DELETE', headers })
      loadFloors()
    } catch {}
  }

  async function loadProps(path) {
    try {
      const q = path ? `?path=${encodeURIComponent(path)}` : ''
      const r = await fetch(`/api/assets/props${q}`)
      if (r.ok) { setPropsData(await r.json()); setPropsPath(path) }
    } catch {}
  }

  function navigateProps(path) { loadProps(path) }

  async function handlePropFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const entries = files.map(f => ({ name: f.name, status: 'wait', progress: 0, error: '' }))
    setPropUploads(prev => [...prev, ...entries])
    const startIdx = propUploads.length
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const idx = startIdx + i
      setPropUploads(prev => prev.map((u, j) => j === idx ? { ...u, status: 'sending', progress: 10 } : u))
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('Error leyendo archivo'))
          reader.readAsDataURL(file)
        })
        setPropUploads(prev => prev.map((u, j) => j === idx ? { ...u, progress: 50 } : u))
        const res = await fetch('/api/dnd/props/upload', {
          method: 'POST', headers,
          body: JSON.stringify({ data: base64, filename: file.name, path: propsPath })
        })
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || res.statusText) }
        setPropUploads(prev => prev.map((u, j) => j === idx ? { ...u, status: 'success', progress: 100 } : u))
      } catch (err) {
        setPropUploads(prev => prev.map((u, j) => j === idx ? { ...u, status: 'error', progress: 0, error: err.message } : u))
      }
    }
    loadProps(propsPath)
    if (propInputRef.current) propInputRef.current.value = ''
  }

  async function createPropFolder() {
    if (!propNewFolderName.trim()) return
    try {
      await fetch('/api/dnd/props/folder', {
        method: 'POST', headers,
        body: JSON.stringify({ name: propNewFolderName.trim(), path: propsPath })
      })
      setPropNewFolderName('')
      setShowPropNewFolder(false)
      loadProps(propsPath)
    } catch {}
  }

  async function createImageFolder() {
    if (!newFolderName.trim()) return
    try {
      await fetch('/api/dnd/images/folder', {
        method: 'POST', headers,
        body: JSON.stringify({ name: newFolderName.trim(), path: data.path || '' })
      })
      setNewFolderName('')
      setShowNewFolder(false)
      onNavigate(data.path || '')
    } catch {}
  }

  if (!data) return <div className="dnd-empty-sm">Cargando...</div>

  const crumbs = data.path ? data.path.split('/') : []
  const parentPath = crumbs.length > 1 ? crumbs.slice(0, -1).join('/') : ''

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const entries = files.map(f => ({ name: f.name, status: 'wait', progress: 0, error: '' }))
    setUploads(prev => [...prev, ...entries])
    const startIdx = uploads.length
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const idx = startIdx + i
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
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || res.statusText) }
        setUploads(prev => prev.map((u, j) => j === idx ? { ...u, status: 'success', progress: 100 } : u))
      } catch (err) {
        setUploads(prev => prev.map((u, j) => j === idx ? { ...u, status: 'error', progress: 0, error: err.message } : u))
      }
    }
    onNavigate(data.path || '')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function clearUploads() { setUploads(prev => prev.filter(u => u.status === 'sending')) }

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
        <div style={{marginLeft:'auto',display:'flex',gap:4}}>
          <button className="dnd-btn-sm" onClick={() => setShowNewFolder(v => !v)} title="Nueva carpeta">+ 📁</button>
          <button className="dnd-btn-sm" onClick={() => fileInputRef.current?.click()}>+ 🖼</button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{display:'none'}} />
        </div>
      </div>
      {showNewFolder && (
        <div style={{display:'flex',gap:4,marginBottom:6}}>
          <input className="dnd-input" style={{flex:1,fontSize:'.82rem',padding:'6px 8px'}} placeholder="Nombre de carpeta…" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createImageFolder()} autoFocus />
          <button className="dnd-btn-sm" onClick={createImageFolder}>✓</button>
          <button className="dnd-btn-sm" onClick={() => { setShowNewFolder(false); setNewFolderName('') }}>✕</button>
        </div>
      )}
      {data.path && <button className="dnd-folder-up" onClick={() => onNavigate(parentPath)}>⬆ Subir</button>}
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
              {u.status === 'sending' && <div className="img-upload-progress-bar"><div className="img-upload-progress-fill" style={{width: `${u.progress}%`}} /></div>}
              {u.status === 'success' && <span className="img-upload-pct">100%</span>}
              {u.status === 'error' && <span className="img-upload-error" title={u.error}>Error</span>}
              {u.status === 'wait' && <span className="img-upload-pct">—</span>}
            </div>
          ))}
        </div>
      )}
      {data.folders.length > 0 && (
        <div className="dnd-folder-list">
          {data.folders.map(f => <button key={f.path} className="dnd-folder" onClick={() => onNavigate(f.path)}>📁 {f.name}</button>)}
        </div>
      )}
      {data.images.length > 0 && (
        <div className="dnd-image-grid">
          {data.images.map(img => (
            <div key={img.url} className="dnd-image-thumb" title={img.name} onClick={() => onImageClick(img)}>
              <img src={img.url} alt={img.name} loading="lazy" />
              <div className="dnd-image-overlay"><span className="dnd-image-name">{img.name}</span></div>
            </div>
          ))}
        </div>
      )}
      {data.folders.length === 0 && data.images.length === 0 && !data.sounds?.length && <div className="dnd-empty-sm">Carpeta vacía</div>}
      <div className="mm-sounds-section">
        <div className="mm-sounds-header">
          <span className="mm-sounds-title">🔊 Sonidos ({data.sounds?.length || 0})</span>
          <div style={{marginLeft:'auto'}}>
            <button className="dnd-btn-sm" onClick={() => soundInputRef.current?.click()}>+ 🔊</button>
          </div>
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
      {/* ── Sección Texturas de Suelo (Floors) ── */}
      <div className="mm-sounds-section">
        <div className="mm-sounds-header" onClick={() => setFloorsCollapsed(c => !c)} style={{cursor:'pointer'}}>
          <span className="mm-sounds-title">{floorsCollapsed ? '▶' : '▼'} 🎨 Texturas de Suelo ({floorsData?.length ?? '…'})</span>
          {!floorsCollapsed && (
            <div style={{marginLeft:'auto'}} onClick={e => e.stopPropagation()}>
              <button className="dnd-btn-sm" onClick={() => floorInputRef.current?.click()}>+ 🖼</button>
              <input ref={floorInputRef} type="file" accept=".png,.jpg,.jpeg,.webp" multiple onChange={handleFloorFiles} style={{display:'none'}} />
            </div>
          )}
        </div>
        {!floorsCollapsed && (
          <div className="mm-props-browser">
            {floorUploads.length > 0 && (
              <div className="img-upload-table" style={{marginBottom:6}}>
                <div className="img-upload-table-header">
                  <span>Subidas texturas</span>
                  <button className="dnd-btn-sm" onClick={() => setFloorUploads(prev => prev.filter(u => u.status === 'sending'))}>✕</button>
                </div>
                {floorUploads.map((u, i) => (
                  <div key={i} className={`img-upload-row img-upload-${u.status}`}>
                    <span className="img-upload-status">{statusIcons[u.status]}</span>
                    <span className="img-upload-name">{u.name}</span>
                    {u.status === 'sending' && <div className="img-upload-progress-bar"><div className="img-upload-progress-fill" style={{width:`${u.progress}%`}} /></div>}
                    {u.status === 'success' && <span className="img-upload-pct">100%</span>}
                    {u.status === 'error' && <span className="img-upload-error" title={u.error}>Error</span>}
                  </div>
                ))}
              </div>
            )}
            {floorsData && floorsData.length > 0 ? (
              <div className="dnd-image-grid">
                {floorsData.map(f => (
                  <div key={f.file} className="dnd-image-thumb floor-thumb" title={f.name}>
                    <img src={f.url} alt={f.name} loading="lazy" />
                    <div className="dnd-image-overlay">
                      <span className="dnd-image-name">{f.name}</span>
                      <button className="floor-delete-btn" onClick={e => { e.stopPropagation(); deleteFloor(f.file) }} title="Eliminar">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : floorsData ? (
              <div className="dnd-empty-sm">Sin texturas de suelo</div>
            ) : (
              <div className="dnd-empty-sm">Cargando...</div>
            )}
          </div>
        )}
      </div>
      {/* ── Sección Props (Map Editor) ── */}
      <div className="mm-sounds-section">
        <div className="mm-sounds-header" onClick={() => setPropsCollapsed(c => !c)} style={{cursor:'pointer'}}>
          <span className="mm-sounds-title">{propsCollapsed ? '▶' : '▼'} 🧩 Props — Editor de Mapas ({propsData?.files?.length ?? '…'})</span>
        </div>
        {!propsCollapsed && propsData && (() => {
          const pCrumbs = propsData.path ? propsData.path.split('/') : []
          const pParent = pCrumbs.length > 1 ? pCrumbs.slice(0, -1).join('/') : ''
          const statusIcons = { wait: '⏳', sending: '📤', success: '✅', error: '❌' }
          return (
            <div className="mm-props-browser">
              <div className="dnd-breadcrumb" style={{marginBottom:6}}>
                <button className="dnd-crumb" onClick={() => navigateProps('')}>🏠</button>
                {pCrumbs.map((c, i) => (
                  <span key={i}>
                    <span className="dnd-crumb-sep"> / </span>
                    <button className="dnd-crumb" onClick={() => navigateProps(pCrumbs.slice(0, i + 1).join('/'))}>{c}</button>
                  </span>
                ))}
                <div style={{marginLeft:'auto',display:'flex',gap:4}}>
                  <button className="dnd-btn-sm" onClick={() => setShowPropNewFolder(v => !v)} title="Nueva carpeta">+ 📁</button>
                  <button className="dnd-btn-sm" onClick={() => propInputRef.current?.click()}>+ 🖼</button>
                  <input ref={propInputRef} type="file" accept="image/*" multiple onChange={handlePropFiles} style={{display:'none'}} />
                </div>
              </div>
              {showPropNewFolder && (
                <div style={{display:'flex',gap:4,marginBottom:6}}>
                  <input className="dnd-input" style={{flex:1,fontSize:'.82rem',padding:'6px 8px'}} placeholder="Nombre de carpeta…" value={propNewFolderName} onChange={e => setPropNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createPropFolder()} autoFocus />
                  <button className="dnd-btn-sm" onClick={createPropFolder}>✓</button>
                  <button className="dnd-btn-sm" onClick={() => { setShowPropNewFolder(false); setPropNewFolderName('') }}>✕</button>
                </div>
              )}
              {propsData.path && <button className="dnd-folder-up" onClick={() => navigateProps(pParent)}>⬆ Subir</button>}
              {propUploads.length > 0 && (
                <div className="img-upload-table" style={{marginBottom:6}}>
                  <div className="img-upload-table-header">
                    <span>Subidas props</span>
                    <button className="dnd-btn-sm" onClick={() => setPropUploads(prev => prev.filter(u => u.status === 'sending'))}>✕</button>
                  </div>
                  {propUploads.map((u, i) => (
                    <div key={i} className={`img-upload-row img-upload-${u.status}`}>
                      <span className="img-upload-status">{statusIcons[u.status]}</span>
                      <span className="img-upload-name">{u.name}</span>
                      {u.status === 'sending' && <div className="img-upload-progress-bar"><div className="img-upload-progress-fill" style={{width:`${u.progress}%`}} /></div>}
                      {u.status === 'success' && <span className="img-upload-pct">100%</span>}
                      {u.status === 'error' && <span className="img-upload-error" title={u.error}>Error</span>}
                    </div>
                  ))}
                </div>
              )}
              {(propsData.folders || []).length > 0 && (
                <div className="dnd-folder-list">
                  {propsData.folders.map(f => <button key={f.path} className="dnd-folder" onClick={() => navigateProps(f.path)}>📁 {f.name}</button>)}
                </div>
              )}
              {(propsData.files || []).length > 0 && (
                <div className="dnd-image-grid">
                  {propsData.files.map(p => (
                    <div key={p.url} className="dnd-image-thumb" title={p.name}>
                      <img src={p.url} alt={p.name} loading="lazy" />
                      <div className="dnd-image-overlay"><span className="dnd-image-name">{p.name}</span></div>
                    </div>
                  ))}
                </div>
              )}
              {(propsData.folders || []).length === 0 && (propsData.files || []).length === 0 && <div className="dnd-empty-sm">Carpeta vacía</div>}
            </div>
          )
        })()}
      </div>
      {/* ── Datos de Referencia SRD ── */}
      <RefDataSection />
    </div>
  )
}

export function ImageAssignModal({ img, campaigns, onAssign, onSend, onClose }) {
  const [selectedCampaign, setSelectedCampaign] = useState(campaigns[0]?.id || null)
  const selectedCamp = campaigns.find(c => c.id === selectedCampaign)
  return (
    <div className="dnd-modal-overlay" onClick={onClose}>
      <div className="dnd-modal img-assign-modal" onClick={e => e.stopPropagation()}>
        <div className="img-assign-preview"><img src={img.url} alt={img.name} /></div>
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
            ) : <div className="dnd-empty-sm">Sin capítulos en esta campaña</div>}
          </div>
        )}
        <div className="dnd-modal-btns"><button className="dnd-btn-cancel" onClick={onClose}>Cerrar</button></div>
      </div>
    </div>
  )
}
