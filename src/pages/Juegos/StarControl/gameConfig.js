// Configuración central del juego: un único objeto mutable que leen todos
// los hooks en tiempo real (no son constantes fijas), así la consola de
// desarrollador puede cambiar valores en caliente sin recargar la página.
// Se persiste en localStorage para no perder la afinación entre sesiones.

const STORAGE_KEY = 'sc_devconfig'

export const DEFAULT_CONFIG = {
  view: { zoom: 0.5 }, // cámara alejada: 0.5 = todo se ve a mitad de tamaño (más mapa visible)
  ship: { thrust: 220, rotationSpeed: 3.2, maxSpeed: 600, radius: 12 },
  bullets: { speed: 500, lifetime: 1.4, cooldown: 0.28, radius: 3, damage: 1 },
  missiles: { speed: 700, lifetime: 20, cooldown: 20, hitRadius: 6, damage: 1 },
  gravity: { g: 2.6e7, radius: 140, enemyDamage: 1 },
  asteroids: { count: 20, minSpeed: 20, maxSpeed: 70, minRadius: 16, maxRadius: 32, damage: 1 },
  enemies: {
    maxEnemies: 5,
    rotationSpeed: 3.2,
    minApproachDist: 260,
    fireRange: 900,
    bulletDamage: 1,
    invulnTime: 1.5,
    avoidSunRange: 3,        // detecta el sol como peligro dentro de N veces su radio
    avoidAsteroidRange: 4,   // detecta un asteroide como peligro dentro de N veces su radio
    avoidStrength: 2.5,      // cuánto pesa esquivar frente a perseguir al jugador
    types: {
      triangle: { health: 3, thrust: 220, maxSpeed: 600, shots: 1, radius: 12, fireCooldown: 0.28 },
      square:   { health: 5, thrust: 130, maxSpeed: 340, shots: 1, radius: 17, fireCooldown: 0.34 },
      pentagon: { health: 5, thrust: 200, maxSpeed: 560, shots: 2, radius: 17, fireCooldown: 0.30 },
    },
  },
  tokens: { spawnInterval: 60, boostAmount: 0.33, shieldCooldown: 5, pickupBonus: 30 }, // boostAmount: fracción que suma la aceleración por cada token ⚡ (0.33 = +33%); shieldCooldown: segundos de recarga del escudo tras bloquear un impacto; pickupBonus: rango extra (px) para poder recogerlos sin tocarlos justo
  scoring: {
    perAsteroid: 5,          // meteorito
    perEnemy: { triangle: 15, square: 30, pentagon: 50 }, // caza / acorazado / bombardero
    perSecond: 1,            // puntos por cada segundo de supervivencia
  },
  player: { maxHits: 3, hitInvulnTime: 1.5 },
  // Escalada estilo "battle royale": cada "interval" segundos (mismo ritmo
  // que el ciclo de aparición de tokens, por defecto) el sol crece y su
  // gravedad se intensifica, para presionar cada vez más la partida.
  escalation: { interval: 60, radiusGrowth: 0.10, gravityGrowth: 0.10 },
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function mergeDeep(base, override) {
  const out = { ...base }
  for (const k of Object.keys(override || {})) {
    if (override[k] && typeof override[k] === 'object' && !Array.isArray(override[k])) {
      out[k] = mergeDeep(base[k] || {}, override[k])
    } else {
      out[k] = override[k]
    }
  }
  return out
}

function loadInitial() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (saved) return mergeDeep(DEFAULT_CONFIG, saved)
  } catch { /* localStorage no disponible o corrupto, usamos defaults */ }
  return deepClone(DEFAULT_CONFIG)
}

// Objeto mutable único: todos los hooks importan esta misma referencia y
// leen sus campos en cada frame, así que cambiarlos aquí se refleja al instante.
export const CONFIG = loadInitial()

export function saveConfig() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(CONFIG)) } catch { /* ignore */ }
}

export function resetConfig() {
  const fresh = deepClone(DEFAULT_CONFIG)
  for (const key of Object.keys(CONFIG)) delete CONFIG[key]
  Object.assign(CONFIG, fresh)
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}
