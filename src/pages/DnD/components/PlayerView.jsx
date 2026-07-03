import { useState } from 'react'
import CharacterCard from './CharacterCard'

export default function PlayerView({ user, characters, onCharacterSaved }) {
  const [selectedChar, setSelectedChar] = useState(null)
  const myChars = characters.filter(ch =>
    ch.playerUserId === user?.id || ch.player === user?.username
  )
  const currentChar = selectedChar
    ? characters.find(c => c.id === selectedChar.id) || selectedChar
    : null

  if (currentChar) {
    return <PlayerCharacterDetail character={currentChar} user={user} onBack={() => setSelectedChar(null)} onCharacterSaved={onCharacterSaved} />
  }

  return (
    <div className="pv-root">
      <div className="pv-header">
        <h2 className="pv-title">⚔️ Elige tu personaje</h2>
        <button className="pv-map-link" onClick={() => window.open('/dnd/viewer/main/multi', '_blank')}>🗺️ Ver mapa</button>
        {myChars.length === 0 && <p className="pv-empty">No tienes personajes asignados todavía.</p>}
      </div>
      <div className="pv-char-grid">
        {myChars.map(ch => (
          <CharacterSelectCard key={ch.id} character={ch} onSelect={() => setSelectedChar(ch)} />
        ))}
      </div>
    </div>
  )
}

function CharacterSelectCard({ character: ch, onSelect }) {
  const s = ch.stats || {}
  return (
    <div className="pv-charcard" onClick={onSelect}>
      <div className="pv-charcard-portrait">
        {ch.portrait
          ? <img src={ch.portrait} alt={ch.name} />
          : <div className="pv-charcard-portrait-placeholder">⚔️</div>}
      </div>
      <div className="pv-charcard-info">
        <div className="pv-charcard-name">{ch.name}</div>
        <div className="pv-charcard-sub">
          {ch.race && <span>{ch.race}</span>}
          {ch.class && <span>{ch.class}{ch.subclass ? ` · ${ch.subclass}` : ''}</span>}
          {ch.level && <span className="pv-charcard-level">Nivel {ch.level}</span>}
        </div>
        {s.hp && (
          <div className="pv-charcard-hp">
            <span className="pv-hp-label">PG</span>
            <span className="pv-hp-val">{s.hp.current ?? s.hp.max} / {s.hp.max}</span>
          </div>
        )}
      </div>
      <div className="pv-charcard-arrow">▶</div>
    </div>
  )
}

function PvSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`pv-section ${open ? 'pv-section-open' : ''}`}>
      <div className="pv-section-header" onClick={() => setOpen(o => !o)}>
        <span className="pv-section-chevron">{open ? '▾' : '▸'}</span>
        <h3 className="pv-section-title">{title}</h3>
      </div>
      {open && <div className="pv-section-body">{children}</div>}
    </div>
  )
}

