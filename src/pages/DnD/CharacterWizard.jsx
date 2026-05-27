import { useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'

// ── Helper: convertir hechizo del glosario a acción ────────
function spellToAction(spell) {
  let actionType = 'normal'
  if (spell.castTime === 'Acción adicional') actionType = 'bonus'
  else if (spell.castTime === 'Reacción') actionType = 'reaction'
  else if (spell.castTime === 'Ritual') actionType = 'ritual'
  let range = 'Distancia'
  if (spell.range?.toLowerCase().includes('toque') || spell.range?.toLowerCase().includes('personal')) range = 'Toque'
  const noteParts = []
  if (spell.duration) noteParts.push(`Duración: ${spell.duration}`)
  if (spell.concentration) noteParts.push('Concentración')
  if (spell.components) {
    const comps = [spell.components.v && 'V', spell.components.s && 'S', spell.components.m && 'M'].filter(Boolean).join(', ')
    if (comps) noteParts.push(`Comp: ${comps}`)
  }
  if (spell.description) noteParts.push(spell.description)
  return { name: spell.name, range, modifier: 0, damage: spell.damage || '', secondaryDamage: spell.secondaryDamage || '',
    note: noteParts.join(' · '), actionType, isSpell: true, spellLevel: spell.spellLevel || 'truco',
    aoe: '', glossarySpellId: spell.id, damageType: spell.damageType || '', secondaryDamageType: spell.secondaryDamageType || '' }
}

function SpellPicker({ spells, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState('all')
  const filtered = spells.filter(s => {
    if (filterLevel !== 'all' && s.spellLevel !== filterLevel) return false
    if (search) { const q = search.toLowerCase(); return s.name?.toLowerCase().includes(q) || s.tags?.some(t => t.toLowerCase().includes(q)) }
    return true
  })
  return (
    <div className="spell-picker">
      <div className="spell-picker-header"><span className="spell-picker-title">🔮 Seleccionar hechizo</span><button className="dnd-btn-sm" onClick={onClose}>✕</button></div>
      <input className="dnd-glossary-search" placeholder="Buscar hechizo..." value={search} onChange={e => setSearch(e.target.value)} autoFocus style={{width:'100%',marginBottom:6}} />
      <div className="dnd-glossary-subfilters" style={{margin:'0 0 6px'}}>
        {[{id:'all',label:'Todos'},{id:'truco',label:'Truco'},...[1,2,3,4,5,6,7,8,9].map(n=>({id:String(n),label:String(n)}))].map(f =>
          <button key={f.id} className={`dnd-glossary-subfilter ${filterLevel===f.id?'active':''}`} onClick={() => setFilterLevel(f.id)}>{f.label}</button>
        )}
      </div>
      <div className="spell-picker-list">
        {filtered.length === 0 && <div className="dnd-empty-sm">Sin hechizos</div>}
        {filtered.map(spell => (
          <button key={spell.id} className="spell-picker-item" onClick={() => onSelect(spell)}>
            <span className="spell-picker-name">{spell.name}</span>
            <span className="spell-picker-info">{spell.spellLevel === 'truco' ? 'Truco' : `Nv.${spell.spellLevel}`}{spell.damage && ` · ${spell.damage}`}{spell.concentration && ' · 🔄'}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const STEP_LABELS = [
  '🧝 Descripción',
  '⚔️ Clase',
  '💪 Características',
  '📜 Trasfondo',
  '🎯 Habilidades',
  '🎒 Equipo',
  '🔮 Conjuros'
]

const ALL_SKILLS = [
  'Acrobacia','Arcanos','Atletismo','Engaño','Historia','Intimidación','Investigación',
  'Juego de manos','Medicina','Naturaleza','Percepción','Perspicacia','Persuasión',
  'Religión','Sigilo','Supervivencia','Trato con animales'
]

export default function CharacterWizard({ mode, character: initialChar, onSave, onClose, template, glossarySpells, glossaryItems: availableGlossaryItems }) {
  const { user } = useAuth()
  const headers = { 'Content-Type': 'application/json', 'x-user-id': user?.id }
  const [step, setStep] = useState(0)
  const [ch, setCh] = useState(() => {
    if (mode === 'edit' && initialChar) return { ...initialChar }
    return template()
  })
  const [portraitTab, setPortraitTab] = useState('upload') // 'upload' | 'gallery'
  const [galleryImages, setGalleryImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [showGlossaryPicker, setShowGlossaryPicker] = useState(false)
  const fileRef = useRef(null)

  // ── Helpers ──
  function update(field, val) { setCh(e => ({ ...e, [field]: val })) }
  function updateStat(key, val) { setCh(e => ({ ...e, stats: { ...e.stats, [key]: val } })) }
  const mod = v => { const m = Math.floor(((v||10)-10)/2); return m >= 0 ? `+${m}` : `${m}` }

  function canAdvance() {
    if (step === 0) return ch.name?.trim()
    return true // resto opcional
  }

  function handleNext() { if (canAdvance() && step < 6) setStep(step + 1) }
  function handleBack() { if (step > 0) setStep(step - 1) }
  function handleSave() { onSave(ch) }

  // ── Portrait upload ──
  async function handlePortraitUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Error leyendo archivo'))
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/dnd/portraits', {
        method: 'POST', headers,
        body: JSON.stringify({ data: base64, filename: file.name })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('Upload failed:', err)
        alert('Error subiendo imagen: ' + (err.error || res.statusText))
        return
      }
      const data = await res.json()
      if (data.url) update('portrait', data.url)
    } catch (err) {
      console.error('Portrait upload error:', err)
      alert('Error subiendo imagen: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function loadGallery() {
    try {
      const r = await fetch('/api/dnd/portraits', { headers })
      if (r.ok) setGalleryImages(await r.json())
    } catch {}
  }

  // ── Render ──
  return (
    <div className="dnd-modal-overlay" onClick={onClose}>
      <div className="dnd-modal glossary-modal cw-modal" onClick={e => e.stopPropagation()}>
        {/* Progress bar */}
        <div className="cw-progress">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className={`cw-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
              onClick={() => setStep(i)} title={label}>
              <span className="cw-step-num">{i + 1}</span>
            </div>
          ))}
        </div>
        <h3 className="cw-step-title">{STEP_LABELS[step]}</h3>

        <div className="cw-body">
          {/* ── PASO 1: Descripción ── */}
          {step === 0 && <>
            <div className="glossary-form-row">
              <label>Nombre *</label>
              <input className="dnd-input" value={ch.name||''} onChange={e => update('name', e.target.value)} placeholder="Nombre del personaje..." autoFocus />
            </div>
            <div className="glossary-form-row">
              <label>Raza / Especie</label>
              <input className="dnd-input" value={ch.race||''} onChange={e => update('race', e.target.value)} placeholder="Humano, Elfo, Enano, Semiorco..." />
            </div>
            <div className="glossary-form-row">
              <label>Nivel</label>
              <input className="dnd-input" type="number" min="1" max="20" value={ch.level||1} onChange={e => update('level', parseInt(e.target.value)||1)} />
            </div>
            <div className="glossary-form-row">
              <label>Descripción</label>
              <textarea className="dnd-input glossary-textarea" value={ch.description||''} onChange={e => update('description', e.target.value)} placeholder="Apariencia, personalidad..." rows={3} />
            </div>
            <div className="glossary-form-row">
              <label>Retrato</label>
              {ch.portrait && <div className="cw-portrait-preview"><img src={ch.portrait} alt="Retrato" /><button className="dnd-btn-sm dnd-btn-danger" onClick={() => update('portrait', '')}>✕</button></div>}
              {!ch.portrait && <>
                <div className="cw-portrait-tabs">
                  <button className={`dnd-auth-tab ${portraitTab==='upload'?'active':''}`} onClick={() => setPortraitTab('upload')}>📤 Subir</button>
                  <button className={`dnd-auth-tab ${portraitTab==='gallery'?'active':''}`} onClick={() => { setPortraitTab('gallery'); loadGallery() }}>🖼️ Galería</button>
                </div>
                {portraitTab === 'upload' && (
                  <div className="cw-portrait-upload">
                    <input ref={fileRef} type="file" accept="image/*" onChange={handlePortraitUpload} style={{display:'none'}} />
                    <button className="dnd-btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      {uploading ? 'Subiendo...' : '📷 Elegir imagen'}
                    </button>
                  </div>
                )}
                {portraitTab === 'gallery' && (
                  <div className="cw-portrait-gallery">
                    {galleryImages.length === 0 && <div className="dnd-empty-sm">Sin imágenes — sube la primera</div>}
                    {galleryImages.map((url, i) => (
                      <img key={i} src={url} alt="" className="cw-portrait-thumb" onClick={() => update('portrait', url)} />
                    ))}
                  </div>
                )}
              </>}
            </div>
          </>}

          {/* ── PASO 2: Clase ── */}
          {step === 1 && <>
            <div className="glossary-form-row">
              <label>Clase</label>
              <input className="dnd-input" value={ch.class||''} onChange={e => update('class', e.target.value)} placeholder="Guerrero, Mago, Pícaro..." autoFocus />
            </div>
            <div className="glossary-form-row">
              <label>Subclase</label>
              <input className="dnd-input" value={ch.subclass||''} onChange={e => update('subclass', e.target.value)} placeholder="Campeón, Escuela de Evocación..." />
            </div>
            <div className="glossary-form-row">
              <label>Bono de competencia</label>
              <input className="dnd-input" type="number" min="2" max="6" value={ch.stats?.proficiencyBonus||2} onChange={e => updateStat('proficiencyBonus', parseInt(e.target.value)||2)} />
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
              <label>Competencias (armaduras, armas, herramientas...)</label>
              <div className="cw-chip-input">
                {(ch.proficiencies||[]).map((p, i) => (
                  <span key={i} className="cw-chip">{p} <button onClick={() => setCh(e => ({...e, proficiencies: e.proficiencies.filter((_,j)=>j!==i)}))} className="cw-chip-x">✕</button></span>
                ))}
                <input className="dnd-input cw-chip-field" placeholder="Escribe y pulsa Enter..."
                  onKeyDown={e => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      e.preventDefault()
                      setCh(prev => ({...prev, proficiencies: [...(prev.proficiencies||[]), e.target.value.trim()]}))
                      e.target.value = ''
                    }
                  }} />
              </div>
            </div>
            <div className="glossary-form-row">
              <label>Rasgos de clase</label>
              <div className="cw-traits-list">
                {(ch.traits||[]).map((t, i) => (
                  <div key={i} className="cw-trait-item">
                    <input className="dnd-input cw-trait-name" value={t.name||''} placeholder="Nombre del rasgo"
                      onChange={e => { const next = [...(ch.traits||[])]; next[i] = {...next[i], name: e.target.value}; setCh(prev => ({...prev, traits: next})) }} />
                    <textarea className="dnd-input cw-trait-desc" value={t.description||''} placeholder="Descripción..." rows={2}
                      onChange={e => { const next = [...(ch.traits||[])]; next[i] = {...next[i], description: e.target.value}; setCh(prev => ({...prev, traits: next})) }} />
                    <button className="dnd-btn-sm dnd-btn-danger cw-trait-remove" onClick={() => setCh(prev => ({...prev, traits: prev.traits.filter((_,j)=>j!==i)}))}>✕</button>
                  </div>
                ))}
                <button className="dnd-btn-sm" onClick={() => setCh(prev => ({...prev, traits: [...(prev.traits||[]), {name:'', description:''}]}))}>+ Añadir rasgo</button>
              </div>
            </div>
          </>}

          {/* ── PASO 3: Características ── */}
          {step === 2 && <>
            <div className="glossary-form-row">
              <label>Atributos</label>
              <div className="glossary-attr-grid">
                {[['FUE','str'],['DES','dex'],['CON','con'],['INT','int'],['SAB','wis'],['CAR','cha']].map(([label,key]) => (
                  <div key={key} className="glossary-stat-input">
                    <span>{label}</span>
                    <input className="dnd-input" type="number" value={ch.stats?.[key]??10} onChange={e => updateStat(key, parseInt(e.target.value)||10)} />
                    <span className="cw-mod">{mod(ch.stats?.[key])}</span>
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
              <label>CA (Clase de Armadura)</label>
              <input className="dnd-input" type="number" value={ch.stats?.ca??10} onChange={e => updateStat('ca', parseInt(e.target.value)||10)} />
            </div>
            <div className="glossary-form-row">
              <label>Velocidad</label>
              <input className="dnd-input" value={ch.stats?.speed||'30 pies'} onChange={e => updateStat('speed', e.target.value)} />
            </div>
            <div className="glossary-form-row">
              <label>Dado de golpe</label>
              <div className="glossary-hp-row">
                <div className="glossary-stat-input" style={{flex:'0 0 auto'}}>
                  <span>Dado</span>
                  <select className="dnd-input" value={ch.stats?.hitDice?.die || 8}
                    onChange={e => updateStat('hitDice', { ...(ch.stats?.hitDice || {}), die: parseInt(e.target.value) })}>
                    <option value={6}>d6</option>
                    <option value={8}>d8</option>
                    <option value={10}>d10</option>
                    <option value={12}>d12</option>
                  </select>
                </div>
                <div className="glossary-stat-input" style={{flex:1}}>
                  <span>Cantidad</span>
                  <input className="dnd-input" type="number" min="1" value={ch.stats?.hitDice?.count ?? ch.level ?? 1}
                    onChange={e => updateStat('hitDice', { ...(ch.stats?.hitDice || {}), count: parseInt(e.target.value) || 1 })} />
                </div>
                <div className="glossary-stat-input" style={{flex:1}}>
                  <span>Usados</span>
                  <input className="dnd-input" type="number" min="0" value={ch.stats?.hitDice?.used ?? 0}
                    onChange={e => updateStat('hitDice', { ...(ch.stats?.hitDice || {}), used: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
            </div>
            <div className="glossary-form-row">
              <label>Percepción pasiva</label>
              <input className="dnd-input" type="number" value={ch.stats?.passivePerception ?? (10 + Math.floor(((ch.stats?.wis || 10) - 10) / 2))}
                onChange={e => updateStat('passivePerception', parseInt(e.target.value) || 10)} />
            </div>
          </>}

          {/* ── PASO 4: Trasfondo ── */}
          {step === 3 && <>
            <div className="glossary-form-row">
              <label>Trasfondo</label>
              <input className="dnd-input" value={ch.background||''} onChange={e => update('background', e.target.value)} placeholder="Acólito, Criminal, Soldado..." autoFocus />
            </div>

            <div className="glossary-form-row">
              <label>Competencias en habilidades (del trasfondo)</label>
              <div className="cw-skills-grid">
                {ALL_SKILLS.map(skill => {
                  const has = (ch.bgSkills||[]).includes(skill)
                  return (
                    <label key={skill} className={`cw-skill-item ${has ? 'active' : ''}`}>
                      <input type="checkbox" checked={has}
                        onChange={e => {
                          if (e.target.checked) {
                            setCh(prev => ({...prev, bgSkills: [...(prev.bgSkills||[]), skill]}))
                          } else {
                            setCh(prev => ({...prev, bgSkills: (prev.bgSkills||[]).filter(s => s !== skill)}))
                          }
                        }} />
                      <span className="cw-skill-name">{skill}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="glossary-form-row">
              <label>Competencias en herramientas (del trasfondo)</label>
              <div className="cw-chip-input">
                {(ch.bgTools||[]).map((t, i) => (
                  <span key={i} className="cw-chip">{t} <button onClick={() => setCh(e => ({...e, bgTools: e.bgTools.filter((_,j)=>j!==i)}))} className="cw-chip-x">✕</button></span>
                ))}
                <input className="dnd-input cw-chip-field" placeholder="Ej: Kit de herramientas de ladrón... (Enter)"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      e.preventDefault()
                      setCh(prev => ({...prev, bgTools: [...(prev.bgTools||[]), e.target.value.trim()]}))
                      e.target.value = ''
                    }
                  }} />
              </div>
            </div>

            <div className="glossary-form-row">
              <label>Idiomas</label>
              <div className="cw-chip-input">
                {(ch.languages||[]).map((l, i) => (
                  <span key={i} className="cw-chip">{l} <button onClick={() => setCh(e => ({...e, languages: e.languages.filter((_,j)=>j!==i)}))} className="cw-chip-x">✕</button></span>
                ))}
                <input className="dnd-input cw-chip-field" placeholder="Ej: Común, Élfico, Enano... (Enter)"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      e.preventDefault()
                      setCh(prev => ({...prev, languages: [...(prev.languages||[]), e.target.value.trim()]}))
                      e.target.value = ''
                    }
                  }} />
              </div>
            </div>

            <div className="glossary-form-row">
              <label>Equipo del trasfondo</label>
              <div className="cw-chip-input">
                {(ch.bgEquipment||[]).map((eq, i) => (
                  <span key={i} className="cw-chip">{eq} <button onClick={() => setCh(e => ({...e, bgEquipment: e.bgEquipment.filter((_,j)=>j!==i)}))} className="cw-chip-x">✕</button></span>
                ))}
                <input className="dnd-input cw-chip-field" placeholder="Ej: Símbolo sagrado, libro de oraciones... (Enter)"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      e.preventDefault()
                      setCh(prev => ({...prev, bgEquipment: [...(prev.bgEquipment||[]), e.target.value.trim()]}))
                      e.target.value = ''
                    }
                  }} />
              </div>
            </div>

            <div className="glossary-form-row">
              <label>Oro inicial (po)</label>
              <input className="dnd-input" type="number" min="0" value={ch.gold??0} onChange={e => update('gold', parseInt(e.target.value)||0)} placeholder="0" />
            </div>

            <div className="glossary-form-row">
              <label>Rasgos del trasfondo <button className="dnd-btn-sm" onClick={() => setCh(e => ({...e, backgroundTraits: [...(e.backgroundTraits||[]), {name:'',description:''}]}))}>+</button></label>
              {(ch.backgroundTraits||[]).map((t, i) => (
                <div key={i} className="glossary-list-item">
                  <input className="dnd-input" placeholder="Nombre" value={t.name} onChange={e => setCh(prev => ({...prev, backgroundTraits: prev.backgroundTraits.map((x,j) => j===i ? {...x, name: e.target.value} : x)}))} />
                  <input className="dnd-input" placeholder="Descripción" value={t.description} onChange={e => setCh(prev => ({...prev, backgroundTraits: prev.backgroundTraits.map((x,j) => j===i ? {...x, description: e.target.value} : x)}))} />
                  <button className="dnd-btn-sm dnd-btn-danger" onClick={() => setCh(e => ({...e, backgroundTraits: e.backgroundTraits.filter((_,j)=>j!==i)}))}>✕</button>
                </div>
              ))}
            </div>

            <div className="glossary-form-row">
              <label>Rasgos de personalidad / Ideales / Vínculos / Defectos</label>
              {(ch.traits||[]).length === 0 && <div className="dnd-empty-sm">Sin rasgos — usa + para añadir</div>}
              <button className="dnd-btn-sm" onClick={() => setCh(e => ({...e, traits: [...(e.traits||[]), {name:'',description:''}]}))}>+ Rasgo</button>
              {(ch.traits||[]).map((t, i) => (
                <div key={i} className="glossary-list-item" style={{marginTop:4}}>
                  <input className="dnd-input" placeholder="Nombre (ej: Ideal)" value={t.name} onChange={e => setCh(prev => ({...prev, traits: prev.traits.map((x,j) => j===i ? {...x, name: e.target.value} : x)}))} />
                  <input className="dnd-input" placeholder="Descripción" value={t.description} onChange={e => setCh(prev => ({...prev, traits: prev.traits.map((x,j) => j===i ? {...x, description: e.target.value} : x)}))} />
                  <button className="dnd-btn-sm dnd-btn-danger" onClick={() => setCh(e => ({...e, traits: e.traits.filter((_,j)=>j!==i)}))}>✕</button>
                </div>
              ))}
            </div>
          </>}

          {/* ── PASO 5: Habilidades ── */}
          {step === 4 && <>
            <div className="glossary-form-row">
              <label>Habilidades con competencia</label>
              <div className="cw-skills-grid">
                {ALL_SKILLS.map(skill => {
                  const has = (ch.skills||[]).some(s => s.name === skill)
                  const statMap = {
                    'Acrobacia':'dex','Arcanos':'int','Atletismo':'str','Engaño':'cha','Historia':'int',
                    'Intimidación':'cha','Investigación':'int','Juego de manos':'dex','Medicina':'wis',
                    'Naturaleza':'int','Percepción':'wis','Perspicacia':'wis','Persuasión':'cha',
                    'Religión':'int','Sigilo':'dex','Supervivencia':'wis','Trato con animales':'wis'
                  }
                  const stat = statMap[skill] || 'str'
                  const base = Math.floor(((ch.stats?.[stat]||10)-10)/2)
                  const bonus = has ? base + (ch.stats?.proficiencyBonus || 2) : base
                  return (
                    <label key={skill} className={`cw-skill-item ${has ? 'active' : ''}`}>
                      <input type="checkbox" checked={has}
                        onChange={e => {
                          if (e.target.checked) {
                            setCh(prev => ({...prev, skills: [...(prev.skills||[]), {name: skill, bonus: base + (prev.stats?.proficiencyBonus||2)}]}))
                          } else {
                            setCh(prev => ({...prev, skills: (prev.skills||[]).filter(s => s.name !== skill)}))
                          }
                        }} />
                      <span className="cw-skill-name">{skill}</span>
                      <span className="cw-skill-bonus">{bonus >= 0 ? '+' : ''}{bonus}</span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="glossary-form-row">
              <label>Habilidades especiales <button className="dnd-btn-sm" onClick={() => setCh(e => ({...e, abilities: [...(e.abilities||[]), {name:'',description:'',uses:''}]}))}>+</button></label>
              {(ch.abilities||[]).map((ab, i) => (
                <div key={i} className="glossary-list-item" style={{flexWrap:'wrap'}}>
                  <input className="dnd-input" placeholder="Nombre" value={ab.name} onChange={e => setCh(prev => ({...prev, abilities: prev.abilities.map((x,j) => j===i ? {...x, name: e.target.value} : x)}))} style={{flex:1}} />
                  <select className="dnd-input" value={ab.uses||''} onChange={e => setCh(prev => ({...prev, abilities: prev.abilities.map((x,j) => j===i ? {...x, uses: e.target.value} : x)}))} style={{flex:'0 0 130px'}}>
                    <option value="">Sin límite</option>
                    <option value="1/día">1/día</option><option value="2/día">2/día</option><option value="3/día">3/día</option>
                    <option value="1/descanso corto">1/descanso corto</option><option value="1/descanso largo">1/descanso largo</option>
                    <option value="A voluntad">A voluntad</option>
                  </select>
                  <button className="dnd-btn-sm dnd-btn-danger" onClick={() => setCh(e => ({...e, abilities: e.abilities.filter((_,j)=>j!==i)}))}>✕</button>
                  <input className="dnd-input" placeholder="Descripción" value={ab.description} onChange={e => setCh(prev => ({...prev, abilities: prev.abilities.map((x,j) => j===i ? {...x, description: e.target.value} : x)}))} style={{width:'100%', marginTop:3}} />
                </div>
              ))}
            </div>
          </>}

          {/* ── PASO 6: Equipo ── */}
          {step === 5 && <>
            <div className="glossary-form-row">
              <label>Equipo <button className="dnd-btn-sm" onClick={() => setCh(e => ({...e, equipment: [...(e.equipment||[]), {name:'',quantity:1,notes:''}]}))}>+</button></label>
              {(ch.equipment||[]).length === 0 && <div className="dnd-empty-sm">Sin equipo — usa + para añadir</div>}
              {(ch.equipment||[]).map((eq, i) => (
                <div key={i} className="glossary-list-item">
                  <input className="dnd-input" placeholder="Nombre (ej: Espada larga)" value={eq.name} onChange={e => setCh(prev => ({...prev, equipment: prev.equipment.map((x,j) => j===i ? {...x, name: e.target.value} : x)}))} style={{flex:1}} />
                  <input className="dnd-input" type="number" min="1" placeholder="×" value={eq.quantity} onChange={e => setCh(prev => ({...prev, equipment: prev.equipment.map((x,j) => j===i ? {...x, quantity: parseInt(e.target.value)||1} : x)}))} style={{maxWidth:55}} />
                  <input className="dnd-input" placeholder="Notas" value={eq.notes||''} onChange={e => setCh(prev => ({...prev, equipment: prev.equipment.map((x,j) => j===i ? {...x, notes: e.target.value} : x)}))} style={{flex:1}} />
                  <button className="dnd-btn-sm dnd-btn-danger" onClick={() => setCh(e => ({...e, equipment: e.equipment.filter((_,j)=>j!==i)}))}>✕</button>
                </div>
              ))}
            </div>
            <div className="glossary-form-row">
              <label>Consumibles <button className="dnd-btn-sm" onClick={() => setCh(e => ({...e, consumables: [...(e.consumables||[]), {name:'',quantity:1,notes:''}]}))}>+</button></label>
              {(ch.consumables||[]).length === 0 && <div className="dnd-empty-sm">Sin consumibles — añade pociones, flechas, etc.</div>}
              {(ch.consumables||[]).map((c, i) => (
                <div key={i} className="glossary-list-item">
                  <input className="dnd-input" placeholder="Nombre (ej: Poción de curación)" value={c.name} onChange={e => setCh(prev => ({...prev, consumables: prev.consumables.map((x,j) => j===i ? {...x, name: e.target.value} : x)}))} style={{flex:1}} />
                  <input className="dnd-input" type="number" min="0" placeholder="×" value={c.quantity} onChange={e => setCh(prev => ({...prev, consumables: prev.consumables.map((x,j) => j===i ? {...x, quantity: parseInt(e.target.value)||0} : x)}))} style={{maxWidth:55}} />
                  <input className="dnd-input" placeholder="Notas (ej: 2d4+2 PG)" value={c.notes||''} onChange={e => setCh(prev => ({...prev, consumables: prev.consumables.map((x,j) => j===i ? {...x, notes: e.target.value} : x)}))} style={{flex:1}} />
                  <button className="dnd-btn-sm dnd-btn-danger" onClick={() => setCh(e => ({...e, consumables: e.consumables.filter((_,j)=>j!==i)}))}>✕</button>
                </div>
              ))}
            </div>
            <div className="glossary-form-row">
              <label>Items del glosario (Lore / Artefactos) <button className="dnd-btn-sm" onClick={() => setShowGlossaryPicker(!showGlossaryPicker)}>+ Vincular</button></label>
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
                <div className="dnd-empty-sm">Sin items del glosario vinculados</div>
              )}
            </div>
            <div className="glossary-form-row">
              <label>Acciones (armas, ataques) <button className="dnd-btn-sm" onClick={() => setCh(e => ({...e, actions: [...(e.actions||[]), {name:'',range:'Cuerpo a cuerpo',modifier:0,damage:'',secondaryDamage:'',note:'',actionType:'normal',isSpell:false,spellLevel:'truco',aoe:''}]}))}>+</button></label>
              {(ch.actions||[]).filter(a => !a.isSpell).map((a, idx) => {
                const i = (ch.actions||[]).indexOf(a)
                return (
                  <div key={i} className="glossary-action-form">
                    <div className="glossary-action-form-row">
                      <input className="dnd-input" placeholder="Nombre" value={a.name} onChange={e => setCh(prev => ({...prev, actions: prev.actions.map((x,j) => j===i ? {...x, name: e.target.value} : x)}))} style={{flex:1}} />
                      <select className="dnd-input" value={a.range||'Cuerpo a cuerpo'} onChange={e => setCh(prev => ({...prev, actions: prev.actions.map((x,j) => j===i ? {...x, range: e.target.value} : x)}))} style={{flex:'0 0 140px'}}>
                        <option value="Cuerpo a cuerpo">Cuerpo a cuerpo</option>
                        <option value="Distancia">Distancia</option>
                        <option value="Toque">Toque</option>
                      </select>
                      <button className="dnd-btn-sm dnd-btn-danger" onClick={() => setCh(e => ({...e, actions: e.actions.filter((_,j)=>j!==i)}))}>✕</button>
                    </div>
                    <div className="glossary-action-form-row">
                      <div className="glossary-stat-input" style={{flex:'0 0 70px'}}><span>Mod.</span><input className="dnd-input" type="number" value={a.modifier??0} onChange={e => setCh(prev => ({...prev, actions: prev.actions.map((x,j) => j===i ? {...x, modifier: parseInt(e.target.value)||0} : x)}))} /></div>
                      <div className="glossary-stat-input" style={{flex:1}}><span>Daño</span><input className="dnd-input" placeholder="1d8+3" value={a.damage||''} onChange={e => setCh(prev => ({...prev, actions: prev.actions.map((x,j) => j===i ? {...x, damage: e.target.value} : x)}))} /></div>
                    </div>
                    <textarea className="dnd-input" placeholder="Descripción / notas de la acción..." rows={2} value={a.note||''} onChange={e => setCh(prev => ({...prev, actions: prev.actions.map((x,j) => j===i ? {...x, note: e.target.value} : x)}))} style={{width:'100%', resize:'vertical', fontSize:'0.85rem'}} />
                  </div>
                )
              })}
            </div>
          </>}

          {/* ── PASO 7: Conjuros ── */}
          {step === 6 && <>
            <div className="glossary-form-row">
              <label className="glossary-spell-check">
                <input type="checkbox" checked={!!(ch.isSpellcaster)} onChange={e => update('isSpellcaster', e.target.checked)} />
                🔮 Lanzador de conjuros
              </label>
            </div>
            {ch.isSpellcaster && <>
              <div className="glossary-form-row">
                <label>Huecos de conjuro por nivel</label>
                <div className="glossary-spell-grid">
                  {[1,2,3,4,5,6,7,8,9].map(lv => (
                    <div key={lv} className="glossary-spell-input">
                      <span>Nv.{lv}</span>
                      <input className="dnd-input" type="number" min="0" value={(ch.spellSlots||{})[lv]??0}
                        onChange={e => {
                          const slots = {...(ch.spellSlots||{1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0})}
                          slots[lv] = parseInt(e.target.value)||0
                          update('spellSlots', slots)
                        }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="glossary-form-row">
                <label>Conjuros conocidos
                  <button className="dnd-btn-sm" onClick={() => setCh(e => ({...e, actions: [...(e.actions||[]), {name:'',range:'Distancia',modifier:0,damage:'',secondaryDamage:'',note:'',actionType:'normal',isSpell:true,spellLevel:'truco',aoe:''}]}))}>+ Manual</button>
                  {(glossarySpells||[]).length > 0 && <button className="dnd-btn-sm spell-picker-btn" onClick={() => update('_showSpellPicker', !ch._showSpellPicker)}>🔮 Del glosario</button>}
                </label>
                {ch._showSpellPicker && (
                  <SpellPicker spells={glossarySpells||[]} onClose={() => update('_showSpellPicker', false)}
                    onSelect={spell => { setCh(e => ({...e, actions: [...(e.actions||[]), spellToAction(spell)], _showSpellPicker: false})) }} />
                )}
                {(ch.actions||[]).filter(a => a.isSpell).map((a, idx) => {
                  const i = (ch.actions||[]).indexOf(a)
                  return (
                    <div key={i} className={`glossary-action-form ${a.glossarySpellId ? 'glossary-action-from-spell' : ''}`}>
                      {a.glossarySpellId && <div className="glossary-action-spell-badge">🔮 Del glosario</div>}
                      <div className="glossary-action-form-row">
                        <input className="dnd-input" placeholder="Nombre" value={a.name} onChange={e => setCh(prev => ({...prev, actions: prev.actions.map((x,j) => j===i ? {...x, name: e.target.value} : x)}))} style={{flex:1}} />
                        <select className="dnd-input" value={a.spellLevel||'truco'} onChange={e => setCh(prev => ({...prev, actions: prev.actions.map((x,j) => j===i ? {...x, spellLevel: e.target.value} : x)}))} style={{flex:'0 0 85px'}}>
                          <option value="truco">Truco</option>
                          {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>Nv. {n}</option>)}
                        </select>
                        <button className="dnd-btn-sm dnd-btn-danger" onClick={() => setCh(e => ({...e, actions: e.actions.filter((_,j)=>j!==i)}))}>✕</button>
                      </div>
                      <div className="glossary-action-form-row">
                        <div className="glossary-stat-input" style={{flex:1}}><span>Daño</span><input className="dnd-input" placeholder="1d10 fuego" value={a.damage||''} onChange={e => setCh(prev => ({...prev, actions: prev.actions.map((x,j) => j===i ? {...x, damage: e.target.value} : x)}))} /></div>
                      </div>
                      <textarea className="dnd-input" placeholder="Descripción / notas del conjuro..." rows={2} value={a.note||''} onChange={e => setCh(prev => ({...prev, actions: prev.actions.map((x,j) => j===i ? {...x, note: e.target.value} : x)}))} style={{width:'100%', resize:'vertical', fontSize:'0.85rem'}} />
                    </div>
                  )
                })}
              </div>
            </>}
            {!ch.isSpellcaster && <div className="dnd-empty-sm" style={{marginTop:20}}>Este personaje no es lanzador de conjuros. Activa la casilla si quieres añadir magia.</div>}
          </>}

        </div>

        {/* ── Footer de navegación ── */}
        <div className="cw-footer">
          <button className="dnd-btn-cancel" onClick={step === 0 ? onClose : handleBack}>
            {step === 0 ? 'Cancelar' : '← Anterior'}
          </button>
          {mode === 'edit' && step < 6 && <button className="dnd-btn-primary cw-save-inline" onClick={handleSave}>✅ Guardar</button>}
          <span className="cw-step-counter">{step + 1} / 7</span>
          {step < 6 ? (
            <button className="dnd-btn-primary" onClick={handleNext} disabled={!canAdvance()}>
              Siguiente →
            </button>
          ) : (
            <button className="dnd-btn-primary" onClick={handleSave}>
              ✅ Guardar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
