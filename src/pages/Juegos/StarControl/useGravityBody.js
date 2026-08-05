import { useRef } from 'react'
import { WORLD_SIZE } from './usePhysics'

/**
 * Cuerpo celeste fijo con gravedad. Es indestructible y no se mueve; su
 * fuerza y radio viven en CONFIG.gravity (afinables en caliente desde la
 * consola de desarrollador), aquí solo guardamos su posición.
 */
export function useGravityBody() {
  const bodyRef = useRef({
    x: WORLD_SIZE * 0.3,
    y: WORLD_SIZE * 0.65,
  })
  return bodyRef
}