const ACTION_TYPE_LABEL = { normal: 'Acción', bonus: 'Adicional', reaction: 'Reacción', free: 'Libre' }
const ACTION_TYPE_COLOR = { normal: '#6fcf97', bonus: '#56b4d3', reaction: '#e0a44e', free: '#aaa' }
const SAVE_LABELS = { str: 'FUE', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' }

function PlayerCharacterDetail({ character: ch, user, onBack, onCharacterSaved }) {
  const s = ch.stats || {}
  const prof = s.proficiencyBonus || 2
  const mod = v => { const m = Math.floor((v - 10) / 2); return m >= 0 ? `+${m}` : `${m}` }
  const headers = { 'Content-Type': 'application/json', 'x-user-id': user?.id }

  const [slotsUsed, setSlotsUsed] = useState(ch.slotsUsed || {})
  const [traitUsed, setTraitUsed] = useState(ch.traitUsed || {})
  const [expandedAction, setExpandedAction] = useState(null)
  const [consumables, setConsumables] = useState(ch.consumables || [])
  const [newConsumable, setNewConsumable] = useState({ name: '', quantity: 1 })

  const activeSpellSlots = Object.entries(ch.spellSlots || {})
    .filter(([, max]) => max > 0)
    .map(([lvl, max]) => ({ lvl: parseInt(lvl), max, used: slotsUsed[lvl] || 0 }))

  const classResources = ch.classResources || []
  const favActions = (ch.favoriteActions || []).map(i => ch.actions?.[i]).filter(Boolean)
  const skills = ch.skills || []
  const activeSaves = Object.entries(ch.savingThrows || {})
    .filter(([, v]) => v)
    .map(([key]) => {
      const attrMap = { str: s.str, dex: s.dex, con: s.con, int: s.int, wis: s.wis, cha: s.cha }
      const base = Math.floor(((attrMap[key] || 10) - 10) / 2)
      return { key, label: SAVE_LABELS[key], total: base + prof }
    })

  async function patchCharacter(patch) {
    try {
      await fetch(`/api/dnd/characters/${ch.id}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ ...ch, ...patch })
      })
    } catch (e) { console.error(e) }
  }

  async function saveConsumables(updated) {
    setConsumables(updated)
    await patchCharacter({ consumables: updated })
    if (onCharacterSaved) onCharacterSaved()
  }

  function updateQuantity(idx, delta) {
    saveConsumables(consumables.map((c, i) =>
      i === idx ? { ...c, quantity: Math.max(0, (c.quantity || 0) + delta) } : c
    ))
  }

  function addConsumable() {
    if (!newConsumable.name.trim()) return
    saveConsumables([...consumables, { name: newConsumable.name.trim(), quantity: newConsumable.quantity, notes: '' }])
    setNewConsumable({ name: '', quantity: 1 })
  }

  function toggleSlot(lvl, i) {
    const max = ch.spellSlots?.[lvl] || 0
    const cur = slotsUsed[lvl] || 0
    const next = i < cur ? i : Math.min(i + 1, max)
    const updated = { ...slotsUsed, [lvl]: next }
    setSlotsUsed(updated)
    patchCharacter({ slotsUsed: updated })
  }

  function toggleTrait(name, max, i) {
    const cur = traitUsed[name] || 0
    const next = i < cur ? i : Math.min(i + 1, max)
    const updated = { ...traitUsed, [name]: next }
    setTraitUsed(updated)
    patchCharacter({ traitUsed: updated })
  }

  return (
    <div className="pv-root">
      {/* Topbar — volver + acceso al mapa */}
      <div className="pv-detail-topbar">
        <button className="pv-back-btn" onClick={onBack}>← Volver</button>
        <button className="pv-map-link" onClick={() => window.open('/dnd/viewer/main/multi', '_blank')}>🗺️ Ver mapa</button>
      </div>

      {/* Hero */}
      <div className="pv-detail-hero">
        {ch.portrait && <img className="pv-detail-portrait" src={ch.portrait} alt={ch.name} />}
        <div className="pv-detail-hero-info">
          <h2>{ch.name}</h2>
          <div className="pv-detail-meta">
            {ch.race && <span>{ch.race}</span>}
            {ch.class && <span>{ch.class}{ch.subclass ? ` (${ch.subclass})` : ''}</span>}
            {ch.level && <span>Nivel {ch.level}</span>}
          </div>
          {s.hp && (() => {
            const cur = s.hp.current ?? s.hp.max
            const max = s.hp.max ?? 1
            const pct = Math.max(0, Math.min(100, (cur / max) * 100))
            const color = pct > 60 ? '#6fcf87' : pct > 30 ? '#f6c90e' : '#f87171'
            return (
              <div className="pv-hp-bar-wrap">
                <div className="pv-hp-bar-track">
                  <div className="pv-hp-bar-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className="pv-hp-bar-label" style={{ color }}>{cur} / {max} PG</span>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Franja de stats */}
      <div className="pv-stats-strip">
        <div className="pv-stat-badge"><span>CA</span><strong>{s.ca ?? '—'}</strong></div>
        <div className="pv-stat-badge"><span>Vel</span><strong>{(s.speed ?? '—').toString().replace(/\s*pies?/i, '')}</strong></div>
        <div className="pv-stat-badge"><span>INI</span><strong>{mod(s.dex || 10)}</strong></div>
        <div className="pv-stat-badge"><span>Comp</span><strong>+{prof}</strong></div>
        {s.hitDice && <div className="pv-stat-badge"><span>DG</span><strong>d{s.hitDice.die}</strong></div>}
      </div>

      {/* Huecos de conjuro */}
      {activeSpellSlots.length > 0 && (
        <PvSection title="✨ Huecos de conjuro">
          <div className="pv-slots-list">
            {activeSpellSlots.map(({ lvl, max, used }) => (
              <div key={lvl} className="pv-slot-row">
                <span className="pv-slot-label">Nivel {lvl}</span>
                <div className="pv-slot-pips">
                  {Array.from({ length: max }).map((_, i) => (
                    <button key={i} className={`pv-pip ${i < used ? 'pv-pip-used' : 'pv-pip-free'}`}
                      onClick={() => toggleSlot(String(lvl), i)} />
                  ))}
                </div>
                <span className="pv-slot-count">{max - used} / {max}</span>
              </div>
            ))}
          </div>
        </PvSection>
      )}

      {/* Recursos de clase */}
      {classResources.length > 0 && (
        <PvSection title="⚡ Recursos de clase">
          <div className="pv-slots-list">
            {classResources.map(({ name, max }) => {
              const used = traitUsed[name] || 0
              return (
                <div key={name} className="pv-slot-row">
                  <span className="pv-slot-label pv-slot-label-trait">{name}</span>
                  <div className="pv-slot-pips">
                    {Array.from({ length: max }).map((_, i) => (
                      <button key={i} className={`pv-pip ${i < used ? 'pv-pip-used' : 'pv-pip-free'}`}
                        onClick={() => toggleTrait(name, max, i)} />
                    ))}
                  </div>
                  <span className="pv-slot-count">{max - used}/{max}</span>
                </div>
              )
            })}
          </div>
        </PvSection>
      )}

      {/* Acciones favoritas */}
      {favActions.length > 0 && (
        <PvSection title="⭐ Acciones favoritas">
          <div className="pv-actions-list">
            {favActions.map((a, i) => {
              const isOpen = expandedAction === i
              const color = ACTION_TYPE_COLOR[a.actionType] || '#aaa'
              return (
                <div key={i} className={`pv-action-card ${isOpen ? 'pv-action-open' : ''}`}>
                  <div className="pv-action-header" onClick={() => setExpandedAction(isOpen ? null : i)}>
                    <div className="pv-action-main">
                      <span className="pv-action-name">{a.name}</span>
                      <div className="pv-action-info">
                        {a.actionType && <span className="pv-action-badge" style={{ color }}>{ACTION_TYPE_LABEL[a.actionType] || a.actionType}</span>}
                        {a.isSpell && a.spellLevel !== 'truco' && <span className="pv-action-badge pv-badge-spell">Nv.{a.spellLevel}</span>}
                        {a.isSpell && a.spellLevel === 'truco' && <span className="pv-action-badge pv-badge-cantrip">Truco</span>}
                        {a.modifier !== 0 && <span className="pv-action-mod">{a.modifier > 0 ? '+' : ''}{a.modifier}</span>}
                        {a.damage && <span className="pv-action-dmg">{a.damage}{a.damageType ? ` ${a.damageType}` : ''}</span>}
                      </div>
                    </div>
                    <span className="pv-action-chevron">{isOpen ? '▾' : '▸'}</span>
                  </div>
                  {isOpen && a.note && <div className="pv-action-note">{a.note}</div>}
                </div>
              )
            })}
          </div>
        </PvSection>
      )}

      {/* Consumibles */}
      <PvSection title="🧪 Consumibles">
        <div className="pv-consumables">
          {consumables.length === 0 && <div className="pv-consumables-empty">Sin consumibles</div>}
          {consumables.map((c, i) => (
            <div key={i} className={`pv-consumable-row ${c.quantity === 0 ? 'pv-consumable-empty' : ''}`}>
              <span className="pv-consumable-name">{c.name}</span>
              <div className="pv-consumable-controls">
                <button className="pv-cons-btn" onClick={() => updateQuantity(i, -1)}>−</button>
                <span className="pv-consumable-qty">{c.quantity}</span>
                <button className="pv-cons-btn" onClick={() => updateQuantity(i, +1)}>+</button>
              </div>
              <button className="pv-cons-del" onClick={() => saveConsumables(consumables.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <div className="pv-consumable-add">
            <input className="pv-cons-input" placeholder="Nombre del consumible..."
              value={newConsumable.name}
              onChange={e => setNewConsumable(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addConsumable()} />
            <input className="pv-cons-qty-input" type="number" min="1"
              value={newConsumable.quantity}
              onChange={e => setNewConsumable(p => ({ ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) }))} />
            <button className="pv-cons-add-btn" onClick={addConsumable}>+</button>
          </div>
        </div>
      </PvSection>

      {/* Estadísticas y habilidades */}
      {(skills.length > 0 || activeSaves.length > 0) && (
        <PvSection title="🎲 Estadísticas y habilidades">
          <div className="pv-attrs pv-attrs-inline">
            {[['FUE', s.str], ['DES', s.dex], ['CON', s.con], ['INT', s.int], ['SAB', s.wis], ['CAR', s.cha]].map(([label, val]) => (
              <div key={label} className="pv-attr">
                <span className="pv-attr-label">{label}</span>
                <span className="pv-attr-val">{val ?? '—'}</span>
                <span className="pv-attr-mod">{mod(val || 10)}</span>
              </div>
            ))}
          </div>
          {activeSaves.length > 0 && (
            <div className="pv-skills-group" style={{ marginTop: 12 }}>
              <div className="pv-skills-group-label">Tiradas de salvación</div>
              <div className="pv-skills-grid">
                {activeSaves.map(({ key, label, total }) => (
                  <div key={key} className="pv-skill-row pv-skill-save">
                    <span className="pv-skill-name">{label}</span>
                    <span className="pv-skill-bonus">{total >= 0 ? '+' : ''}{total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {skills.length > 0 && (
            <div className="pv-skills-group" style={{ marginTop: 10 }}>
              {activeSaves.length > 0 && <div className="pv-skills-group-label">Competencias</div>}
              <div className="pv-skills-grid">
                {[...skills].sort((a, b) => b.bonus - a.bonus).map((sk, i) => (
                  <div key={i} className="pv-skill-row">
                    <span className="pv-skill-name">{sk.name}</span>
                    <span className="pv-skill-bonus">{sk.bonus >= 0 ? '+' : ''}{sk.bonus}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </PvSection>
      )}

      {/* Hoja completa */}
      <PvSection title="📋 Hoja completa">
        <CharacterCard
          character={ch}
          expanded={true}
          onToggle={() => {}}
          onSave={async (updated) => {
            await fetch(`/api/dnd/characters/${updated.id}`, {
              method: 'PUT', headers,
              body: JSON.stringify(updated)
            })
            if (onCharacterSaved) onCharacterSaved()
          }}
          isMaster={false}
          glossaryEntries={[]}
        />
      </PvSection>

    </div>
  )
}
