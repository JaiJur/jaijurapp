import React, { useState } from 'react'

export default function SpellPicker({ spells, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState('all')

  const filtered = spells.filter(s => {
    if (filterLevel !== 'all' && s.spellLevel !== filterLevel) return false
    if (search) {
      const q = search.toLowerCase()
      return s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q) || s.tags?.some(t => t.toLowerCase().includes(q))
    }
    return true
  })

  return (
    <div className="spell-picker">
      <div className="spell-picker-header">
        <span className="spell-picker-title">🔮 Seleccionar hechizo</span>
        <button className="dnd-btn-sm" onClick={onClose}>✕</button>
      </div>
      <input className="dnd-glossary-search" placeholder="Buscar hechizo..." value={search} onChange={e => setSearch(e.target.value)} autoFocus style={{width:'100%',marginBottom:6}} />
      <div className="dnd-glossary-subfilters" style={{margin:'0 0 6px'}}>
        {[{id:'all',label:'Todos'},{id:'truco',label:'Truco'},{id:'1',label:'1'},{id:'2',label:'2'},{id:'3',label:'3'},{id:'4',label:'4'},{id:'5',label:'5'},{id:'6',label:'6'},{id:'7',label:'7'},{id:'8',label:'8'},{id:'9',label:'9'}].map(f => (
          <button key={f.id} className={`dnd-glossary-subfilter ${filterLevel===f.id?'active':''}`}
            onClick={() => setFilterLevel(f.id)}>{f.label}</button>
        ))}
      </div>
      <div className="spell-picker-list">
        {filtered.length === 0 && <div className="dnd-empty-sm">{search ? 'Sin resultados' : 'Sin hechizos en el glosario'}</div>}
        {filtered.map(spell => (
          <button key={spell.id} className="spell-picker-item" onClick={() => onSelect(spell)}>
            <span className="spell-picker-name">{spell.name}</span>
            <span className="spell-picker-info">
              {spell.spellLevel === 'truco' ? 'Truco' : `Nv.${spell.spellLevel}`}
              {spell.damage && ` · ${spell.damage}`}
              {spell.damageType && ` ${spell.damageType}`}
              {spell.concentration && ' · 🔄'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
