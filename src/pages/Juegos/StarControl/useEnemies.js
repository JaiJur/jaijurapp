import { useRef, useCallback } from 'react'
import { WORLD_SIZE } from './usePhysics'
import { wrapDelta, gravityAccel } from './gravity'
import { CONFIG } from './gameConfig'

const SPAWN_MIN_DIST = 1500    // aparece lejos del jugador (que arranca en el centro)

// Al añadir un enemigo nuevo (por un token), se elige uno de estos 3 tipos al azar
const SPAWN_WEIGHTS = [['triangle', 0.5], ['square', 0.25], ['pentagon', 0.25]]
function pickRandomType() {
  const r = Math.random()
  let acc = 0
  for (const [type, w] of SPAWN_WEIGHTS) {
    acc += w
    if (r <= acc) return type
  }
  return 'triangle'
}

function randomSpawn() {
  const angle = Math.random() * Math.PI * 2
  const dist = SPAWN_MIN_DIST + Math.random() * 900
  let x = WORLD_SIZE / 2 + Math.cos(angle) * dist
  let y = WORLD_SIZE / 2 + Math.sin(angle) * dist
  x = ((x % WORLD_SIZE) + WORLD_SIZE) % WORLD_SIZE
  y = ((y % WORLD_SIZE) + WORLD_SIZE) % WORLD_SIZE
  return { x, y, heading: Math.random() * Math.PI * 2 }
}

function makeEnemy(type = 'triangle') {
  return {
    id: Math.random().toString(36).slice(2),
    type,
    ...randomSpawn(),
    vx: 0, vy: 0,
    damage: 0, // daño acumulado recibido (se compara con CONFIG.enemies.types[type].health)
    invuln: CONFIG.enemies.invulnTime,
    fireCooldown: 0,
  }
}

/**
 * Naves enemigas (hasta CONFIG.enemies.maxEnemies a la vez): misma física
 * base que la del jugador (inercia real, gravedad del cuerpo celeste),
 * controladas por una IA sencilla que gira y se propulsa para acercarse al
 * jugador y disparar. Todos los parámetros (vida, velocidad, cadencia,
 * daño de sus disparos, radio de colisión...) se leen de CONFIG.enemies en
 * cada frame, afinables en caliente desde la consola de desarrollador.
 * Empiezan siendo 1 (triángulo) y se añaden más al recoger tokens (spawnOne).
 */
