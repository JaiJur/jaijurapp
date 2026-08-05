import { useState, useCallback } from 'react'
import { CONFIG, saveConfig, resetConfig } from './gameConfig'
import './StarControl.css'

// El propio objeto CONFIG se muta directamente al cambiar un campo (así lo
// leen en caliente los hooks del juego); este hook solo fuerza el re-render
// de este panel para reflejar el cambio en los inputs.
function useForceUpdate() {
  const [, setTick] = useState(0)
  return useCallback(() => setTick(t => t + 1), [])
}

function NumberField({ label, value, onChange, min }) {
  return (
    <label className="sc-dev-field">
      <span>{label}</span>
      <input
        type="number"
        step="any"
        min={min}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  )
}

const ENEMY_TYPE_LABELS = {
  triangle: 'Caza (triángulo)',
  square: 'Acorazado (cuadrado)',
  pentagon: 'Bombardero (pentágono)',
}

export default function DevConsole({ onClose }) {
  const forceUpdate = useForceUpdate()

  const set = (path, value) => {
    if (Number.isNaN(value)) return
    const keys = path.split('.')
    let obj = CONFIG
    for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
    obj[keys[keys.length - 1]] = value
    saveConfig()
    forceUpdate()
  }

  const handleReset = () => {
    resetConfig()
    forceUpdate()
  }

  return (
    <div className="sc-devconsole">
      <div className="sc-devconsole-header">
        <span>🛠 Consola de desarrollador</span>
        <button className="sc-devconsole-close" onClick={onClose}>✕</button>
      </div>

      <div className="sc-devconsole-body">
        <section className="sc-dev-section">
          <h4>Vista</h4>
          <NumberField label="Zoom (1 = tamaño real)" value={CONFIG.view.zoom} onChange={v => set('view.zoom', v)} min={0.1} />
        </section>

        <section className="sc-dev-section">
          <h4>Nave</h4>
          <NumberField label="Aceleración" value={CONFIG.ship.thrust} onChange={v => set('ship.thrust', v)} />
          <NumberField label="Vel. de giro" value={CONFIG.ship.rotationSpeed} onChange={v => set('ship.rotationSpeed', v)} />
          <NumberField label="Vel. máxima" value={CONFIG.ship.maxSpeed} onChange={v => set('ship.maxSpeed', v)} />
          <NumberField label="Radio colisión" value={CONFIG.ship.radius} onChange={v => set('ship.radius', v)} />
        </section>

        <section className="sc-dev-section">
          <h4>Disparo</h4>
          <NumberField label="Velocidad bala" value={CONFIG.bullets.speed} onChange={v => set('bullets.speed', v)} />
          <NumberField label="Duración (s)" value={CONFIG.bullets.lifetime} onChange={v => set('bullets.lifetime', v)} />
          <NumberField label="Cadencia (s)" value={CONFIG.bullets.cooldown} onChange={v => set('bullets.cooldown', v)} />
          <NumberField label="Daño" value={CONFIG.bullets.damage} onChange={v => set('bullets.damage', v)} min={0} />
        </section>

        <section className="sc-dev-section">
          <h4>Misiles</h4>
          <NumberField label="Velocidad" value={CONFIG.missiles.speed} onChange={v => set('missiles.speed', v)} />
          <NumberField label="Vida (s)" value={CONFIG.missiles.lifetime} onChange={v => set('missiles.lifetime', v)} />
          <NumberField label="Cadencia (s)" value={CONFIG.missiles.cooldown} onChange={v => set('missiles.cooldown', v)} />
          <NumberField label="Daño" value={CONFIG.missiles.damage} onChange={v => set('missiles.damage', v)} min={0} />
        </section>

        <section className="sc-dev-section">
          <h4>Cuerpo celeste</h4>
          <NumberField label="Fuerza gravedad" value={CONFIG.gravity.g} onChange={v => set('gravity.g', v)} />
          <NumberField label="Radio" value={CONFIG.gravity.radius} onChange={v => set('gravity.radius', v)} />
          <NumberField label="Daño a enemigos" value={CONFIG.gravity.enemyDamage} onChange={v => set('gravity.enemyDamage', v)} min={0} />
        </section>

        <section className="sc-dev-section">
          <h4>Asteroides</h4>
          <NumberField label="Cantidad" value={CONFIG.asteroids.count} onChange={v => set('asteroids.count', v)} min={0} />
          <NumberField label="Vel. mínima" value={CONFIG.asteroids.minSpeed} onChange={v => set('asteroids.minSpeed', v)} />
          <NumberField label="Vel. máxima" value={CONFIG.asteroids.maxSpeed} onChange={v => set('asteroids.maxSpeed', v)} />
          <NumberField label="Daño" value={CONFIG.asteroids.damage} onChange={v => set('asteroids.damage', v)} min={0} />
        </section>

        <section className="sc-dev-section">
          <h4>Enemigos (general)</h4>
          <NumberField label="Máximo simultáneo" value={CONFIG.enemies.maxEnemies} onChange={v => set('enemies.maxEnemies', v)} min={1} />
          <NumberField label="Rango de disparo" value={CONFIG.enemies.fireRange} onChange={v => set('enemies.fireRange', v)} />
          <NumberField label="Daño de sus balas" value={CONFIG.enemies.bulletDamage} onChange={v => set('enemies.bulletDamage', v)} min={0} />
          <NumberField label="Invulnerabilidad (s)" value={CONFIG.enemies.invulnTime} onChange={v => set('enemies.invulnTime', v)} />
          <NumberField label="Rango esquiva sol (x radio)" value={CONFIG.enemies.avoidSunRange} onChange={v => set('enemies.avoidSunRange', v)} min={0} />
          <NumberField label="Rango esquiva asteroide (x radio)" value={CONFIG.enemies.avoidAsteroidRange} onChange={v => set('enemies.avoidAsteroidRange', v)} min={0} />
          <NumberField label="Fuerza de la esquiva" value={CONFIG.enemies.avoidStrength} onChange={v => set('enemies.avoidStrength', v)} min={0} />
        </section>

        {Object.keys(CONFIG.enemies.types).map(type => (
          <section className="sc-dev-section" key={type}>
            <h4>Enemigo: {ENEMY_TYPE_LABELS[type] || type}</h4>
            <NumberField label="Vida" value={CONFIG.enemies.types[type].health} onChange={v => set(`enemies.types.${type}.health`, v)} min={1} />
            <NumberField label="Aceleración" value={CONFIG.enemies.types[type].thrust} onChange={v => set(`enemies.types.${type}.thrust`, v)} />
            <NumberField label="Vel. máxima" value={CONFIG.enemies.types[type].maxSpeed} onChange={v => set(`enemies.types.${type}.maxSpeed`, v)} />
            <NumberField label="Cadencia (s)" value={CONFIG.enemies.types[type].fireCooldown} onChange={v => set(`enemies.types.${type}.fireCooldown`, v)} />
            <NumberField label="Puntos al matarlo" value={CONFIG.scoring.perEnemy[type]} onChange={v => set(`scoring.perEnemy.${type}`, v)} min={0} />
          </section>
        ))}

        <section className="sc-dev-section">
          <h4>Tokens</h4>
          <NumberField label="Intervalo (s)" value={CONFIG.tokens.spawnInterval} onChange={v => set('tokens.spawnInterval', v)} min={1} />
          <NumberField label="Aumento por token ⚡ (fracción)" value={CONFIG.tokens.boostAmount} onChange={v => set('tokens.boostAmount', v)} min={0} />
          <NumberField label="Recarga del escudo 🛡 (s)" value={CONFIG.tokens.shieldCooldown} onChange={v => set('tokens.shieldCooldown', v)} min={0} />
          <NumberField label="Rango de recogida extra" value={CONFIG.tokens.pickupBonus} onChange={v => set('tokens.pickupBonus', v)} min={0} />
        </section>

        <section className="sc-dev-section">
          <h4>Puntuación</h4>
          <NumberField label="Por meteorito" value={CONFIG.scoring.perAsteroid} onChange={v => set('scoring.perAsteroid', v)} min={0} />
          <NumberField label="Por segundo vivo" value={CONFIG.scoring.perSecond} onChange={v => set('scoring.perSecond', v)} min={0} />
        </section>

        <section className="sc-dev-section">
          <h4>Vidas</h4>
          <NumberField label="Vidas del jugador" value={CONFIG.player.maxHits} onChange={v => set('player.maxHits', v)} min={1} />
          <NumberField label="Invulnerabilidad (s)" value={CONFIG.player.hitInvulnTime} onChange={v => set('player.hitInvulnTime', v)} />
        </section>

        <section className="sc-dev-section">
          <h4>Escalada (battle royale)</h4>
          <NumberField label="Intervalo (s)" value={CONFIG.escalation.interval} onChange={v => set('escalation.interval', v)} min={1} />
          <NumberField label="Crece el sol (fracción)" value={CONFIG.escalation.radiusGrowth} onChange={v => set('escalation.radiusGrowth', v)} min={0} />
          <NumberField label="Crece la gravedad (fracción)" value={CONFIG.escalation.gravityGrowth} onChange={v => set('escalation.gravityGrowth', v)} min={0} />
        </section>
      </div>

      <button className="sc-devconsole-reset" onClick={handleReset}>Restaurar valores por defecto</button>
    </div>
  )
}
