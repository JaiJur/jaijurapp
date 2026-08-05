import { useState, useEffect } from 'react'
import Leaderboard from './Leaderboard'
import './StarControl.css'

const ACTIONS = [
  { id: 'rotateLeft', label: 'Girar izquierda' },
  { id: 'rotateRight', label: 'Girar derecha' },
  { id: 'thrust', label: 'Propulsión' },
  { id: 'fire', label: 'Disparo' },
  { id: 'missile', label: 'Misil' },
]

const KEY_LABELS = {
  ' ': 'ESPACIO',
  'arrowup': '↑',
  'arrowdown': '↓',
  'arrowleft': '←',
  'arrowright': '→',
  'control': 'CTRL',
  'shift': 'SHIFT',
  'escape': 'ESC',
}
function formatKey(key) {
  return KEY_LABELS[key] || key.toUpperCase()
}

// isTouch: en móvil no tiene sentido configurar teclas (se juega con los
// botones táctiles), así que el acordeón de controles no se muestra.
export default function KeyBindModal({ binds, onStart, onExit, isTouch, userId, isMaster, onOpenDev }) {
  const [localBinds, setLocalBinds] = useState(binds)
  const [listening, setListening] = useState(null)
  const [controlsOpen, setControlsOpen] = useState(false)

  // Sincroniza con las teclas guardadas: "binds" puede llegar un instante
  // después del primer render (se cargan de localStorage de forma async).
  useEffect(() => {
    setLocalBinds(binds)
  }, [binds])

  useEffect(() => {
    if (!listening) return
    function onKeyDown(e) {
      e.preventDefault()
      const key = e.key.toLowerCase()
      setLocalBinds(prev => {
        const next = { ...prev, [listening]: key }
        // Si esa tecla ya la usaba otra acción, intercambiamos para que
        // nunca haya dos acciones compartiendo la misma tecla.
        const conflict = Object.keys(prev).find(a => a !== listening && prev[a] === key)
        if (conflict) next[conflict] = prev[listening]
        return next
      })
      setListening(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [listening])

  return (
    <div className="sc-gameover">
      <div className="sc-gameover-box sc-keybind-box">
        <div className="sc-keybind-title">STAR CONTROL</div>

        <Leaderboard userId={userId} ready={true} padTo={10} />

        {!isTouch && (
          <div className="sc-accordion">
            <button className="sc-accordion-header" onClick={() => setControlsOpen(o => !o)}>
              <span>Controles</span>
              <span className={`sc-accordion-arrow${controlsOpen ? ' open' : ''}`}>▸</span>
            </button>

            {controlsOpen && (
              <div className="sc-accordion-body">
                {ACTIONS.map(({ id, label }) => (
                  <div key={id} className="sc-keybind-row">
                    <span className="sc-keybind-label">{label}</span>
                    <button
                      className={`sc-keybind-key${listening === id ? ' listening' : ''}`}
                      onClick={() => setListening(id)}
                    >
                      {listening === id ? 'Pulsa una tecla…' : formatKey(localBinds[id])}
                    </button>
                  </div>
                ))}

                {isMaster && (
                  <button className="sc-exit-btn sc-accordion-devbtn" onClick={onOpenDev}>
                    🛠 Consola de desarrollador
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <button className="sc-gameover-btn" onClick={() => onStart(localBinds)}>Empezar</button>
        <button className="sc-exit-btn" onClick={onExit}>Salir del juego</button>
      </div>
    </div>
  )
}
