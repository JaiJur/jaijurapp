import { useRef, useCallback } from 'react'

const SPAWN_INTERVAL = 0.03 // segundos entre partículas de estela
const PARTICLE_LIFE = 0.5   // segundos que tarda en desvanecerse cada partícula
const TRAIL_OFFSET = 10     // distancia detrás de la nave donde nace la estela

/**
 * Estela del motor: solo estética, no afecta a la física ni a colisiones.
 * Nace en la parte trasera de la nave mientras se acelera (W) y se
 * desvanece de claro a oscuro con el tiempo.
 */
export function useTrail() {
  const particlesRef = useRef([])
  const timerRef = useRef(0)

  const step = useCallback((dt, thrusting, ship) => {
    if (thrusting) {
      timerRef.current -= dt
      if (timerRef.current <= 0) {
        timerRef.current = SPAWN_INTERVAL
        particlesRef.current.push({
          x: ship.x - Math.cos(ship.heading) * TRAIL_OFFSET,
          y: ship.y - Math.sin(ship.heading) * TRAIL_OFFSET,
          life: PARTICLE_LIFE,
          maxLife: PARTICLE_LIFE,
        })
      }
    } else {
      timerRef.current = 0
    }

    particlesRef.current = particlesRef.current.filter(p => {
      p.life -= dt
      return p.life > 0
    })
  }, [])

  const reset = useCallback(() => {
    particlesRef.current = []
    timerRef.current = 0
  }, [])

  return { particlesRef, step, reset }
}
