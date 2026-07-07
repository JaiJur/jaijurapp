import { useState, useEffect } from 'react'
import { spellToAction } from './shared'

const STAT_MAP = { FUE: 'str', DES: 'dex', CON: 'con', INT: 'int', SAB: 'wis', CAR: 'cha' }

export default function LevelUpModal({ character, glossarySpells, onSave, onClose }) {
  const [refData, setRefData] = useState(null)
  const [targetLevel, setTargetLevel] = useState(Math.min(20, (character.level || 1) + 1))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/dnd/refdata', { headers: { 'x-user-id': '1' } }).then(r => r.json()).then(setRefData)
  }, [])

  if (!refData) {
    return (
      <div className="dnd-modal-overlay" onClick={onClose}>
        <div className="dnd-modal glossary-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
          <div style={{ padding: 20, textAlign: 'center', color: '#8b7d5c' }}>Cargando datos de clase...</div>
        </div>
      </div>
    )
  }

  const cls = refData.classes?.find(c => c.id === character.classId) || refData.classes?.find(c => c.name === character.class)
  const sub = cls?.subclasses?.find(s => s.id === character.subclassId) || cls?.subclasses?.find(s => s.name === character.subclass)

  if (!cls) {
    return (
      <div className="dnd-modal-overlay" onClick={onClose}>
        <div className="dnd-modal glossary-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
          <div style={{ padding: 20, color: '#f87171', fontSize: '.85rem' }}>
            No se encontró la clase "{character.class}" en los Datos de Referencia. No se puede calcular la subida de nivel.
          </div>
          <button className="dnd-btn-sm" onClick={onClose} style={{ margin: '0 20px 20px' }}>Cerrar</button>
        </div>
      </div>
    )
  }

  const oldLevel = character.level || 1

  // Rasgos, conjuros y huecos nuevos entre oldLevel+1 y targetLevel
  const newClassFeatures = []
  const newSubFeatures = []
  const newSpells = []
  for (let lv = oldLevel + 1; lv <= targetLevel; lv++) {
    const ld = cls.levels?.[lv]
    if (ld?.features) ld.features.forEach(f => newClassFeatures.push({ ...f, lv }))
    if (sub) {
      ;(sub.features || []).filter(f => (f.fromLevel || 1) === lv).forEach(f => newSubFeatures.push({ ...f, lv }))
      ;(sub.spellGrants || []).filter(g => (g.fromLevel || 1) === lv).forEach(g => {
        ;(g.spells || []).forEach(name => newSpells.push({ name, lv }))
      })
    }
  }

  const targetLvlData = cls.levels?.[targetLevel] || {}
  const oldLvlData = cls.levels?.[oldLevel] || {}
  const conMod = Math.floor(((character.stats?.con || 10) - 10) / 2)
  const hpGainPerLevel = Math.ceil((cls.hitDie || 8) / 2) + conMod
  const levelsGained = targetLevel - oldLevel
  const hpGain = Math.max(1, hpGainPerLevel) * levelsGained

  const oldSlots = oldLvlData.spellSlots || []
  const newSlotsArr = targetLvlData.spellSlots || []
  const slotsChanged = newSlotsArr.some((n, i) => (n || 0) !== (oldSlots[i] || 0))
  const preparedChanged = (targetLvlData.preparedSpells ?? null) !== (oldLvlData.preparedSpells ?? null) && targetLvlData.preparedSpells != null

  async function applyLevelUp() {
    setSaving(true)
    try {
      const traits = [...(character.traits || [])]
      ;[...newClassFeatures, ...newSubFeatures].forEach(f => {
        if (!traits.find(t => t.name === f.name)) {
          traits.push({ name: f.name, description: f.desc || '', subclass: newSubFeatures.includes(f) })
        }
      })

      const actions = [...(character.actions || [])]
      const favoriteActions = [...(character.favoriteActions || [])]
      newSpells.forEach(({ name }) => {
        const spell = glossarySpells.find(s => (s.name || '').toLowerCase().trim() === name.toLowerCase().trim())
        if (spell && !actions.find(a => a.name === spell.name)) {
          const action = { ...spellToAction(spell), alwaysPrepared: true }
          actions.push(action)
          favoriteActions.push({ ...action })
        }
      })

      // classResources: actualizar máximos desde huecos de uso del nuevo nivel, conservando uso actual
      const classResources = (character.classResources || []).map(r => ({ ...r }))
      ;(targetLvlData.slots || []).forEach(s => {
        const existing = classResources.find(r => r.name === s.name)
        let newMax
        if (s.statKey) {
          const statField = STAT_MAP[s.statKey] || 'cha'
          const statVal = character.stats?.[statField] ?? 10
          newMax = Math.max(1, Math.floor((statVal - 10) / 2))
        } else {
          newMax = s.count ?? 999
        }
        if (existing) { existing.max = newMax; if (existing.current > newMax) existing.current = newMax }
        else classResources.push({ name: s.name, max: newMax, current: newMax })
      })

      // spellSlots del nuevo nivel (si la clase tiene tabla configurada)
      const spellSlots = {}
      ;(targetLvlData.spellSlots || []).forEach((n, i) => { if (n > 0) spellSlots[`slot${i + 1}`] = n })

      const updated = {
        ...character,
        level: targetLevel,
        traits,
        actions,
        favoriteActions,
        classResources,
        spellSlots: Object.keys(spellSlots).length ? spellSlots : character.spellSlots,
        maxPreparedSpells: targetLvlData.preparedSpells ?? character.maxPreparedSpells,
        stats: {
          ...character.stats,
          proficiencyBonus: targetLvlData.profBonus || character.stats?.proficiencyBonus || 2,
          hp: {
            max: (character.stats?.hp?.max || 0) + hpGain,
            current: (character.stats?.hp?.current || 0) + hpGain,
          },
        },
      }
      await onSave(updated)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dnd-modal-overlay" onClick={onClose}>
      <div className="dnd-modal glossary-modal cw-modal" style={{ maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#c8a96e' }}>⬆️ Subir de nivel — {character.name}</span>
          <button className="dnd-btn-sm" style={{ marginLeft: 'auto' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: '.85rem', color: '#8b7d5c' }}>Nivel actual: <b style={{ color: '#d4c5a0' }}>{oldLevel}</b></span>
          <span style={{ color: '#6b6050' }}>→</span>
          <span style={{ fontSize: '.85rem', color: '#8b7d5c' }}>Nuevo nivel:</span>
          <input className="dnd-input" type="number" min={oldLevel + 1} max={20} style={{ width: 60, fontSize: '.9rem', padding: '4px 8px' }}
            value={targetLevel}
            onChange={e => setTargetLevel(Math.max(oldLevel + 1, Math.min(20, parseInt(e.target.value) || oldLevel + 1)))} />
        </div>

        {oldLevel >= 20 && <div className="dnd-empty-sm">Este personaje ya está al nivel máximo (20).</div>}

        {oldLevel < 20 && (
          <>
            <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 6, padding: '10px 12px', marginBottom: 10 }}>
              <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#4ade80', marginBottom: 6 }}>❤️ Puntos de golpe</div>
              <div style={{ fontSize: '.8rem', color: '#d4c5a0' }}>+{hpGain} PG máximos ({character.stats?.hp?.max || 0} → {(character.stats?.hp?.max || 0) + hpGain})</div>
            </div>

            {(newClassFeatures.length > 0 || newSubFeatures.length > 0) && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#c8a96e', marginBottom: 6 }}>📖 Rasgos nuevos</div>
                {[...newClassFeatures, ...newSubFeatures].map((f, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 6, padding: '8px 10px', marginBottom: 6 }}>
                    <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#d4c5a0' }}>{f.name} <span style={{ fontSize: '.7rem', color: '#8b7d5c' }}>(nv.{f.lv})</span></div>
                    {f.desc && <div style={{ fontSize: '.75rem', color: '#8b7d5c', marginTop: 2 }}>{f.desc}</div>}
                  </div>
                ))}
              </div>
            )}

            {newSpells.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#c8a96e', marginBottom: 6 }}>🔮 Conjuros otorgados</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {newSpells.map((s, i) => {
                    const found = glossarySpells.find(sp => (sp.name || '').toLowerCase().trim() === s.name.toLowerCase().trim())
                    return (
                      <span key={i} style={{ fontSize: '.75rem', padding: '2px 8px', borderRadius: 20, background: found ? 'rgba(200,169,110,0.15)' : 'rgba(248,113,113,0.15)', color: found ? '#c8a96e' : '#f87171' }}>
                        {s.name}{!found && ' (no encontrado)'}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {(slotsChanged || preparedChanged) && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#c8a96e', marginBottom: 6 }}>💫 Huecos de conjuro</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {newSlotsArr.map((n, i) => n > 0 && (
                    <span key={i} className="glossary-spell-slot-badge">Nv.{i + 1}: {n}</span>
                  ))}
                </div>
                {targetLvlData.preparedSpells != null && (
                  <div style={{ fontSize: '.75rem', color: '#8b7d5c', marginTop: 6 }}>Conjuros preparados: {targetLvlData.preparedSpells}</div>
                )}
              </div>
            )}

            {newClassFeatures.length === 0 && newSubFeatures.length === 0 && newSpells.length === 0 && !slotsChanged && !preparedChanged && (
              <div className="dnd-empty-sm">Sin rasgos, conjuros ni huecos nuevos en este rango de niveles (solo suben PG y quizá la bonificación de competencia).</div>
            )}

            <button className="dnd-btn-sm" style={{ width: '100%', padding: '8px', fontSize: '.85rem', color: '#4ade80', borderColor: 'rgba(74,222,128,0.3)', marginTop: 6 }}
              disabled={saving} onClick={applyLevelUp}>
              {saving ? 'Aplicando...' : `✓ Aplicar subida a nivel ${targetLevel}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
