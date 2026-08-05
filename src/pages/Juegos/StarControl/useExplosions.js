import { useRef, useCallback } from 'react'

const PARTICLES_PER_BURST = 10
const SPEED_MIN = 40
const SPEED_MAX = 140
const EXPLOSION_LIFE = 0.5

function makeBurst(x, y) {
  return Array.from({ length: PARTICLES_PER_BURST }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN)
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: EXPLOSION_LIFE,
      maxLife: EXPLOSION_LIFE,
    }
  })
}

/**
 * Pequeñas explosiones estéticas al destruir un asteroide.
 * Puramente visual: no tiene ningún efecto sobre el juego.
 */
export function useExplosions() {
  const particlesRef = useRef([])

  const spawn = useCallback((x, y) => {
    particlesRef.current.push(...makeBurst(x, y))
  }, [])

  const step = useCallback((dt) => {
    particlesRef.current = particlesRef.current.filter(p => {
      p.life -= dt
      if (p.life <= 0) return false
      p.x += p.vx * dt
      p.y += p.vy * dt
      return true
    })
  }, [])

  const reset = useCallback(() => {
    particlesRef.current = []
  }, [])

  return { particlesRef, spawn, step, reset }
}
