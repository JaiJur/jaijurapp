import React, { useState } from 'react'

export const CONDITION_LIST = [
  { id: 'agarrado', label: 'AGA' }, { id: 'apresado', label: 'APR' }, { id: 'asustado', label: 'ASU' },
  { id: 'aturdido', label: 'ATU' }, { id: 'cansancio', label: 'CAN', levels: 6 }, { id: 'cegado', label: 'CEG' },
  { id: 'derribado', label: 'DER' }, { id: 'ensordecido', label: 'ENS' }, { id: 'envenenado', label: 'ENV' },
  { id: 'hechizado', label: 'HEC' }, { id: 'incapacitado', label: 'INC' }, { id: 'inconsciente', label: 'INS' },
  { id: 'invisible', label: 'INV' }, { id: 'paralizado', label: 'PAR' }, { id: 'petrificado', label: 'PET' },
]

export const SOUND_CATEGORIES = ['⚔️ Combate', '🏰 Ambiente', '🚪 Objetos', '✨ Magia', '🐉 Criaturas', '🎭 Social', '💀 Terror']
export const SOUND_ICONS = ['🔈','⚔️','💥','🔥','❄️','⚡','🌊','🌪️','🏹','🛡️','🚪','🔔','💀','👻','🐉','🧙','✨','🎵','🪓','🗡️','💣','🔮','🌿','🪨','🐺','🦇','💎','🏰','🔒','🪄']

export function ConditionPills({ conditions }) {
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

export function ConditionManager({ conditions, onChange }) {
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

export function spellToAction(spell) {
  let actionType = 'normal'
  if (spell.castTime === 'Acción adicional') actionType = 'bonus'
  else if (spell.castTime === 'Reacción') actionType = 'reaction'
  else if (spell.castTime === 'Ritual') actionType = 'ritual'

  let range = 'Distancia'
  if (spell.range?.toLowerCase().includes('toque') || spell.range?.toLowerCase().includes('personal')) range = 'Toque'
  else if (spell.range?.toLowerCase().includes('personal')) range = 'Cuerpo a cuerpo'

  const noteParts = []
  if (spell.duration) noteParts.push(`Duración: ${spell.duration}`)
  if (spell.concentration) noteParts.push('Concentración')
  if (spell.components) {
    const comps = [spell.components.v && 'V', spell.components.s && 'S', spell.components.m && 'M'].filter(Boolean).join(', ')
    if (comps) noteParts.push(`Comp: ${comps}`)
  }
  if (spell.description) noteParts.push(spell.description)

  return {
    name: spell.name, range, modifier: 0,
    damage: spell.damage || '', secondaryDamage: spell.secondaryDamage || '',
    note: noteParts.join(' · '), actionType, isSpell: true,
    spellLevel: spell.spellLevel || 'truco', aoe: '',
    glossarySpellId: spell.id,
    damageType: spell.damageType || '', secondaryDamageType: spell.secondaryDamageType || '',
  }
}

export function TraitCard({ trait }) {
  const [open, setOpen] = useState(false)
  const desc = trait.description || ''
  return (
    <>
      <div className="trait-card" onClick={e => { e.stopPropagation(); setOpen(true) }}>
        <div className="trait-card-name">
          {trait.name}
          {trait.uses && <span className="trait-card-uses">({trait.uses})</span>}
        </div>
        {trait.maxUses > 0 && (
          <div className="trait-card-dots">
            {Array.from({length: trait.maxUses}, (_,i) => <span key={i} className="party-slot-dot" />)}
          </div>
        )}
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
            {trait.maxUses > 0 && (
              <div className="trait-card-dots" style={{justifyContent:'center',padding:'4px 0 8px'}}>
                {Array.from({length: trait.maxUses}, (_,i) => <span key={i} className="party-slot-dot" />)}
              </div>
            )}
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

export function SectionAccordion({ id, label, count, openSections, toggleSec, children }) {
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

export function ActionCard({ a, isFav, onToggleFav }) {
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

export function ActionsPanel({ actions, favoriteActions, actionTab, setActionTab, onToggleFav }) {
  const favSet = new Set(favoriteActions || [])
  const melee = [], spells = [], favs = []
  actions.forEach((a, i) => {
    if (favSet.has(i)) favs.push({ ...a, _idx: i })
    if (a.isSpell) spells.push({ ...a, _idx: i })
    else melee.push({ ...a, _idx: i })
  })
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
