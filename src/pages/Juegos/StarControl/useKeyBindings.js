import { useRef, useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'sc_keybinds'
export const DEFAULT_BINDS = { rotateLeft: 'a', rotateRight: 'd', thrust: 'w', fire: 's', missile: 'k' }

/**
 * Gestiona el mapeo de teclas del jugador (persistido en localStorage del
 * navegador, es una preferencia local, no un dato de partida).
 */
export function useKeyBindings() {
  const [binds, setBinds] = useState(DEFAULT_BINDS)
  const bindsRef = useRef(DEFAULT_BINDS)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      if (saved) {
        setBinds({ ...DEFAULT_BINDS, ...saved })
        bindsRef.current = { ...DEFAULT_BINDS, ...saved }
      }
    } catch { /* localStorage no disponible o corrupto, usamos defaults */ }
  }, [])

  const save = useCallback((next) => {
    bindsRef.current = next
    setBinds(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }, [])

  return { binds, bindsRef, save }
}
