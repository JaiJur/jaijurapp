import { useRef, useEffect, useState, useCallback } from 'react'
import { useTokenSocket } from '../../../hooks/useTokenSocket'
import './TokenLayer.css'

/**
 * TokenLayer — capa SVG superpuesta al canvas del mapa.
 * Muestra los tokens de los jugadores y permite arrastrarlos.
 *
 * Props:
 *   partyId     {string|null}  ID de la party
 *   userId      {number|null}  ID del usuario actual
 *   isMaster    {boolean}      Si el usuario es DM
 *   canvasW     {number}       Ancho del canvas del mapa
 *   canvasH     {number}       Alto del canvas del mapa
 *   characters  {Array}        Lista de personajes (para avatar/color)
 *   readOnly    {boolean}      Si true, no permite arrastrar (viewer externo)
 */
export default function TokenLayer({ partyId, userId, isMaster, canvasW, canvasH, characters = [], readOnly = false }) {
  const { tokens, connected, moveToken, initToken, removeToken, setTokenVisible } =
    useTokenSocket(partyId, userId, !!partyId && !!userId)

  const svgRef = useRef(null)
  const draggingRef = useRef(null) // { charId, startX, startY, origX, origY }
  const [dragPos, setDragPos] = useState({}) // { [charId]: { x, y } } — posición local durante drag

  // ── Helpers ──────────────────────────────────────────────────────────────
  function getCharData(charId) {
    return characters.find(c => String(c.id) === String(charId))
  }

  function tokenColor(token) {
    const ch = getCharData(token.charId)
    return ch?.tokenColor || token.color || '#6366f1'
  }

  function tokenInitials(token) {
    const name = token.charName || '?'
    return name.slice(0, 2).toUpperCase()
  }

  function tokenAvatar(token) {
    // Primero el portrait que viene en el token (para enemigos), luego el del personaje en DB
    if (token.portrait) return token.portrait
    const ch = getCharData(token.charId)
    return ch?.portrait || null
  }

  // ¿Puede este usuario mover este token?
  function canDrag(token) {
    if (readOnly) return false
    if (isMaster) return true
    return token.userId === userId
  }

  // ── Drag handlers ────────────────────────────────────────────────────────
  function getSVGPoint(e) {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const scaleX = canvasW / rect.width
    const scaleY = canvasH / rect.height
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    }
  }

  function onPointerDown(e, token) {
    if (!canDrag(token)) return
    e.preventDefault()
    e.stopPropagation()
    const pos = getSVGPoint(e)
    const cx = dragPos[token.charId]?.x ?? token.x
    const cy = dragPos[token.charId]?.y ?? token.y
    draggingRef.current = {
      charId: token.charId,
      startX: pos.x, startY: pos.y,
      origX: cx, origY: cy
    }
  }

  const onPointerMove = useCallback((e) => {
    if (!draggingRef.current) return
    const pos = getSVGPoint(e)
    const { charId, startX, startY, origX, origY } = draggingRef.current
    setDragPos(prev => ({
      ...prev,
      [charId]: { x: origX + pos.x - startX, y: origY + pos.y - startY }
    }))
  }, [canvasW, canvasH])

  const onPointerUp = useCallback((e) => {
    if (!draggingRef.current) return
    const { charId } = draggingRef.current
    const pos = dragPos[charId]
    if (pos) {
      moveToken(charId, Math.round(pos.x), Math.round(pos.y))
    }
    draggingRef.current = null
  }, [dragPos, moveToken])

  useEffect(() => {
    window.addEventListener('mousemove', onPointerMove)
    window.addEventListener('mouseup', onPointerUp)
    window.addEventListener('touchmove', onPointerMove, { passive: false })
    window.addEventListener('touchend', onPointerUp)
    return () => {
      window.removeEventListener('mousemove', onPointerMove)
      window.removeEventListener('mouseup', onPointerUp)
      window.removeEventListener('touchmove', onPointerMove)
      window.removeEventListener('touchend', onPointerUp)
    }
  }, [onPointerMove, onPointerUp])

  // ── Render ────────────────────────────────────────────────────────────────
  const tokenList = Object.values(tokens)

  if (!partyId) return null

  return (
    <svg
      ref={svgRef}
      className="token-layer"
      viewBox={`0 0 ${canvasW} ${canvasH}`}
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {tokenList.map(token => {
          const avatar = tokenAvatar(token)
          if (!avatar) return null
          return (
            <clipPath key={`clip-${token.charId}`} id={`clip-${token.charId}`}>
              <circle cx="0" cy="0" r="20" />
            </clipPath>
          )
        })}
      </defs>

      {tokenList.map(token => {
        if (!token.visible && !isMaster) return null

        const x = dragPos[token.charId]?.x ?? token.x ?? 100
        const y = dragPos[token.charId]?.y ?? token.y ?? 100
        const color = tokenColor(token)
        const avatar = tokenAvatar(token)
        const isDragging = draggingRef.current?.charId === token.charId
        const hidden = !token.visible

        return (
          <g
            key={token.charId}
            transform={`translate(${x}, ${y})`}
            className={`token-group ${canDrag(token) ? 'token-draggable' : ''} ${isDragging ? 'token-dragging' : ''} ${hidden ? 'token-hidden' : ''}`}
            onMouseDown={e => onPointerDown(e, token)}
            onTouchStart={e => onPointerDown(e, token)}
          >
            {/* Sombra */}
            <circle cx="2" cy="3" r="22" fill="rgba(0,0,0,0.4)" />

            {/* Fondo de color / avatar */}
            {avatar ? (
              <>
                <circle cx="0" cy="0" r="20" fill={color} stroke="white" strokeWidth="2.5" />
                <image
                  href={avatar}
                  x="-20" y="-20" width="40" height="40"
                  clipPath={`url(#clip-${token.charId})`}
                  preserveAspectRatio="xMidYMid slice"
                />
              </>
            ) : (
              <circle cx="0" cy="0" r="20" fill={color} stroke="white" strokeWidth="2.5" />
            )}

            {/* Iniciales si no hay avatar */}
            {!avatar && (
              <text
                x="0" y="0"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="12"
                fontWeight="bold"
                fill="white"
                style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'sans-serif' }}
              >
                {tokenInitials(token)}
              </text>
            )}

            {/* Nombre flotante */}
            <text
              x="0" y="28"
              textAnchor="middle"
              fontSize="9"
              fontWeight="600"
              fill="white"
              stroke="rgba(0,0,0,0.85)"
              strokeWidth="2.5"
              paintOrder="stroke"
              style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'sans-serif' }}
            >
              {token.charName}
            </text>

            {/* Indicador de oculto (solo visible para master) */}
            {hidden && (
              <text x="18" y="-18" fontSize="14" style={{ pointerEvents: 'none' }}>👁‍🗨</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
