import { useRef } from 'react'
import { WORLD_SIZE } from './usePhysics'

const STAR_COUNT = 1600

/**
 * Genera un campo de estrellas aleatorio (no cuadrícula) una sola vez por
 * partida, distribuido por todo el mundo (WORLD_SIZE x WORLD_SIZE).
 */
export function useStarfield(count = STAR_COUNT) {
  const starsRef = useRef(null)
  if (!starsRef.current) {
    starsRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * WORLD_SIZE,
      y: Math.random() * WORLD_SIZE,
      size: Math.random() < 0.8 ? 1 : 2,
      alpha: 0.35 + Math.random() * 0.65,
    }))
  }
  return starsRef.current
}
