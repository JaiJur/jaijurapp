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
    if (type === 'classes') {
      if (typeof body.savingThrows === 'string') body.savingThrows = body.savingThrows.split(',').map(s => s.trim()).filter(Boolean)
      if (typeof body.armorProficiencies === 'string') body.armorProficiencies = body.armorProficiencies.split(',').map(s => s.trim()).filter(Boolean)
      if (typeof body.weaponProficiencies === 'string') body.weaponProficiencies = body.weaponProficiencies.split(',').map(s => s.trim()).filter(Boolean)
      if (typeof body.toolProficiencies === 'string') body.toolProficiencies = body.toolProficiencies.split(',').map(s => s.trim()).filter(Boolean)
      if (typeof body.skillOptions === 'string') body.skillOptions = body.skillOptions.split(',').map(s => s.trim()).filter(Boolean)
      // Generar id del nombre si es nueva
      if (!body.id && body.name) body.id = body.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')
      // Inicializar 20 niveles vacíos si no tiene
      if (!body.levels || Object.keys(body.levels).length === 0) {
        body.levels = {}
        for (let i = 1; i <= 20; i++) body.levels[i] = { profBonus: i <= 4 ? 2 : i <= 8 ? 3 : i <= 12 ? 4 : i <= 16 ? 5 : 6, slots: [], features: [] }
      }
    }
    try {
      const r = await fetch(url, { method, headers, body: JSON.stringify(body) })
      if (r.ok) { setEditItem(null); loadData() }
      else { const err = await r.json().catch(() => ({})); alert(err.error || `Error al guardar (${r.status})`) }
    } catch { alert('Error de conexión al guardar') }
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
      : tab === 'classes'
      ? { name:'',nameEn:'',hitDie:8,primaryAbility:'',savingThrows:'',armorProficiencies:'',weaponProficiencies:'',toolProficiencies:'',skillChoices:2,skillOptions:'',startingEquipment:'',spellcaster:false,spellcastingAbility:'',subclassLevel:3,subclassName:'',source:'Homebrew',levels:{},subclasses:[] }
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

  const [classEditModal, setClassEditModal] = useState(null) // null | clase completa
  const [classDraft, setClassDraft] = useState(null)
  const [classEditLevel, setClassEditLevel] = useState(null) // nivel abierto en editor

  function openClassEdit(cls) {
    // Deep copy para edición segura
    const draft = JSON.parse(JSON.stringify(cls))
    // Asegurar que cada nivel tiene traitDescs {}
    Object.keys(draft.levels).forEach(lv => {
      if (!draft.levels[lv].traitDescs) draft.levels[lv].traitDescs = {}
    })
    if (!draft.baseTraits) draft.baseTraits = []
    if (!draft.subclasses) draft.subclasses = []
    draft.subclasses.forEach(s => { if (!s.features) s.features = []; if (!s.spellGrants) s.spellGrants = [] })
    setClassDraft(draft)
    setClassEditModal(cls)
    setClassEditLevel(null)
  }

  async function saveClassEdit() {
    try {
      const r = await fetch(`/api/dnd/refdata/classes/${classDraft.id}`, {
        method: 'PUT', headers, body: JSON.stringify(classDraft)
      })
      if (r.ok) { setClassEditModal(null); setClassDraft(null); loadData() }
    } catch {}
  }

  function updateLevelFeatureName(lv, idx, value) {
    setClassDraft(d => {
      const features = [...(d.levels[lv].features || [])]
      features[idx] = { ...features[idx], name: value }
      return { ...d, levels: { ...d.levels, [lv]: { ...d.levels[lv], features } } }
    })
  }

  function updateLevelFeatureDesc(lv, idx, value) {
    setClassDraft(d => {
      const features = [...(d.levels[lv].features || [])]
      features[idx] = { ...features[idx], desc: value }
      return { ...d, levels: { ...d.levels, [lv]: { ...d.levels[lv], features } } }
    })
  }

  function addLevelFeature(lv) {
    setClassDraft(d => {
      const features = [...(d.levels[lv].features || []), { name: '', desc: '' }]
      return { ...d, levels: { ...d.levels, [lv]: { ...d.levels[lv], features } } }
    })
  }

  function removeLevelFeature(lv, idx) {
    setClassDraft(d => {
      const features = (d.levels[lv].features || []).filter((_, i) => i !== idx)
      return { ...d, levels: { ...d.levels, [lv]: { ...d.levels[lv], features } } }
    })
  }

  function updateLevelSlot(lv, idx, field, value) {
    setClassDraft(d => {
      const slots = [...(d.levels[lv].slots || [])]
      slots[idx] = { ...slots[idx], [field]: field === 'count' ? (value === '' ? null : parseInt(value) || 0) : value }
      return { ...d, levels: { ...d.levels, [lv]: { ...d.levels[lv], slots } } }
    })
  }

  function addLevelSlot(lv) {
    setClassDraft(d => {
      const slots = [...(d.levels[lv].slots || []), { name: '', count: 1 }]
      return { ...d, levels: { ...d.levels, [lv]: { ...d.levels[lv], slots } } }
    })
  }

  function removeLevelSlot(lv, idx) {
    setClassDraft(d => {
      const slots = (d.levels[lv].slots || []).filter((_, i) => i !== idx)
      return { ...d, levels: { ...d.levels, [lv]: { ...d.levels[lv], slots } } }
    })
  }

  function updateBaseTrait(idx, field, value) {
    setClassDraft(d => {
      const bt = [...(d.baseTraits || [])]
      bt[idx] = { ...bt[idx], [field]: value }
      return { ...d, baseTraits: bt }
    })
  }

  function addBaseTrait() {
    setClassDraft(d => ({ ...d, baseTraits: [...(d.baseTraits || []), { name: '', desc: '' }] }))
  }

  function removeBaseTrait(idx) {
    setClassDraft(d => ({ ...d, baseTraits: (d.baseTraits || []).filter((_, i) => i !== idx) }))
  }

  // ── Subclases ──
  function addSubclass() {
    setClassDraft(d => ({ ...d, subclasses: [...(d.subclasses || []), { id: `sub_${Date.now()}`, name: '', desc: '', features: [], spellGrants: [] }] }))
  }
  function removeSubclass(idx) {
    setClassDraft(d => ({ ...d, subclasses: (d.subclasses || []).filter((_, i) => i !== idx) }))
  }
  function updateSubclass(idx, field, value) {
    setClassDraft(d => {
      const subs = [...(d.subclasses || [])]
      subs[idx] = { ...subs[idx], [field]: value }
      return { ...d, subclasses: subs }
    })
  }
  function addSubclassFeature(idx) {
    setClassDraft(d => {
      const subs = [...(d.subclasses || [])]
      subs[idx] = { ...subs[idx], features: [...(subs[idx].features || []), { fromLevel: d.subclassLevel || 3, name: '', desc: '' }] }
      return { ...d, subclasses: subs }
    })
  }
  function updateSubclassFeature(idx, featIdx, field, value) {
    setClassDraft(d => {
      const subs = [...(d.subclasses || [])]
      const features = [...(subs[idx].features || [])]
      features[featIdx] = { ...features[featIdx], [field]: field === 'fromLevel' ? (parseInt(value) || 1) : value }
      subs[idx] = { ...subs[idx], features }
      return { ...d, subclasses: subs }
    })
  }
  function removeSubclassFeature(idx, featIdx) {
    setClassDraft(d => {
      const subs = [...(d.subclasses || [])]
      subs[idx] = { ...subs[idx], features: (subs[idx].features || []).filter((_, i) => i !== featIdx) }
      return { ...d, subclasses: subs }
    })
  }
  function addSubclassSpellGrant(idx) {
    setClassDraft(d => {
      const subs = [...(d.subclasses || [])]
      subs[idx] = { ...subs[idx], spellGrants: [...(subs[idx].spellGrants || []), { fromLevel: d.subclassLevel || 3, spells: [] }] }
      return { ...d, subclasses: subs }
    })
  }
  function updateSubclassSpellGrant(idx, grantIdx, field, value) {
    setClassDraft(d => {
      const subs = [...(d.subclasses || [])]
      const grants = [...(subs[idx].spellGrants || [])]
      grants[grantIdx] = { ...grants[grantIdx], [field]: field === 'fromLevel' ? (parseInt(value) || 1) : value.split(',').map(s => s.trim()).filter(Boolean) }
      subs[idx] = { ...subs[idx], spellGrants: grants }
      return { ...d, subclasses: subs }
    })
  }
  function removeSubclassSpellGrant(idx, grantIdx) {
    setClassDraft(d => {
      const subs = [...(d.subclasses || [])]
      subs[idx] = { ...subs[idx], spellGrants: (subs[idx].spellGrants || []).filter((_, i) => i !== grantIdx) }
      return { ...d, subclasses: subs }
    })
  }

  const [expandedLevel, setExpandedLevel] = useState(null)
  const [expandedSubclass, setExpandedSubclass] = useState(null)

  const tabs = [
    { id: 'weapons', icon: '⚔️', label: 'Armas' },
    { id: 'armor', icon: '🛡️', label: 'Armaduras' },
    { id: 'backgrounds', icon: '📜', label: 'Trasfondos' },
    { id: 'classes', icon: '🧙', label: 'Clases' },
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
            {tab !== 'classes' && <button className="dnd-btn-sm" style={{marginLeft:'auto'}} onClick={openNew}>+ {tabs.find(t=>t.id===tab)?.icon}</button>}
            {tab === 'classes' && <button className="dnd-btn-sm" style={{marginLeft:'auto'}} onClick={openNew}>+ 🧙</button>}
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
              {tab === 'classes' && <>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                  {field('name','Nombre (ES)')}
                  {field('nameEn','Nombre (EN)')}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4}}>
                  {field('hitDie','Dado de golpe',{type:'select',options:[4,6,8,10,12]})}
                  {field('primaryAbility','Caract. principal')}
                  {field('skillChoices','Habilidades a elegir',{type:'number'})}
                </div>
                {field('savingThrows','Tiradas de salvación (separadas por coma, ej: FUE, CON)')}
                {field('armorProficiencies','Competencias en armaduras (coma)')}
                {field('weaponProficiencies','Competencias en armas (coma)')}
                {field('toolProficiencies','Competencias en herramientas (coma)')}
                {field('skillOptions','Opciones de habilidad (coma, o "todas")')}
                {field('startingEquipment','Equipo inicial',{type:'textarea'})}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                  {field('spellcaster','Es lanzador',{type:'bool'})}
                  {editDraft.spellcaster && field('spellcastingAbility','Caract. de lanzamiento')}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                  {field('subclassLevel','Nivel de subclase',{type:'number'})}
                  {field('subclassName','Nombre de subclase')}
                </div>
                {field('source','Fuente')}
                <div style={{fontSize:'.72rem',color:'#6b7280',marginTop:4}}>Los niveles y rasgos se rellenan después desde el editor ✏️</div>
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

          {tab === 'classes' && data && !editItem && (
            <div className="ref-data-list">
              {(data.classes || []).map(cls => {
                const isOpen = expandedItem === cls.id
                const lvlData = cls.levels?.[expandedLevel] || null
                return (
                  <div key={cls.id} className={`ref-data-item ${isOpen ? 'expanded' : ''}`}
                    onClick={() => { setExpandedItem(isOpen ? null : cls.id); setExpandedLevel(null) }}>
                    <div className="ref-data-item-row">
                      <span className="ref-data-item-name">{cls.name}</span>
                      <span className="ref-data-item-meta">d{cls.hitDie} · {cls.primaryAbility}</span>
                      <span className="ref-data-item-tag" style={{color: cls.spellcaster ? '#a78bfa' : '#94a3b8'}}>{cls.spellcaster ? '✨ Lanzador' : '⚔️ Marcial'}</span>
                    </div>
                    {isOpen && (
                      <div className="ref-data-item-detail" onClick={e => e.stopPropagation()}>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 12px',marginBottom:8,fontSize:'.78rem',color:'#a09880'}}>
                          <div>🎲 Dado de Golpe: d{cls.hitDie}</div>
                          <div>💪 Caract. principal: {cls.primaryAbility}</div>
                          <div>🛡 Tiradas de salvación: {cls.savingThrows.join(', ')}</div>
                          <div>🎓 Competencias: {cls.skillChoices} habilidades</div>
                          {cls.spellcaster && <div>✨ Característica: {cls.spellcastingAbility}</div>}
                          <div>🌿 Subclase (nv.{cls.subclassLevel}): {cls.subclassName}</div>
                        </div>
                        {cls.armorProficiencies.length > 0 && <div className="ref-data-props">🛡 Armaduras: {cls.armorProficiencies.join(', ')}</div>}
                        <div className="ref-data-props">⚔️ Armas: {cls.weaponProficiencies.join(', ')}</div>
                        {cls.toolProficiencies.length > 0 && <div className="ref-data-props">🔧 Herramientas: {cls.toolProficiencies.join(', ')}</div>}
                        <div className="ref-data-props" style={{marginTop:4}}>🎒 Equipo inicial: {cls.startingEquipment}</div>
                        {/* Rasgos base */}
                        {(cls.baseTraits || []).length > 0 && (
                          <div style={{marginTop:8}}>
                            <div style={{fontSize:'.8rem',fontWeight:600,color:'#c8a96e',marginBottom:4}}>📖 Rasgos de clase</div>
                            {cls.baseTraits.map((t, i) => (
                              <div key={i} style={{marginBottom:6}}>
                                <div style={{fontSize:'.8rem',fontWeight:600,color:'#d4c5a0'}}>{t.name}</div>
                                {t.desc && <div style={{fontSize:'.76rem',color:'#a09880',lineHeight:1.5,whiteSpace:'pre-wrap'}}>{t.desc}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Tabla de progresión */}
                        <div style={{marginTop:10}}>
                          <div style={{fontSize:'.8rem',fontWeight:600,color:'#c8a96e',marginBottom:6}}>📊 Progresión por nivel</div>
                          <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                            {Object.keys(cls.levels).map(lv => (
                              <button key={lv}
                                className={`dnd-btn-sm ${expandedLevel === parseInt(lv) ? 'active' : ''}`}
                                style={{minWidth:32, fontWeight: expandedLevel === parseInt(lv) ? 700 : 400}}
                                onClick={() => setExpandedLevel(expandedLevel === parseInt(lv) ? null : parseInt(lv))}>
                                {lv}
                              </button>
                            ))}
                          </div>
                          {lvlData && (
                            <div style={{marginTop:8,padding:'8px 10px',background:'rgba(0,0,0,0.2)',borderRadius:6,fontSize:'.78rem'}}>
                              <div style={{fontWeight:600,color:'#c8a96e',marginBottom:4}}>Nivel {expandedLevel}</div>
                              <div style={{display:'flex',flexWrap:'wrap',gap:'3px 14px',color:'#a09880',marginBottom:6}}>
                                <span>🎖 Bon. competencia: +{lvlData.profBonus}</span>
                                {lvlData.rages != null && <span>💢 Rabia: {lvlData.rages} ({lvlData.rageDamage > 0 ? `+${lvlData.rageDamage}` : '—'})</span>}
                                {lvlData.kiPoints != null && <span>☯ Ki: {lvlData.kiPoints}</span>}
                                {lvlData.martialDie != null && <span>👊 Artes marciales: d{lvlData.martialDie}</span>}
                                {lvlData.sneakAttack != null && <span>🗡 Ataque furtivo: {lvlData.sneakAttack}</span>}
                                {lvlData.cantrips != null && <span>✨ Trucos: {lvlData.cantrips}</span>}
                                {lvlData.spellsKnown != null && <span>📖 Conjuros conocidos: {lvlData.spellsKnown}</span>}
                                {lvlData.sorceryPoints != null && <span>💜 Puntos hechicería: {lvlData.sorceryPoints}</span>}
                                {lvlData.pactSlots != null && <span>🔮 Espacios de pacto: {lvlData.pactSlots} (nv.{lvlData.pactSlotLevel})</span>}
                                {lvlData.invocations != null && <span>📜 Invocaciones: {lvlData.invocations}</span>}
                              </div>
                              {lvlData.slots?.length > 0 && (
                                <div style={{marginBottom:6}}>
                                  <span style={{color:'#8b7d5c'}}>Espacios de conjuro: </span>
                                  {lvlData.slots.map((s, i) => s > 0 ? <span key={i} style={{marginRight:8}}>Nv.{i+1}: {s}</span> : null)}
                                </div>
                              )}
                              {/* Huecos de uso */}
                              {(lvlData.slots || []).length > 0 && (
                                <div style={{marginBottom:6,display:'flex',flexWrap:'wrap',gap:'4px 12px'}}>
                                  {lvlData.slots.map((s, i) => (
                                    <span key={i} style={{color:'#c8a96e',fontWeight:600}}>
                                      {s.name}: <span style={{color:'#d4c5a0'}}>{s.count ?? '∞'}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                              {/* Rasgos del nivel */}
                              {(lvlData.features || []).map((f, i) => (
                                <div key={i} style={{marginTop:5,paddingTop:5,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                                  <div style={{fontWeight:600,color:'#d4c5a0',fontSize:'.8rem',marginBottom:2}}>📌 {f.name}</div>
                                  {f.desc && <div style={{color:'#a09880',fontSize:'.76rem',lineHeight:1.5,whiteSpace:'pre-wrap'}}>{f.desc}</div>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="ref-data-item-actions" style={{marginTop:8}}>
                          <button className="dnd-btn-sm" onClick={() => openClassEdit(cls)}>✏️ Editar clase</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {!data && <div className="dnd-empty-sm">Cargando datos...</div>}
        </div>
      )}

      {/* ── Modal editor de clase ── */}
      {classEditModal && classDraft && (
        <div className="dnd-modal-overlay" onClick={() => { setClassEditModal(null); setClassDraft(null) }}>
          <div className="dnd-modal glossary-modal cw-modal" style={{maxWidth:640,maxHeight:'90vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <span style={{fontSize:'1.1rem',fontWeight:700,color:'#c8a96e'}}>✏️ Editar — {classDraft.name}</span>
              <button className="dnd-btn-sm" style={{marginLeft:'auto',color:'#4ade80',borderColor:'rgba(74,222,128,0.3)'}} onClick={saveClassEdit}>✓ Guardar</button>
              <button className="dnd-btn-sm" onClick={() => { setClassEditModal(null); setClassDraft(null) }}>✕</button>
            </div>
            {/* Rasgos base */}
            <div style={{marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                <span style={{fontWeight:600,fontSize:'.85rem',color:'#c8a96e'}}>📖 Rasgos de clase (base)</span>
                <button className="dnd-btn-sm" onClick={addBaseTrait}>+ Rasgo</button>
              </div>
              {(classDraft.baseTraits || []).length === 0 && <div className="dnd-empty-sm">Sin rasgos base. Pulsa "+ Rasgo" para añadir.</div>}
              {(classDraft.baseTraits || []).map((t, i) => (
                <div key={i} style={{background:'rgba(0,0,0,0.15)',borderRadius:6,padding:'8px 10px',marginBottom:6}}>
                  <div style={{display:'flex',gap:6,marginBottom:4}}>
                    <input className="dnd-input" style={{flex:1,fontSize:'.82rem',padding:'4px 8px'}} placeholder="Nombre del rasgo..." value={t.name} onChange={e => updateBaseTrait(i, 'name', e.target.value)} />
                    <button className="dnd-btn-sm" style={{color:'#f87171',borderColor:'rgba(248,113,113,0.3)'}} onClick={() => removeBaseTrait(i)}>🗑</button>
                  </div>
                  <textarea className="dnd-input" style={{width:'100%',fontSize:'.78rem',padding:'4px 8px',resize:'vertical',minHeight:60}} placeholder="Descripción del rasgo..." value={t.desc || ''} onChange={e => updateBaseTrait(i, 'desc', e.target.value)} />
                </div>
              ))}
            </div>
            {/* Subclases */}
            <div style={{marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                <span style={{fontWeight:600,fontSize:'.85rem',color:'#c8a96e'}}>🌿 Subclases {classDraft.subclassName ? `— ${classDraft.subclassName} (nv.${classDraft.subclassLevel||'?'})` : ''}</span>
                <button className="dnd-btn-sm" onClick={addSubclass}>+ Subclase</button>
              </div>
              {(classDraft.subclasses || []).length === 0 && <div className="dnd-empty-sm">Sin subclases. Pulsa "+ Subclase" para añadir.</div>}
              {(classDraft.subclasses || []).map((sub, si) => {
                const isOpen = expandedSubclass === si
                return (
                  <div key={sub.id || si} style={{background:'rgba(0,0,0,0.15)',borderRadius:6,padding:'8px 10px',marginBottom:6}}>
                    <div style={{display:'flex',gap:6,marginBottom:4,alignItems:'center'}}>
                      <input className="dnd-input" style={{flex:1,fontSize:'.82rem',padding:'4px 8px'}} placeholder="Nombre de la subclase..." value={sub.name} onChange={e => updateSubclass(si, 'name', e.target.value)} />
                      <button className="dnd-btn-sm" onClick={() => setExpandedSubclass(isOpen ? null : si)}>{isOpen ? '▾' : '▸'}</button>
                      <button className="dnd-btn-sm" style={{color:'#f87171',borderColor:'rgba(248,113,113,0.3)'}} onClick={() => removeSubclass(si)}>🗑</button>
                    </div>
                    <textarea className="dnd-input" style={{width:'100%',fontSize:'.78rem',padding:'4px 8px',resize:'vertical',minHeight:40}} placeholder="Descripción de la subclase..." value={sub.desc || ''} onChange={e => updateSubclass(si, 'desc', e.target.value)} />
                    {isOpen && (
                      <div style={{marginTop:8}}>
                        {/* Rasgos de subclase */}
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                          <span style={{fontSize:'.78rem',color:'#8b7d5c'}}>📖 Rasgos de subclase</span>
                          <button className="dnd-btn-sm" onClick={() => addSubclassFeature(si)}>+ Rasgo</button>
                        </div>
                        {(sub.features || []).length === 0 && <div style={{fontSize:'.75rem',color:'#6b6050',fontStyle:'italic',marginBottom:6}}>Sin rasgos añadidos</div>}
                        {(sub.features || []).map((f, fi) => (
                          <div key={fi} style={{background:'rgba(0,0,0,0.2)',borderRadius:6,padding:'8px 10px',marginBottom:6}}>
                            <div style={{display:'flex',gap:6,marginBottom:4,alignItems:'center'}}>
                              <span style={{fontSize:'.7rem',color:'#8b7d5c'}}>Nv.</span>
                              <input className="dnd-input" style={{width:50,fontSize:'.8rem',padding:'4px 6px'}} type="number" min="1" max="20" value={f.fromLevel || 1} onChange={e => updateSubclassFeature(si, fi, 'fromLevel', e.target.value)} />
                              <input className="dnd-input" style={{flex:1,fontSize:'.82rem',padding:'4px 8px'}} placeholder="Nombre del rasgo..." value={f.name} onChange={e => updateSubclassFeature(si, fi, 'name', e.target.value)} />
                              <button className="dnd-btn-sm" style={{color:'#f87171',borderColor:'rgba(248,113,113,0.3)'}} onClick={() => removeSubclassFeature(si, fi)}>🗑</button>
                            </div>
                            <textarea className="dnd-input" style={{width:'100%',fontSize:'.77rem',padding:'4px 8px',resize:'vertical',minHeight:50}} placeholder="Descripción..." value={f.desc || ''} onChange={e => updateSubclassFeature(si, fi, 'desc', e.target.value)} />
                          </div>
                        ))}
                        {/* Conjuros otorgados por la subclase */}
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6,marginTop:8}}>
                          <span style={{fontSize:'.78rem',color:'#8b7d5c'}}>🔮 Conjuros otorgados</span>
                          <button className="dnd-btn-sm" onClick={() => addSubclassSpellGrant(si)}>+ Nivel</button>
                        </div>
                        {(sub.spellGrants || []).length === 0 && <div style={{fontSize:'.75rem',color:'#6b6050',fontStyle:'italic'}}>Sin conjuros automáticos</div>}
                        {(sub.spellGrants || []).map((g, gi) => (
                          <div key={gi} style={{display:'flex',gap:6,marginBottom:4,alignItems:'center'}}>
                            <span style={{fontSize:'.7rem',color:'#8b7d5c'}}>Nv.</span>
                            <input className="dnd-input" style={{width:50,fontSize:'.8rem',padding:'4px 6px'}} type="number" min="1" max="20" value={g.fromLevel || 1} onChange={e => updateSubclassSpellGrant(si, gi, 'fromLevel', e.target.value)} />
                            <input className="dnd-input" style={{flex:1,fontSize:'.8rem',padding:'4px 8px'}} placeholder="Conjuros (nombre exacto, separados por coma)" value={(g.spells||[]).join(', ')} onChange={e => updateSubclassSpellGrant(si, gi, 'spells', e.target.value)} />
                            <button className="dnd-btn-sm" style={{color:'#f87171',borderColor:'rgba(248,113,113,0.3)'}} onClick={() => removeSubclassSpellGrant(si, gi)}>🗑</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {/* Rasgos por nivel */}
            <div style={{fontWeight:600,fontSize:'.85rem',color:'#c8a96e',marginBottom:8}}>📊 Rasgos por nivel</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}>
              {Object.keys(classDraft.levels).map(lv => (
                <button key={lv}
                  className={`dnd-btn-sm ${classEditLevel === parseInt(lv) ? 'active' : ''}`}
                  style={{minWidth:32, fontWeight: classEditLevel === parseInt(lv) ? 700 : 400,
                    borderColor: (classDraft.levels[lv].features?.length > 0) ? 'rgba(200,169,110,0.4)' : undefined }}
                  onClick={() => setClassEditLevel(classEditLevel === parseInt(lv) ? null : parseInt(lv))}>
                  {lv}
                </button>
              ))}
            </div>
            {classEditLevel && classDraft.levels[classEditLevel] && (() => {
              const lvl = classDraft.levels[classEditLevel]
              const lv = classEditLevel
              const isLv1 = lv === 1
              return (
                <div style={{background:'rgba(0,0,0,0.2)',borderRadius:6,padding:'10px 12px'}}>
                  <div style={{fontWeight:600,color:'#c8a96e',marginBottom:10,fontSize:'.85rem'}}>Nivel {lv}</div>

                  {/* Nivel 1: datos fijos de clase */}
                  {isLv1 && (
                    <div style={{marginBottom:12,padding:'8px 10px',background:'rgba(200,169,110,0.07)',borderRadius:6,border:'1px solid rgba(200,169,110,0.15)'}}>
                      <div style={{fontWeight:600,fontSize:'.78rem',color:'#c8a96e',marginBottom:8}}>🏛 Datos de clase (nivel 1)</div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                        <div>
                          <span style={{fontSize:'.72rem',color:'#8b7d5c'}}>Dado de golpe</span>
                          <select className="dnd-input" style={{width:'100%',fontSize:'.82rem',padding:'4px 8px'}}
                            value={classDraft.hitDie}
                            onChange={e => setClassDraft(d => ({...d, hitDie: parseInt(e.target.value)}))}>
                            {[4,6,8,10,12].map(d => <option key={d} value={d}>d{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <span style={{fontSize:'.72rem',color:'#8b7d5c'}}>Característica principal</span>
                          <input className="dnd-input" style={{width:'100%',fontSize:'.82rem',padding:'4px 8px'}}
                            value={classDraft.primaryAbility}
                            onChange={e => setClassDraft(d => ({...d, primaryAbility: e.target.value}))} />
                        </div>
                        <div>
                          <span style={{fontSize:'.72rem',color:'#8b7d5c'}}>Tiradas de salvación</span>
                          <input className="dnd-input" style={{width:'100%',fontSize:'.82rem',padding:'4px 8px'}}
                            placeholder="FUE, CON"
                            value={(classDraft.savingThrows || []).join(', ')}
                            onChange={e => setClassDraft(d => ({...d, savingThrows: e.target.value.split(',').map(s => s.trim()).filter(Boolean)}))} />
                        </div>
                        <div>
                          <span style={{fontSize:'.72rem',color:'#8b7d5c'}}>Habilidades a elegir</span>
                          <input className="dnd-input" style={{width:'100%',fontSize:'.82rem',padding:'4px 8px'}} type="number" min="1" max="6"
                            value={classDraft.skillChoices}
                            onChange={e => setClassDraft(d => ({...d, skillChoices: parseInt(e.target.value)||1}))} />
                        </div>
                        <div>
                          <span style={{fontSize:'.72rem',color:'#8b7d5c'}}>Nivel de subclase</span>
                          <input className="dnd-input" style={{width:'100%',fontSize:'.82rem',padding:'4px 8px'}} type="number" min="1" max="20"
                            value={classDraft.subclassLevel || ''}
                            onChange={e => setClassDraft(d => ({...d, subclassLevel: parseInt(e.target.value)||1}))} />
                        </div>
                        <div>
                          <span style={{fontSize:'.72rem',color:'#8b7d5c'}}>Nombre genérico subclase</span>
                          <input className="dnd-input" style={{width:'100%',fontSize:'.82rem',padding:'4px 8px'}} placeholder="Senda, Dominio, Círculo..."
                            value={classDraft.subclassName || ''}
                            onChange={e => setClassDraft(d => ({...d, subclassName: e.target.value}))} />
                        </div>
                      </div>
                      <div style={{marginTop:4}}>
                        <span style={{fontSize:'.72rem',color:'#8b7d5c'}}>Opciones de habilidad (separadas por coma)</span>
                        <input className="dnd-input" style={{width:'100%',fontSize:'.82rem',padding:'4px 8px'}}
                          value={(classDraft.skillOptions || []).join(', ')}
                          onChange={e => setClassDraft(d => ({...d, skillOptions: e.target.value.split(',').map(s => s.trim()).filter(Boolean)}))} />
                      </div>
                      <div style={{marginTop:4}}>
                        <span style={{fontSize:'.72rem',color:'#8b7d5c'}}>Competencias en armaduras</span>
                        <input className="dnd-input" style={{width:'100%',fontSize:'.82rem',padding:'4px 8px'}}
                          value={(classDraft.armorProficiencies || []).join(', ')}
                          onChange={e => setClassDraft(d => ({...d, armorProficiencies: e.target.value.split(',').map(s => s.trim()).filter(Boolean)}))} />
                      </div>
                      <div style={{marginTop:4}}>
                        <span style={{fontSize:'.72rem',color:'#8b7d5c'}}>Competencias en armas</span>
                        <input className="dnd-input" style={{width:'100%',fontSize:'.82rem',padding:'4px 8px'}}
                          value={(classDraft.weaponProficiencies || []).join(', ')}
                          onChange={e => setClassDraft(d => ({...d, weaponProficiencies: e.target.value.split(',').map(s => s.trim()).filter(Boolean)}))} />
                      </div>
                      <div style={{marginTop:4}}>
                        <span style={{fontSize:'.72rem',color:'#8b7d5c'}}>Competencias en herramientas</span>
                        <input className="dnd-input" style={{width:'100%',fontSize:'.82rem',padding:'4px 8px'}}
                          value={(classDraft.toolProficiencies || []).join(', ')}
                          onChange={e => setClassDraft(d => ({...d, toolProficiencies: e.target.value.split(',').map(s => s.trim()).filter(Boolean)}))} />
                      </div>
                      <div style={{marginTop:4}}>
                        <span style={{fontSize:'.72rem',color:'#8b7d5c'}}>Equipo inicial</span>
                        <textarea className="dnd-input" style={{width:'100%',fontSize:'.78rem',padding:'4px 8px',resize:'vertical',minHeight:48}}
                          value={classDraft.startingEquipment || ''}
                          onChange={e => setClassDraft(d => ({...d, startingEquipment: e.target.value}))} />
                      </div>
                    </div>
                  )}

                  {/* Bonificación de competencia */}
                  <div style={{marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:'.78rem',color:'#8b7d5c',minWidth:140}}>🎖 Bonificación competencia</span>
                    <input className="dnd-input" style={{width:60,fontSize:'.82rem',padding:'4px 8px'}} type="number" min="2" max="6"
                      value={lvl.profBonus || 2}
                      onChange={e => setClassDraft(d => ({...d, levels: {...d.levels, [lv]: {...d.levels[lv], profBonus: parseInt(e.target.value)||2}}}))} />
                  </div>

                  {/* Progresión de conjuros (solo clases lanzadoras) */}
                  <div style={{marginBottom:10}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                      <span style={{fontSize:'.78rem',color:'#8b7d5c',minWidth:140}}>🔮 Conjuros preparados</span>
                      <input className="dnd-input" style={{width:60,fontSize:'.82rem',padding:'4px 8px'}} type="number" min="0"
                        value={lvl.preparedSpells ?? ''} placeholder="—"
                        onChange={e => setClassDraft(d => ({...d, levels: {...d.levels, [lv]: {...d.levels[lv], preparedSpells: e.target.value === '' ? null : (parseInt(e.target.value)||0)}}}))} />
                    </div>
                    <div style={{fontSize:'.72rem',color:'#8b7d5c',marginBottom:4}}>Huecos de conjuro por nivel de hechizo</div>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      {[0,1,2,3,4,5,6,7,8].map(i => (
                        <div key={i} style={{textAlign:'center'}}>
                          <div style={{fontSize:'.65rem',color:'#6b6050'}}>Nv.{i+1}</div>
                          <input className="dnd-input" style={{width:34,fontSize:'.78rem',padding:'3px 4px',textAlign:'center'}} type="number" min="0"
                            value={(lvl.spellSlots || [])[i] || ''} placeholder="0"
                            onChange={e => setClassDraft(d => {
                              const arr = [...(d.levels[lv].spellSlots || Array(9).fill(0))]
                              arr[i] = parseInt(e.target.value) || 0
                              return { ...d, levels: { ...d.levels, [lv]: { ...d.levels[lv], spellSlots: arr } } }
                            })} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Huecos de uso */}
                  <div style={{marginBottom:10}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                      <span style={{fontSize:'.78rem',color:'#8b7d5c'}}>💢 Huecos de uso</span>
                      <button className="dnd-btn-sm" onClick={() => addLevelSlot(lv)}>+ Hueco</button>
                    </div>
                    {(lvl.slots || []).length === 0 && <div style={{fontSize:'.75rem',color:'#6b6050',fontStyle:'italic'}}>Sin huecos de uso en este nivel</div>}
                    {(lvl.slots || []).map((s, i) => (
                      <div key={i} style={{display:'flex',gap:6,marginBottom:4,alignItems:'center'}}>
                        <input className="dnd-input" style={{flex:2,fontSize:'.8rem',padding:'4px 8px'}} placeholder="Nombre (ej: Inspiración Bárdica)" value={s.name}
                          onChange={e => updateLevelSlot(lv, i, 'name', e.target.value)} />
                        <select className="dnd-input" style={{width:72,fontSize:'.76rem',padding:'4px 4px'}}
                          value={s.statKey || ''}
                          onChange={e => updateLevelSlot(lv, i, 'statKey', e.target.value)}>
                          <option value="">Fijo</option>
                          <option value="FUE">FUE</option>
                          <option value="DES">DES</option>
                          <option value="CON">CON</option>
                          <option value="INT">INT</option>
                          <option value="SAB">SAB</option>
                          <option value="CAR">CAR</option>
                        </select>
                        {!s.statKey ? (
                          <input className="dnd-input" style={{width:60,fontSize:'.8rem',padding:'4px 8px'}} type="number" min="0" placeholder="∞"
                            value={s.count ?? ''}
                            onChange={e => updateLevelSlot(lv, i, 'count', e.target.value)} />
                        ) : (
                          <span style={{fontSize:'.68rem',color:'#8b7d5c',width:60,textAlign:'center'}}>= mod.{s.statKey}</span>
                        )}
                        <button className="dnd-btn-sm" style={{color:'#f87171',borderColor:'rgba(248,113,113,0.3)'}} onClick={() => removeLevelSlot(lv, i)}>🗑</button>
                      </div>
                    ))}
                  </div>

                  {/* Rasgos del nivel */}
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                      <span style={{fontSize:'.78rem',color:'#8b7d5c'}}>📖 Rasgos obtenidos</span>
                      <button className="dnd-btn-sm" onClick={() => addLevelFeature(lv)}>+ Rasgo</button>
                    </div>
                    {(lvl.features || []).length === 0 && <div style={{fontSize:'.75rem',color:'#6b6050',fontStyle:'italic'}}>Sin rasgos nuevos en este nivel</div>}
                    {(lvl.features || []).map((feat, i) => (
                      <div key={i} style={{background:'rgba(0,0,0,0.15)',borderRadius:6,padding:'8px 10px',marginBottom:6}}>
                        <div style={{display:'flex',gap:6,marginBottom:4}}>
                          <input className="dnd-input" style={{flex:1,fontSize:'.82rem',padding:'4px 8px'}} placeholder="Nombre del rasgo..."
                            value={feat.name}
                            onChange={e => updateLevelFeatureName(lv, i, e.target.value)} />
                          <button className="dnd-btn-sm" style={{color:'#f87171',borderColor:'rgba(248,113,113,0.3)'}} onClick={() => removeLevelFeature(lv, i)}>🗑</button>
                        </div>
                        <textarea className="dnd-input" style={{width:'100%',fontSize:'.77rem',padding:'4px 8px',resize:'vertical',minHeight:60}}
                          placeholder="Descripción del rasgo..."
                          value={feat.desc || ''}
                          onChange={e => updateLevelFeatureDesc(lv, i, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
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
