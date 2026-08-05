import { useRef, useCallback } from 'react'
import { WORLD_SIZE } from './usePhysics'
import { wrapDelta } from './gravity'
import { CONFIG } from './gameConfig'

const TRAIL_SPAWN_INTERVAL = 0.03
const TRAIL_LIFE = 0.5

function findNearestEnemy(ship, enemiesArr) {
  let best = null, bestDist = Infinity
  for (const e of enemiesArr) {
    const dx = wrapDelta(e.x - ship.x)
    const dy = wrapDelta(e.y - ship.y)
    const d = Math.hypot(dx, dy)
    if (d < bestDist) { bestDist = d; best = e }
  }
  return best
}

/**
 * Misiles teledirigidos: arma secundaria. Velocidad, vida, cadencia y radio
 * de impacto se leen de CONFIG.missiles en cada frame (afinables desde la
 * consola de desarrollador). Al disparar, buscan el enemigo más cercano y
 * lo persiguen recalculando su rumbo hacia la posición actual del objetivo
 * en cada frame — como siempre se corrigen en vuelo, si tardan menos que su
 * vida útil en llegar, impactan seguro. Si el objetivo desaparece o se
 * agota el tiempo, se autodestruyen sin más efecto.
 */
export function useMissiles() {
  const missilesRef = useRef([])
  const trailRef = useRef([])
  const cooldownRef = useRef(CONFIG.missiles.cooldown) // empieza sin cargar, hay que esperar la recarga inicial
  const trailTimerRef = useRef(0)

  const step = useCallback((dt, firing, ship, enemiesArr) => {
    const { speed: MISSILE_SPEED, lifetime: MISSILE_LIFETIME, cooldown: MISSILE_COOLDOWN } = CONFIG.missiles

    if (cooldownRef.current > 0) cooldownRef.current -= dt

    if (firing && cooldownRef.current <= 0) {
      const target = findNearestEnemy(ship, enemiesArr)
      if (target) {
        cooldownRef.current = MISSILE_COOLDOWN
        const dx = wrapDelta(target.x - ship.x)
        const dy = wrapDelta(target.y - ship.y)
        missilesRef.current.push({
          id: Math.random().toString(36).slice(2),
          x: ship.x, y: ship.y,
          heading: Math.atan2(dy, dx),
          life: MISSILE_LIFETIME,
          targetId: target.id,
        })
      }
    }

    trailTimerRef.current -= dt
    const spawnTrail = trailTimerRef.current <= 0

    missilesRef.current = missilesRef.current.filter(m => {
      m.life -= dt
      if (m.life <= 0) return false

      const target = enemiesArr.find(e => e.id === m.targetId)
      if (target) {
        const dx = wrapDelta(target.x - m.x)
        const dy = wrapDelta(target.y - m.y)
        m.heading = Math.atan2(dy, dx)
      }

      m.x += Math.cos(m.heading) * MISSILE_SPEED * dt
      m.y += Math.sin(m.heading) * MISSILE_SPEED * dt
      if (m.x < 0) m.x += WORLD_SIZE
      if (m.x >= WORLD_SIZE) m.x -= WORLD_SIZE
      if (m.y < 0) m.y += WORLD_SIZE
      if (m.y >= WORLD_SIZE) m.y -= WORLD_SIZE

      if (spawnTrail) {
        trailRef.current.push({ x: m.x, y: m.y, life: TRAIL_LIFE, maxLife: TRAIL_LIFE })
      }

      return true
    })

    if (spawnTrail) trailTimerRef.current = TRAIL_SPAWN_INTERVAL

    trailRef.current = trailRef.current.filter(p => {
      p.life -= dt
      return p.life > 0
    })
  }, [])

  const removeMissile = useCallback((id) => {
    missilesRef.current = missilesRef.current.filter(m => m.id !== id)
  }, [])

  const reset = useCallback(() => {
    missilesRef.current = []
    trailRef.current = []
    cooldownRef.current = CONFIG.missiles.cooldown
    trailTimerRef.current = 0
  }, [])

  return { missilesRef, trailRef, cooldownRef, step, removeMissile, reset }
}
