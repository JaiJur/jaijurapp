import { useState, useEffect } from 'react'
import './PartyViewer.css'

const CONDITION_LIST = [
  { id: 'agarrado', label: 'AGA' }, { id: 'apresado', label: 'APR' }, { id: 'asustado', label: 'ASU' },
  { id: 'aturdido', label: 'ATU' }, { id: 'cansancio', label: 'CAN', levels: 6 }, { id: 'cegado', label: 'CEG' },
  { id: 'derribado', label: 'DER' }, { id: 'ensordecido', label: 'ENS' }, { id: 'envenenado', label: 'ENV' },
  { id: 'hechizado', label: 'HEC' }, { id: 'incapacitado', label: 'INC' }, { id: 'inconsciente', label: 'INS' },
  { id: 'invisible', label: 'INV' }, { id: 'paralizado', label: 'PAR' }, { id: 'petrificado', label: 'PET' },
]

function PvAccordion({ label, count, show, children }) {
  const [open, setOpen] = useState(false)
  if (!show) return null
  return (
    <div className="pv-accordion">
      <div className="pv-accordion-header" onClick={() => setOpen(!open)}>
        <span className="pv-accordion-chevron">{open ? '▾' : '▸'}</span>
        <span className="pv-accordion-label">{label}</span>
        {count != null && count > 0 && <span className="pv-accordion-count">{count}</span>}
      </div>
      {open && <div className="pv-accordion-body">{children}</div>}
    </div>
  )
}

function PvActionCard({ a }) {
  const [open, setOpen] = useState(false)
  const content = () => (
    <>
      <div className="pva-top">
        <span className="pva-name">{a.name}</span>
        {a.actionType && a.actionType !== 'normal' && (
          <span className="pva-type">{a.actionType === 'bonus' ? 'Adic.' : a.actionType === 'reaction' ? 'Reacción' : 'Ritual'}</span>
        )}
      </div>
      <div className="pva-body">
        {a.isSpell && <span className="pva-tag pva-spell">🔮 {a.spellLevel === 'truco' ? 'Truco' : `Nv.${a.spellLevel}`}</span>}
        {a.range && <span className="pva-tag">📏 {a.range}</span>}
        {a.aoe && <span className="pva-tag">◎ {a.aoe}</span>}
        {a.modifier != null && a.modifier !== '' && a.modifier !== 0 && (
          <span className="pva-tag pva-mod">{a.modifier >= 0 ? '+' : ''}{a.modifier}</span>
        )}
      </div>
      {(a.damage || a.secondaryDamage) && (
        <div className="pva-dmg">
          {a.damage && <span className="pva-dmg-main">⚔ {a.damage}</span>}
          {a.secondaryDamage && <span className="pva-dmg-sec">+ {a.secondaryDamage}</span>}
        </div>
      )}
      {a.concentration && <div className="pva-conc">🎯 Concentración</div>}
      {a.note && <div className="pva-note">{a.note}</div>}
    </>
  )
  return (
    <>
      <div className="pva-card" onClick={e => { e.stopPropagation(); setOpen(true) }}>{content()}</div>
      {open && (
        <div className="pva-overlay" onClick={e => { e.stopPropagation(); setOpen(false) }}>
          <div className="pva-modal" onClick={e => e.stopPropagation()}>{content()}</div>
        </div>
      )}
    </>
  )
}

export default function PartyViewer() {
  const [parties, setParties] = useState([])
  const [expandedCard, setExpandedCard] = useState(null)

  async function fetchParties() {
    try {
      const r = await fetch('/api/dnd/parties/view')
      if (r.ok) setParties(await r.json())
    } catch {}
  }

  useEffect(() => {
    fetchParties()
    const iv = setInterval(fetchParties, 3000)
    return () => clearInterval(iv)
  }, [])

  if (parties.length === 0) return (
    <div className="pv-root"><div className="pv-empty">Cargando parties...</div></div>
  )

  return (
    <div className="pv-root">
      <div className="pv-bg" />
      <div className="pv-content">
        {parties.map(party => (
          <PartyBlock key={party.id} party={party}
            expandedCard={expandedCard} setExpandedCard={setExpandedCard} />
        ))}
      </div>
    </div>
  )
}

