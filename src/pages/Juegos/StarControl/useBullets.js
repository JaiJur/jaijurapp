import { useRef, useCallback } from 'react'
import { WORLD_SIZE } from './usePhysics'
import { gravityAccel } from './gravity'
import { CONFIG } from './gameConfig'

// Reparte "count" balas en abanico simétrico alrededor del rumbo de la nave.
// Cada x2 recogido suma 1 al recuento (1 bala = disparo normal, 2 = primer
// x2, 3 = segundo x2, etc.)
function computeSpreadOffsets(count) {
  if (count <= 1) return [0]
  const step = 0.09
  const offsets = []
  for (let i = 0; i < count; i++) {
    offsets.push((i - (count - 1) / 2) * step)
  }
  return offsets
}

/**
 * Gestión de disparos: se crean apuntando hacia donde mira la nave.
 * Velocidad/duración/cadencia se leen de CONFIG.bullets en cada frame
 * (afinables en caliente desde la consola de desarrollador). Se reutiliza
 * tanto para el jugador como para los enemigos.
 */
export function useBullets() {
  const bulletsRef = useRef([])
  const cooldownRef = useRef(0)

  const step = useCallback((dt, firing, ship, gravityBody, shotCount = 1, rangeMultiplier = 1) => {
    const { speed: BULLET_SPEED, lifetime: BULLET_LIFETIME, cooldown: FIRE_COOLDOWN } = CONFIG.bullets

    if (cooldownRef.current > 0) cooldownRef.current -= dt

    if (firing && cooldownRef.current <= 0) {
      cooldownRef.current = FIRE_COOLDOWN
      computeSpreadOffsets(shotCount).forEach(offset => {
        const heading = ship.heading + offset
        bulletsRef.current.push({
          x: ship.x, y: ship.y,
          vx: ship.vx + Math.cos(heading) * BULLET_SPEED,
          vy: ship.vy + Math.sin(heading) * BULLET_SPEED,
          life: BULLET_LIFETIME * rangeMultiplier,
        })
      })
    }

    bulletsRef.current = bulletsRef.current.filter(b => {
      b.life -= dt
      if (b.life <= 0) return false
      if (gravityBody) {
        const { ax, ay } = gravityAccel(gravityBody, b.x, b.y)
        b.vx += ax * dt
        b.vy += ay * dt
      }
      b.x += b.vx * dt
      b.y += b.vy * dt
      if (b.x < 0) b.x += WORLD_SIZE
      if (b.x >= WORLD_SIZE) b.x -= WORLD_SIZE
      if (b.y < 0) b.y += WORLD_SIZE
      if (b.y >= WORLD_SIZE) b.y -= WORLD_SIZE
      return true
    })
  }, [])

  // Añade una bala directamente (usado por los enemigos, que llevan su
  // propio cooldown individual en vez de compartir el de este hook).
  const pushBullet = useCallback((x, y, vx, vy) => {
    bulletsRef.current.push({ x, y, vx, vy, life: CONFIG.bullets.lifetime })
  }, [])

  const removeBullet = useCallback((index) => {
    bulletsRef.current.splice(index, 1)
  }, [])

  const reset = useCallback(() => {
    bulletsRef.current = []
    cooldownRef.current = 0
  }, [])

  return { bulletsRef, step, pushBullet, removeBullet, reset }
}
