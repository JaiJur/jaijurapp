import React, { useState, useRef } from 'react'
import { SOUND_CATEGORIES, SOUND_ICONS } from './shared'

export default function SoundModal({ mode, sound, browsePath, browseData, onBrowse, onSave, onDelete, onClose }) {
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
