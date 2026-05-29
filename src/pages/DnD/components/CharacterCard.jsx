import { useState } from 'react'
import { ActionsPanel, SectionAccordion, TraitCard } from './shared'

export default function CharacterCard({ character, expanded, onToggle, onEdit, onDelete, onSave, onAddToParty, parties, isMaster, glossaryEntries }) {
  const s = character.stats || {}
  const mod = v => { const m = Math.floor((v-10)/2); return m >= 0 ? `+${m}` : `${m}` }
  const [openSections, setOpenSections] = useState({})
  const [actionTab, setActionTab] = useState('fav')
  const [openActionIdx, setOpenActionIdx] = useState(null)
  const [loreModal, setLoreModal] = useState(null)
  const toggleSec = key => setOpenSections(p => ({ ...p, [key]: !p[key] }))

  const hasSaves = character.savingThrows && Object.values(character.savingThrows).some(v => v)
  const hasSkills = (character.skills||[]).length > 0
  const allTraits = [...(character.traits||[]), ...(character.bgTraits||[])]
  const hasTraits = allTraits.length > 0
  const hasActions = (character.actions||[]).length > 0
  const hasAbilities = (character.abilities||[]).length > 0
  const hasSpellSlots = character.spellSlots && typeof character.spellSlots === 'object' && Object.values(character.spellSlots).some(v => v > 0)
  const hasProficiencies = [...(character.proficiencies||[]), ...(character.bgTools||[])].length > 0
  const allEquipment = [...(character.equipment||[]), ...(character.bgEquipment||[])]
  const hasEquipment = allEquipment.length > 0
  const hasConsumables = (character.consumables||[]).length > 0

  return (
    <div className={`glossary-card ${expanded ? 'expanded' : ''}`}>
      <div className="glossary-card-header" onClick={onToggle}>
        <span className="glossary-card-cat">🛡️</span>
        <span className="glossary-card-name">{character.name || 'Sin nombre'}</span>
        {character.player && <span className="glossary-card-player">🎮 {character.player}</span>}
        {character.race && <span className="glossary-card-cr">{character.race}</span>}
        {character.class && <span className="glossary-card-rarity">{character.class}{character.subclass ? ` (${character.subclass})` : ''} Nv.{character.level || 1}</span>}
        <span className="glossary-card-chevron">{expanded ? '▾' : '▸'}</span>
      </div>

      {expanded && (
        <div className="glossary-card-body">
          {character.description && <p className="glossary-desc">{character.description}</p>}

          <div className="cc-profile-layout">
            {character.portrait && (
              <div className="cc-profile-portrait">
                <img src={character.portrait} alt="" />
              </div>
            )}
            <div className="cc-profile-stats">
              <div className="glossary-stats-row">
                <span className="glossary-stat-badge">CA {s.ca}</span>
                <span className="glossary-stat-badge">PG {s.hp?.current ?? '?'} / {s.hp?.max ?? '?'}</span>
                <span className="glossary-stat-badge">Vel. {s.speed}</span>
                <span className="glossary-stat-badge">Comp. +{s.proficiencyBonus || 2}</span>
                {s.passivePerception != null && <span className="glossary-stat-badge">PP {s.passivePerception}</span>}
                {s.hitDice && <span className="glossary-stat-badge">DG {s.hitDice.count}d{s.hitDice.die}</span>}
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
            </div>
          </div>

            {hasSaves && (
              <SectionAccordion id="saves" label="Tiradas de salvación" count={[['FUE','str'],['DES','dex'],['CON','con'],['INT','int'],['SAB','wis'],['CAR','cha']].filter(([,k]) => character.savingThrows[k]).length} openSections={openSections} toggleSec={toggleSec}>
                <div className="glossary-skills">
                  {[['FUE','str'],['DES','dex'],['CON','con'],['INT','int'],['SAB','wis'],['CAR','cha']]
                    .filter(([,key]) => character.savingThrows[key])
                    .map(([label,key]) => {
                      const bonus = Math.floor(((s[key]||10)-10)/2) + (s.proficiencyBonus || 2)
                      return <span key={key} className="glossary-skill-badge">{label} {bonus >= 0 ? '+' : ''}{bonus}</span>
                    })}
                </div>
              </SectionAccordion>
            )}

            {hasSkills && (
              <SectionAccordion id="skills" label="Habilidades" count={character.skills.length} openSections={openSections} toggleSec={toggleSec}>
                <div className="glossary-skills">
                  {character.skills.map((sk,i) => (
                    <span key={i} className="glossary-skill-badge">{sk.name} {sk.bonus >= 0 ? '+' : ''}{sk.bonus}</span>
                  ))}
                </div>
              </SectionAccordion>
            )}

            {hasProficiencies && (() => {
              const allProfs = [...(character.proficiencies||[]), ...(character.bgTools||[])]
              return (
              <SectionAccordion id="profs" label="Competencias" count={allProfs.length} openSections={openSections} toggleSec={toggleSec}>
                <div className="glossary-skills">
                  {allProfs.map((p,i) => (
                    <span key={i} className="glossary-skill-badge">{p}</span>
                  ))}
                </div>
              </SectionAccordion>
            )})()}

            {(character.languages||[]).length > 0 && (
              <SectionAccordion id="languages" label="Idiomas" count={character.languages.length} openSections={openSections} toggleSec={toggleSec}>
                <div className="glossary-skills">
                  {character.languages.map((l,i) => (
                    <span key={i} className="glossary-skill-badge">{l}</span>
                  ))}
                </div>
              </SectionAccordion>
            )}

            {hasTraits && (
              <SectionAccordion id="traits" label="Rasgos" count={allTraits.length} openSections={openSections} toggleSec={toggleSec}>
                <div className="trait-cards-grid">
                  {[...allTraits].sort((a,b) => (a.name||'').localeCompare(b.name||'', 'es')).map((t,i) => (
                    <TraitCard key={i} trait={t} />
                  ))}
                </div>
              </SectionAccordion>
            )}

            {(hasActions || hasSpellSlots) && (
              <SectionAccordion id="actions" label="Acciones" count={hasActions ? character.actions.length : undefined} openSections={openSections} toggleSec={toggleSec}>
                {hasSpellSlots && (
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
                <ActionsPanel actions={character.actions||[]} favoriteActions={character.favoriteActions||[]}
                  actionTab={actionTab} setActionTab={setActionTab}
                  openActionIdx={openActionIdx} setOpenActionIdx={setOpenActionIdx}
                  onToggleFav={idx => {
                    const favs = [...(character.favoriteActions||[])]
                    const pos = favs.indexOf(idx)
                    if (pos >= 0) favs.splice(pos, 1); else favs.push(idx)
                    onSave({ ...character, favoriteActions: favs })
                  }} />
              </SectionAccordion>
            )}

            {hasAbilities && (
              <SectionAccordion id="abilities" label="Habilidades especiales" count={character.abilities.length} openSections={openSections} toggleSec={toggleSec}>
                <div className="trait-cards-grid">
                  {character.abilities.map((ab,i) => (
                    <TraitCard key={i} trait={{ name: ab.name, description: ab.description, uses: ab.uses }} />
                  ))}
                </div>
              </SectionAccordion>
            )}

            {hasEquipment && (
              <SectionAccordion id="equipment" label="Equipo" count={allEquipment.length} openSections={openSections} toggleSec={toggleSec}>
                <div className="glossary-skills">
                  {allEquipment.map((eq,i) => (
                    <span key={i} className="glossary-skill-badge">{typeof eq === 'string' ? eq : eq.name}{eq.quantity > 1 ? ` ×${eq.quantity}` : ''}</span>
                  ))}
                </div>
                {(character.glossaryItems||[]).length > 0 && (
                  <div className="glossary-linked-items" style={{marginTop:6}}>
                    {character.glossaryItems.map(gId => {
                      const g = (glossaryEntries || []).find(x => x.id === gId)
                      if (!g) return null
                      return (
                        <div key={gId} className="glossary-linked-item glossary-linked-clickable" onClick={() => setLoreModal(g)}>
                          <span>{g.category === 'artifact' ? '💎' : '📜'}</span>
                          <span className="glossary-linked-name">{g.name}</span>
                          {g.rarity && <span className="glossary-linked-rarity">{g.rarity}</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </SectionAccordion>
            )}
            {!hasEquipment && (character.glossaryItems||[]).length > 0 && (
              <SectionAccordion id="equipment" label="Equipo" count={(character.glossaryItems||[]).length} openSections={openSections} toggleSec={toggleSec}>
                <div className="glossary-linked-items">
                  {character.glossaryItems.map(gId => {
                    const g = (glossaryEntries || []).find(x => x.id === gId)
                    if (!g) return null
                    return (
                      <div key={gId} className="glossary-linked-item glossary-linked-clickable" onClick={() => setLoreModal(g)}>
                        <span>{g.category === 'artifact' ? '💎' : '📜'}</span>
                        <span className="glossary-linked-name">{g.name}</span>
                        {g.rarity && <span className="glossary-linked-rarity">{g.rarity}</span>}
                      </div>
                    )
                  })}
                </div>
              </SectionAccordion>
            )}

            {hasConsumables && (
              <SectionAccordion id="consumables" label="Consumibles" count={character.consumables.length} openSections={openSections} toggleSec={toggleSec}>
                <div className="cc-consumables-list">
                  {character.consumables.map((c,i) => (
                    <div key={i} className="cc-consumable-item">
                      <span className="cc-consumable-name">{c.name}</span>
                      <span className="cc-consumable-qty">×{c.quantity}</span>
                      {c.notes && <span className="cc-consumable-notes">{c.notes}</span>}
                    </div>
                  ))}
                </div>
              </SectionAccordion>
            )}

          {character.tags?.length > 0 && (
            <div className="glossary-tags">
              {character.tags.map((t,i) => <span key={i} className="glossary-tag">{t}</span>)}
            </div>
          )}

          {isMaster && <div className="glossary-card-actions">
            <button className="dnd-btn-sm" onClick={onEdit}>✏ Editar</button>
            {isMaster && parties && parties.length > 0 && (
              <div className="char-party-assign">
                {parties.map(p => {
                  const isIn = (p.members || []).includes(character.id)
                  return <button key={p.id} className={`dnd-btn-sm ${isIn ? 'dnd-btn-in-party' : 'dnd-btn-party'}`}
                    onClick={() => !isIn && onAddToParty(p.id, character.id)}
                    style={isIn ? {cursor:'default', opacity:0.6} : {}}>
                    {isIn ? '✔' : '⚔'} {p.name.length > 14 ? p.name.slice(0,14) + '…' : p.name}
                  </button>
                })}
              </div>
            )}
            {isMaster && <button className="dnd-btn-sm dnd-btn-danger" onClick={onDelete}>✕ Borrar</button>}
          </div>}
        </div>
      )}

      {loreModal && (
        <div className="dnd-modal-overlay" onClick={() => setLoreModal(null)}>
          <div className="dnd-modal lore-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="lore-detail-header">
              <span className="lore-detail-icon">{loreModal.category === 'artifact' ? '💎' : '📜'}</span>
              <h3 className="lore-detail-title">{loreModal.name}</h3>
              {loreModal.rarity && <span className="glossary-linked-rarity">{loreModal.rarity}</span>}
            </div>
            <div className="lore-detail-body">
              {loreModal.description && <p className="lore-detail-text">{loreModal.description}</p>}
              {loreModal.properties && <p className="lore-detail-text">{loreModal.properties}</p>}
              {(loreModal.images||[]).length > 0 && (
                <div className="lore-detail-images">
                  {loreModal.images.map((url, i) => (
                    <img key={i} src={url} alt="" className="lore-detail-img" onClick={() => window.open(url, '_blank')} />
                  ))}
                </div>
              )}
              {loreModal.tags?.length > 0 && (
                <div className="glossary-tags" style={{marginTop:8}}>
                  {loreModal.tags.map((t,i) => <span key={i} className="glossary-tag">{t}</span>)}
                </div>
              )}
            </div>
            <button className="dnd-btn-cancel lore-detail-close" onClick={() => setLoreModal(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}
