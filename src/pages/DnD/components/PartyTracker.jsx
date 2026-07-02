import { useState } from 'react'
import { CONDITION_LIST } from './shared'

// ── Sub: Editor de estados ─────────────────────────────
function ConditionsEditor({ conditions, onChange }) {
  function toggleCondition(id) {
    const def = CONDITION_LIST.find(c => c.id === id)
    const existing = conditions.find(c => (c.id || c) === id)
    if (existing) {
      onChange(conditions.filter(c => (c.id || c) !== id))
    } else {
      onChange([...conditions, def.levels ? { id, level: 1 } : id])
    }
  }
  function setLevel(id, level) {
    onChange(conditions.map(c => (c.id || c) === id ? { id, level } : c))
  }
  return (
    <div className="conditions-editor">
      <div className="party-expanded-label">Estados</div>
      <div className="conditions-grid">
        {CONDITION_LIST.map(def => {
          const active = conditions.find(c => (c.id || c) === def.id)
          return (
            <div key={def.id} className={`condition-toggle ${active ? 'active' : ''}`}>
              <button className="condition-toggle-btn" onClick={() => toggleCondition(def.id)}>
                <span className="condition-toggle-label">{def.label}</span>
                <span className="condition-toggle-name">{def.id}</span>
              </button>
              {active && def.levels && (
                <select className="condition-level-select" value={active.level || 1} onClick={e => e.stopPropagation()}
                  onChange={e => setLevel(def.id, parseInt(e.target.value))}>
                  {Array.from({length: def.levels}, (_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                </select>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Sub: Modal detalle PC ──────────────────────────────
function PCDetailModal({ ch, party, onHpChange, onSlotsChange, onAbilitySlotsChange, onClassResourceChange, onRemove, mod, conditions, onConditionsChange, isMaster }) {
  const s = ch.stats || {}
  const hp = s.hp?.current ?? 0
  const hpMax = s.hp?.max ?? 1
  const hpPct = Math.round((hp / hpMax) * 100)
  const hpColor = hpPct > 50 ? 'var(--party-hp-good)' : hpPct > 25 ? 'var(--party-hp-mid)' : 'var(--party-hp-low)'
  const usedSlots = party.usedSlots?.[ch.id] || {}
  const usedAbilities = party.usedAbilities?.[ch.id] || {}
  const usedClassRes = party.usedClassResources?.[ch.id] || {}
  const hasSpells = ch.isSpellcaster && ch.spellSlots && Object.values(ch.spellSlots).some(v => v > 0)
  const hasClassResources = (ch.classResources||[]).length > 0
  const [openSec, setOpenSec] = useState({})
  const toggleSec = k => setOpenSec(p => ({ ...p, [k]: !p[k] }))
  const Acc = ({ id, label, children, count }) => (
    <div className="cc-accordion">
      <div className="cc-accordion-header" onClick={() => toggleSec(id)}>
        <span className="cc-accordion-chevron">{openSec[id] ? '▾' : '▸'}</span>
        <span className="cc-accordion-label">{label}</span>
        {count != null && <span className="cc-accordion-count">{count}</span>}
      </div>
      {openSec[id] && <div className="cc-accordion-body">{children}</div>}
    </div>
  )
  function toggleSlot(level) {
    const used = { ...(party.usedSlots?.[ch.id] || {}) }
    const maxSlots = ch.spellSlots?.[level] || 0
    used[level] = (used[level] || 0) >= maxSlots ? 0 : (used[level] || 0) + 1
    onSlotsChange(ch.id, used)
  }
  function toggleAbilitySlot(abilityIdx) {
    const used = { ...(party.usedAbilities?.[ch.id] || {}) }
    const ab = ch.abilities[abilityIdx]
    const max = ab?.maxUses || 0
    if (!max) return
    used[abilityIdx] = (used[abilityIdx] || 0) >= max ? 0 : (used[abilityIdx] || 0) + 1
    onAbilitySlotsChange(ch.id, used)
  }
  function toggleClassResource(idx) {
    const used = { ...(party.usedClassResources?.[ch.id] || {}) }
    const cr = ch.classResources[idx]
    const max = cr?.max || 0
    if (!max) return
    used[idx] = (used[idx] || 0) >= max ? 0 : (used[idx] || 0) + 1
    onClassResourceChange(ch.id, used)
  }
  return (
    <>
      {ch.portrait ? <img src={ch.portrait} alt="" className="party-detail-portrait-wide" /> : <div className="party-detail-portrait-ph" style={{width:'100%',height:120,fontSize:'2.5rem'}}>🛡️</div>}
      <div className="party-detail-nameblock">
        <div className="party-detail-name">{ch.name}</div>
        <div className="party-detail-meta">{ch.race} · {ch.class}{ch.subclass ? ` (${ch.subclass})` : ''} Nv.{ch.level || 1}</div>
      </div>
      {conditions.length > 0 && <div className="party-mini-conditions" style={{justifyContent:'flex-start'}}>{conditions.map((c,i) => { const def = CONDITION_LIST.find(x => x.id === (c.id||c)); return def ? <span key={i} className="condition-pill">{def.levels ? `${def.label}${c.level||1}` : def.label}</span> : null })}</div>}
      <div className="party-detail-hp">
        <div className="party-hp-bar" style={{height:22}}><div className="party-hp-fill" style={{ width: `${hpPct}%`, background: hpColor }} /><span className="party-hp-text">{hp} / {hpMax}</span></div>
        {isMaster && <div className="party-hp-controls">
          <button className="party-hp-btn party-hp-minus" onClick={() => onHpChange(ch.id, Math.max(0, hp - 1))}>−</button>
          <input className="party-hp-input" type="number" value={hp} onChange={e => onHpChange(ch.id, Math.max(0, Math.min(hpMax, parseInt(e.target.value)||0)))} />
          <button className="party-hp-btn party-hp-plus" onClick={() => onHpChange(ch.id, Math.min(hpMax, hp + 1))}>+</button>
        </div>}
      </div>
      <div className="party-card-stats">
        <span className="party-stat">🛡 CA {s.ca}</span>
        <span className="party-stat">👟 {s.speed}</span>
        {s.passivePerception != null && <span className="party-stat">👁 PP {s.passivePerception}</span>}
      </div>
      <div className="party-card-attrs">
        {[['F',s.str],['D',s.dex],['C',s.con],['I',s.int],['S',s.wis],['Ca',s.cha]].map(([l,v]) => (
          <div key={l} className="party-attr"><span className="party-attr-label">{l}</span><span className="party-attr-mod">{mod(v)}</span></div>
        ))}
      </div>
      {(hasSpells || hasClassResources) && (
        <div className="party-resources-inline">
          {hasSpells && [1,2,3,4,5,6,7,8,9].map(lv => {
            const total = ch.spellSlots[lv] || 0; if (!total) return null
            return (<button key={`s${lv}`} className="party-res-row" onClick={e => { e.stopPropagation(); toggleSlot(lv) }} title={`Nv.${lv}: ${usedSlots[lv]||0}/${total}`}>
              <span className="party-res-icon">🔮</span>
              <span className="party-res-name">Nv.{lv}</span>
              <span className="party-slot-dots">{Array.from({length: total}, (_, i) => <span key={i} className={`party-slot-dot ${i < (usedSlots[lv]||0) ? 'used' : ''}`} />)}</span>
            </button>)
          })}
          {hasClassResources && ch.classResources.map((cr, idx) => (
            <button key={`cr${idx}`} className="party-res-row" onClick={e => { e.stopPropagation(); toggleClassResource(idx) }} title={`${cr.name}: ${usedClassRes[idx]||0}/${cr.max}`}>
              <span className="party-res-icon">⚡</span>
              <span className="party-res-name">{cr.name}</span>
              <span className="party-slot-dots">{Array.from({length: cr.max}, (_, i) => <span key={i} className={`party-slot-dot ${i < (usedClassRes[idx]||0) ? 'used' : ''}`} />)}</span>
            </button>
          ))}
        </div>
      )}
      {(ch.skills||[]).length > 0 && <Acc id="skills" label="Habilidades" count={ch.skills.length}><div className="party-skills-list">{ch.skills.map((sk,i) => <span key={i} className="party-skill-badge">{sk.name} {sk.bonus >= 0 ? '+' : ''}{sk.bonus}</span>)}</div></Acc>}
      {ch.savingThrows && Object.values(ch.savingThrows).some(v => v) && (
        <Acc id="saves" label="Salvaciones"><div className="party-skills-list">
          {[['FUE','str'],['DES','dex'],['CON','con'],['INT','int'],['SAB','wis'],['CAR','cha']].filter(([,k]) => ch.savingThrows[k]).map(([l,k]) => {
            const bonus = Math.floor(((s[k]||10)-10)/2) + (s.proficiencyBonus || 2)
            return <span key={k} className="party-skill-badge">{l} {bonus >= 0 ? '+' : ''}{bonus}</span>
          })}
        </div></Acc>
      )}
      {(ch.abilities||[]).length > 0 && <Acc id="abilities" label="Habilidades especiales" count={ch.abilities.length}>
        {ch.abilities.map((ab,i) => (
          <div key={i} className="party-ability">
            <strong>{ab.name}</strong>
            {ab.uses && <span className="party-ability-uses"> ({ab.uses})</span>}
            {ab.maxUses > 0 && (
              <button className="party-slot-btn party-ability-slot-btn" onClick={e => { e.stopPropagation(); toggleAbilitySlot(i) }} title={`${ab.name}: ${usedAbilities[i]||0}/${ab.maxUses}`}>
                <span className="party-slot-dots">{Array.from({length: ab.maxUses}, (_,j) => <span key={j} className={`party-slot-dot ${j < (usedAbilities[i]||0) ? 'used' : ''}`} />)}</span>
              </button>
            )}
            {ab.description && <span> — {ab.description}</span>}
          </div>
        ))}
      </Acc>}
      {(ch.actions||[]).length > 0 && <Acc id="actions" label="Acciones" count={ch.actions.length}>{ch.actions.map((a,i) => <div key={i} className="party-action"><span className="party-action-name">{a.name}</span>{a.isSpell && <span className="party-action-spell">🔮{a.spellLevel === 'truco' ? 'T' : a.spellLevel}</span>}{a.damage && <span className="party-action-dmg">⚔ {a.damage}</span>}{a.modifier != null && a.modifier !== 0 && <span className="party-action-mod">{a.modifier >= 0 ? '+' : ''}{a.modifier}</span>}</div>)}</Acc>}
      {isMaster && <Acc id="conditions" label="Estados" count={conditions.length || undefined}>
        <ConditionsEditor conditions={conditions} onChange={onConditionsChange} />
      </Acc>}
      {isMaster && <button className="dnd-btn-sm dnd-btn-danger" style={{marginTop:10}} onClick={() => onRemove(ch.id)}>✕ Quitar del grupo</button>}
    </>
  )
}

// ── Sub: Modal detalle Enemigo ─────────────────────────
function EnemyDetailModal({ enemy, onEnemyHpChange, onRemoveEnemy, onEnemyClick, onEnemyDispositionChange, mod, onClose, conditions, onConditionsChange, isMaster }) {
  const g = enemy.glossaryData || {}
  const s = g.stats || {}
  const hp = enemy.hpCurrent ?? 0
  const hpMax = enemy.hpMax ?? 1
  const hpPct = Math.round((hp / hpMax) * 100)
  const hpColor = hpPct > 50 ? 'var(--party-hp-good)' : hpPct > 25 ? 'var(--party-hp-mid)' : 'var(--party-hp-low)'
  const displayName = enemy.label || g.name || 'Enemigo'
  const [openSec, setOpenSec] = useState({})
  const toggleSec = k => setOpenSec(p => ({ ...p, [k]: !p[k] }))
  const Acc = ({ id, label, children, count }) => (
    <div className="cc-accordion">
      <div className="cc-accordion-header" onClick={() => toggleSec(id)}>
        <span className="cc-accordion-chevron">{openSec[id] ? '▾' : '▸'}</span>
        <span className="cc-accordion-label">{label}</span>
        {count != null && <span className="cc-accordion-count">{count}</span>}
      </div>
      {openSec[id] && <div className="cc-accordion-body">{children}</div>}
    </div>
  )
  return (
    <>
      <div className="party-detail-header">
        {enemy.portrait ? <img src={enemy.portrait} alt="" className="party-detail-portrait-sm" /> : <div className="party-detail-portrait-ph party-enemy-icon" style={{width:56,height:56}}>💀</div>}
        <div>
          <div className="party-detail-name">{displayName}</div>
          <div className="party-detail-meta">{s.challenge ? `CR ${s.challenge}` : ''}{s.speed ? ` · Vel. ${s.speed}` : ''}</div>
          <div className="party-detail-extra">
            <span className="party-stat">⚡ Init {enemy.initiative ?? '?'}</span>
            {s.passivePerception != null && <span className="party-stat">👁 PP {s.passivePerception}</span>}
          </div>
        </div>
      </div>
      {isMaster && <div className="party-disposition-toggle">
        <button className={`party-disposition-btn party-disposition-enemy ${(enemy.disposition || 'enemy') === 'enemy' ? 'active' : ''}`} onClick={() => onEnemyDispositionChange(enemy.id, 'enemy')}>😈 Enemigo</button>
        <button className={`party-disposition-btn party-disposition-npc ${enemy.disposition === 'npc' ? 'active' : ''}`} onClick={() => onEnemyDispositionChange(enemy.id, 'npc')}>🎭 NPC</button>
        <button className={`party-disposition-btn party-disposition-ally ${enemy.disposition === 'ally' ? 'active' : ''}`} onClick={() => onEnemyDispositionChange(enemy.id, 'ally')}>🤝 Aliado</button>
      </div>}
      {conditions.length > 0 && <div className="party-mini-conditions" style={{justifyContent:'flex-start'}}>{conditions.map((c,i) => { const def = CONDITION_LIST.find(x => x.id === (c.id||c)); return def ? <span key={i} className="condition-pill">{def.levels ? `${def.label}${c.level||1}` : def.label}</span> : null })}</div>}
      <div className="party-detail-hp">
        <div className="party-hp-bar" style={{height:22}}><div className="party-hp-fill" style={{ width: `${hpPct}%`, background: hpColor }} /><span className="party-hp-text">{hp} / {hpMax}</span></div>
        {isMaster && <div className="party-hp-controls">
          <button className="party-hp-btn party-hp-minus" onClick={() => onEnemyHpChange(enemy.id, Math.max(0, hp - 1))}>−</button>
          <input className="party-hp-input" type="number" value={hp} onChange={e => onEnemyHpChange(enemy.id, Math.max(0, Math.min(hpMax, parseInt(e.target.value)||0)))} />
          <button className="party-hp-btn party-hp-plus" onClick={() => onEnemyHpChange(enemy.id, Math.min(hpMax, hp + 1))}>+</button>
        </div>}
      </div>
      <div className="party-card-stats"><span className="party-stat">🛡 {s.ca ?? '?'}</span>{s.speed && <span className="party-stat">👟 {s.speed}</span>}</div>
      <div className="party-card-attrs">
        {[['F',s.str],['D',s.dex],['C',s.con],['I',s.int],['S',s.wis],['Ca',s.cha]].map(([l,v]) => (
          <div key={l} className="party-attr"><span className="party-attr-label">{l}</span><span className="party-attr-mod">{mod(v)}</span></div>
        ))}
      </div>
      {g.description && <p className="party-ability" style={{marginBottom:6}}>{g.description}</p>}
      {(g.traits||[]).length > 0 && <Acc id="traits" label="Rasgos" count={g.traits.length}>{g.traits.map((t,i) => <div key={i} className="party-ability"><strong>{t.name}.</strong> {t.description}</div>)}</Acc>}
      {(g.skills||[]).length > 0 && <Acc id="skills" label="Habilidades" count={g.skills.length}><div className="party-skills-list">{g.skills.map((sk,i) => <span key={i} className="party-skill-badge">{sk.name} {sk.bonus >= 0 ? '+' : ''}{sk.bonus}</span>)}</div></Acc>}
      {(g.abilities||[]).length > 0 && <Acc id="abilities" label="Habilidades especiales" count={g.abilities.length}>{g.abilities.map((ab,i) => <div key={i} className="party-ability"><strong>{ab.name}</strong>{ab.uses && <span className="party-ability-uses"> ({ab.uses})</span>}{ab.description && <span> — {ab.description}</span>}</div>)}</Acc>}
      {(g.actions||[]).length > 0 && <Acc id="actions" label="Acciones" count={g.actions.length}>{g.actions.map((a,i) => <div key={i} className="party-action"><span className="party-action-name">{a.name}</span>{a.isSpell && <span className="party-action-spell">🔮{a.spellLevel === 'truco' ? 'T' : a.spellLevel}</span>}{a.damage && <span className="party-action-dmg">⚔ {a.damage}</span>}{a.modifier != null && a.modifier !== 0 && <span className="party-action-mod">{a.modifier >= 0 ? '+' : ''}{a.modifier}</span>}</div>)}</Acc>}
      {isMaster && <Acc id="conditions" label="Estados" count={conditions.length || undefined}>
        <ConditionsEditor conditions={conditions} onChange={onConditionsChange} />
      </Acc>}
      {isMaster && <div className="party-enemy-actions">
        {enemy.glossaryId && <button className="dnd-btn-sm" onClick={() => { onEnemyClick(enemy.glossaryId); onClose() }}>📖 Ver en glosario</button>}
        <button className="dnd-btn-sm dnd-btn-danger" onClick={() => onRemoveEnemy(enemy.id)}>✕ Eliminar</button>
      </div>}
    </>
  )
}

// ── Componente principal: Party Tracker ─────────────────
export default function PartyTracker({ party, isMaster, userId, onReorder, onInitiativeChange, onHpChange, onSlotsChange, onAbilitySlotsChange, onClassResourceChange, onRemove, onEnemyHpChange, onEnemyDispositionChange, onRemoveEnemy, onEnemyClick, onConditionsChange }) {
  const [dragId, setDragId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [expandedCard, setExpandedCard] = useState(null)
  const [editingInit, setEditingInit] = useState(null) // key del personaje editando iniciativa

  const chars = party.memberChars || []
  const enemies = party.enemies || []
  const allItems = []
  chars.forEach(c => allItems.push({ type: 'pc', key: c.id, data: c }))
  enemies.forEach(e => allItems.push({ type: 'enemy', key: `e${e.id}`, data: e }))

  const initOrder = (party.initiative || []).map(String)
  const allKeys = allItems.map(i => String(i.key))
  const orderedKeys = initOrder.filter(k => allKeys.includes(k))
  const extraKeys = allKeys.filter(k => !orderedKeys.includes(k))
  const sortedKeys = [...orderedKeys, ...extraKeys]
  const sortedItems = sortedKeys.map(k => allItems.find(i => String(i.key) === k)).filter(Boolean)

  function handleDragStart(e, key) { setDragId(key); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(key)) }
  function handleDragOver(e, key) { e.preventDefault(); if (key !== dragOverId) setDragOverId(key) }
  function handleDragEnd() { setDragId(null); setDragOverId(null) }
  function handleDrop(e, targetKey) {
    e.preventDefault()
    if (!dragId || dragId === targetKey) { handleDragEnd(); return }
    const newOrder = sortedKeys.map(k => typeof k === 'number' ? k : String(k))
    const dragStr = typeof dragId === 'number' ? dragId : String(dragId)
    const targetStr = typeof targetKey === 'number' ? targetKey : String(targetKey)
    const fromIdx = newOrder.indexOf(dragStr)
    const toIdx = newOrder.indexOf(targetStr)
    if (fromIdx === -1 || toIdx === -1) { handleDragEnd(); return }
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, dragStr)
    onReorder(newOrder)
    handleDragEnd()
  }

  const mod = v => { const m = Math.floor(((v||10)-10)/2); return m >= 0 ? `+${m}` : `${m}` }
  function getConditions(key) { return (party.conditions || {})[key] || [] }

  if (sortedItems.length === 0) return <div className="dnd-empty-sm" style={{padding:12}}>Sin miembros — usa «+ Añadir» para incluir personajes o enemigos</div>

  return (
    <div className="party-tracker">
      <div className="party-grid">
        {sortedItems.map((item, idx) => {
          const isDragging = dragId === item.key
          const isDragOver = dragOverId === item.key
          const isEnemy = item.type === 'enemy'
          const d = item.data
          const portrait = isEnemy ? (d.portrait || null) : d.portrait
          const name = isEnemy ? (d.label || d.glossaryData?.name || 'Enemigo') : d.name
          const subtitle = isEnemy ? (d.glossaryData?.stats?.challenge ? `CR ${d.glossaryData.stats.challenge}` : '💀') : `${d.class || ''} Nv.${d.level || 1}`
          const hp = isEnemy ? (d.hpCurrent ?? 0) : (d.stats?.hp?.current ?? 0)
          const hpMax = isEnemy ? (d.hpMax ?? 1) : (d.stats?.hp?.max ?? 1)
          const hpPct = Math.round((hp / hpMax) * 100)
          const hpColor = hpPct > 50 ? 'var(--party-hp-good)' : hpPct > 25 ? 'var(--party-hp-mid)' : 'var(--party-hp-low)'
          const init = isEnemy ? (d.initiative ?? '?') : '—'
          const initValue = (party.initiativeValues || {})[String(item.key)]
          const pp = isEnemy ? (d.glossaryData?.stats?.passivePerception ?? '—') : (d.stats?.passivePerception ?? '—')
          const conditions = getConditions(item.key)

          return (
            <div key={item.key}
              className={`party-mini-card ${isEnemy ? 'party-mini-enemy' : ''} ${isDragging ? 'party-card-dragging' : ''} ${isDragOver ? 'party-card-dragover' : ''}`}
              draggable={isMaster} onDragStart={e => isMaster && handleDragStart(e, item.key)} onDragOver={e => isMaster && handleDragOver(e, item.key)}
              onDragEnd={handleDragEnd} onDrop={e => isMaster && handleDrop(e, item.key)}
              onClick={() => {
                const canOpen = isMaster || (item.type === 'pc' && item.data.playerUserId === userId)
                if (canOpen) setExpandedCard(expandedCard === item.key ? null : item.key)
              }}
              style={!isMaster && !(item.type === 'pc' && item.data.playerUserId === userId) ? { cursor: 'default' } : undefined}>
              <div className="party-mini-order">{idx + 1}</div>
              {portrait ? <img src={portrait} alt="" className="party-mini-portrait" /> : <div className="party-mini-placeholder">{isEnemy ? '💀' : '🛡️'}</div>}
              <div className="party-mini-info">
                <span className="party-mini-name">{name}</span>
                <span className="party-mini-sub">{subtitle}</span>
              </div>
              <div className="party-mini-stats-row">
                {isMaster ? (
                  <span className="party-mini-stat party-init-edit" title="Iniciativa" onClick={e => { e.stopPropagation(); setEditingInit(editingInit === item.key ? null : item.key) }}>
                    ⚡{editingInit === item.key ? (
                      <input className="party-init-input" type="number" autoFocus defaultValue={initValue ?? ''} placeholder="—"
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => { if (e.key === 'Enter') { onInitiativeChange(String(item.key), parseInt(e.target.value) || 0); setEditingInit(null) } if (e.key === 'Escape') setEditingInit(null) }}
                        onBlur={e => { if (e.target.value !== '') { onInitiativeChange(String(item.key), parseInt(e.target.value) || 0) } setEditingInit(null) }}
                      />
                    ) : <span>{initValue != null ? initValue : '—'}</span>}
                  </span>
                ) : (
                  <span className="party-mini-stat" title="Iniciativa">⚡{initValue != null ? initValue : (init !== '—' ? init : '—')}</span>
                )}
                {pp !== '—' && <span className="party-mini-stat" title="Percepción pasiva">👁{pp}</span>}
              </div>
              <div className="party-mini-hp-bar">
                <div className="party-mini-hp-fill" style={{ width: `${hpPct}%`, background: hpColor }} />
                <span className="party-mini-hp-text">{hp}/{hpMax}</span>
              </div>
              {conditions.length > 0 && (
                <div className="party-mini-conditions">
                  {conditions.map((c,i) => {
                    const def = CONDITION_LIST.find(x => x.id === (c.id || c))
                    if (!def) return null
                    const label = def.levels ? `${def.label}${c.level || 1}` : def.label
                    return <span key={i} className="condition-pill">{label}</span>
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {expandedCard && (() => {
        const item = sortedItems.find(i => i.key === expandedCard)
        if (!item) return null
        const conditions = getConditions(item.key)
        if (item.type === 'pc') return (
          <div className="action-card-overlay" onClick={() => setExpandedCard(null)}>
            <div className="party-detail-modal" onClick={e => e.stopPropagation()}>
              <PCDetailModal ch={item.data} party={party} onHpChange={onHpChange} onSlotsChange={onSlotsChange} onAbilitySlotsChange={onAbilitySlotsChange} onClassResourceChange={onClassResourceChange} onRemove={onRemove} mod={mod}
                conditions={conditions} onConditionsChange={conds => onConditionsChange(item.key, conds)} isMaster={isMaster} />
            </div>
          </div>
        )
        return (
          <div className="action-card-overlay" onClick={() => setExpandedCard(null)}>
            <div className="party-detail-modal" onClick={e => e.stopPropagation()}>
              <EnemyDetailModal enemy={item.data} onEnemyHpChange={onEnemyHpChange} onRemoveEnemy={onRemoveEnemy} onEnemyClick={onEnemyClick} onEnemyDispositionChange={onEnemyDispositionChange} mod={mod} onClose={() => setExpandedCard(null)}
                conditions={conditions} onConditionsChange={conds => onConditionsChange(item.key, conds)} isMaster={isMaster} />
            </div>
          </div>
        )
      })()}
    </div>
  )
}
