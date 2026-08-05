import { useRef, useCallback } from 'react'
import { WORLD_SIZE } from './usePhysics'
import { gravityAccel } from './gravity'
import { CONFIG } from './gameConfig'

function randomAsteroid() {
  const { minSpeed, maxSpeed, minRadius, maxRadius } = CONFIG.asteroids
  const angle = Math.random() * Math.PI * 2
  const speed = minSpeed + Math.random() * (maxSpeed - minSpeed)
  const points = 8
  const shape = Array.from({ length: points }, (_, i) => ({
    angle: (i / points) * Math.PI * 2,
    r: 0.7 + Math.random() * 0.5,
  }))
  return {
    id: Math.random().toString(36).slice(2),
    x: Math.random() * WORLD_SIZE,
    y: Math.random() * WORLD_SIZE,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: minRadius + Math.random() * (maxRadius - minRadius),
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 1.2,
    shape,
  }
}

/**
 * Asteroides con movimiento lineal aleatorio y wrap toroidal. La cantidad y
 * el rango de velocidad/tamaño se leen de CONFIG.asteroids (afinables desde
 * la consola de desarrollador; el recuento se aplica al crear/reponer).
 */
export function useAsteroids() {
  const asteroidsRef = useRef(null)
  if (!asteroidsRef.current) {
    asteroidsRef.current = Array.from({ length: CONFIG.asteroids.count }, randomAsteroid)
  }

  const step = useCallback((dt, gravityBody) => {
    asteroidsRef.current.forEach(a => {
      if (gravityBody) {
        const { ax, ay } = gravityAccel(gravityBody, a.x, a.y)
        a.vx += ax * dt
        a.vy += ay * dt
      }
      a.x += a.vx * dt
      a.y += a.vy * dt
      a.rotation += a.spin * dt
      if (a.x < 0) a.x += WORLD_SIZE
      if (a.x >= WORLD_SIZE) a.x -= WORLD_SIZE
      if (a.y < 0) a.y += WORLD_SIZE
      if (a.y >= WORLD_SIZE) a.y -= WORLD_SIZE
    })
  }, [])

  // Destruye un asteroide y repone otro nuevo para mantener siempre el mismo número
  const removeAsteroid = useCallback((id) => {
    asteroidsRef.current = asteroidsRef.current.filter(a => a.id !== id)
    asteroidsRef.current.push(randomAsteroid())
  }, [])

  const reset = useCallback(() => {
    asteroidsRef.current = Array.from({ length: CONFIG.asteroids.count }, randomAsteroid)
  }, [])

  return { asteroidsRef, step, removeAsteroid, reset }
}
