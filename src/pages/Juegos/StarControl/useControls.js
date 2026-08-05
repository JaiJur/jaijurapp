import { useEffect, useRef } from 'react'

/**
 * Controles de teclado (mapeo configurable vía bindsRef) + interfaz para
 * botones táctiles en móvil.
 * bindsRef.current = { rotateLeft, rotateRight, thrust, fire, missile } (teclas en minúscula)
 */
export function useControls(bindsRef) {
  const controls = useRef({ thrust: false, rotateLeft: false, rotateRight: false, fire: false, missile: false })

  useEffect(() => {
    function setKey(e, value) {
      // No secuestrar teclas si el foco está en un campo de texto/número
      // (p.ej. la consola de desarrollador o el modal de configuración)
      const tag = e.target && e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const key = e.key.toLowerCase()
      const kb = bindsRef.current
      let matched = false
      if (key === kb.thrust) { controls.current.thrust = value; matched = true }
      if (key === kb.rotateLeft) { controls.current.rotateLeft = value; matched = true }
      if (key === kb.rotateRight) { controls.current.rotateRight = value; matched = true }
      if (key === kb.fire) { controls.current.fire = value; matched = true }
      if (key === kb.missile) { controls.current.missile = value; matched = true }
      // Evita el comportamiento por defecto del navegador (scroll con flechas/espacio, etc.)
      if (matched) e.preventDefault()
    }
    const onKeyDown = (e) => setKey(e, true)
    const onKeyUp = (e) => setKey(e, false)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [bindsRef])

  const setMobileControl = (name, value) => {
    controls.current[name] = value
  }

  return { controls, setMobileControl }
}
