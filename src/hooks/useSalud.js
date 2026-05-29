import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const API = '/api/salud'

function headers(userId) {
  return { 'Content-Type': 'application/json', 'x-user-id': userId }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function useSalud() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [config, setConfig] = useState({})
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch(API, { headers: headers(user.id) })
      const data = await res.json()
      setEntries(data.entries || [])
      setConfig(data.config || {})
    } catch (err) {
      console.error('Salud fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchAll() }, [fetchAll])

  const saveEntry = useCallback(async (date, data) => {
    if (!user) return
    try {
      const res = await fetch(`${API}/${date}`, {
        method: 'PUT',
        headers: headers(user.id),
        body: JSON.stringify(data),
      })
      const saved = await res.json()
      setEntries(prev => {
        const filtered = prev.filter(e => e.date !== date)
        return [saved, ...filtered].sort((a, b) => b.date.localeCompare(a.date))
      })
      return saved
    } catch (err) {
      console.error('Salud save error:', err)
    }
  }, [user])

  const deleteEntry = useCallback(async (date) => {
    if (!user) return
    try {
      await fetch(`${API}/${date}`, {
        method: 'DELETE',
        headers: headers(user.id),
      })
      setEntries(prev => prev.filter(e => e.date !== date))
    } catch (err) {
      console.error('Salud delete error:', err)
    }
  }, [user])

  const getToday = useCallback(() => {
    const today = todayStr()
    return entries.find(e => e.date === today) || null
  }, [entries])

  const saveConfig = useCallback(async (newConfig) => {
    if (!user) return
    try {
      const res = await fetch(`${API}/config`, {
        method: 'PUT',
        headers: headers(user.id),
        body: JSON.stringify(newConfig),
      })
      const saved = await res.json()
      setConfig(saved)
      return saved
    } catch (err) {
      console.error('Salud config save error:', err)
    }
  }, [user])

  return { entries, config, loading, saveEntry, deleteEntry, getToday, saveConfig, todayStr }
}
