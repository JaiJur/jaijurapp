import React, { useState, useRef } from 'react'
import SpellPicker from './SpellPicker'
import { spellToAction } from './shared'

export default function GlossaryModal({ mode, entry: initialEntry, onSave, onClose, templates, glossarySpells }) {
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
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': '1' },
          body: JSON.stringify({ data: base64, filename: file.name, path: 'lore' })
        })
        if (res.ok) { const { url } = await res.json(); setEntry(en => ({ ...en, images: [...(en.images || []), url] })) }
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
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': '1' },
          body: JSON.stringify({ data: base64, filename: file.name })
        })
        if (res.ok) { const { url } = await res.json(); setEntry(en => ({ ...en, portraits: [...(en.portraits || []), url] })) }
      } catch (err) { console.error('Portrait upload error:', err) }
    }
    setUploadingPortrait(false)
    if (portraitInputRef.current) portraitInputRef.current.value = ''
  }

  function removePortrait(url) { setEntry(en => ({ ...en, portraits: (en.portraits || []).filter(p => p !== url) })) }
  function update(field, val) { setEntry(e => ({ ...e, [field]: val })) }
  function updateStat(key, val) { setEntry(e => ({ ...e, stats: { ...e.stats, [key]: val } })) }
  function updateAction(idx, field, val) { setEntry(e => ({ ...e, actions: e.actions.map((a,i) => i===idx ? {...a,[field]:val} : a) })) }
  function addAction() { setEntry(e => ({ ...e, actions: [...(e.actions||[]), {name:'',range:'Cuerpo a cuerpo',modifier:0,damage:'',secondaryDamage:'',note:'',actionType:'normal',isSpell:false,spellLevel:'truco',aoe:''}] })) }
  function removeAction(idx) { setEntry(e => ({ ...e, actions: e.actions.filter((_,i)=>i!==idx) })) }
  function updateTrait(idx, field, val) { setEntry(e => ({ ...e, traits: e.traits.map((t,i) => i===idx ? {...t,[field]:val} : t) })) }
  function addTrait() { setEntry(e => ({ ...e, traits: [...(e.traits||[]), {name:'',description:''}] })) }
  function removeTrait(idx) { setEntry(e => ({ ...e, traits: e.traits.filter((_,i)=>i!==idx) })) }
  function updateSkill(idx, field, val) { setEntry(e => ({ ...e, skills: e.skills.map((s,i) => i===idx ? {...s,[field]:val} : s) })) }
  function addSkill() { setEntry(e => ({ ...e, skills: [...(e.skills||[]), {name:'',bonus:0}] })) }
  function removeSkill(idx) { setEntry(e => ({ ...e, skills: (e.skills||[]).filter((_,i)=>i!==idx) })) }
  function updateAbility(idx, field, val) { setEntry(e => ({ ...e, abilities: (e.abilities||[]).map((a,i) => i===idx ? {...a,[field]:val} : a) })) }
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

  const SKILL_NAMES = ['Acrobacia','Arcanos','Atletismo','Engaño','Historia','Intimidación','Investigación',
    'Juego de manos','Medicina','Naturaleza','Percepción','Perspicacia','Persuasión',
    'Religión','Sigilo','Supervivencia','Trato con animales']
  const DAMAGE_TYPES = ['Ácido','Contundente','Cortante','Perforante','Fuego','Frío','Veneno','Necrótico','Radiante','Relámpago','Trueno','Fuerza','Psíquico','Curación']
  const USES_OPTIONS = ['','1/día','2/día','3/día','1/descanso corto','2/descanso corto','1/descanso largo','A voluntad']

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
              <input type="checkbox" checked={!!(entry.hidden)} onChange={e => update('hidden', e.target.checked)} />
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
            ) : <div className="dnd-empty-sm">Sin fotos — al añadir al grupo se asignará una aleatoriamente</div>}
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
                = {(() => { const hp = entry.stats?.hp || { dice:1, sides:6, modifier:0 }; return `~${Math.floor(hp.dice * (hp.sides + 1) / 2) + hp.modifier} PG` })()}
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
                  {SKILL_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
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
                    <option value="normal">Normal</option><option value="bonus">Adicional</option><option value="reaction">Reacción</option><option value="ritual">Ritual</option>
                  </select>
                  <button className="dnd-btn-sm dnd-btn-danger" onClick={()=>removeAction(i)}>✕</button>
                </div>
                <div className="glossary-action-form-row">
                  <select className="dnd-input" value={a.range||'Cuerpo a cuerpo'} onChange={e=>updateAction(i,'range',e.target.value)} style={{flex:'0 0 140px'}}>
                    <option value="Cuerpo a cuerpo">Cuerpo a cuerpo</option><option value="Toque">Toque</option><option value="Distancia">Distancia</option>
                  </select>
                  <label className="glossary-spell-check"><input type="checkbox" checked={a.isSpell||false} onChange={e=>updateAction(i,'isSpell',e.target.checked)} /> 🔮 Hechizo</label>
                  {a.isSpell && (
                    <select className="dnd-input" value={a.spellLevel||'truco'} onChange={e=>updateAction(i,'spellLevel',e.target.value)} style={{flex:'0 0 85px'}}>
                      <option value="truco">Truco</option>{[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>Nv. {n}</option>)}
                    </select>
                  )}
                  <input className="dnd-input" placeholder="Área de efecto (ej: Cono 15 pies)" value={a.aoe||''} onChange={e=>updateAction(i,'aoe',e.target.value)} style={{flex:1}} />
                </div>
                <div className="glossary-action-form-row">
                  <div className="glossary-stat-input" style={{flex:'0 0 70px'}}><span>Mod.</span><input className="dnd-input" type="number" value={a.modifier??0} onChange={e=>updateAction(i,'modifier',parseInt(e.target.value)||0)} /></div>
                  <div className="glossary-stat-input" style={{flex:1}}><span>Daño</span><input className="dnd-input" placeholder="1d6+2 cortante" value={a.damage||''} onChange={e=>updateAction(i,'damage',e.target.value)} /></div>
                  <div className="glossary-stat-input" style={{flex:1}}><span>Daño sec.</span><input className="dnd-input" placeholder="1d6 fuego" value={a.secondaryDamage||''} onChange={e=>updateAction(i,'secondaryDamage',e.target.value)} /></div>
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

