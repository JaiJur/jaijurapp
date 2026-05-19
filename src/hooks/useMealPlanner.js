import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

const EMPTY = { planning: {}, lista: [], preparados: [], favoritos: [] }

export function useMealPlanner() {
  const { user } = useAuth()
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const saveTimer = useRef(null)

  // ── Cargar al montar ──────────────────────────────────
  useEffect(() => {
    if (!user) return
    fetch('/api/mealplanner', {
      headers: { 'x-user-id': user.id }
    })
      .then(r => r.json())
      .then(d => setData({ ...EMPTY, ...d }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  // ── Guardar con debounce 500ms ────────────────────────
  const save = useCallback((next) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch('/api/mealplanner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify(next)
      }).catch(() => {})
    }, 500)
  }, [user])

  const setPlanning = useCallback((planning) =>
    setData(prev => { const next = { ...prev, planning }; save(next); return next }), [save])

  const setLista = useCallback((lista) =>
    setData(prev => { const next = { ...prev, lista }; save(next); return next }), [save])

  const setPreparados = useCallback((preparados) =>
    setData(prev => { const next = { ...prev, preparados }; save(next); return next }), [save])

  const setFavoritos = useCallback((favoritos) =>
    setData(prev => { const next = { ...prev, favoritos }; save(next); return next }), [save])

  return {
    loading,
    planning: data.planning,       setPlanning,
    lista: data.lista,             setLista,
    preparados: data.preparados,   setPreparados,
    favoritos: data.favoritos,     setFavoritos,
  }
}
