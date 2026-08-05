import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { usePhysics, WORLD_SIZE } from './usePhysics'
import { useControls } from './useControls'
import { useGameSocket } from './useGameSocket'
import { useStarfield } from './useStarfield'
import { useBullets } from './useBullets'
import { useAsteroids } from './useAsteroids'
import { useTrail } from './useTrail'
import { useExplosions } from './useExplosions'
import { useMissiles } from './useMissiles'
import { useKeyBindings } from './useKeyBindings'
import { useGravityBody } from './useGravityBody'
import { useEnemies } from './useEnemies'
import { useTokens } from './useTokens'
import { gravityAccel } from './gravity'
import { CONFIG } from './gameConfig'
import KeyBindModal from './KeyBindModal'
import MobileControls from './MobileControls'
import DevConsole from './DevConsole'
import './StarControl.css'

const SHIP_SIZE = 18
const SHIP_COLOR = '#4da3ff'
const ENEMY_COLOR = '#ff3b3b'

export default function StarControl() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const sizeRef = useRef({ w: 800, h: 600 })

  const physics = usePhysics()
  const { binds, bindsRef, save: saveBinds } = useKeyBindings()
  const { controls, setMobileControl } = useControls(bindsRef)
  // Multijugador desactivado de momento: cada jugador ve solo su propia nave.
  // (para reactivarlo, basta con volver a poner el 3er argumento a true)
  const { ships, sendState } = useGameSocket(user?.id, 'main', false)
  const shipsRef = useRef(ships)
  shipsRef.current = ships
  const stars = useStarfield()
  const bullets = useBullets()
  const asteroids = useAsteroids()
  const trail = useTrail()
  const explosions = useExplosions()
  const missiles = useMissiles()
  const gravityBodyRef = useGravityBody()
  const enemies = useEnemies()
  const enemyBullets = useBullets()
  const tokens = useTokens()

  const [score, setScore] = useState(0)
  const [hits, setHits] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [scoreSaved, setScoreSaved] = useState(false)
  const [finalRank, setFinalRank] = useState(null) // { rank, total } de la partida que acaba de terminar
  const [configOpen, setConfigOpen] = useState(true)
  const [devOpen, setDevOpen] = useState(false)
  const scoreRef = useRef(0)
  const hitsRef = useRef(0)
  const [maxHits, setMaxHits] = useState(CONFIG.player.maxHits)
  const maxHitsRef = useRef(CONFIG.player.maxHits) // puede crecer por encima del valor base recogiendo "+" con la vida ya llena
  const gameOverRef = useRef(false)
  const configOpenRef = useRef(true)
  const invulnRef = useRef(CONFIG.player.hitInvulnTime) // invulnerable un instante al empezar
  const [shotCount, setShotCount] = useState(1)
  const shotCountRef = useRef(1)
  const rangeMultiplierRef = useRef(1) // cada x2 recogido reduce el alcance de la bala un 10% (acumulativo)
  const [boost, setBoost] = useState(1)
  const boostRef = useRef(1)
  const shieldUnlockedRef = useRef(false)
  const shieldCooldownRef = useRef(0)
  const survivalRef = useRef(0) // acumulador para el punto por segundo de supervivencia
  const totalTimeRef = useRef(0) // segundos totales de partida, para el ranking

  // Escalada battle royale: valores base del sol/gravedad al empezar la
  // partida (para poder crecer desde ahí y luego resetear al reiniciar)
  const baseGravityRadiusRef = useRef(CONFIG.gravity.radius)
  const baseGravityGRef = useRef(CONFIG.gravity.g)
  const escalationTimerRef = useRef(CONFIG.escalation.interval)
  const escalationCycleRef = useRef(0)
  const gameStartedRef = useRef(false) // false = el próximo "Empezar" es un inicio nuevo (recaptura la base)

  const isMaster = user?.role === 'master'

  const handleStart = useCallback((newBinds) => {
    saveBinds(newBinds)
    configOpenRef.current = false
    setConfigOpen(false)
    // Solo si es un inicio nuevo (no al reanudar tras pausar con ⚙) toma como
    // base los valores actuales del sol/gravedad y arranca la escalada de cero.
    if (!gameStartedRef.current) {
      baseGravityRadiusRef.current = CONFIG.gravity.radius
      baseGravityGRef.current = CONFIG.gravity.g
      escalationTimerRef.current = CONFIG.escalation.interval
      escalationCycleRef.current = 0
      gameStartedRef.current = true
    }
    try {
      const el = rootRef.current
      const req = el?.requestFullscreen || el?.webkitRequestFullscreen || el?.msRequestFullscreen
      req?.call(el)
    } catch { /* pantalla completa no soportada, seguimos sin ella */ }
  }, [saveBinds])

  const handleExit = useCallback(() => {
    try {
      const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen
      if (document.fullscreenElement || document.webkitFullscreenElement) exit?.call(document)
    } catch { /* ignore */ }
    navigate('/juegos')
  }, [navigate])

  const addScore = useCallback((n) => {
    scoreRef.current += n
    setScore(scoreRef.current)
  }, [])

  // Envía la puntuación final al servidor para el ranking. El Game Over no
  // espera a esto (no bloquea), pero el ranking en pantalla sí espera a que
  // termine (setScoreSaved) para no pedirlo antes de que se haya guardado.
  const submitScore = useCallback(() => {
    if (!user?.id) { setScoreSaved(true); return }
    fetch('/api/starcontrol/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': String(user.id) },
      body: JSON.stringify({ score: scoreRef.current, time: Math.floor(totalTimeRef.current) }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setFinalRank({ rank: data.rank, total: data.total }) })
      .catch(() => { /* si falla el envío, no mostramos posición, pero no bloqueamos el Game Over */ })
      .finally(() => setScoreSaved(true))
  }, [user])

  // Si el escudo está desbloqueado y cargado, bloquea el impacto (asteroide o
  // bala) y entra en recarga. Devuelve true si absorbió el golpe.
  const tryShieldBlock = useCallback(() => {
    if (shieldUnlockedRef.current && shieldCooldownRef.current <= 0) {
      shieldCooldownRef.current = CONFIG.tokens.shieldCooldown
      return true
    }
    return false
  }, [])

  const takeDamage = useCallback((amount = 1) => {
    hitsRef.current += amount
    setHits(hitsRef.current)
    invulnRef.current = CONFIG.player.hitInvulnTime
    if (hitsRef.current >= maxHitsRef.current) {
      gameOverRef.current = true
      setGameOver(true)
      submitScore()
    }
  }, [submitScore])

  // Muerte instantánea (p.ej. al colisionar con el cuerpo celeste): no pasa
  // por el sistema de vidas/invulnerabilidad, va directa a Game Over.
  const triggerGameOver = useCallback(() => {
    hitsRef.current = maxHitsRef.current
    setHits(maxHitsRef.current)
    gameOverRef.current = true
    setGameOver(true)
    submitScore()
  }, [submitScore])

  // Daño a un enemigo concreto: por asteroides, la estrella o disparos del
  // jugador. Al llegar a la vida de su tipo reaparece en otro punto del
  // mapa; solo suma puntos (según el tipo) y suelta un token (aleatorio) si
  // el golpe final vino de un disparo del jugador (no si murió por el entorno).
  const damageEnemy = useCallback((id, amount, fromPlayer) => {
    const result = enemies.damage(id, amount)
    if (result?.died) {
      explosions.spawn(result.x, result.y)
      if (fromPlayer) {
        const reward = CONFIG.scoring.perEnemy[result.type] ?? CONFIG.scoring.perEnemy.triangle
        addScore(reward)
        tokens.spawnRandomAt(result.x, result.y)
      }
    }
  }, [enemies, explosions, addScore, tokens])

  // Al recoger cualquier token aparece un enemigo más (hasta el máximo)
  const onTokenCollected = useCallback(() => {
    enemies.spawnOne()
  }, [enemies])

  const handleRestart = useCallback(() => {
    scoreRef.current = 0; setScore(0)
    hitsRef.current = 0; setHits(0)
    maxHitsRef.current = CONFIG.player.maxHits; setMaxHits(CONFIG.player.maxHits)
    gameOverRef.current = false; setGameOver(false)
    setScoreSaved(false)
    setFinalRank(null)
    invulnRef.current = CONFIG.player.hitInvulnTime
    shotCountRef.current = 1; setShotCount(1)
    rangeMultiplierRef.current = 1
    boostRef.current = 1; setBoost(1)
    shieldUnlockedRef.current = false
    shieldCooldownRef.current = 0
    survivalRef.current = 0
    totalTimeRef.current = 0
    // La escalada battle royale vuelve a su base (misma base, la partida
    // sigue "iniciada" porque Reiniciar reanuda al instante sin pasar por
    // el modal; "Volver al inicio" es quien marca que hay que recapturar)
    CONFIG.gravity.radius = baseGravityRadiusRef.current
    CONFIG.gravity.g = baseGravityGRef.current
    escalationTimerRef.current = CONFIG.escalation.interval
    escalationCycleRef.current = 0
    physics.reset()
    bullets.reset()
    asteroids.reset()
    trail.reset()
    explosions.reset()
    missiles.reset()
    enemies.reset()
    enemyBullets.reset()
    tokens.reset()
  }, [physics, bullets, asteroids, trail, explosions, missiles, enemies, enemyBullets, tokens])

  // Reinicia la partida y vuelve a mostrar el modal de inicio (STAR CONTROL)
  const handleBackToStart = useCallback(() => {
    handleRestart()
    gameStartedRef.current = false // el próximo "Empezar" debe recapturar la base de la escalada
    configOpenRef.current = true
    setConfigOpen(true)
  }, [handleRestart])

  // Intenta bloquear la orientación a horizontal (funciona en Android/Chrome
  // sobre todo en PWA instalada; en iOS Safari no está soportado y falla en
  // silencio — para eso está el aviso de "gira tu dispositivo" de abajo).
  const [isPortrait, setIsPortrait] = useState(false)
  // Dispositivo táctil: oculta la configuración de teclas (no aplica, se juega con botones)
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait) and (pointer: coarse)')
    const update = () => setIsPortrait(mq.matches)
    update()
    mq.addEventListener('change', update)

    const touchMq = window.matchMedia('(pointer: coarse)')
    const updateTouch = () => setIsTouch(touchMq.matches)
    updateTouch()
    touchMq.addEventListener('change', updateTouch)

    async function tryLock() {
      try {
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock('landscape')
        }
      } catch { /* no soportado, ignoramos */ }
    }
    tryLock()

    return () => {
      mq.removeEventListener('change', update)
      touchMq.removeEventListener('change', updateTouch)
      try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock() } catch { /* ignore */ }
    }
  }, [])

  // Al salir de la página, aseguramos que no quede la pantalla completa activa
  useEffect(() => {
    return () => {
      try {
        const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen
        if (document.fullscreenElement || document.webkitFullscreenElement) exit?.call(document)
      } catch { /* ignore */ }
      // Deja la gravedad del sol en su base, para que si se vuelve a entrar
      // sin recargar la página no se herede una escalada ya en marcha.
      CONFIG.gravity.radius = baseGravityRadiusRef.current
      CONFIG.gravity.g = baseGravityGRef.current
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    const ctx = canvas.getContext('2d')

    function resize() {
      const dpr = window.devicePixelRatio || 1
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      sizeRef.current = { w, h }
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    let rafId, lastTime = null, lastSend = 0

    function frame(time) {
      if (lastTime == null) lastTime = time
      const dt = Math.min((time - lastTime) / 1000, 0.05)
      lastTime = time

      const s = physics.stateRef.current

      if (!gameOverRef.current && !configOpenRef.current) {
        const body = gravityBodyRef.current
        const shipAccel = gravityAccel(body, s.x, s.y)
        physics.step(dt, controls.current, shipAccel, boostRef.current)
        bullets.step(dt, controls.current.fire, s, body, shotCountRef.current, rangeMultiplierRef.current)
        asteroids.step(dt, body)
        trail.step(dt, controls.current.thrust, s)
        explosions.step(dt)
        tokens.step(dt)
        missiles.step(dt, controls.current.missile, s, enemies.enemiesRef.current)

        // Escalada battle royale: cada ciclo, el sol crece y su gravedad se intensifica
        escalationTimerRef.current -= dt
        if (escalationTimerRef.current <= 0) {
          escalationTimerRef.current = CONFIG.escalation.interval
          escalationCycleRef.current += 1
          const n = escalationCycleRef.current
          CONFIG.gravity.radius = baseGravityRadiusRef.current * Math.pow(1 + CONFIG.escalation.radiusGrowth, n)
          CONFIG.gravity.g = baseGravityGRef.current * Math.pow(1 + CONFIG.escalation.gravityGrowth, n)
        }

        // Cada enemigo decide por su cuenta si dispara este frame (cooldown propio)
        const shots = enemies.step(dt, s.x, s.y, body, asteroids.asteroidsRef.current)
        shots.forEach(sh => enemyBullets.pushBullet(sh.x, sh.y, sh.vx, sh.vy))
        enemyBullets.step(dt, false, null, body) // solo mueve/expira, el disparo ya se hizo arriba

        if (invulnRef.current > 0) invulnRef.current -= dt
        if (shieldCooldownRef.current > 0) shieldCooldownRef.current -= dt
        checkCollisions()

        // Puntos por tiempo de supervivencia (1 por segundo, vía acumulador
        // para no perder precisión con el redondeo de dt entre frames)
        survivalRef.current += dt
        totalTimeRef.current += dt
        while (survivalRef.current >= 1) {
          survivalRef.current -= 1
          addScore(CONFIG.scoring.perSecond)
        }
      }

      if (time - lastSend > 66) {
        lastSend = time
        sendState({
          x: s.x, y: s.y, vx: s.vx, vy: s.vy, heading: s.heading,
          color: SHIP_COLOR, name: user?.username
        })
      }

      const { w, h } = sizeRef.current
      const missileReady = 1 - Math.max(0, Math.min(1, missiles.cooldownRef.current / CONFIG.missiles.cooldown))
      const shieldReady = shieldCooldownRef.current <= 0
      renderFrame(
        ctx, s, shipsRef.current, user?.id, w, h, stars,
        bullets.bulletsRef.current, asteroids.asteroidsRef.current,
        trail.particlesRef.current, explosions.particlesRef.current,
        gravityBodyRef.current, enemies.enemiesRef.current, enemyBullets.bulletsRef.current,
        tokens.tokensRef.current, missiles.missilesRef.current, missiles.trailRef.current,
        missileReady, shieldUnlockedRef.current, shieldReady, invulnRef.current
      )
      rafId = requestAnimationFrame(frame)
    }

    function checkCollisions() {
      const s = physics.stateRef.current
      const bulletsArr = bullets.bulletsRef.current
      const asteroidsArr = asteroids.asteroidsRef.current
      const enemiesArr = enemies.enemiesRef.current
      const shipRadius = CONFIG.ship.radius
      const bulletRadius = CONFIG.bullets.radius

      // Nave vs cuerpo celeste: muerte instantánea, sin excepción de invulnerabilidad
      const body = gravityBodyRef.current
      if (wrappedDist(s.x, s.y, body.x, body.y) < CONFIG.gravity.radius + shipRadius) {
        triggerGameOver()
        return
      }

      // Asteroide vs cuerpo celeste: el asteroide se desintegra (sin puntos, no lo destruyó el jugador)
      for (let ai = asteroidsArr.length - 1; ai >= 0; ai--) {
        const a = asteroidsArr[ai]
        if (wrappedDist(a.x, a.y, body.x, body.y) < CONFIG.gravity.radius + a.radius) {
          asteroids.removeAsteroid(a.id)
          explosions.spawn(a.x, a.y)
          asteroidsArr.splice(ai, 1) // no volver a procesarlo en el resto de comprobaciones de este frame
        }
      }

      // Cada nave enemiga vs cuerpo celeste / asteroides / balas del jugador
      for (const e of enemiesArr) {
        const eRadius = (CONFIG.enemies.types[e.type] || CONFIG.enemies.types.triangle).radius
        if (wrappedDist(e.x, e.y, body.x, body.y) < CONFIG.gravity.radius + eRadius) {
          damageEnemy(e.id, CONFIG.gravity.enemyDamage, false)
        }
        for (const a of asteroidsArr) {
          if (wrappedDist(a.x, a.y, e.x, e.y) < a.radius + eRadius) {
            damageEnemy(e.id, CONFIG.asteroids.damage, false)
            break
          }
        }
      }

      // Bala vs asteroide
      for (let bi = bulletsArr.length - 1; bi >= 0; bi--) {
        const b = bulletsArr[bi]
        for (let ai = 0; ai < asteroidsArr.length; ai++) {
          const a = asteroidsArr[ai]
          if (wrappedDist(b.x, b.y, a.x, a.y) < a.radius + bulletRadius) {
            bullets.removeBullet(bi)
            asteroids.removeAsteroid(a.id)
            explosions.spawn(a.x, a.y)
            addScore(CONFIG.scoring.perAsteroid)
            break
          }
        }
      }

      // Nave vs asteroide
      if (invulnRef.current <= 0) {
        for (const a of asteroids.asteroidsRef.current) {
          if (wrappedDist(s.x, s.y, a.x, a.y) < a.radius + shipRadius) {
            if (!tryShieldBlock()) takeDamage(CONFIG.asteroids.damage)
            break
          }
        }
      }

      // Bala del jugador vs cualquier nave enemiga: le hace daño (respawn al llegar a su vida)
      for (let bi = bulletsArr.length - 1; bi >= 0; bi--) {
        const b = bulletsArr[bi]
        let hit = false
        for (const e of enemiesArr) {
          const eRadius = (CONFIG.enemies.types[e.type] || CONFIG.enemies.types.triangle).radius
          if (wrappedDist(b.x, b.y, e.x, e.y) < eRadius + bulletRadius) {
            bullets.removeBullet(bi)
            damageEnemy(e.id, CONFIG.bullets.damage, true)
            hit = true
            break
          }
        }
        if (hit) continue
      }

      // Bala enemiga vs nave: quita vida (respeta la invulnerabilidad, pero la bala desaparece igual)
      const enemyBulletsArr = enemyBullets.bulletsRef.current
      for (let ebi = enemyBulletsArr.length - 1; ebi >= 0; ebi--) {
        const eb = enemyBulletsArr[ebi]
        if (wrappedDist(eb.x, eb.y, s.x, s.y) < shipRadius + bulletRadius) {
          enemyBullets.removeBullet(ebi)
          if (invulnRef.current <= 0 && !tryShieldBlock()) takeDamage(CONFIG.enemies.bulletDamage)
        }
      }

      // Misiles: además de perseguir a su objetivo, pueden ser interceptados
      // por el camino — asteroides, balas enemigas o el cuerpo celeste los destruyen.
      const missilesArr = missiles.missilesRef.current
      for (let mi = missilesArr.length - 1; mi >= 0; mi--) {
        const m = missilesArr[mi]
        let consumed = false

        // vs cuerpo celeste (se destruye, sin recompensa)
        if (wrappedDist(m.x, m.y, body.x, body.y) < CONFIG.gravity.radius) {
          missiles.removeMissile(m.id)
          consumed = true
        }

        // vs asteroide (se destruyen los dos, como si fuera una bala normal)
        if (!consumed) {
          for (const a of asteroids.asteroidsRef.current) {
            if (wrappedDist(m.x, m.y, a.x, a.y) < a.radius) {
              missiles.removeMissile(m.id)
              asteroids.removeAsteroid(a.id)
              explosions.spawn(a.x, a.y)
              addScore(CONFIG.scoring.perAsteroid)
              consumed = true
              break
            }
          }
        }

        // vs bala enemiga (se destruyen los dos, el misil queda "derribado")
        if (!consumed) {
          for (let ebi = 0; ebi < enemyBulletsArr.length; ebi++) {
            const eb = enemyBulletsArr[ebi]
            if (wrappedDist(m.x, m.y, eb.x, eb.y) < bulletRadius + 4) {
              missiles.removeMissile(m.id)
              enemyBullets.removeBullet(ebi)
              consumed = true
              break
            }
          }
        }

        if (consumed) continue

        // vs su objetivo asignado
        const target = enemiesArr.find(e => e.id === m.targetId)
        if (!target) continue
        const eRadius = (CONFIG.enemies.types[target.type] || CONFIG.enemies.types.triangle).radius
        if (wrappedDist(m.x, m.y, target.x, target.y) < eRadius + CONFIG.missiles.hitRadius) {
          missiles.removeMissile(m.id)
          damageEnemy(target.id, CONFIG.missiles.damage, true)
        }
      }

      // Nave vs token de power-up: lo recoge y aplica su efecto (+ un enemigo más, hasta el máximo)
      const tokensArr = tokens.tokensRef.current
      for (let ti = tokensArr.length - 1; ti >= 0; ti--) {
        const t = tokensArr[ti]
        if (wrappedDist(s.x, s.y, t.x, t.y) < t.radius + shipRadius + CONFIG.tokens.pickupBonus) {
          if (t.type === 'repair') {
            if (hitsRef.current > 0) {
              // Cura daño existente
              hitsRef.current = Math.max(0, hitsRef.current - 1)
              setHits(hitsRef.current)
            } else {
              // Ya estaba a vida completa: amplía el máximo de vidas (por encima de las 3 base)
              maxHitsRef.current += 1
              setMaxHits(maxHitsRef.current)
            }
          } else if (t.type === 'doubleShot') {
            shotCountRef.current += 1
            setShotCount(shotCountRef.current)
            rangeMultiplierRef.current *= 0.9 // cada x2 reduce el alcance de la bala un 10% (acumulativo)
          } else if (t.type === 'boost') {
            boostRef.current += CONFIG.tokens.boostAmount
            setBoost(boostRef.current)
          } else if (t.type === 'shield') {
            shieldUnlockedRef.current = true
            shieldCooldownRef.current = 0 // listo al instante
          }
          onTokenCollected()
          tokens.removeToken(t.id)
        }
      }
    }

    rafId = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="sc-root" ref={rootRef}>
      <div className="sc-canvas-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} className="sc-canvas" />

        <div className="sc-hud">
          <div className="sc-hud-score">🏆 {score}</div>
          <div className="sc-hud-right">
            <div className="sc-hud-lives">
              {Array.from({ length: maxHits }, (_, i) => (
                <span key={i} className={i < maxHits - hits ? 'sc-life on' : 'sc-life off'}>▲</span>
              ))}
            </div>
            {shotCount > 1 && <span className="sc-hud-buff">x{shotCount}</span>}
            {boost > 1 && <span className="sc-hud-buff sc-hud-buff-boost">⚡+{Math.round((boost - 1) * 100)}%</span>}
            {isMaster && (
              <button className="sc-settings-btn" onClick={() => setDevOpen(true)} title="Consola de desarrollador">🛠</button>
            )}
            {!gameOver && (
              <button
                className="sc-settings-btn"
                onClick={() => { configOpenRef.current = true; setConfigOpen(true) }}
              >⚙</button>
            )}
          </div>
        </div>

        {configOpen && (
          <KeyBindModal
            binds={binds}
            onStart={handleStart}
            onExit={handleExit}
            isTouch={isTouch}
            userId={user?.id}
            isMaster={isMaster}
            onOpenDev={() => setDevOpen(true)}
          />
        )}

        {devOpen && <DevConsole onClose={() => setDevOpen(false)} />}

        {gameOver && (
          <div className="sc-gameover">
            <div className="sc-gameover-box">
              <div className="sc-gameover-title">GAME OVER</div>
              <div className="sc-gameover-score">Puntuación final: {score}</div>
              <div className="sc-gameover-rank">
                {!scoreSaved
                  ? 'Guardando puntuación…'
                  : finalRank
                    ? (finalRank.rank
                        ? `Puesto ${finalRank.rank} de ${finalRank.total}`
                        : `Fuera del top ${finalRank.total} (no se ha guardado)`)
                    : 'No se pudo guardar la puntuación'}
              </div>
              <button className="sc-gameover-btn" onClick={handleRestart}>Reiniciar</button>
              <button className="sc-exit-btn" onClick={handleBackToStart}>Volver al inicio</button>
              <button className="sc-exit-btn" onClick={handleExit}>Salir del juego</button>
            </div>
          </div>
        )}

        {isPortrait && (
          <div className="sc-rotate-prompt">
            <div className="sc-rotate-icon">📱</div>
            <div>Gira tu dispositivo para jugar en horizontal</div>
            <button className="sc-exit-btn" onClick={handleExit}>Salir del juego</button>
          </div>
        )}

        <MobileControls setMobileControl={setMobileControl} />
      </div>
    </div>
  )
}

function wrapDelta(v, size) {
  let d = v % size
  if (d > size / 2) d -= size
  if (d < -size / 2) d += size
  return d
}

function wrappedDist(x1, y1, x2, y2) {
  const dx = wrapDelta(x2 - x1, WORLD_SIZE)
  const dy = wrapDelta(y2 - y1, WORLD_SIZE)
  return Math.hypot(dx, dy)
}

function renderFrame(ctx, s, ships, myUserId, w, h, stars, bulletsArr, asteroidsArr, trailArr, explosionArr, gravityBody, enemiesArr, enemyBulletsArr, tokensArr, missilesArr, missileTrailArr, missileReady, shieldUnlocked, shieldReady, invuln) {
  ctx.fillStyle = '#05070f'
  ctx.fillRect(0, 0, w, h)

  const ZOOM = CONFIG.view.zoom

  // A partir de aquí se dibuja con la cámara alejada: el origen (0,0) es la
  // posición de la nave, y todo (posiciones Y tamaños) se escala por ZOOM.
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.scale(ZOOM, ZOOM)

  drawStarfield(ctx, s.x, s.y, w, h, stars)

  {
    const dx = wrapDelta(gravityBody.x - s.x, WORLD_SIZE)
    const dy = wrapDelta(gravityBody.y - s.y, WORLD_SIZE)
    drawGravityBody(ctx, dx, dy, CONFIG.gravity.radius)
  }

  tokensArr.forEach(t => {
    const dx = wrapDelta(t.x - s.x, WORLD_SIZE)
    const dy = wrapDelta(t.y - s.y, WORLD_SIZE)
    drawToken(ctx, dx, dy, t.type, t.age)
  })

  trailArr.forEach(p => {
    const dx = wrapDelta(p.x - s.x, WORLD_SIZE)
    const dy = wrapDelta(p.y - s.y, WORLD_SIZE)
    drawTrailParticle(ctx, dx, dy, p.life / p.maxLife)
  })

  missileTrailArr.forEach(p => {
    const dx = wrapDelta(p.x - s.x, WORLD_SIZE)
    const dy = wrapDelta(p.y - s.y, WORLD_SIZE)
    drawMissileTrailParticle(ctx, dx, dy, p.life / p.maxLife)
  })

  asteroidsArr.forEach(a => {
    const dx = wrapDelta(a.x - s.x, WORLD_SIZE)
    const dy = wrapDelta(a.y - s.y, WORLD_SIZE)
    drawAsteroid(ctx, dx, dy, a.radius, a.rotation, a.shape)
  })

  bulletsArr.forEach(b => {
    const dx = wrapDelta(b.x - s.x, WORLD_SIZE)
    const dy = wrapDelta(b.y - s.y, WORLD_SIZE)
    drawBullet(ctx, dx, dy, '#ffd23f')
  })

  enemyBulletsArr.forEach(b => {
    const dx = wrapDelta(b.x - s.x, WORLD_SIZE)
    const dy = wrapDelta(b.y - s.y, WORLD_SIZE)
    drawBullet(ctx, dx, dy, ENEMY_COLOR)
  })

  missilesArr.forEach(m => {
    const dx = wrapDelta(m.x - s.x, WORLD_SIZE)
    const dy = wrapDelta(m.y - s.y, WORLD_SIZE)
    drawMissile(ctx, dx, dy, m.heading)
  })

  Object.entries(ships || {}).forEach(([id, ship]) => {
    if (String(id) === String(myUserId)) return
    const dx = wrapDelta(ship.x - s.x, WORLD_SIZE)
    const dy = wrapDelta(ship.y - s.y, WORLD_SIZE)
    drawShip(ctx, dx, dy, ship.heading, ship.color || '#ff6a00', false)
  })

  enemiesArr.forEach(e => {
    const dx = wrapDelta(e.x - s.x, WORLD_SIZE)
    const dy = wrapDelta(e.y - s.y, WORLD_SIZE)
    drawEnemyShip(ctx, dx, dy, e.heading, e.invuln > 0, e.type)
  })

  drawShield(ctx, 0, 0, shieldUnlocked, shieldReady)
  drawMissileCooldownBar(ctx, 0, 0, missileReady)
  drawShip(ctx, 0, 0, s.heading, SHIP_COLOR, invuln > 0)

  explosionArr.forEach(p => {
    const dx = wrapDelta(p.x - s.x, WORLD_SIZE)
    const dy = wrapDelta(p.y - s.y, WORLD_SIZE)
    drawExplosionParticle(ctx, dx, dy, p.life / p.maxLife)
  })

  ctx.restore()

  // Indicadores de borde: se dibujan SIN el zoom (tamaño de pantalla fijo,
  // son elementos de interfaz, no del mundo del juego).
  tokensArr.forEach(t => {
    const dx = wrapDelta(t.x - s.x, WORLD_SIZE)
    const dy = wrapDelta(t.y - s.y, WORLD_SIZE)
    const tx = w / 2 + dx * ZOOM, ty = h / 2 + dy * ZOOM
    const onScreen = tx >= 0 && tx <= w && ty >= 0 && ty <= h
    if (!onScreen) drawEdgeIndicator(ctx, w / 2, h / 2, dx, dy, w, h, '#4da3ff')
  })

  enemiesArr.forEach(e => {
    const dx = wrapDelta(e.x - s.x, WORLD_SIZE)
    const dy = wrapDelta(e.y - s.y, WORLD_SIZE)
    const ex = w / 2 + dx * ZOOM, ey = h / 2 + dy * ZOOM
    const onScreen = ex >= 0 && ex <= w && ey >= 0 && ey <= h
    if (!onScreen) drawEdgeIndicator(ctx, w / 2, h / 2, dx, dy, w, h, ENEMY_COLOR)
  })
}

// El mundo (WORLD_SIZE) es mucho más grande que cualquier viewport, así que
// basta un único wrap por eje (no hace falta duplicar el mundo en 9 copias).
// Se dibuja en coordenadas locales (relativas a la nave, en el origen); el
// contexto ya está trasladado/escalado por la cámara al llamar a esta función.
function drawStarfield(ctx, shipX, shipY, w, h, stars) {
  const ZOOM = CONFIG.view.zoom
  const halfW = (w / 2) / ZOOM + 5
  const halfH = (h / 2) / ZOOM + 5
  stars.forEach(star => {
    const dx = wrapDelta(star.x - shipX, WORLD_SIZE)
    const dy = wrapDelta(star.y - shipY, WORLD_SIZE)
    if (dx >= -halfW && dx <= halfW && dy >= -halfH && dy <= halfH) {
      ctx.globalAlpha = star.alpha
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(dx, dy, star.size, star.size)
    }
  })
  ctx.globalAlpha = 1
}

function drawShip(ctx, x, y, heading, color, invulnerable) {
  ctx.save()
  ctx.translate(x, y)
  if (invulnerable && Math.floor(performance.now() / 120) % 2 === 0) {
    ctx.globalAlpha = 0.35
  }
  ctx.rotate(heading)
  ctx.beginPath()
  ctx.moveTo(SHIP_SIZE, 0)
  ctx.lineTo(-SHIP_SIZE * 0.6, SHIP_SIZE * 0.6)
  ctx.lineTo(-SHIP_SIZE * 0.6, -SHIP_SIZE * 0.6)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
}

// Elige la forma según el tipo de enemigo: triángulo (básico), cuadrado
// (más vida, más lento) o pentágono (más vida, dispara 2 ráfagas).
function drawEnemyShip(ctx, x, y, heading, invulnerable, type) {
  if (type === 'square') {
    drawPolygonEnemy(ctx, x, y, heading, invulnerable, 4, 17)
  } else if (type === 'pentagon') {
    drawPolygonEnemy(ctx, x, y, heading, invulnerable, 5, 17)
  } else {
    drawShip(ctx, x, y, heading, ENEMY_COLOR, invulnerable)
  }
}

function drawPolygonEnemy(ctx, x, y, heading, invulnerable, sides, radius) {
  ctx.save()
  ctx.translate(x, y)
  if (invulnerable && Math.floor(performance.now() / 120) % 2 === 0) {
    ctx.globalAlpha = 0.35
  }
  ctx.rotate(heading)
  ctx.beginPath()
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2
    const px = Math.cos(angle) * radius
    const py = Math.sin(angle) * radius
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fillStyle = ENEMY_COLOR
  ctx.fill()
  ctx.strokeStyle = '#7a0000'
  ctx.lineWidth = 2
  ctx.stroke()
  // marca de "nariz" para ver hacia dónde apunta
  ctx.beginPath()
  ctx.moveTo(radius * 0.3, 0)
  ctx.lineTo(radius * 1.25, 0)
  ctx.strokeStyle = 'rgba(255,255,255,.7)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawAsteroid(ctx, x, y, radius, rotation, shape) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.beginPath()
  shape.forEach((p, i) => {
    const r = radius * p.r
    const px = Math.cos(p.angle) * r
    const py = Math.sin(p.angle) * r
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  })
  ctx.closePath()
  ctx.fillStyle = '#8a8577'
  ctx.strokeStyle = '#4d4a3f'
  ctx.lineWidth = 2
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function drawBullet(ctx, x, y, color) {
  ctx.beginPath()
  ctx.arc(x, y, CONFIG.bullets.radius, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
}

// Misil teledirigido: pequeño triángulo blanco con su propia estela.
function drawMissile(ctx, x, y, heading) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(heading)
  ctx.beginPath()
  ctx.moveTo(9, 0)
  ctx.lineTo(-5, 4)
  ctx.lineTo(-5, -4)
  ctx.closePath()
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.restore()
}

function drawMissileTrailParticle(ctx, x, y, t) {
  ctx.globalAlpha = t * 0.7
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x, y, 1 + 2 * t, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

// Visor de recarga del misil: barra horizontal detrás de la nave, que se
// va rellenando de izquierda a derecha a medida que se recarga.
function drawMissileCooldownBar(ctx, x, y, ready) {
  const width = 40, height = 5, offsetY = 24
  const barX = x - width / 2, barY = y + offsetY
  const frac = Math.max(0, Math.min(1, ready))

  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,.18)'
  ctx.fillRect(barX, barY, width, height)

  ctx.fillStyle = frac >= 1 ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.55)'
  ctx.fillRect(barX, barY, width * frac, height)

  ctx.strokeStyle = 'rgba(255,255,255,.35)'
  ctx.lineWidth = 1
  ctx.strokeRect(barX, barY, width, height)
  ctx.restore()
}

// Escudo: círculo alrededor de la nave. Cargado = azul claro con degradado;
// recargando = mismo círculo en azul oscuro y sin degradado. No se dibuja
// nada si el jugador todavía no ha recogido ningún token de escudo.
function drawShield(ctx, x, y, unlocked, ready) {
  if (!unlocked) return
  const radius = 30
  ctx.save()
  ctx.translate(x, y)
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)

  if (ready) {
    const glow = ctx.createRadialGradient(0, 0, radius * 0.4, 0, 0, radius)
    glow.addColorStop(0, 'rgba(160,225,255,.05)')
    glow.addColorStop(0.7, 'rgba(120,205,255,.25)')
    glow.addColorStop(1, 'rgba(120,205,255,.65)')
    ctx.fillStyle = glow
    ctx.fill()
    ctx.strokeStyle = 'rgba(190,235,255,.9)'
  } else {
    ctx.fillStyle = 'rgba(30,70,110,.25)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(40,90,130,.7)'
  }
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

// Estela del motor: degradado de claro (recién nacida) a oscuro (a punto de desaparecer).
const TRAIL_LIGHT = [255, 230, 160]
const TRAIL_DARK = [110, 35, 10]
function drawTrailParticle(ctx, x, y, t) {
  const r = TRAIL_LIGHT[0] * t + TRAIL_DARK[0] * (1 - t)
  const g = TRAIL_LIGHT[1] * t + TRAIL_DARK[1] * (1 - t)
  const b = TRAIL_LIGHT[2] * t + TRAIL_DARK[2] * (1 - t)
  ctx.globalAlpha = t * 0.85
  ctx.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`
  ctx.beginPath()
  ctx.arc(x, y, 1.5 + 3 * t, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

// Pequeña explosión estética al destruir un asteroide (sin efecto en el juego).
function drawExplosionParticle(ctx, x, y, t) {
  ctx.globalAlpha = t
  ctx.fillStyle = t > 0.5 ? '#fff2b0' : '#ff6a00'
  ctx.beginPath()
  ctx.arc(x, y, 1.5 + 3 * t, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

// Cuerpo celeste con gravedad: indestructible, con un halo que insinúa su
// campo gravitatorio.
function drawGravityBody(ctx, x, y, radius) {
  const glow = ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius * 2.4)
  glow.addColorStop(0, 'rgba(255,170,60,.85)')
  glow.addColorStop(0.4, 'rgba(255,110,30,.3)')
  glow.addColorStop(1, 'rgba(255,110,30,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, y, radius * 2.4, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = '#ff9d3d'
  ctx.fill()
  ctx.strokeStyle = '#c9600f'
  ctx.lineWidth = 3
  ctx.stroke()
}

// Flecha en el borde de la pantalla apuntando hacia una entidad (enemigo o
// token) cuando está fuera del campo de visión. (dx, dy) es su posición
// relativa a la nave, ya calculada con el wrap toroidal más corto.
function drawEdgeIndicator(ctx, cx, cy, dx, dy, w, h, color) {
  const dist = Math.hypot(dx, dy)
  if (dist < 1) return
  const ndx = dx / dist, ndy = dy / dist
  const margin = 34
  const halfW = w / 2 - margin
  const halfH = h / 2 - margin
  const scaleX = ndx !== 0 ? halfW / Math.abs(ndx) : Infinity
  const scaleY = ndy !== 0 ? halfH / Math.abs(ndy) : Infinity
  const scale = Math.min(scaleX, scaleY)
  const px = cx + ndx * scale
  const py = cy + ndy * scale
  const angle = Math.atan2(ndy, ndx)

  ctx.save()
  ctx.translate(px, py)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(14, 0)
  ctx.lineTo(-10, 8)
  ctx.lineTo(-10, -8)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.globalAlpha = 0.9
  ctx.fill()
  ctx.strokeStyle = '#00000055'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.restore()
}

// Token de power-up: círculo translúcido con un pequeño flotado vertical.
// Iconos: "+" reparación (verde), "x2" disparo doble (azul), "⚡" aceleración (amarillo).
function drawToken(ctx, x, y, type, age) {
  const bob = Math.sin(age * 2.2) * 4
  const COLORS = { repair: '#4ade80', doubleShot: '#4da3ff', boost: '#ffd23f', shield: '#7dd3fc' }
  const ICONS = { repair: '+', doubleShot: 'x2', boost: '⚡', shield: '🛡' }
  const color = COLORS[type] || '#ffffff'

  ctx.save()
  ctx.translate(x, y + bob)

  ctx.beginPath()
  ctx.arc(0, 0, 16, 0, Math.PI * 2)
  ctx.fillStyle = color + '33'
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = color
  ctx.font = 'bold 14px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(ICONS[type] || '?', 0, 1)
  ctx.restore()
}
