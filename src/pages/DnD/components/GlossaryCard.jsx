import React, { useState } from 'react'
import { ActionsPanel, TraitCard } from './shared'

export default function GlossaryCard({ entry, expanded, onToggle, onEdit, onDelete, onSendImage, campaigns, favorites, onToggleFav, isFavorite, canEdit, onToggleUnlocked }) {
  const catIcons = { enemy: '⚔️', artifact: '💎', lore: '📜', spell: '🔮' }
  const s = entry.stats || {}
  const mod = v => { const m = Math.floor((v-10)/2); return m >= 0 ? `+${m}` : `${m}` }
  const [openSections, setOpenSections] = useState({})
  const [actionTab, setActionTab] = useState('melee')
  const toggleSec = key => setOpenSections(p => ({ ...p, [key]: !p[key] }))

  const GlossaryAccordion = ({ id, label, children, count }) => {
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

  const hasSkills = (entry.skills||[]).length > 0
  const hasTraits = (entry.traits||[]).length > 0
  const hasActions = (entry.actions||[]).length > 0
  const hasAbilities = (entry.abilities||[]).length > 0
  const hasSpellSlots = entry.spellSlots && typeof entry.spellSlots === 'object' && Object.values(entry.spellSlots).some(v => v > 0)

  return (
    <div className={`glossary-card ${expanded ? 'expanded' : ''} ${entry.hidden ? 'glossary-card-hidden' : ''}`} data-glossary-id={entry.id}>
      <div className="glossary-card-header" onClick={onToggle}>
        {isFavorite && <span className="glossary-card-fav-star">★</span>}
        {entry.hidden && <span className="glossary-hidden-badge" title="Oculto para jugadores">🙈</span>}
        {entry.category === 'lore' && canEdit && <span className="glossary-hidden-badge" title={entry.unlocked ? 'Visible para jugadores' : 'Bloqueado para jugadores'}>{entry.unlocked ? '🔓' : '🔒'}</span>}
        {entry.category === 'enemy' && (entry.portraits||[]).length > 0 ? (
          <img src={entry.portraits[0]} alt="" className="glossary-card-enemy-thumb" />
        ) : (
          <span className="glossary-card-cat">{catIcons[entry.category] || '📄'}</span>
        )}
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
              {hasSkills && (
                <GlossaryAccordion id="skills" label="Habilidades" count={entry.skills.length}>
                  <div className="glossary-skills">
                    {entry.skills.map((sk,i) => <span key={i} className="glossary-skill-badge">{sk.name} {sk.bonus >= 0 ? '+' : ''}{sk.bonus}</span>)}
                  </div>
                </GlossaryAccordion>
              )}
              {hasTraits && (
                <GlossaryAccordion id="traits" label="Rasgos" count={entry.traits.length}>
                  {entry.traits.map((t,i) => <div key={i} className="glossary-trait"><strong>{t.name}.</strong> {t.description}</div>)}
                </GlossaryAccordion>
              )}
              {(hasActions || hasSpellSlots) && (
                <GlossaryAccordion id="actions" label="Acciones" count={hasActions ? entry.actions.length : undefined}>
                  {hasSpellSlots && (
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
                  {hasActions && <ActionsPanel actions={entry.actions} favoriteActions={[]} actionTab={actionTab} setActionTab={setActionTab} onToggleFav={() => {}} />}
                </GlossaryAccordion>
              )}
              {hasAbilities && (
                <GlossaryAccordion id="abilities" label="Habilidades especiales" count={entry.abilities.length}>
                  <div className="trait-cards-grid">
                    {entry.abilities.map((ab,i) => <TraitCard key={i} trait={{ name: ab.name, description: ab.description, uses: ab.uses }} />)}
                  </div>
                </GlossaryAccordion>
              )}
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

          {entry.category === 'artifact' && entry.properties && <div className="glossary-props-text">{entry.properties}</div>}

          {(entry.images||[]).length > 0 && (
            <div className="lore-detail-images" style={{marginTop:8}}>
              {entry.images.map((url, i) => <img key={i} src={url} alt="" className="lore-detail-img" onClick={() => window.open(url, '_blank')} />)}
            </div>
          )}

          {entry.tags?.length > 0 && (
            <div className="glossary-tags">
              {entry.tags.map((t,i) => <span key={i} className="glossary-tag">{t}</span>)}
            </div>
          )}

          <div className="glossary-card-actions">
            {canEdit && <button className="dnd-btn-sm" onClick={onEdit}>✏ Editar</button>}
            {canEdit && entry.category === 'lore' && onToggleUnlocked && (
              <button className={`dnd-btn-sm ${entry.unlocked ? 'dnd-btn-visible-active' : ''}`}
                onClick={() => onToggleUnlocked(entry.id, !entry.unlocked)}
                title={entry.unlocked ? 'Bloquear para jugadores' : 'Desbloquear para jugadores'}>
                {entry.unlocked ? '🔓' : '🔒'}
              </button>
            )}
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
