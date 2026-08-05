import { useRef, useCallback } from 'react'
import { WORLD_SIZE } from './usePhysics'
import { CONFIG } from './gameConfig'

const TOKEN_RADIUS = 22
const TYPES = ['doubleShot', 'repair', 'boost', 'shield']

function randomToken() {
  return {
    id: Math.random().toString(36).slice(2),
    x: Math.random() * WORLD_SIZE,
    y: Math.random() * WORLD_SIZE,
    type: TYPES[Math.floor(Math.random() * TYPES.length)],
    radius: TOKEN_RADIUS,
    age: 0, // para una pequeña animación de flotación
  }
}

/**
 * Tokens de power-up: cada CONFIG.tokens.spawnInterval segundos aparece uno
 * (disparo doble, reparación o aceleración), en un punto aleatorio del mapa.
 * Solo hay uno activo a la vez — si el anterior no se ha recogido, se
 * espera al siguiente ciclo.
 */
export function useTokens() {
  const tokensRef = useRef([])
  const timerRef = useRef(CONFIG.tokens.spawnInterval)

  const step = useCallback((dt) => {
    timerRef.current -= dt
    if (timerRef.current <= 0) {
      timerRef.current = CONFIG.tokens.spawnInterval
      if (tokensRef.current.length === 0) {
        tokensRef.current = [randomToken()]
      }
    }
    tokensRef.current.forEach(t => { t.age += dt })
  }, [])

  const removeToken = useCallback((id) => {
    tokensRef.current = tokensRef.current.filter(t => t.id !== id)
  }, [])

  // Añade un token inmediatamente en un punto concreto (p.ej. al matar un
  // enemigo), sin esperar al ciclo de 60s.
  const spawnAt = useCallback((x, y, type) => {
    tokensRef.current = [...tokensRef.current, {
      id: Math.random().toString(36).slice(2),
      x, y, type, radius: TOKEN_RADIUS, age: 0,
    }]
  }, [])

  // Igual que spawnAt, pero elige el tipo al azar (usado al matar enemigos)
  const spawnRandomAt = useCallback((x, y) => {
    tokensRef.current = [...tokensRef.current, {
      id: Math.random().toString(36).slice(2),
      x, y, type: TYPES[Math.floor(Math.random() * TYPES.length)], radius: TOKEN_RADIUS, age: 0,
    }]
  }, [])

  const reset = useCallback(() => {
    tokensRef.current = []
    timerRef.current = CONFIG.tokens.spawnInterval
  }, [])

  return { tokensRef, step, removeToken, spawnAt, spawnRandomAt, reset }
}
