import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'

export function ImageManager({ data, onNavigate, onSend, onImageClick, onSoundAdded }) {
  const { user } = useAuth()
  const headers = { 'Content-Type': 'application/json', 'x-user-id': user?.id }
  const fileInputRef = useRef(null)
  const soundInputRef = useRef(null)
  const propInputRef = useRef(null)
  const [uploads, setUploads] = useState([])

  // ── Props state ──
  const [propsData, setPropsData] = useState(null)
  const [propsPath, setPropsPath] = useState('')
  const [propsCollapsed, setPropsCollapsed] = useState(true)
  const [propUploads, setPropUploads] = useState([])
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)

  useEffect(() => {
    if (!propsCollapsed) loadProps(propsPath)
  }, [propsCollapsed])

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
    if (!newFolderName.trim()) return
    try {
      await fetch('/api/dnd/props/folder', {
        method: 'POST', headers,
        body: JSON.stringify({ name: newFolderName.trim(), path: propsPath })
      })
      setNewFolderName('')
      setShowNewFolder(false)
      loadProps(propsPath)
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
        <button className="dnd-btn-sm" style={{marginLeft:'auto'}} onClick={() => fileInputRef.current?.click()}>📤 Subir imágenes</button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{display:'none'}} />
      </div>
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
                <button className="dnd-btn-sm" style={{marginLeft:'auto'}} onClick={() => propInputRef.current?.click()}>📤 Subir props</button>
                <input ref={propInputRef} type="file" accept="image/*" multiple onChange={handlePropFiles} style={{display:'none'}} />
                <button className="dnd-btn-sm" style={{marginLeft:4}} onClick={() => setShowNewFolder(v => !v)} title="Nueva carpeta">📁+</button>
              </div>
              {showNewFolder && (
                <div style={{display:'flex',gap:4,marginBottom:6}}>
                  <input className="dnd-input" style={{flex:1,fontSize:'.82rem'}} placeholder="Nombre de carpeta…" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createPropFolder()} />
                  <button className="dnd-btn-sm" onClick={createPropFolder}>✓</button>
                  <button className="dnd-btn-sm" onClick={() => { setShowNewFolder(false); setNewFolderName('') }}>✕</button>
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
