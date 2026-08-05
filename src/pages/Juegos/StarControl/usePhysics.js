import { useRef, useCallback } from 'react'
import { CONFIG } from './gameConfig'

export const WORLD_SIZE = 5000

/**
 * Física estilo Star Control clásico: inercia real, sin fricción.
 * La nave sigue derivando en la dirección de su última aceleración
 * hasta que se vuelve a acelerar en otra dirección.
 * Los valores (aceleración, giro, velocidad máxima) se leen de CONFIG.ship
 * en cada frame, así la consola de desarrollador los puede tocar en caliente.
 */
export function usePhysics(initial = {}) {
  const stateRef = useRef({
    x: initial.x ?? WORLD_SIZE / 2,
    y: initial.y ?? WORLD_SIZE / 2,
    vx: 0,
    vy: 0,
    heading: initial.heading ?? -Math.PI / 2, // apuntando "hacia arriba"
  })

  const step = useCallback((dt, controls, externalAccel, thrustMultiplier = 1) => {
    const s = stateRef.current
    const { thrust: THRUST, rotationSpeed: ROTATION_SPEED, maxSpeed: MAX_SPEED } = CONFIG.ship

    if (controls.rotateLeft) s.heading -= ROTATION_SPEED * dt
    if (controls.rotateRight) s.heading += ROTATION_SPEED * dt

    // Aceleración externa (p.ej. gravedad de un cuerpo celeste): no se
    // recorta al MAX_SPEED, así se puede usar para ganar velocidad extra
    // (efecto honda gravitacional).
    if (externalAccel) {
      s.vx += externalAccel.ax * dt
      s.vy += externalAccel.ay * dt
    }

    if (controls.thrust) {
      s.vx += Math.cos(s.heading) * THRUST * thrustMultiplier * dt
      s.vy += Math.sin(s.heading) * THRUST * thrustMultiplier * dt
      const speed = Math.hypot(s.vx, s.vy)
      if (speed > MAX_SPEED) {
        const scale = MAX_SPEED / speed
        s.vx *= scale
        s.vy *= scale
      }
    }

    s.x += s.vx * dt
    s.y += s.vy * dt

    // Wrap toroidal en los 4 bordes
    if (s.x < 0) s.x += WORLD_SIZE
    if (s.x >= WORLD_SIZE) s.x -= WORLD_SIZE
    if (s.y < 0) s.y += WORLD_SIZE
    if (s.y >= WORLD_SIZE) s.y -= WORLD_SIZE

    return s
  }, [])

  const reset = useCallback(() => {
    stateRef.current = {
      x: WORLD_SIZE / 2, y: WORLD_SIZE / 2,
      vx: 0, vy: 0,
      heading: -Math.PI / 2,
    }
  }, [])

  return { stateRef, step, reset }
}