function PartyBlock({ party, expandedCard, setExpandedCard }) {
  const chars = party.memberChars || []
  const enemies = party.enemies || []
  const allItems = []
  chars.forEach(c => allItems.push({ type: 'pc', key: c.id, data: c }))
  enemies.forEach(e => allItems.push({ type: 'enemy', key: `e${e.id}`, data: e }))

  const initOrder = party.initiative || []
  const allKeys = allItems.map(i => i.key)
  const orderedKeys = initOrder.filter(k => allKeys.includes(k) || allKeys.includes(Number(k)))
  const extraKeys = allKeys.filter(k => !orderedKeys.includes(k) && !orderedKeys.includes(String(k)))
  const sortedKeys = [...orderedKeys, ...extraKeys]
  const sortedItems = sortedKeys.map(k => allItems.find(i => i.key === k || String(i.key) === String(k))).filter(Boolean)

  function getConditions(key) { return (party.conditions || {})[key] || [] }

  const mod = v => { const m = Math.floor(((v||10)-10)/2); return m >= 0 ? `+${m}` : `${m}` }

  if (sortedItems.length === 0) return (
    <div className="pv-party">
      <div className="pv-party-header"><span className="pv-party-name">{party.name}</span></div>
      <div className="pv-empty-sm">Sin miembros</div>
    </div>
  )

  return (
    <div className="pv-party">
      <div className="pv-party-header">
        <span className="pv-party-name">{party.name}</span>
        <span className="pv-party-count">{chars.length} PCs · {enemies.length} enemigos</span>
      </div>
      <div className="pv-grid">
        {sortedItems.map((item, idx) => {
          const isEnemy = item.type === 'enemy'
          const d = item.data
          const portrait = isEnemy ? (d.portrait || null) : d.portrait
          const name = isEnemy ? (d.label || d.glossaryData?.name || 'Enemigo') : d.name
          const subtitle = isEnemy ? '' : `${d.class || ''} Nv.${d.level || 1}`
          const hp = isEnemy ? (d.hpCurrent ?? 0) : (d.stats?.hp?.current ?? 0)
          const hpMax = isEnemy ? (d.hpMax ?? 1) : (d.stats?.hp?.max ?? 1)
          const hpPct = Math.round((hp / hpMax) * 100)
          const hpColor = hpPct > 50 ? '#4ade80' : hpPct > 25 ? '#fbbf24' : '#f87171'
          const init = isEnemy ? (d.initiative ?? '?') : '—'
          const conditions = getConditions(item.key)
          const isExpanded = expandedCard === `${party.id}-${item.key}`

          return (
            <div key={item.key} className={`pv-card ${isEnemy ? 'pv-card-enemy' : ''}`}
              onClick={() => setExpandedCard(isExpanded ? null : `${party.id}-${item.key}`)}>
              <div className="pv-card-order">{idx + 1}</div>
              {portrait ? <img src={portrait} alt="" className="pv-card-portrait" />
                : <div className="pv-card-placeholder">{isEnemy ? '💀' : '🛡️'}</div>}
              <div className="pv-card-info">
                <span className="pv-card-name">{name}</span>
                {subtitle && <span className="pv-card-sub">{subtitle}</span>}
              </div>
              <div className="pv-card-stats-row">
                {init !== '—' && <span className="pv-card-stat" title="Iniciativa">⚡{init}</span>}
              </div>
              <div className="pv-card-hp-bar">
                <div className="pv-card-hp-fill" style={{ width: `${hpPct}%`, background: hpColor }} />
                {!isEnemy && <span className="pv-card-hp-text">{hp}/{hpMax}</span>}
              </div>
              {conditions.length > 0 && (
                <div className="pv-card-conditions">
                  {conditions.map((c,i) => {
                    const def = CONDITION_LIST.find(x => x.id === (c.id || c))
                    if (!def) return null
                    const label = def.levels ? `${def.label}${c.level || 1}` : def.label
                    return <span key={i} className="pv-condition-pill">{label}</span>
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal de detalle al hacer click en un PC */}
      {expandedCard && (() => {
        const item = sortedItems.find(i => `${party.id}-${i.key}` === expandedCard)
        if (!item || item.type !== 'pc') return null
        const ch = item.data
        const s = ch.stats || {}
        const conditions = getConditions(item.key)
        const hp = s.hp?.current ?? 0
        const hpMax = s.hp?.max ?? 1
        const hpPct = Math.round((hp / hpMax) * 100)
        const hpColor = hpPct > 50 ? '#4ade80' : hpPct > 25 ? '#fbbf24' : '#f87171'
        const allTraits = [...(ch.traits||[]), ...(ch.bgTraits||[])]

        return (
          <div className="pv-detail-overlay" onClick={() => setExpandedCard(null)}>
            <div className="pv-detail-modal" onClick={e => e.stopPropagation()}>
              {ch.portrait && <img src={ch.portrait} alt="" className="pv-detail-portrait" />}
              <div className="pv-detail-name">{ch.name}</div>
              <div className="pv-detail-meta">{ch.race} · {ch.class}{ch.subclass ? ` (${ch.subclass})` : ''} Nv.{ch.level || 1}</div>

              {conditions.length > 0 && (
                <div className="pv-card-conditions" style={{justifyContent:'center', marginBottom:8}}>
                  {conditions.map((c,i) => {
                    const def = CONDITION_LIST.find(x => x.id === (c.id||c))
                    return def ? <span key={i} className="pv-condition-pill">{def.levels ? `${def.label}${c.level||1}` : def.label}</span> : null
                  })}
                </div>
              )}

              <div className="pv-detail-hp-bar">
                <div className="pv-detail-hp-fill" style={{ width: `${hpPct}%`, background: hpColor }} />
                <span className="pv-detail-hp-text">{hp} / {hpMax}</span>
              </div>

              <div className="pv-detail-stats">
                <span className="pv-detail-stat">🛡 CA {s.ca}</span>
                <span className="pv-detail-stat">👟 {s.speed}</span>
                {s.passivePerception != null && <span className="pv-detail-stat">👁 PP {s.passivePerception}</span>}
              </div>

              <div className="pv-detail-attrs">
                {[['FUE',s.str],['DES',s.dex],['CON',s.con],['INT',s.int],['SAB',s.wis],['CAR',s.cha]].map(([label,val]) => (
                  <div key={label} className="pv-detail-attr">
                    <span className="pv-detail-attr-label">{label}</span>
                    <span className="pv-detail-attr-val">{val}</span>
                    <span className="pv-detail-attr-mod">{mod(val)}</span>
                  </div>
                ))}
              </div>

              <PvAccordion label="Habilidades" count={(ch.skills||[]).length} show={(ch.skills||[]).length > 0}>
                <div className="pv-detail-badges">
                  {(ch.skills||[]).map((sk,i) => <span key={i} className="pv-detail-badge">{sk.name} {sk.bonus >= 0 ? '+' : ''}{sk.bonus}</span>)}
                </div>
              </PvAccordion>

              <PvAccordion label="Recursos de clase" count={(ch.classResources||[]).length} show={(ch.classResources||[]).length > 0}>
                <div className="pv-class-resources">
                  {(ch.classResources||[]).map((cr,i) => {
                    const usedCr = party.usedClassResources?.[ch.id]?.[i] || 0
                    return (
                      <div key={i} className="pv-detail-ability" style={{display:'flex',alignItems:'center',gap:6}}>
                        <strong>{cr.name}</strong>
                        <span className="pv-ability-dots">
                          {Array.from({length: cr.max}, (_,j) => <span key={j} className={`pv-ability-dot ${j < usedCr ? 'used' : ''}`} />)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </PvAccordion>

              <PvAccordion label="Rasgos" count={allTraits.length} show={allTraits.length > 0}>
                {allTraits.map((t,i) => (
                  <div key={i} className="pv-detail-ability"><strong>{t.name}.</strong> {t.description}</div>
                ))}
              </PvAccordion>

              <PvAccordion label="Acciones" count={(ch.actions||[]).length} show={(ch.actions||[]).length > 0}>
                <div className="pva-grid">
                  {(ch.actions||[]).map((a,i) => <PvActionCard key={i} a={a} />)}
                </div>
              </PvAccordion>

              <PvAccordion label="Habilidades especiales" count={(ch.abilities||[]).length} show={(ch.abilities||[]).length > 0}>
                {(ch.abilities||[]).map((ab,i) => {
                  const usedAb = party.usedAbilities?.[ch.id]?.[i] || 0
                  return (
                    <div key={i} className="pv-detail-ability">
                      <strong>{ab.name}</strong>
                      {ab.uses && <span className="pv-detail-ability-uses"> ({ab.uses})</span>}
                      {ab.maxUses > 0 && (
                        <span className="pv-ability-dots">
                          {Array.from({length: ab.maxUses}, (_,j) => <span key={j} className={`pv-ability-dot ${j < usedAb ? 'used' : ''}`} />)}
                        </span>
                      )}
                      {ab.description && <span> — {ab.description}</span>}
                    </div>
                  )
                })}
              </PvAccordion>

              <button className="pv-detail-close" onClick={() => setExpandedCard(null)}>Cerrar</button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
