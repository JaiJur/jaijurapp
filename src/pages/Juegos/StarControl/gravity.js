import { WORLD_SIZE } from './usePhysics'
import { CONFIG } from './gameConfig'

export function wrapDelta(v, size = WORLD_SIZE) {
  let d = v % size
  if (d > size / 2) d -= size
  if (d < -size / 2) d += size
  return d
}

/**
 * Aceleración gravitatoria que ejerce el cuerpo celeste (posición en "body",
 * fuerza y radio en CONFIG.gravity) sobre un punto (x,y). Usa ley de la
 * inversa del cuadrado, con la distancia recortada al radio del cuerpo para
 * evitar que la aceleración se dispare al infinito justo antes de la colisión.
 */
export function gravityAccel(body, x, y) {
  const dx = wrapDelta(body.x - x)
  const dy = wrapDelta(body.y - y)
  let dist = Math.hypot(dx, dy)
  const radius = CONFIG.gravity.radius
  if (dist < radius) dist = radius
  const a = CONFIG.gravity.g / (dist * dist)
  return { ax: (dx / dist) * a, ay: (dy / dist) * a }
}