export function useEnemies(initialCount = 1) {
  const enemiesRef = useRef(Array.from({ length: initialCount }, () => makeEnemy('triangle')))

  // Devuelve la lista de disparos que quieren hacer los enemigos este frame
  // ({x, y, vx, vy}), para que se añadan al pool de balas enemigas.
  // "asteroidsArr" se usa solo para la esquiva, no afecta a su física.
  const step = useCallback((dt, playerX, playerY, gravityBody, asteroidsArr = []) => {
    const shots = []
    const {
      types, rotationSpeed: ROTATION_SPEED, minApproachDist: MIN_APPROACH_DIST, fireRange: FIRE_RANGE,
      avoidSunRange, avoidAsteroidRange, avoidStrength,
    } = CONFIG.enemies
    const bulletSpeed = CONFIG.bullets.speed

    enemiesRef.current.forEach(e => {
      const stats = types[e.type] || types.triangle
      const dx = wrapDelta(playerX - e.x)
      const dy = wrapDelta(playerY - e.y)
      const dist = Math.hypot(dx, dy)

      // Dirección "de caza": hacia el jugador
      let seekX = dist > 0.001 ? dx / dist : 1
      let seekY = dist > 0.001 ? dy / dist : 0

      // Esquiva: se aleja del sol y de los asteroides que tiene cerca
      let avoidX = 0, avoidY = 0
      if (gravityBody) {
        const sdx = wrapDelta(e.x - gravityBody.x)
        const sdy = wrapDelta(e.y - gravityBody.y)
        const sdist = Math.hypot(sdx, sdy)
        const dangerR = CONFIG.gravity.radius * avoidSunRange
        if (sdist < dangerR && sdist > 0.001) {
          const strength = (dangerR - sdist) / dangerR
          avoidX += (sdx / sdist) * strength
          avoidY += (sdy / sdist) * strength
        }
      }
      for (const a of asteroidsArr) {
        const adx = wrapDelta(e.x - a.x)
        const ady = wrapDelta(e.y - a.y)
        const adist = Math.hypot(adx, ady)
        const dangerR = a.radius * avoidAsteroidRange
        if (adist < dangerR && adist > 0.001) {
          const strength = (dangerR - adist) / dangerR
          avoidX += (adx / adist) * strength
          avoidY += (ady / adist) * strength
        }
      }
      const avoiding = avoidX !== 0 || avoidY !== 0

      // El rumbo final combina perseguir al jugador con esquivar el peligro
      // (la esquiva pesa más, así que domina cuando hay algo cerca)
      const finalX = seekX + avoidX * avoidStrength
      const finalY = seekY + avoidY * avoidStrength
      const targetHeading = Math.atan2(finalY, finalX)

      let diff = targetHeading - e.heading
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))

      if (Math.abs(diff) > 0.05) {
        e.heading += Math.sign(diff) * Math.min(ROTATION_SPEED * dt, Math.abs(diff))
      }

      // Se propulsa si está lejos del jugador, o si está esquivando algo
      // (aunque esté cerca del jugador, necesita moverse para apartarse)
      if (dist > MIN_APPROACH_DIST || avoiding) {
        e.vx += Math.cos(e.heading) * stats.thrust * dt
        e.vy += Math.sin(e.heading) * stats.thrust * dt
        const speed = Math.hypot(e.vx, e.vy)
        if (speed > stats.maxSpeed) {
          const scale = stats.maxSpeed / speed
          e.vx *= scale
          e.vy *= scale
        }
      }

      if (gravityBody) {
        const { ax, ay } = gravityAccel(gravityBody, e.x, e.y)
        e.vx += ax * dt
        e.vy += ay * dt
      }

      e.x += e.vx * dt
      e.y += e.vy * dt
      if (e.x < 0) e.x += WORLD_SIZE
      if (e.x >= WORLD_SIZE) e.x -= WORLD_SIZE
      if (e.y < 0) e.y += WORLD_SIZE
      if (e.y >= WORLD_SIZE) e.y -= WORLD_SIZE

      if (e.fireCooldown > 0) e.fireCooldown -= dt
      if (dist < FIRE_RANGE && e.fireCooldown <= 0) {
        e.fireCooldown = stats.fireCooldown
        // El pentágono dispara 2 ráfagas (2 balas en abanico) por cada disparo
        const offsets = stats.shots > 1 ? [-0.09, 0.09] : [0]
        offsets.forEach(offset => {
          const heading = e.heading + offset
          shots.push({
            x: e.x, y: e.y,
            vx: e.vx + Math.cos(heading) * bulletSpeed,
            vy: e.vy + Math.sin(heading) * bulletSpeed,
          })
        })
      }

      if (e.invuln > 0) e.invuln -= dt
    })

    return shots
  }, [])

  // Añade un enemigo más (hasta el máximo), de un tipo aleatorio; se llama al recoger un token.
  const spawnOne = useCallback(() => {
    if (enemiesRef.current.length >= CONFIG.enemies.maxEnemies) return
    enemiesRef.current = [...enemiesRef.current, makeEnemy(pickRandomType())]
  }, [])

  // Aplica "amount" de daño a un enemigo concreto. Devuelve null si estaba
  // invulnerable (no ha pasado nada), o { died, x, y } con la posición donde
  // murió si llegó a la vida de su tipo (en ese caso reaparece en otro punto).
  const damage = useCallback((id, amount = 1) => {
    const e = enemiesRef.current.find(en => en.id === id)
    if (!e || e.invuln > 0) return null
    const stats = CONFIG.enemies.types[e.type] || CONFIG.enemies.types.triangle
    e.damage += amount
    e.invuln = CONFIG.enemies.invulnTime
    if (e.damage >= stats.health) {
      const deathPos = { x: e.x, y: e.y, type: e.type }
      Object.assign(e, randomSpawn(), { vx: 0, vy: 0, damage: 0, invuln: CONFIG.enemies.invulnTime, fireCooldown: 0 })
      return { died: true, x: deathPos.x, y: deathPos.y, type: deathPos.type }
    }
    return { died: false }
  }, [])

  const reset = useCallback((count = 1) => {
    enemiesRef.current = Array.from({ length: count }, () => makeEnemy('triangle'))
  }, [])

  return { enemiesRef, step, spawnOne, damage, reset }
}
