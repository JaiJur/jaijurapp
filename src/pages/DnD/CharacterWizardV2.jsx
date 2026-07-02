import { useState, useEffect } from 'react'
import { spellToAction } from './components/shared'

// ── Utilidades ─────────────────────────────────────────────
const statMod = v => { const m = Math.floor((v - 10) / 2); return (m >= 0 ? '+' : '') + m }
const STAT_KEYS = ['FUE', 'DES', 'CON', 'INT', 'SAB', 'CAR']
const STAT_FULL = { FUE: 'Fuerza', DES: 'Destreza', CON: 'Constitución', INT: 'Inteligencia', SAB: 'Sabiduría', CAR: 'Carisma' }

const STEPS = [
  { id: 1, label: 'Descripción' },
  { id: 2, label: 'Clase' },
  { id: 3, label: 'Raza y Trasfondo' },
  { id: 4, label: 'Equipo' },
  { id: 5, label: 'Conjuros' },
  { id: 6, label: 'Resumen' },
]

export default function CharacterWizardV2({ onSave, onClose, dndPlayers = [], glossarySpells = [] }) {
  const [step, setStep] = useState(1)
  const [refData, setRefData] = useState(null)

  // ── Estado global del wizard ──
  const [form, setForm] = useState({
    // Paso 1
    name: '', portrait: '', description: '', notes: '', playerUserId: null,
    // Paso 2
    classId: '', level: 1, subclassId: '',
    skills: [],       // habilidades elegidas
    stats: { FUE: 10, DES: 10, CON: 10, INT: 10, SAB: 10, CAR: 10 },
    // Paso 3
    raceId: '', backgroundId: '',
    bgBonuses: {},    // { FUE: 1, DES: 2 ... }
    // Paso 4
    weapons: [],      // [{ id, name, qty, dmg, mastery, props }]
    armorId: '', armorName: '', armorAC: '', armorACNum: null, shield: false,
    extraItems: [],   // [{ name, fromBg }]
    gold: 0,
    maxHp: null,      // si null se calcula automático
    // Paso 5
    isSpellcaster: false,
    knownSpells: [],  // ids de conjuros
  })

  // ── Cargar refData ──
  useEffect(() => {
    fetch('/api/dnd/refdata', { headers: { 'x-user-id': '1' } })
      .then(r => r.json())
      .then(d => setRefData(d))
  }, [])

  function setF(key, val) { setForm(f => ({ ...f, [key]: val })) }

  // ── Validación por paso ──
  function stepValid(s) {
    const cls = refData?.classes?.find(c => c.id === form.classId)
    switch (s) {
      case 1: return form.name.trim().length > 0
      case 2: {
        if (!form.classId) return false
        if (!cls) return false
        const needsSub = cls.subclassLevel && form.level >= cls.subclassLevel
        if (needsSub && !form.subclassId) return false
        if (form.skills.length !== (cls.skillChoices || 2)) return false
        return true
      }
      case 3: return form.raceId && form.backgroundId && Object.values(form.bgBonuses).reduce((a, b) => a + b, 0) === 3
      case 4: return true
      case 5: return true
      default: return true
    }
  }

  function goNext() { if (stepValid(step)) setStep(s => s + 1) }
  function goPrev() { setStep(s => s - 1) }

  // ── Crear personaje final ──
  async function createCharacter() {
    const cls = refData?.classes?.find(c => c.id === form.classId)
    const race = refData?.races?.find(r => r.id === form.raceId)
    const bg = refData?.backgrounds?.find(b => b.id == form.backgroundId)
    const sub = cls?.subclasses?.find(s => s.id === form.subclassId)
    const lvlData = cls?.levels?.[form.level] || {}

    // Stats finales con bonos de trasfondo
    const finalStats = {}
    STAT_KEYS.forEach(k => {
      finalStats[k] = (form.stats[k] || 10) + (form.bgBonuses[k] || 0)
    })

    // Rasgos: clase (acumulados hasta nivel) + subclase + raza + trasfondo
    // CharacterCard espera { name, description } (no desc)
    const traits = []
    if (cls) {
      for (let lv = 1; lv <= form.level; lv++) {
        const ld = cls.levels?.[lv]
        if (ld?.features) ld.features.forEach(f => traits.push({ name: f.name, description: f.desc || '' }))
      }
      if (sub) {
        sub.features?.filter(f => f.fromLevel <= form.level)
          .forEach(f => traits.push({ name: f.name, description: f.desc || '', subclass: true }))
      }
    }
    if (race) race.traits?.forEach(t => traits.push({ name: t.name, description: t.desc || '', race: true }))
    if (bg?.feat) traits.push({ name: bg.feat, description: bg.featDesc || '', background: true })

    // Acciones desde armas — CharacterCard usa character.actions[]
    const actions = form.weapons.map(w => ({
      name: `${w.name}${w.qty > 1 ? ` ×${w.qty}` : ''}`,
      damage: w.dmg,
      damageType: w.dmg?.split(' ')[1] || '',
      attackBonus: `+${(lvlData.profBonus||2) + Math.floor((finalStats.FUE-10)/2)}`,
      type: 'Ataque',
      mastery: w.mastery || '',
      notes: w.props || '',
    }))

    // Conjuros conocidos → también se añaden como acciones
    if (form.isSpellcaster && form.knownSpells.length > 0) {
      const allSpells = glossarySpells
      form.knownSpells.forEach(id => {
        const spell = allSpells.find(s => s.id === id)
        if (spell) actions.push(spellToAction(spell))
      })
    }
    // favoriteActions = mismas acciones (se muestran en la tab "favoritos")
    const favoriteActions = actions.map(a => ({ ...a }))

    // classResources desde slots del nivel
    const classResources = (lvlData.slots || []).map(s => ({ name: s.name, max: s.count ?? 999, current: s.count ?? 999 }))

    // spellSlots desde tabla de clase si lanzador
    const spellSlots = {}
    if (form.isSpellcaster && Array.isArray(lvlData.slots)) {
      lvlData.slots.forEach((s, i) => { if (s > 0) spellSlots[`slot${i + 1}`] = s })
    }

    // Competencias
    const proficiencies = [
      ...(cls?.armorProficiencies || []),
      ...(cls?.weaponProficiencies || []),
      ...(cls?.toolProficiencies || []),
      ...(bg?.toolProficiencies || []),
    ]

    // Habilidades con bonus
    const skillList = form.skills.map(name => ({
      name, proficient: true, bonus: lvlData.profBonus || 2,
    }))
    if (bg?.skillProficiencies) {
      bg.skillProficiencies.forEach(name => {
        if (!skillList.find(s => s.name === name))
          skillList.push({ name, proficient: true, bonus: lvlData.profBonus || 2 })
      })
    }

    // CA: número real (+2 si escudo)
    const dexMod = Math.floor((finalStats.DES - 10) / 2)
    const conMod = Math.floor((finalStats.CON - 10) / 2)
    const shieldBonus = form.shield ? 2 : 0
    let caValue
    if (form.armorId && form.armorACNum) {
      caValue = form.armorACNum + shieldBonus
    } else {
      const hasUnarmoredDef = traits.some(t => t.name === 'Defensa sin Armadura')
      caValue = (hasUnarmoredDef ? 10 + dexMod + conMod : 10 + dexMod) + shieldBonus
    }

    // PG máximos = hitDie + CON por cada nivel
    const maxHp = form.maxHp || ((cls?.hitDie || 8) + conMod + (form.level - 1) * (Math.ceil((cls?.hitDie || 8) / 2) + conMod))

    const character = {
      name: form.name,
      portrait: form.portrait || '',
      playerUserId: form.playerUserId,
      class: cls?.name || form.classId,
      subclass: sub?.name || '',
      race: race?.name || form.raceId,
      background: bg?.name || form.backgroundId,
      level: form.level,
      description: form.description,
      notes: form.notes,
      isSpellcaster: form.isSpellcaster,
      stats: {
        str: finalStats.FUE, dex: finalStats.DES, con: finalStats.CON,
        int: finalStats.INT, wis: finalStats.SAB, cha: finalStats.CAR,
        hitDice: `d${cls?.hitDie || 8}`,
        speed: race?.speed || 30,
        proficiencyBonus: lvlData.profBonus || 2,
        ca: caValue,
        hp: { current: maxHp, max: maxHp },
      },
      savingThrows: (cls?.savingThrows || []).reduce((acc, k) => ({ ...acc, [k]: true }), {}),
      skills: skillList,
      traits,
      actions,
      favoriteActions,
      classResources,
      spellSlots,
      consumables: form.weapons
        .filter(w => w.qty > 1 && (w.props||'').toLowerCase().includes('arrojadiza'))
        .map(w => ({ name: w.name, current: w.qty, max: w.qty })),
      proficiencies,
      equipment: form.extraItems.map(i => i.name),
      gold: form.gold,
      glossaryItems: form.knownSpells,
    }

    await onSave(character)
    onClose()
  }

  if (!refData) return (
    <div className="dnd-modal-overlay">
      <div className="dnd-modal" style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⏳</div>
        <div>Cargando datos...</div>
      </div>
    </div>
  )

  const cls = refData.classes?.find(c => c.id === form.classId)

  return (
    <div className="dnd-modal-overlay" onClick={onClose}>
      <div className="dnd-modal cw-modal" style={{ maxWidth: 560, maxHeight: '94vh', overflowY: 'auto', padding: 0 }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '14px 16px 0', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: '.95rem', color: '#c8a96e' }}>✦ Nuevo personaje v2</span>
            <button className="dnd-btn-sm" onClick={onClose}>✕</button>
          </div>
          {/* Progress */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <div onClick={() => s.id < step && setStep(s.id)} style={{
                  width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '11px', fontWeight: 500, flexShrink: 0, cursor: s.id < step ? 'pointer' : 'default',
                  background: step === s.id ? '#c8a96e' : s.id < step ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${step === s.id ? '#c8a96e' : s.id < step ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.15)'}`,
                  color: step === s.id ? '#fff' : s.id < step ? '#4ade80' : '#6b7280',
                }}>
                  {s.id < step ? '✓' : s.id}
                </div>
                {i < STEPS.length - 1 && <div style={{ width: 16, height: 1, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />}
              </div>
            ))}
          </div>
          <div style={{ fontSize: '.7rem', color: '#8b7d5c', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Paso {step} — {STEPS.find(s => s.id === step)?.label}
          </div>
        </div>

        {/* Contenido por paso */}
        <div style={{ padding: '14px 16px' }}>
          {step === 1 && <Step1 form={form} setF={setF} dndPlayers={dndPlayers} />}
          {step === 2 && <Step2 form={form} setF={setF} cls={cls} refData={refData} />}
          {step === 3 && <Step3 form={form} setF={setF} refData={refData} />}
          {step === 4 && <Step4 form={form} setF={setF} cls={cls} refData={refData} />}
          {step === 5 && <Step5 form={form} setF={setF} glossarySpells={glossarySpells} cls={cls} />}
          {step === 6 && <Step6 form={form} setF={setF} refData={refData} cls={cls} />}
        </div>

        {/* Footer */}
        <div style={{ padding: '0 16px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="dnd-btn-sm" onClick={goPrev} style={{ visibility: step === 1 ? 'hidden' : 'visible' }}>← Atrás</button>
          <span style={{ fontSize: '.72rem', color: '#6b7280' }}>{step} / {STEPS.length}</span>
          {step < 6
            ? <button className="dnd-btn-primary" onClick={goNext} disabled={!stepValid(step)}>
                Siguiente →
              </button>
            : <button className="dnd-btn-primary" style={{ background: '#1d9e75', borderColor: '#1d9e75' }} onClick={createCharacter}>
                ✦ Crear personaje
              </button>
          }
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// PASO 1 — Descripción
// ══════════════════════════════════════════════════════════
function Step1({ form, setF, dndPlayers }) {
  const [portraits, setPortraits] = useState([])
  const [showGallery, setShowGallery] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useState(null)

  useEffect(() => {
    fetch('/api/dnd/portraits', { headers: { 'x-user-id': '1' } })
      .then(r => r.json()).then(setPortraits).catch(() => {})
  }, [])

  async function uploadPortrait(file) {
    setUploading(true)
    const fd = new FormData()
    fd.append('portrait', file)
    try {
      const r = await fetch('/api/dnd/portraits', { method: 'POST', headers: { 'x-user-id': '1' }, body: fd })
      const d = await r.json()
      if (d.url) { setF('portrait', d.url); setPortraits(p => [d.url, ...p]) }
    } finally { setUploading(false) }
  }

  return (
    <div>
      {/* Retrato + nombre */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div onClick={() => setShowGallery(true)}
            style={{ width: 72, height: 72, borderRadius: '50%', border: `2px ${form.portrait ? 'solid #c8a96e44' : 'dashed rgba(255,255,255,0.15)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(0,0,0,0.2)', cursor: 'pointer', overflow: 'hidden' }}>
            {form.portrait
              ? <img src={form.portrait} alt="retrato" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '1.6rem' }}>🧝</span>}
          </div>
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: '50%', background: '#c8a96e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer' }}
            onClick={() => setShowGallery(true)}>✎</div>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '.72rem', color: '#8b7d5c', display: 'block', marginBottom: 3 }}>Nombre <span style={{ color: '#e57' }}>*</span></label>
          <input className="dnd-input" placeholder="Nombre del personaje..." value={form.name}
            onChange={e => setF('name', e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
          <label style={{ fontSize: '.72rem', color: '#8b7d5c', display: 'block', marginBottom: 3 }}>Jugador</label>
          <select className="dnd-input" style={{ width: '100%' }} value={form.playerUserId || ''}
            onChange={e => setF('playerUserId', e.target.value ? parseInt(e.target.value) : null)}>
            <option value="">— Sin asignar —</option>
            {dndPlayers.filter(p => p).map(p => (
              <option key={p.id} value={p.id}>{p.name || p.username}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: '.72rem', color: '#8b7d5c', display: 'block', marginBottom: 3 }}>Descripción</label>
        <textarea className="dnd-input" rows={3} placeholder="Apariencia, personalidad, motivaciones..."
          value={form.description} onChange={e => setF('description', e.target.value)}
          style={{ width: '100%', resize: 'vertical' }} />
      </div>
      <div>
        <label style={{ fontSize: '.72rem', color: '#8b7d5c', display: 'block', marginBottom: 3 }}>Notas adicionales</label>
        <textarea className="dnd-input" rows={2} placeholder="Vínculos, defectos, ideales..."
          value={form.notes} onChange={e => setF('notes', e.target.value)}
          style={{ width: '100%', resize: 'vertical' }} />
      </div>

      {/* Galería de retratos */}
      {showGallery && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowGallery(false)}>
          <div style={{ background: '#1a1611', border: '1px solid rgba(200,169,110,0.2)', borderRadius: 12, padding: 16, width: 340, maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600, color: '#c8a96e', fontSize: '.88rem' }}>🖼 Retrato</span>
              <button className="dnd-btn-sm" onClick={() => setShowGallery(false)}>✕</button>
            </div>
            {/* Subir nuevo */}
            <label style={{ display: 'block', marginBottom: 10, cursor: 'pointer', padding: '8px', borderRadius: 8, border: '1px dashed rgba(200,169,110,0.3)', textAlign: 'center', fontSize: '.78rem', color: '#c8a96e' }}>
              {uploading ? 'Subiendo...' : '+ Subir imagen'}
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => e.target.files[0] && uploadPortrait(e.target.files[0])} />
            </label>
            {/* Galería existente */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {portraits.map((url, i) => (
                <div key={i} onClick={() => { setF('portrait', url); setShowGallery(false) }}
                  style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${form.portrait === url ? '#c8a96e' : 'transparent'}` }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
              {portraits.length === 0 && !uploading && <div style={{ gridColumn: 'span 4', fontSize: '.75rem', color: '#6b7280', textAlign: 'center', padding: '12px 0' }}>Sin retratos — sube el primero</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// PASO 2 — Clase, nivel, stats, habilidades, subclase
// ══════════════════════════════════════════════════════════
function Step2({ form, setF, cls, refData }) {
  const classes = refData?.classes || []
  const maxSkills = cls?.skillChoices || 2
  const skillOpts = cls?.skillOptions || []
  const needsSub = cls && cls.subclassLevel && form.level >= cls.subclassLevel
  const lvlData = cls?.levels?.[form.level] || {}

  function toggleSkill(name) {
    const cur = form.skills
    if (cur.includes(name)) { setF('skills', cur.filter(s => s !== name)); return }
    if (cur.length >= maxSkills) return
    setF('skills', [...cur, name])
  }

  function updateStat(key, val) {
    setF('stats', { ...form.stats, [key]: parseInt(val) || 10 })
  }

  return (
    <div>
      {/* Clase + Nivel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: '.72rem', color: '#8b7d5c', display: 'block', marginBottom: 3 }}>Clase</label>
          <select className="dnd-input" value={form.classId}
            onChange={e => { setF('classId', e.target.value); setF('subclassId', ''); setF('skills', []) }}>
            <option value="">— Selecciona clase —</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '.72rem', color: '#8b7d5c', display: 'block', marginBottom: 3 }}>Nivel</label>
          <select className="dnd-input" value={form.level}
            onChange={e => { setF('level', parseInt(e.target.value)); setF('subclassId', '') }}>
            {Array.from({ length: 20 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Stats en fila */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '.72rem', color: '#8b7d5c', marginBottom: 6 }}>Características base</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {STAT_KEYS.map(k => (
            <div key={k} style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '6px 3px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#8b7d5c', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{k}</div>
              <input type="number" min={1} max={30} value={form.stats[k]}
                onChange={e => updateStat(k, e.target.value)}
                style={{ width: '100%', textAlign: 'center', fontSize: '16px', fontWeight: 500, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 5, padding: '3px 0', color: '#d4c5a0' }} />
              <div style={{ fontSize: '11px', color: '#8b7d5c', marginTop: 3 }}>{statMod(form.stats[k])}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Info clase */}
      {cls && (
        <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: '.78rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px', color: '#a09880', marginBottom: 8 }}>
            <div>🎲 d{cls.hitDie} · <strong style={{ color: '#d4c5a0' }}>{cls.primaryAbility}</strong></div>
            <div>🛡 <strong style={{ color: '#d4c5a0' }}>{cls.savingThrows?.join(', ')}</strong></div>
            <div>🎖 Bon. competencia: <strong style={{ color: '#d4c5a0' }}>+{lvlData.profBonus || 2}</strong></div>
            {(lvlData.slots || []).length > 0 && <div>💢 {lvlData.slots.map(s => `${s.name}: ${s.count ?? '∞'}`).join(' · ')}</div>}
          </div>

          {/* Huecos de uso del nivel */}
          {(lvlData.slots || []).length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {lvlData.slots.map((s, i) => (
                <span key={i} style={{ fontSize: '11px', padding: '2px 9px', borderRadius: 20, background: '#c8a96e22', border: '1px solid #c8a96e44', color: '#c8a96e', fontWeight: 500 }}>
                  {s.name} × {s.count ?? '∞'}
                </span>
              ))}
            </div>
          )}

          {/* Habilidades */}
          <div style={{ fontSize: '.7rem', color: '#8b7d5c', marginBottom: 5 }}>
            Habilidades — elige {maxSkills}
            <span style={{ marginLeft: 6, color: form.skills.length === maxSkills ? '#4ade80' : '#e57' }}>
              {form.skills.length}/{maxSkills} {form.skills.length === maxSkills ? '✓' : '✕'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 10 }}>
            {skillOpts.map(s => {
              const sel = form.skills.includes(s)
              const disabled = !sel && form.skills.length >= maxSkills
              return (
                <div key={s} onClick={() => !disabled && toggleSkill(s)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6, fontSize: '.78rem', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, border: `1px solid ${sel ? '#c8a96e55' : 'transparent'}`, background: sel ? '#c8a96e15' : 'rgba(0,0,0,0.15)', color: sel ? '#c8a96e' : '#a09880' }}>
                  <span style={{ fontSize: '11px' }}>{sel ? '☑' : '☐'}</span> {s}
                </div>
              )
            })}
          </div>

          {/* Subclase */}
          {needsSub && (
            <>
              <div style={{ fontSize: '.7rem', color: '#8b7d5c', marginBottom: 6 }}>
                {cls.subclassName} — nv. {cls.subclassLevel}
                <span style={{ marginLeft: 6, color: form.subclassId ? '#4ade80' : '#e57' }}>
                  {form.subclassId ? '✓' : 'Obligatorio ✕'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(cls.subclasses || []).map(sc => (
                  <div key={sc.id} onClick={() => setF('subclassId', sc.id)}
                    style={{ flex: 1, minWidth: 0, borderRadius: 6, padding: '8px 10px', cursor: 'pointer', border: `1.5px solid ${form.subclassId === sc.id ? '#c8a96e' : 'rgba(255,255,255,0.1)'}`, background: form.subclassId === sc.id ? '#c8a96e0d' : 'rgba(0,0,0,0.15)' }}>
                    <div style={{ fontSize: '.78rem', fontWeight: 500, color: form.subclassId === sc.id ? '#c8a96e' : '#d4c5a0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                      {sc.name.replace('Senda del ', '').replace('Senda de la ', '')}
                    </div>
                    <div style={{ fontSize: '.7rem', color: '#8b7d5c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sc.desc?.slice(0, 60)}...
                    </div>
                  </div>
                ))}
                {(!cls.subclasses || cls.subclasses.length === 0) && (
                  <input className="dnd-input" placeholder={`Nombre de ${cls.subclassName}...`} value={form.subclassId}
                    onChange={e => setF('subclassId', e.target.value)} style={{ flex: 1 }} />
                )}
              </div>
            </>
          )}

          {/* Rasgos del nivel actual */}
          {(lvlData.features || []).length > 0 && (
            <div style={{ marginTop: 10, borderTop: '0.5px solid rgba(255,255,255,0.07)', paddingTop: 8 }}>
              <div style={{ fontSize: '.7rem', color: '#8b7d5c', marginBottom: 6 }}>Rasgos nv. {form.level}</div>
              {lvlData.features.map((f, i) => (
                <div key={i} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 5, padding: '5px 8px', marginBottom: 4, fontSize: '.75rem' }}>
                  <strong style={{ color: '#d4c5a0' }}>{f.name}</strong>
                  {f.desc && <div style={{ color: '#8b7d5c', marginTop: 2, lineHeight: 1.4 }}>{f.desc.slice(0, 120)}...</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// PASO 3 — Raza, Trasfondo, Bonos
// ══════════════════════════════════════════════════════════
function Step3({ form, setF, refData }) {
  const races = refData?.races || []
  const backgrounds = refData?.backgrounds || []
  const bg = backgrounds.find(b => b.id == form.backgroundId)
  const race = races.find(r => r.id === form.raceId)

  const totalBonos = Object.values(form.bgBonuses).reduce((a, b) => a + b, 0)
  const clicksLeft = 3 - totalBonos

  function clickStat(key) {
    if (clicksLeft <= 0) return
    const cur = form.bgBonuses[key] || 0
    if (cur >= 2) return
    setF('bgBonuses', { ...form.bgBonuses, [key]: cur + 1 })
  }

  function resetBonos() { setF('bgBonuses', {}) }

  return (
    <div>
      {/* Raza */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '.72rem', color: '#8b7d5c', marginBottom: 6 }}>Raza</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {races.map(r => (
            <div key={r.id} onClick={() => setF('raceId', r.id)}
              style={{ flex: 1, minWidth: 0, borderRadius: 6, padding: '9px 10px', cursor: 'pointer', border: `1.5px solid ${form.raceId === r.id ? '#c8a96e' : 'rgba(255,255,255,0.1)'}`, background: form.raceId === r.id ? '#c8a96e0d' : 'rgba(0,0,0,0.15)' }}>
              <div style={{ fontSize: '.8rem', fontWeight: 500, color: form.raceId === r.id ? '#c8a96e' : '#d4c5a0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
              <div style={{ fontSize: '.7rem', color: '#8b7d5c', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.creatureType} · {r.size} · {r.speed} pies</div>
            </div>
          ))}
        </div>
        {race && (
          <div style={{ marginTop: 8, background: 'rgba(0,0,0,0.15)', borderRadius: 6, padding: '8px 10px', fontSize: '.75rem' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              {race.languages?.map(l => <span key={l} style={{ padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: '#a09880' }}>{l}</span>)}
            </div>
            {race.traits?.map((t, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <strong style={{ color: '#d4c5a0' }}>{t.name}</strong>
                <span style={{ color: '#8b7d5c', marginLeft: 6 }}>{t.desc?.slice(0, 80)}...</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trasfondo */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '.72rem', color: '#8b7d5c', marginBottom: 6 }}>Trasfondo</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {backgrounds.map(b => (
            <div key={b.id} onClick={() => { setF('backgroundId', b.id); setF('bgBonuses', {}) }}
              style={{ flex: '1 1 80px', minWidth: 0, borderRadius: 6, padding: '8px 10px', cursor: 'pointer', border: `1.5px solid ${form.backgroundId == b.id ? '#c8a96e' : 'rgba(255,255,255,0.1)'}`, background: form.backgroundId == b.id ? '#c8a96e0d' : 'rgba(0,0,0,0.15)' }}>
              <div style={{ fontSize: '.8rem', fontWeight: 500, color: form.backgroundId == b.id ? '#c8a96e' : '#d4c5a0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
              <div style={{ fontSize: '.7rem', color: '#8b7d5c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.skillProficiencies?.join(' · ')}</div>
            </div>
          ))}
        </div>
        {bg && (
          <div style={{ marginTop: 8, background: 'rgba(0,0,0,0.15)', borderRadius: 6, padding: '8px 10px', fontSize: '.75rem' }}>
            <div style={{ color: '#a09880', marginBottom: 4 }}>🎒 {bg.equipment}</div>
            {bg.toolProficiencies?.length > 0 && <div style={{ color: '#a09880', marginBottom: 4 }}>🔧 {bg.toolProficiencies.join(', ')}</div>}
            {bg.feat && <div style={{ color: '#c8a96e' }}>✨ Dote: {bg.feat}</div>}
          </div>
        )}
      </div>

      {/* Bonos de trasfondo */}
      {bg && (
        <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: '.72rem', color: '#8b7d5c' }}>
              Bonos de trasfondo — {bg.abilityScores || '+2 a una, +1 a otra'}
              <span style={{ marginLeft: 8, color: totalBonos === 3 ? '#4ade80' : '#e57' }}>
                {totalBonos === 3 ? '✓' : `${clicksLeft} click${clicksLeft !== 1 ? 's' : ''} restante${clicksLeft !== 1 ? 's' : ''}`}
              </span>
            </div>
            {totalBonos > 0 && <button className="dnd-btn-sm" onClick={resetBonos} style={{ fontSize: '.65rem', padding: '2px 7px' }}>↺</button>}
          </div>
          <div style={{ fontSize: '.7rem', color: '#6b7280', marginBottom: 8 }}>Pulsa una característica para añadir +1 (máx. +2 por stat, 3 clicks en total)</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {STAT_KEYS.map(k => {
              const bonus = form.bgBonuses[k] || 0
              const base = form.stats[k] || 10
              const total = base + bonus
              const hasBonus = bonus > 0
              const maxed = bonus >= 2
              const cantClick = (clicksLeft <= 0 || maxed)
              return (
                <div key={k} onClick={() => !cantClick && clickStat(k)}
                  style={{ flex: 1, borderRadius: 6, padding: '7px 3px', textAlign: 'center', cursor: cantClick ? 'default' : 'pointer', border: `1.5px solid ${hasBonus ? '#c8a96e' : 'rgba(255,255,255,0.1)'}`, background: hasBonus ? '#c8a96e0d' : 'rgba(0,0,0,0.2)', opacity: cantClick && !hasBonus ? 0.5 : 1 }}>
                  <div style={{ fontSize: '9px', color: hasBonus ? '#c8a96e' : '#8b7d5c', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: '15px', fontWeight: 500, color: '#d4c5a0' }}>{base}</div>
                  <div style={{ fontSize: '11px', color: '#c8a96e', fontWeight: 500, minHeight: 14 }}>{hasBonus ? `+${bonus}` : ''}</div>
                  <div style={{ fontSize: '11px', padding: '1px 4px', borderRadius: 10, display: 'inline-block', marginTop: 2, background: hasBonus ? '#c8a96e15' : 'rgba(255,255,255,0.05)', border: `0.5px solid ${hasBonus ? '#c8a96e44' : 'rgba(255,255,255,0.1)'}`, color: hasBonus ? '#c8a96e' : '#8b7d5c' }}>
                    {statMod(total)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// PASO 4 — Equipo
// ══════════════════════════════════════════════════════════
function Step4({ form, setF, cls, refData }) {
  const weapons = refData?.weapons || []
  const armors = refData?.armor || []
  const bg = refData?.backgrounds?.find(b => b.id == form.backgroundId)
  const [newItem, setNewItem] = useState('')

  // Prellena equipo de trasfondo al montar si no hay nada
  useEffect(() => {
    if (bg && form.extraItems.length === 0) {
      const items = []
      if (bg.equipment) bg.equipment.split(';').forEach(e => {
        const t = e.trim()
        if (t) items.push({ name: t, fromBg: true })
      })
      if (bg.toolProficiencies) bg.toolProficiencies.forEach(t => items.push({ name: t, fromBg: true }))
      if (items.length > 0) setF('extraItems', items)
      // Oro del trasfondo
      const match = bg.equipment?.match(/(\d+)\s*po/)
      if (match) setF('gold', parseInt(match[1]))
    }
  }, [])

  function addWeapon(weaponId) {
    if (!weaponId) return
    const w = weapons.find(x => x.id == weaponId || x.name === weaponId)
    if (!w) return
    const existing = form.weapons.find(x => x.id == weaponId)
    if (existing) { setF('weapons', form.weapons.map(x => x.id == weaponId ? { ...x, qty: x.qty + 1 } : x)); return }
    setF('weapons', [...form.weapons, { id: w.id || w.name, name: w.name, qty: 1, dmg: w.damage || w.dmg || '', mastery: w.mastery || '', props: w.properties || w.props || '' }])
  }

  function changeQty(id, delta) {
    setF('weapons', form.weapons.map(w => w.id == id ? { ...w, qty: Math.max(1, w.qty + delta) } : w))
  }

  function removeWeapon(id) { setF('weapons', form.weapons.filter(w => w.id != id)) }

  function addItem() {
    if (!newItem.trim()) return
    setF('extraItems', [...form.extraItems, { name: newItem.trim(), fromBg: false }])
    setNewItem('')
  }

  return (
    <div>
      {/* Armas */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '.72rem', color: '#8b7d5c', marginBottom: 6 }}>⚔️ Armas</div>
        <select className="dnd-input" style={{ width: '100%', marginBottom: 8 }}
          onChange={e => { addWeapon(e.target.value); e.target.value = '' }}>
          <option value="">— Añadir arma —</option>
          {weapons.map(w => <option key={w.id || w.name} value={w.id || w.name}>{w.name} ({w.damage || w.dmg})</option>)}
        </select>
        {form.weapons.map(w => (
          <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '6px 10px', marginBottom: 5 }}>
            <span style={{ fontSize: '14px' }}>⚔️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '.8rem', fontWeight: 500, color: '#d4c5a0' }}>{w.name}</div>
              <div style={{ fontSize: '.72rem', color: '#8b7d5c' }}>{w.dmg} {w.props && `· ${w.props}`}</div>
            </div>
            {w.mastery && <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: 10, background: '#c8a96e22', border: '0.5px solid #c8a96e44', color: '#c8a96e' }}>{w.mastery}</span>}
            <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: 10, background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>Acción</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button className="dnd-btn-sm" style={{ width: 22, height: 22, padding: 0, borderRadius: '50%' }} onClick={() => changeQty(w.id, -1)}>−</button>
              <span style={{ fontSize: '.8rem', fontWeight: 500, minWidth: 20, textAlign: 'center', color: '#d4c5a0' }}>{w.qty}</span>
              <button className="dnd-btn-sm" style={{ width: 22, height: 22, padding: 0, borderRadius: '50%' }} onClick={() => changeQty(w.id, 1)}>+</button>
            </div>
            <button className="dnd-btn-sm" style={{ color: '#f87171', padding: '1px 5px' }} onClick={() => removeWeapon(w.id)}>✕</button>
          </div>
        ))}
      </div>

      {/* Armadura */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '.72rem', color: '#8b7d5c', marginBottom: 6 }}>🛡️ Armadura</div>
        <select className="dnd-input" style={{ width: '100%', marginBottom: 6 }} value={form.armorId}
          onChange={e => {
            const a = armors.find(x => x.id == e.target.value || x.name === e.target.value)
            setF('armorId', e.target.value)
            setF('armorName', a?.name || '')
            setF('armorAC', a?.ac || a?.armorClass || '')
            setF('armorACNum', a?.acBase || null)
          }}>
          <option value="">— Sin armadura —</option>
          {armors.map(a => <option key={a.id || a.name} value={a.id || a.name}>{a.name}</option>)}
        </select>
        {form.armorName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '6px 10px', marginBottom: 6 }}>
            <span>🛡️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '.8rem', fontWeight: 500, color: '#d4c5a0' }}>{form.armorName}</div>
              <div style={{ fontSize: '.72rem', color: '#8b7d5c' }}>CA {form.armorAC}</div>
            </div>
            <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: 10, background: 'rgba(55,138,221,0.2)', color: '#60a5fa' }}>CA base</span>
          </div>
        )}
        {/* Escudo */}
        <div onClick={() => setF('shield', !form.shield)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${form.shield ? '#c8a96e55' : 'rgba(255,255,255,0.1)'}`, background: form.shield ? '#c8a96e0d' : 'rgba(0,0,0,0.15)' }}>
          <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${form.shield ? '#c8a96e' : 'rgba(255,255,255,0.2)'}`, background: form.shield ? '#c8a96e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {form.shield && <span style={{ fontSize: '10px', color: '#fff' }}>✓</span>}
          </div>
          <span style={{ fontSize: '.8rem', color: form.shield ? '#c8a96e' : '#a09880' }}>Lleva escudo equipado</span>
          <span style={{ fontSize: '.75rem', color: '#c8a96e', marginLeft: 'auto', fontWeight: 500 }}>+2 CA</span>
        </div>
      </div>

      {/* Equipo adicional */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '.72rem', color: '#8b7d5c', marginBottom: 6 }}>🎒 Equipo adicional</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
          {form.extraItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.78rem', padding: '3px 9px', borderRadius: 20, border: `1px solid ${item.fromBg ? 'rgba(55,138,221,0.4)' : 'rgba(255,255,255,0.15)'}`, background: item.fromBg ? 'rgba(55,138,221,0.08)' : 'rgba(0,0,0,0.2)', color: '#d4c5a0' }}>
              <span>{item.name}</span>
              {item.fromBg && <span style={{ fontSize: '9px', color: '#60a5fa' }}>· Trasfondo</span>}
              <button style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 0, fontSize: '11px' }} onClick={() => setF('extraItems', form.extraItems.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input className="dnd-input" style={{ flex: 1, borderRadius: 20 }} placeholder="Añadir objeto..."
            value={newItem} onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()} />
          <button className="dnd-btn-sm" onClick={addItem} style={{ borderRadius: 20 }}>+ Añadir</button>
        </div>
      </div>

      {/* Monedas */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: '10px 12px' }}>
        <span style={{ fontSize: '18px' }}>🪙</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '.8rem', color: '#a09880' }}>Monedas de oro</div>
          {bg?.equipment?.match(/(\d+)\s*po/) && <div style={{ fontSize: '.72rem', color: '#6b7280' }}>Trasfondo: {bg.equipment.match(/(\d+)\s*po/)[1]} po</div>}
        </div>
        <input type="number" min={0} value={form.gold} onChange={e => setF('gold', parseInt(e.target.value) || 0)}
          style={{ width: 70, textAlign: 'center', fontSize: '15px', fontWeight: 500, padding: '5px 8px', borderRadius: 6, border: '1px solid #c8a96e44', background: '#c8a96e0d', color: '#c8a96e' }} />
        <span style={{ fontSize: '.78rem', color: '#8b7d5c' }}>po</span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// PASO 5 — Conjuros
// ══════════════════════════════════════════════════════════
function Step5({ form, setF, glossarySpells, cls }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const lvlLabel = { truco: 'Truco', 0: 'Truco', 1: 'Nv.1', 2: 'Nv.2', 3: 'Nv.3', 4: 'Nv.4', 5: 'Nv.5', 6: 'Nv.6', 7: 'Nv.7', 8: 'Nv.8', 9: 'Nv.9' }
  const lvlColor = { truco: '#a78bfa', 0: '#a78bfa', 1: '#378add', 2: '#1d9e75', 3: '#c8a96e', 4: '#e57', 5: '#f59e0b' }

  const filtered = glossarySpells.filter(s => {
    if (filter !== 'all' && String(s.spellLevel) !== filter) return false
    if (search && !s.name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function toggleSpell(id) {
    if (form.knownSpells.includes(id)) setF('knownSpells', form.knownSpells.filter(x => x !== id))
    else setF('knownSpells', [...form.knownSpells, id])
  }

  const levels = ['all', 'truco', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  const levelLabels = { all: 'Todos', truco: 'Truco', '1': 'Nv.1', '2': 'Nv.2', '3': 'Nv.3', '4': 'Nv.4', '5': 'Nv.5', '6': 'Nv.6', '7': 'Nv.7', '8': 'Nv.8', '9': 'Nv.9' }

  return (
    <div>
      {/* Toggle lanzador */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '.82rem', fontWeight: 500, color: '#d4c5a0' }}>Lanzador de conjuros</div>
          <div style={{ fontSize: '.72rem', color: '#8b7d5c', marginTop: 2 }}>
            {form.isSpellcaster ? 'Activado — selecciona conjuros conocidos' : cls?.spellcaster ? 'La clase es lanzadora — activa para seleccionar conjuros' : 'Clase marcial — activa si tiene acceso a magia'}
          </div>
        </div>
        <div onClick={() => setF('isSpellcaster', !form.isSpellcaster)}
          style={{ width: 40, height: 22, borderRadius: 11, cursor: 'pointer', position: 'relative', background: form.isSpellcaster ? '#c8a96e' : 'rgba(255,255,255,0.1)', border: `1px solid ${form.isSpellcaster ? '#c8a96e' : 'rgba(255,255,255,0.2)'}`, transition: 'all .15s' }}>
          <div style={{ position: 'absolute', top: 3, left: form.isSpellcaster ? 21 : 3, width: 14, height: 14, borderRadius: '50%', background: form.isSpellcaster ? '#fff' : '#6b7280', transition: 'left .15s' }} />
        </div>
      </div>

      {form.isSpellcaster && (
        <>
          {/* Filtros nivel */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4, marginBottom: 8 }}>
            {levels.map(lv => (
              <button key={lv} onClick={() => setFilter(lv)}
                style={{ fontSize: '11px', padding: '3px 9px', borderRadius: 20, flexShrink: 0, cursor: 'pointer', border: '0.5px solid', borderColor: filter === lv ? '#c8a96e' : 'rgba(255,255,255,0.15)', background: filter === lv ? '#c8a96e22' : 'transparent', color: filter === lv ? '#c8a96e' : '#8b7d5c' }}>
                {levelLabels[lv]}
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <input className="dnd-input" placeholder="Buscar conjuro..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />

          {/* Lista */}
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10 }}>
            {filtered.map(s => {
              const sel = form.knownSpells.includes(s.id)
              const lv = String(s.spellLevel)
              return (
                <div key={s.id} onClick={() => toggleSpell(s.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${sel ? '#c8a96e55' : 'transparent'}`, background: sel ? '#c8a96e0d' : 'rgba(0,0,0,0.15)' }}>
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: 8, background: `${lvlColor[lv] || '#888'}22`, border: `0.5px solid ${lvlColor[lv] || '#888'}44`, color: lvlColor[lv] || '#888', flexShrink: 0, minWidth: 34, textAlign: 'center' }}>
                    {lvlLabel[lv] || lv}
                  </span>
                  <span style={{ flex: 1, fontSize: '.78rem', fontWeight: 500, color: sel ? '#c8a96e' : '#d4c5a0' }}>{s.name}</span>
                  {s.tags?.includes('Concentración') && <span style={{ fontSize: '10px', color: '#a78bfa' }}>⚫</span>}
                  <div style={{ width: 15, height: 15, borderRadius: '50%', border: `1.5px solid ${sel ? '#c8a96e' : 'rgba(255,255,255,0.2)'}`, background: sel ? '#c8a96e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {sel && <span style={{ fontSize: '9px', color: '#fff' }}>✓</span>}
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && <div className="dnd-empty-sm">Sin conjuros para este filtro</div>}
          </div>

          {/* Pills seleccionados */}
          {form.knownSpells.length > 0 && (
            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 6, padding: '8px 10px' }}>
              <div style={{ fontSize: '.7rem', color: '#8b7d5c', marginBottom: 6 }}>
                Conjuros conocidos — <span style={{ color: '#c8a96e' }}>{form.knownSpells.length}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {form.knownSpells.map(id => {
                  const s = glossarySpells.find(x => x.id === id)
                  return s ? (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.75rem', padding: '2px 8px', borderRadius: 20, background: '#c8a96e0d', border: '1px solid #c8a96e44', color: '#d4c5a0' }}>
                      <span style={{ fontSize: '10px', color: '#c8a96e' }}>{lvlLabel[String(s.spellLevel)] || s.spellLevel}</span>
                      <span>{s.name}</span>
                      <button style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '10px', padding: 0 }} onClick={() => toggleSpell(id)}>✕</button>
                    </div>
                  ) : null
                })}
              </div>
            </div>
          )}
        </>
      )}

      {!form.isSpellcaster && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b7280' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚔️</div>
          <div style={{ fontSize: '.82rem' }}>Activa el toggle si este personaje tiene acceso a magia</div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// PASO 6 — Resumen final
// ══════════════════════════════════════════════════════════
function Step6({ form, setF, refData, cls }) {
  const race = refData?.races?.find(r => r.id === form.raceId)
  const bg = refData?.backgrounds?.find(b => b.id == form.backgroundId)
  const sub = cls?.subclasses?.find(s => s.id === form.subclassId)
  const lvlData = cls?.levels?.[form.level] || {}

  const finalStats = {}
  STAT_KEYS.forEach(k => { finalStats[k] = (form.stats[k] || 10) + (form.bgBonuses[k] || 0) })

  const SumRow = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', padding: '3px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
      <span style={{ color: '#8b7d5c' }}>{label}</span>
      <span style={{ color: '#d4c5a0', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  )

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: '.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em', color: '#8b7d5c', paddingBottom: 5, borderBottom: '0.5px solid rgba(255,255,255,0.07)', marginBottom: 7 }}>{title}</div>
      {children}
    </div>
  )

  return (
    <div>


      {/* CA y PG manuales */}
      {(() => {
        const dexMod = Math.floor(((form.stats.DES||10) + (form.bgBonuses?.DES||0) - 10) / 2)
        const conMod = Math.floor(((form.stats.CON||10) + (form.bgBonuses?.CON||0) - 10) / 2)
        const hasUnarmoredDef = !form.armorId
        const shieldBonus = form.shield ? 2 : 0
        const caCalc = (hasUnarmoredDef ? 10 + dexMod + conMod : (form.armorACNum || 10 + dexMod)) + shieldBonus
        const hpCalc = (cls?.hitDie || 8) + conMod + (form.level - 1) * (Math.ceil((cls?.hitDie||8)/2) + conMod)
        return (
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
            <div style={{ fontSize: '.7rem', color: '#8b7d5c', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>Combate base</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: '.72rem', color: '#8b7d5c', marginBottom: 4 }}>
                  CA {hasUnarmoredDef ? '(sin armadura: 10+DES+CON)' : `(${form.armorName})`}{form.shield ? ' +2 escudo' : ''}
                </div>
                <input type="number" className="dnd-input" min={1} max={30}
                  value={form.armorACNum ?? caCalc}
                  onChange={e => setF('armorACNum', parseInt(e.target.value)||10)}
                  style={{ textAlign:'center', fontSize:'1.2rem', fontWeight:500 }} />
              </div>
              <div>
                <div style={{ fontSize: '.72rem', color: '#8b7d5c', marginBottom: 4 }}>
                  PG máximos (calculado: {hpCalc})
                </div>
                <input type="number" className="dnd-input" min={1}
                  value={form.maxHp ?? hpCalc}
                  onChange={e => setF('maxHp', parseInt(e.target.value)||1)}
                  style={{ textAlign:'center', fontSize:'1.2rem', fontWeight:500 }} />
              </div>
            </div>
          </div>
        )
      })()}

      {/* Datos básicos */}
      <Section title="Personaje">
        <SumRow label="Nombre" value={form.name || '—'} />
        <SumRow label="Jugador" value={form.playerUserId ? `ID ${form.playerUserId}` : 'Sin asignar'} />
        <SumRow label="Clase" value={`${cls?.name || '—'} · Nivel ${form.level}`} />
        {sub && <SumRow label="Subclase" value={sub.name} />}
        <SumRow label="Raza" value={race?.name || '—'} />
        <SumRow label="Trasfondo" value={bg?.name || '—'} />
        <SumRow label="Velocidad" value={`${race?.speed || 30} pies`} />
        <SumRow label="Bon. competencia" value={`+${lvlData.profBonus || 2}`} />
      </Section>

      {/* Stats */}
      <Section title="Características finales">
        <div style={{ display: 'flex', gap: 5 }}>
          {STAT_KEYS.map(k => {
            const v = finalStats[k]
            const bonus = form.bgBonuses[k] || 0
            return (
              <div key={k} style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '6px 3px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: '#8b7d5c', textTransform: 'uppercase', letterSpacing: '.04em' }}>{k}</div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#d4c5a0' }}>{v}</div>
                <div style={{ fontSize: '11px', color: bonus > 0 ? '#c8a96e' : '#8b7d5c' }}>{statMod(v)}</div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* Combate */}
      <Section title="Combate">
        {(lvlData.slots || []).length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
            {lvlData.slots.map((s, i) => (
              <span key={i} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: 20, background: '#c8a96e22', border: '1px solid #c8a96e44', color: '#c8a96e' }}>
                {s.name} × {s.count ?? '∞'}
              </span>
            ))}
          </div>
        )}
        {form.armorName && <SumRow label="Armadura" value={`${form.armorName} · CA ${form.armorAC}`} />}
        <SumRow label="Dado de vida" value={`d${cls?.hitDie || 8}`} />
        <SumRow label="Salvaciones" value={cls?.savingThrows?.join(', ') || '—'} />
        {form.weapons.length > 0 && (
          <div style={{ marginTop: 5 }}>
            {form.weapons.map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.75rem', padding: '3px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: 8, background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>Acción</span>
                <span style={{ fontWeight: 500, color: '#d4c5a0' }}>{w.name}{w.qty > 1 ? ` ×${w.qty}` : ''}</span>
                <span style={{ color: '#8b7d5c' }}>{w.dmg} {w.mastery && `· ${w.mastery}`}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Habilidades */}
      {form.skills.length > 0 && (
        <Section title="Habilidades">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {[...form.skills, ...(bg?.skillProficiencies || []).filter(s => !form.skills.includes(s))].map(s => (
              <span key={s} style={{ fontSize: '.75rem', padding: '2px 8px', borderRadius: 20, background: 'rgba(0,0,0,0.2)', border: '0.5px solid rgba(255,255,255,0.1)', color: '#a09880' }}>{s}</span>
            ))}
          </div>
        </Section>
      )}

      {/* Rasgos */}
      <Section title="Rasgos">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {cls && Object.entries(cls.levels || {})
            .filter(([lv]) => parseInt(lv) <= form.level)
            .flatMap(([, ld]) => ld.features || [])
            .map((f, i) => (
              <span key={i} style={{ fontSize: '.75rem', padding: '2px 8px', borderRadius: 20, background: 'rgba(0,0,0,0.2)', border: '0.5px solid rgba(255,255,255,0.1)', color: '#a09880' }}>{f.name}</span>
            ))}
          {sub?.features?.filter(f => f.fromLevel <= form.level).map((f, i) => (
            <span key={`sub-${i}`} style={{ fontSize: '.75rem', padding: '2px 8px', borderRadius: 20, background: '#c8a96e0d', border: '0.5px solid #c8a96e44', color: '#c8a96e' }}>{f.name}</span>
          ))}
          {race?.traits?.map((t, i) => (
            <span key={`race-${i}`} style={{ fontSize: '.75rem', padding: '2px 8px', borderRadius: 20, background: 'rgba(55,138,221,0.08)', border: '0.5px solid rgba(55,138,221,0.3)', color: '#60a5fa' }}>{t.name}</span>
          ))}
          {bg?.feat && (
            <span style={{ fontSize: '.75rem', padding: '2px 8px', borderRadius: 20, background: 'rgba(167,139,250,0.1)', border: '0.5px solid rgba(167,139,250,0.3)', color: '#a78bfa' }}>{bg.feat}</span>
          )}
        </div>
      </Section>

      {/* Equipo */}
      <Section title="Equipo y oro">
        <SumRow label="Oro" value={`${form.gold} po`} />
        {form.extraItems.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
            {form.extraItems.map((item, i) => (
              <span key={i} style={{ fontSize: '.75rem', padding: '2px 8px', borderRadius: 20, background: 'rgba(0,0,0,0.2)', border: '0.5px solid rgba(255,255,255,0.1)', color: '#a09880' }}>{item.name}</span>
            ))}
          </div>
        )}
      </Section>

      {/* Conjuros */}
      {form.isSpellcaster && form.knownSpells.length > 0 && (
        <Section title={`Conjuros conocidos (${form.knownSpells.length})`}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {form.knownSpells.map(id => {
              const s = refData?.glossary?.entries?.find(e => e.id === id)
              return s ? (
                <span key={id} style={{ fontSize: '.75rem', padding: '2px 8px', borderRadius: 20, background: 'rgba(167,139,250,0.1)', border: '0.5px solid rgba(167,139,250,0.3)', color: '#a78bfa' }}>{s.name}</span>
              ) : null
            })}
          </div>
        </Section>
      )}
    </div>
  )
}
