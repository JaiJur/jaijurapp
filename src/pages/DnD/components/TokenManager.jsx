import './TokenManager.css'

const TOKEN_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6'
]
const ENEMY_COLORS = [
  '#ef4444', '#f97316', '#dc2626', '#b91c1c',
  '#e11d48', '#c2410c', '#9f1239', '#7f1d1d'
]

export default function TokenManager({ party, characters, tokens, connected, onInit, onRemove, onSetVisible }) {
  if (!party) return null

  const members = (party.members || [])
    .map(id => characters.find(c => c.id === id))
    .filter(Boolean)

  const enemies = party.enemies || []

  function isOnMap(tokenId) {
    return !!tokens[String(tokenId)]
  }

  function handlePlace(tokenId, name, color, portrait, isEnemy = false) {
    onInit(String(tokenId), 400, 300, color, name, portrait, isEnemy)
  }

  return (
    <div className="token-manager">
      <div className="token-manager-header">
        <span className="token-manager-title">🪙 Tokens en mapa</span>
        <span className={`token-manager-ws ${connected ? 'token-ws-ok' : 'token-ws-off'}`}>
          {connected ? '● EN VIVO' : '○ desconectado'}
        </span>
      </div>

      {/* ── Personajes ── */}
      {members.length > 0 && (
        <>
          <div className="token-section-label">Personajes</div>
          <div className="token-manager-list">
            {members.map((char, idx) => {
              const onMap = isOnMap(char.id)
              const tok = tokens[String(char.id)]
              const color = tok?.color || TOKEN_COLORS[idx % TOKEN_COLORS.length]
              return (
                <TokenRow
                  key={char.id}
                  tokenId={char.id}
                  name={char.name}
                  portrait={char.portrait}
                  color={color}
                  onMap={onMap}
                  tok={tok}
                  onPlace={() => handlePlace(char.id, char.name, TOKEN_COLORS[idx % TOKEN_COLORS.length], char.portrait, false)}
                  onRemove={() => onRemove(String(char.id))}
                  onSetVisible={(v) => onSetVisible(String(char.id), v)}
                />
              )
            })}
          </div>
        </>
      )}

      {/* ── Enemigos ── */}
      {enemies.length > 0 && (
        <>
          <div className="token-section-label token-section-enemy">Enemigos</div>
          <div className="token-manager-list">
            {enemies.map((enemy, idx) => {
              const tokenId = `e_${enemy.id}`
              const onMap = isOnMap(tokenId)
              const tok = tokens[tokenId]
              const color = tok?.color || ENEMY_COLORS[idx % ENEMY_COLORS.length]
              return (
                <TokenRow
                  key={enemy.id}
                  tokenId={tokenId}
                  name={enemy.label}
                  portrait={enemy.portrait}
                  color={color}
                  onMap={onMap}
                  tok={tok}
                  isEnemy
                  onPlace={() => handlePlace(tokenId, enemy.label, ENEMY_COLORS[idx % ENEMY_COLORS.length], enemy.portrait, true)}
                  onRemove={() => onRemove(tokenId)}
                  onSetVisible={(v) => onSetVisible(tokenId, v)}
                />
              )
            })}
          </div>
        </>
      )}

      {members.length === 0 && enemies.length === 0 && (
        <p className="token-manager-empty">No hay personajes ni enemigos en esta party</p>
      )}
    </div>
  )
}

function TokenRow({ name, portrait, color, onMap, tok, isEnemy, onPlace, onRemove, onSetVisible }) {
  return (
    <div className={`token-member-row ${onMap ? 'token-member-active' : ''} ${isEnemy ? 'token-member-enemy' : ''}`}>
      <div className="token-medallion" style={{ background: color }} title={name}>
        {portrait
          ? <img src={portrait} alt={name} />
          : <span>{name.slice(0, 2).toUpperCase()}</span>
        }
      </div>
      <span className="token-member-name">{name}</span>
      <div className="token-member-actions">
        {onMap ? (
          <>
            <button
              className={`token-btn ${tok?.visible === false ? 'token-btn-hidden' : ''}`}
              title={tok?.visible === false ? 'Mostrar' : 'Ocultar'}
              onClick={() => onSetVisible(tok?.visible === false)}
            >
              {tok?.visible === false ? '👁‍🗨' : '👁'}
            </button>
            <button className="token-btn token-btn-remove" title="Quitar del mapa" onClick={onRemove}>✕</button>
          </>
        ) : (
          <button className="token-btn token-btn-place" title="Colocar en el mapa" onClick={onPlace}>+ Colocar</button>
        )}
      </div>
    </div>
  )
}
