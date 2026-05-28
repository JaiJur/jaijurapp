import { useState } from 'react'

export default function PartyAddModal({ characters, partyMembers, enemies, onAddCharacter, onAddEnemy, onDone, onClose }) {
  const [tab, setTab] = useState('pc')
  const [search, setSearch] = useState('')
  const [labelValue, setLabelValue] = useState('')
  const [selectedEnemy, setSelectedEnemy] = useState(null)
  const [maxHpCheck, setMaxHpCheck] = useState(false)
  const [surprisedCheck, setSurprisedCheck] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)

  const availablePCs = characters.filter(c => !partyMembers.includes(c.id))
  const filteredEnemies = enemies.filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    return e.name?.toLowerCase().includes(q) || e.tags?.some(t => t.toLowerCase().includes(q))
  })

  async function handleAddEnemy() {
    if (!selectedEnemy || adding) return
    setAdding(true)
    const hp = selectedEnemy.stats?.hp || {}
    const calcMax = maxHpCheck && hp.dice && hp.sides ? (hp.dice * hp.sides + (hp.modifier || 0)) : undefined
    const baseName = labelValue.trim() || selectedEnemy.name || 'Enemigo'
    const count = Math.max(1, Math.min(20, quantity))
    for (let i = 0; i < count; i++) {
      const label = count > 1 ? `${baseName} ${i + 1}` : baseName
      await onAddEnemy(selectedEnemy.id, label, calcMax, surprisedCheck)
    }
    setAdding(false)
    onDone()
  }

  return (
    <div className="dnd-modal-overlay" onClick={onClose}>
      <div className="dnd-modal glossary-modal" onClick={e => e.stopPropagation()}>
        <h3>Añadir al combate</h3>
        <div className="party-add-tabs">
          <button className={`dnd-auth-tab ${tab === 'pc' ? 'active' : ''}`} onClick={() => setTab('pc')}>🛡️ Personajes</button>
          <button className={`dnd-auth-tab ${tab === 'enemy' ? 'active' : ''}`} onClick={() => setTab('enemy')}>💀 Enemigos</button>
        </div>

        {tab === 'pc' && (
          <div className="party-add-list">
            {availablePCs.length === 0 && <div className="dnd-empty-sm">Todos los personajes ya están en el grupo</div>}
            {availablePCs.map(ch => (
              <button key={ch.id} className="party-add-item" onClick={() => onAddCharacter(ch.id)}>
                {ch.portrait && <img src={ch.portrait} alt="" className="party-add-portrait" />}
                <span className="party-add-name">{ch.name}</span>
                <span className="party-add-info">{ch.race} · {ch.class} Nv.{ch.level || 1}</span>
              </button>
            ))}
          </div>
        )}

        {tab === 'enemy' && (
          <div className="party-add-enemy-section">
            <input className="dnd-glossary-search" placeholder="Buscar enemigo..." value={search} onChange={e => setSearch(e.target.value)} autoFocus style={{width:'100%', marginBottom:8}} />
            {!selectedEnemy ? (
              <div className="party-add-list">
                {filteredEnemies.length === 0 && <div className="dnd-empty-sm">Sin enemigos en el glosario</div>}
                {filteredEnemies.map(e => (
                  <button key={e.id} className="party-add-item" onClick={() => { setSelectedEnemy(e); setLabelValue(e.name || '') }}>
                    {(e.portraits||[]).length > 0 ? <img src={e.portraits[0]} alt="" className="party-add-portrait" /> : <span className="party-add-enemy-icon">💀</span>}
                    <span className="party-add-name">{e.name}</span>
                    <span className="party-add-info">
                      CR {e.stats?.challenge || '?'} · CA {e.stats?.ca ?? '?'}
                      {e.stats?.hp ? ` · ${e.stats.hp.dice}d${e.stats.hp.sides}${e.stats.hp.modifier ? (e.stats.hp.modifier > 0 ? '+' : '') + e.stats.hp.modifier : ''}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="party-add-enemy-config">
                <div className="party-add-enemy-selected">
                  <span className="party-add-enemy-icon">💀</span>
                  <span className="party-add-name">{selectedEnemy.name}</span>
                  <button className="dnd-btn-sm" onClick={() => setSelectedEnemy(null)}>✕ Cambiar</button>
                </div>
                <div className="glossary-form-row">
                  <label>Etiqueta (nombre en combate)</label>
                  <input className="dnd-input" value={labelValue} onChange={e => setLabelValue(e.target.value)} placeholder={selectedEnemy.name} />
                </div>
                <div className="glossary-form-row">
                  <label>Cantidad</label>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <button className="dnd-btn-sm" onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                    <input className="dnd-input" type="number" min="1" max="20" value={quantity}
                      onChange={e => setQuantity(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                      style={{width:50,textAlign:'center'}} />
                    <button className="dnd-btn-sm" onClick={() => setQuantity(q => Math.min(20, q + 1))}>+</button>
                    {quantity > 1 && <span style={{fontSize:'0.75rem',color:'#a58b55'}}>Se nombrarán {labelValue.trim() || selectedEnemy.name} 1, 2, 3…</span>}
                  </div>
                </div>
                <label className="glossary-add-party-check" style={{marginTop:8}}>
                  <input type="checkbox" checked={maxHpCheck} onChange={e => setMaxHpCheck(e.target.checked)} />
                  <span>PG máximos {selectedEnemy.stats?.hp ? `(${selectedEnemy.stats.hp.dice * selectedEnemy.stats.hp.sides + (selectedEnemy.stats.hp.modifier || 0)} PG)` : ''}</span>
                </label>
                <label className="glossary-add-party-check" style={{marginTop:4}}>
                  <input type="checkbox" checked={surprisedCheck} onChange={e => setSurprisedCheck(e.target.checked)} />
                  <span>Sorprendido</span>
                </label>
                <button className="dnd-btn-primary" style={{width:'100%', marginTop:8}} onClick={handleAddEnemy} disabled={adding}>
                  {adding ? '⏳ Añadiendo...' : `💀 Añadir ${quantity > 1 ? quantity + ' enemigos' : 'al combate'}`}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="dnd-modal-btns" style={{marginTop:10}}>
          <button className="dnd-btn-cancel" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
