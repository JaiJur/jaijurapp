import { useState } from 'react'
import AppHeader from '../../components/AppHeader'
import AddDishModal from '../../components/AddDishModal'
import { useMealPlanner } from '../../hooks/useMealPlanner'
import './MealPlanner.css'

const TABS = [
  { id: 'planning',   label: 'Planning' },
  { id: 'lista',      label: 'Lista' },
  { id: 'preparados', label: 'Preparados' },
  { id: 'favoritos',  label: 'Favoritos' },
]
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DAY_INITIALS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/* ── Utilidades de semana ── */
function getWeekMonday(offset = 0) {
  const now = new Date()
  const day = now.getDay() // 0=dom
  const diff = (day === 0 ? -6 : 1 - day)
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return monday
}
function weekKey(monday) {
  const y = monday.getFullYear()
  const m = String(monday.getMonth() + 1).padStart(2, '0')
  const d = String(monday.getDate()).padStart(2, '0')
  return `W${y}${m}${d}`
}
function formatWeekRange(monday) {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d) => `${d.getDate()} ${d.toLocaleDateString('es-ES', { month: 'short' })}`
  return `${fmt(monday)} – ${fmt(sunday)}`
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
}
function EditIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
}
function TrashIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
}

/* ─────────── PLANNING ─────────── */
function Planning({ planning, setPlanning, onSaveDish, onEditDish, preparados }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [modal, setModal]           = useState(null) // { day, slot, dishIndex: null|number }

  const monday = getWeekMonday(weekOffset)
  const wk     = weekKey(monday)

  const planKey   = (day, slot) => `${wk}-${day}-${slot}`
  const getDishes = (day, slot) => {
    // Primero busca con el prefijo de semana (formato nuevo)
    const val = planning[planKey(day, slot)]
      // Fallback: clave antigua sin prefijo (datos pre-migración)
      ?? planning[`${day}-${slot}`]
    if (!val) return []
    // Si es objeto suelto (formato antiguo), lo envuelve en array
    return Array.isArray(val) ? val : [val]
  }

  // dish en edición (null si es nuevo)
  const currentDish = modal && modal.dishIndex != null
    ? getDishes(modal.day, modal.slot)[modal.dishIndex] ?? null
    : null
  const racionesDisponibles = currentDish
    ? (preparados.find(p => p.name.toLowerCase() === currentDish.name.toLowerCase())?.raciones ?? 0)
    : 0

  const handleSave = (dish, isEdit) => {
    const key    = planKey(modal.day, modal.slot)
    const dishes = getDishes(modal.day, modal.slot)
    let next
    if (isEdit && modal.dishIndex != null) {
      // reemplazar en su posición
      const updated = dishes.map((d, i) => i === modal.dishIndex ? dish : d)
      next = { ...planning, [key]: updated }
      onEditDish(currentDish, dish)
    } else {
      // añadir al final
      next = { ...planning, [key]: [...dishes, dish] }
      onSaveDish(dish)
    }
    setPlanning(next)
    setModal(null)
  }
  const handleRemove = (day, slot, dishIndex, e) => {
    e.stopPropagation()
    const key    = planKey(day, slot)
    const dishes = getDishes(day, slot).filter((_, i) => i !== dishIndex)
    const next   = { ...planning }
    if (dishes.length === 0) delete next[key]
    else next[key] = dishes
    setPlanning(next)
  }

  // Renderiza la lista de chips + botón añadir para un slot
  const renderSlot = (day, slot, compact = false) => {
    const dishes = getDishes(day, slot)
    return (
      <div className="slot-dishes">
        {dishes.map((dish, i) => (
          <div className="dish-chip-wrap" key={i}>
            <span className="dish-chip-name">{dish.name}</span>
            <button className="dish-action edit"
              onClick={() => setModal({ day, slot, dishIndex: i })}><EditIcon /></button>
            <button className="dish-action remove"
              onClick={(e) => handleRemove(day, slot, i, e)}><TrashIcon /></button>
          </div>
        ))}
        <button className="add-meal-btn"
          onClick={() => setModal({ day, slot, dishIndex: null })}>
          <PlusIcon />{!compact && <span className="add-label">Añadir</span>}
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="planning-wrap">
        {/* ── Navegador de semana ── */}
        <div className="week-nav">
          <button className="week-nav-btn" onClick={() => setWeekOffset(o => o - 1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className="week-nav-label">
            {weekOffset === 0 ? <strong>Esta semana</strong> : weekOffset === 1 ? <strong>Próxima semana</strong> : weekOffset === -1 ? <strong>Semana pasada</strong> : <strong>{formatWeekRange(monday)}</strong>}
            <em>{formatWeekRange(monday)}</em>
          </span>
          <button className="week-nav-btn" onClick={() => setWeekOffset(o => o + 1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* ── Tabla desktop ── */}
        <div className="planning-table">
          <div className="planning-header-row">
            <div className="planning-cell day-col" />
            <div className="planning-cell col-header">Comida</div>
            <div className="planning-cell col-header">Cena</div>
          </div>
          {DAYS.map((day, idx) => (
            <div className="planning-row" key={day}>
              <div className="planning-cell day-col">
                <span className="day-label day-full">{day}</span>
                <span className="day-label day-short">{DAY_INITIALS[idx]}</span>
              </div>
              {['comida', 'cena'].map(slot => (
                <div className="planning-cell meal-col" key={slot}>
                  {renderSlot(day, slot)}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* ── Tarjetas móvil ── */}
        <div className="planning-cards">
          {DAYS.map(day => (
            <div className="planning-card" key={day}>
              <div className="planning-card-header">
                <span className="planning-card-day">{day}</span>
              </div>
              <div className="planning-card-rows">
                {['comida', 'cena'].map(slot => (
                  <div className="planning-card-row" key={slot}>
                    <span className="planning-card-slot">{slot}</span>
                    <div className="planning-card-meal">
                      {renderSlot(day, slot)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {modal && (
        <AddDishModal onClose={() => setModal(null)} onSave={handleSave}
          initialDish={currentDish} racionesDisponibles={racionesDisponibles}
          preparados={preparados} />
      )}
    </>
  )
}

/* ─────────── LISTA ─────────── */
function Lista({ items, setItems }) {
  const [editing, setEditing] = useState(null)
  const [addQty, setAddQty]   = useState(1)
  const [addName, setAddName] = useState('')

  const toggle   = (id) => setItems(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  const remove   = (id) => setItems(items.filter(i => i.id !== id))
  const saveEdit = (id, qty, name) => { setItems(items.map(i => i.id === id ? { ...i, qty, name } : i)); setEditing(null) }
  const clearChecked = () => setItems(items.filter(i => !i.checked))

  const checkedCount = items.filter(i => i.checked).length

  const addItem = () => {
    if (!addName.trim()) return
    const existing = items.find(i => i.name.toLowerCase() === addName.trim().toLowerCase())
    if (existing) {
      setItems(items.map(i => i.id === existing.id ? { ...i, qty: i.qty + addQty } : i))
    } else {
      setItems([...items, { id: Date.now() + Math.random(), qty: addQty, name: addName.trim(), checked: false }])
    }
    setAddName('')
    setAddQty(1)
  }

  return (
    <div className="list-wrap">
      {items.length > 0 && (
        <ul className="shopping-list">
          {items.map(item => (
            <li key={item.id} className={`shopping-item${item.checked ? ' checked' : ''}`}>
              {editing === item.id
                ? <EditRow item={item} onSave={saveEdit} onCancel={() => setEditing(null)} />
                : <ViewRow item={item} onToggle={toggle} onEdit={() => setEditing(item.id)} onRemove={remove} />}
            </li>
          ))}
        </ul>
      )}
      {items.length === 0 && (
        <p className="mp-placeholder" style={{ marginBottom: '1rem' }}>La lista de la compra está vacía.</p>
      )}
      {checkedCount > 0 && (
        <button className="clear-checked-btn" onClick={clearChecked}>
          Eliminar {checkedCount} tachado{checkedCount !== 1 ? 's' : ''}
        </button>
      )}
      <div className="lista-adder">
        <div className="lista-adder-counter">
          <button className="counter-btn" onClick={() => setAddQty(q => Math.max(1, q - 1))}>‹</button>
          <span className="counter-val">{addQty}</span>
          <button className="counter-btn" onClick={() => setAddQty(q => q + 1)}>›</button>
        </div>
        <input className="lista-adder-input" type="text" placeholder="Añadir producto..."
          value={addName} onChange={e => setAddName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()} />
        <button className="lista-adder-btn" onClick={addItem} disabled={!addName.trim()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

function ViewRow({ item, onToggle, onEdit, onRemove }) {
  return (
    <>
      <button className={`check-btn${item.checked ? ' on' : ''}`} onClick={() => onToggle(item.id)}>
        {item.checked && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
      </button>
      <span className="item-qty">{item.qty}</span>
      <span className="item-name">{item.name}</span>
      <div className="item-actions">
        <button className="action-btn" onClick={onEdit} title="Editar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button className="action-btn danger" onClick={() => onRemove(item.id)} title="Eliminar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </>
  )
}
function EditRow({ item, onSave, onCancel }) {
  const [qty, setQty]   = useState(item.qty)
  const [name, setName] = useState(item.name)
  return (
    <>
      <div className="edit-counter">
        <button className="counter-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>‹</button>
        <span className="counter-val">{qty}</span>
        <button className="counter-btn" onClick={() => setQty(q => q + 1)}>›</button>
      </div>
      <input className="edit-input" value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(item.id, qty, name); if (e.key === 'Escape') onCancel() }} autoFocus />
      <div className="item-actions">
        <button className="action-btn save" onClick={() => onSave(item.id, qty, name)} title="Guardar">✓</button>
        <button className="action-btn" onClick={onCancel} title="Cancelar">✕</button>
      </div>
    </>
  )
}

/* ─────────── PREPARADOS ─────────── */
function Preparados({ items, setItems }) {
  if (items.length === 0) return <p className="mp-placeholder">No hay platos preparados todavía.</p>

  const updateRaciones = (id, delta) => {
    setItems(items.map(p => p.id === id ? { ...p, raciones: Math.max(1, p.raciones + delta) } : p))
  }
  const remove = (id) => setItems(items.filter(p => p.id !== id))

  return (
    <div className="list-wrap">
      <ul className="prepared-list">
        {items.map(item => (
          <li key={item.id} className="prepared-item">
            <span className="prep-name">{item.name}</span>
            <div className="prep-controls">
              <div className="prep-counter">
                <button className="counter-btn" onClick={() => updateRaciones(item.id, -1)}>‹</button>
                <span className="counter-val">{item.raciones}</span>
                <button className="counter-btn" onClick={() => updateRaciones(item.id, +1)}>›</button>
              </div>
              <button className="prep-remove" onClick={() => remove(item.id)} title="Eliminar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ─────────── MAIN ─────────── */
export default function MealPlanner() {
  const [activeTab, setActiveTab] = useState('planning')
  const { loading, planning, setPlanning, lista, setLista, preparados, setPreparados } = useMealPlanner()

  const handleSaveDish = (dish) => {
    // ── Lista de la compra ──
    const nextLista = [...lista]
    dish.ingredients.forEach(ing => {
      const existing = nextLista.find(i => i.name.toLowerCase() === ing.name.toLowerCase())
      if (existing) existing.qty += ing.qty
      else nextLista.push({ id: Date.now() + Math.random(), qty: ing.qty, name: ing.name, checked: false })
    })
    setLista(nextLista)

    // ── Preparados: restar raciones consumidas y sumar sobrantes ──
    let nextPrep = preparados.map(p => ({ ...p }))
    const dishKey = dish.name.toLowerCase()
    const prepEntry = nextPrep.find(p => p.name.toLowerCase() === dishKey)

    // Restar las raciones que se van a consumir en este plato
    if (prepEntry && dish.racionesPlato > 0) {
      prepEntry.raciones -= dish.racionesPlato
      if (prepEntry.raciones <= 0) {
        nextPrep = nextPrep.filter(p => p.name.toLowerCase() !== dishKey)
      }
    }

    // Sumar sobrantes nuevos (si se cocinó más de lo que se come)
    const sobrantes = dish.raciones - dish.racionesPlato
    if (sobrantes > 0) {
      const entry = nextPrep.find(p => p.name.toLowerCase() === dishKey)
      if (entry) entry.raciones += sobrantes
      else nextPrep.push({ id: Date.now(), name: dish.name, raciones: sobrantes })
    }

    setPreparados(nextPrep)
  }

  const handleEditDish = (oldDish, newDish) => {
    let nextLista = lista.map(i => ({ ...i }))
    oldDish.ingredients.forEach(oldIng => {
      const idx = nextLista.findIndex(i => i.name.toLowerCase() === oldIng.name.toLowerCase())
      if (idx !== -1) { nextLista[idx].qty -= oldIng.qty; if (nextLista[idx].qty <= 0) nextLista.splice(idx, 1) }
    })
    newDish.ingredients.forEach(newIng => {
      const existing = nextLista.find(i => i.name.toLowerCase() === newIng.name.toLowerCase())
      if (existing) existing.qty += newIng.qty
      else nextLista.push({ id: Date.now() + Math.random(), qty: newIng.qty, name: newIng.name, checked: false })
    })
    setLista(nextLista)

    const delta = (newDish.raciones - newDish.racionesPlato) - (oldDish.raciones - oldDish.racionesPlato)
    const oldKey = oldDish.name.toLowerCase(), newKey = newDish.name.toLowerCase()
    let nextPrep = preparados.map(p => ({ ...p }))
    if (oldKey !== newKey) {
      const oldEntry = nextPrep.find(p => p.name.toLowerCase() === oldKey)
      if (oldEntry) {
        const newEntry = nextPrep.find(p => p.name.toLowerCase() === newKey)
        if (newEntry) { newEntry.raciones += oldEntry.raciones; nextPrep = nextPrep.filter(p => p.name.toLowerCase() !== oldKey) }
        else oldEntry.name = newDish.name
      }
    }
    if (delta !== 0) {
      const entry = nextPrep.find(p => p.name.toLowerCase() === newKey)
      if (entry) { entry.raciones += delta; if (entry.raciones <= 0) nextPrep = nextPrep.filter(p => p.name.toLowerCase() !== newKey) }
      else if (delta > 0) nextPrep.push({ id: Date.now(), name: newDish.name, raciones: delta })
    }
    setPreparados(nextPrep)
  }

  if (loading) return (
    <div className="mp-root"><AppHeader appName="mealPlanner" />
      <div className="mp-placeholder" style={{ marginTop: '3rem' }}>Cargando...</div>
    </div>
  )

  return (
    <div className="mp-root">
      <AppHeader appName="mealPlanner" />
      <nav className="mp-tabs">
        {TABS.map(tab => (
          <button key={tab.id} className={`mp-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.label}
            {tab.id === 'lista' && lista.filter(i => !i.checked).length > 0 &&
              <span className="tab-badge">{lista.filter(i => !i.checked).length}</span>}
            {tab.id === 'preparados' && preparados.length > 0 &&
              <span className="tab-badge">{preparados.length}</span>}
          </button>
        ))}
      </nav>
      <main className="mp-content">
        {activeTab === 'planning' && (
          <Planning planning={planning} setPlanning={setPlanning}
            onSaveDish={handleSaveDish} onEditDish={handleEditDish} preparados={preparados} />
        )}
        {activeTab === 'lista'      && <Lista items={lista} setItems={setLista} />}
        {activeTab === 'preparados' && <Preparados items={preparados} setItems={setPreparados} />}
        {activeTab === 'favoritos'  && <div className="mp-placeholder">Favoritos — próximamente</div>}
      </main>
    </div>
  )
}
