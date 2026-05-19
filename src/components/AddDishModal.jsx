import { useState, useRef, useEffect } from 'react'
import './AddDishModal.css'

function Counter({ value, onChange, min = 1, label }) {
  return (
    <div className="counter-block">
      <div className="counter">
        <button className="counter-btn" onClick={() => onChange(Math.max(min, value - 1))}>‹</button>
        <span className="counter-val">{value}</span>
        <button className="counter-btn" onClick={() => onChange(value + 1)}>›</button>
      </div>
      {label && <span className="counter-label">{label}</span>}
    </div>
  )
}

function IngredientItem({ ing, onRemove, onEdit }) {
  const [editingQty, setEditingQty] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [qty, setQty]   = useState(ing.qty)
  const [name, setName] = useState(ing.name)

  const commitQty = () => { onEdit(ing.id, qty, ing.name); setEditingQty(false) }
  const commitName = () => { onEdit(ing.id, ing.qty, name); setEditingName(false) }

  return (
    <li className="ingredient-item">
      {editingQty ? (
        <input className="ing-edit-qty" type="number" min="1" value={qty}
          onChange={e => setQty(Number(e.target.value))}
          onBlur={commitQty}
          onKeyDown={e => { if (e.key === 'Enter') commitQty(); if (e.key === 'Escape') setEditingQty(false) }}
          autoFocus />
      ) : (
        <span className="ing-qty ing-editable" title="Editar cantidad" onClick={() => { setQty(ing.qty); setEditingQty(true) }}>
          {ing.qty}
        </span>
      )}
      {editingName ? (
        <input className="ing-edit-name" type="text" value={name}
          onChange={e => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditingName(false) }}
          autoFocus />
      ) : (
        <span className="ing-name ing-editable" title="Editar nombre" onClick={() => { setName(ing.name); setEditingName(true) }}>
          {ing.name}
        </span>
      )}
      <button className="ing-remove" onClick={() => onRemove(ing.id)}>✕</button>
    </li>
  )
}

// initialDish      → modo edición (pre-rellena el form)
// racionesDisponibles → raciones del plato que quedan en preparados (solo edición)
// preparados       → lista completa para sugerencias al añadir
export default function AddDishModal({ onClose, onSave, initialDish = null, racionesDisponibles = 0, preparados = [] }) {
  const editing = !!initialDish

  const [name, setName]                     = useState(initialDish?.name ?? '')
  const [ingredientQty, setIngredientQty]   = useState(1)
  const [ingredientName, setIngredientName] = useState('')
  const [ingredients, setIngredients]       = useState(
    initialDish?.ingredients?.map(i => ({ ...i })) ?? []
  )
  const [raciones, setRaciones]             = useState(initialDish?.raciones ?? 1)
  const [racionesPlato, setRacionesPlato]   = useState(initialDish?.racionesPlato ?? 1)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const nameInputRef = useRef(null)

  // Stock disponible del plato seleccionado en preparados (0 si no está)
  const [stockPreparado, setStockPreparado] = useState(0)

  // Sugerencias: preparados cuyo nombre incluye el texto escrito
  const suggestions = !editing && name.trim().length > 0
    ? preparados.filter(p =>
        p.name.toLowerCase().includes(name.trim().toLowerCase())
      )
    : !editing && name.trim().length === 0
    ? preparados  // muestra todos si el campo está vacío y tiene foco
    : []

  const selectSuggestion = (prep) => {
    setName(prep.name)
    setStockPreparado(prep.raciones)
    // Resetea a 1 ración: el usuario elige cuántas consume/cocina
    setRaciones(1)
    setRacionesPlato(1)
    setShowSuggestions(false)
    nameInputRef.current?.focus()
  }

  // Si el nombre cambia manualmente, limpiar el stock
  const handleNameChange = (e) => {
    setName(e.target.value)
    setStockPreparado(0)
    setShowSuggestions(true)
  }

  const addIngredient = () => {
    if (!ingredientName.trim()) return
    setIngredients(prev => [...prev, { id: Date.now(), qty: ingredientQty, name: ingredientName.trim() }])
    setIngredientName('')
    setIngredientQty(1)
  }
  const removeIngredient = (id) => setIngredients(prev => prev.filter(i => i.id !== id))
  const editIngredient   = (id, qty, name) =>
    setIngredients(prev => prev.map(i => i.id === id ? { ...i, qty, name } : i))

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ name: name.trim(), ingredients, raciones, racionesPlato }, editing)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{editing ? 'Editar plato' : 'Añadir plato'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="field-group">
            <label className="field-label">Nombre del plato</label>
            <div className="name-field-wrap">
              <input
                ref={nameInputRef}
                className="field-input"
                type="text"
                placeholder="ej. Pollo al horno"
                value={name}
                onChange={handleNameChange}                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                autoFocus
              />
              {!editing && showSuggestions && suggestions.length > 0 && (
                <ul className="dish-suggestions">
                  {suggestions.map(p => (
                    <li key={p.id} className="dish-suggestion-item"
                      onMouseDown={() => selectSuggestion(p)}>
                      <span className="suggestion-name">{p.name}</span>
                      <span className="suggestion-raciones">{p.raciones} rac.</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {ingredients.length > 0 && (
            <ul className="ingredient-list">
              {ingredients.map(ing => (
                <IngredientItem key={ing.id} ing={ing}
                  onRemove={removeIngredient} onEdit={editIngredient} />
              ))}
            </ul>
          )}

          <div className="adder-row">
            <Counter value={ingredientQty} onChange={setIngredientQty} />
            <input className="field-input adder-input" type="text" placeholder="Ingrediente"
              value={ingredientName} onChange={e => setIngredientName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addIngredient()} />
            <button className="adder-add" onClick={addIngredient}>+</button>
          </div>

          <div className="modal-divider" />

          <div className="rations-pair">
            <Counter value={raciones} onChange={setRaciones} label="Raciones a crear" />
            <Counter value={racionesPlato} onChange={setRacionesPlato} label="Raciones para este plato" />
          </div>

          {!editing && stockPreparado > 0 && (
            <div className="prep-info">
              <span className="prep-info-badge">{stockPreparado}</span>
              <span className="prep-info-text">
                {stockPreparado === 1 ? 'ración disponible' : 'raciones disponibles'} en preparados
              </span>
            </div>
          )}

          {editing && racionesDisponibles > 0 && (
            <div className="prep-info">
              <span className="prep-info-badge">{racionesDisponibles}</span>
              <span className="prep-info-text">
                {racionesDisponibles === 1 ? 'ración disponible' : 'raciones disponibles'} en preparados
              </span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave} disabled={!name.trim()}>
            {editing ? 'Guardar cambios' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
