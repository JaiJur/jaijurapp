import { useState } from 'react'
import SpellPicker from './SpellPicker'
import { spellToAction } from './shared'

export default function CharacterModal({ mode, character: initialChar, onSave, onClose, template, glossarySpells, glossaryItems: availableGlossaryItems }) {
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

