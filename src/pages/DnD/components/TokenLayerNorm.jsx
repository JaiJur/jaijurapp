import { useRef, useEffect, useState, useCallback } from 'react'
import { useTokenSocket } from '../../../hooks/useTokenSocket'
import './TokenLayer.css'

/**
 * TokenLayerNorm — igual que TokenLayer pero con coordenadas NORMALIZADAS (0.0–1.0).
 * Los tokens se posicionan como fracción del tamaño real del canvas en pantalla.
 * Esto garantiza que x:0.5 y:0.5 es siempre el centro exacto, en cualquier resolución.
 *
 * Props:
 *   partyId     {string|null}
 *   userId      {number|null}
 *   isMaster    {boolean}
 *   canvasRef   {ref}          ref al elemento <canvas> del mapa (para medir su tamaño real)
 *   characters  {Array}
 */
export default function TokenLayerNorm({ partyId, userId, isMaster, canvasRef, mapW = 1600, mapH = 1000, characters = [] }) {
  const { tokens, connected, moveToken, initToken, removeToken, setTokenVisible } =
    useTokenSocket(partyId, userId, !!partyId && !!userId)

  // Tamaño real del canvas en píxeles CSS
  const [canvasRect, setCanvasRect] = useState({ width: 1, height: 1, left: 0, top: 0 })
  const svgRef = useRef(null)
  const draggingRef = useRef(null)
  const [dragPos, setDragPos] = useState({})

  // ResizeObserver: medir el canvas real en pantalla
  useEffect(() => {
    const el = canvasRef?.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      console.log('[TokenNorm] canvas rect:', r.width, r.height, r.left, r.top)
      setCanvasRect({ width: r.width, height: r.height, left: r.left, top: r.top })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    document.addEventListener('fullscreenchange', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
      document.removeEventListener('fullscreenchange', update)
    }
  }, [canvasRef])

  // ── Helpers ──────────────────────────────────────────────────────────────
  function getChar(charId) { return characters.find(c => String(c.id) === String(charId)) }
  function tokenColor(t) { return getChar(t.charId)?.tokenColor || t.color || '#6366f1' }
  function tokenInitials(t) { return (t.charName || '?').slice(0, 2).toUpperCase() }
  function tokenAvatar(t) {
    if (t.portrait) return t.portrait
    return getChar(t.charId)?.portrait || null
  }
  function canDrag(t) {
    if (isMaster) return true
    return t.userId === userId
  }

  // Normalizar coords: si x > 1 son píxeles del canvas, convertir a 0-1
  function toNorm(x, y) {
    if (x > 1 || y > 1) return { x: x / mapW, y: y / mapH }
    return { x, y }
  }

  // Coordenadas normalizadas → píxeles CSS en pantalla
  function normToScreen(nx, ny) {
    return {
      x: nx * canvasRect.width,
      y: ny * canvasRect.height
    }
  }

  // Píxeles de pantalla → normalizadas
  function screenToNorm(px, py) {
    return {
      x: Math.max(0, Math.min(1, px / canvasRect.width)),
      y: Math.max(0, Math.min(1, py / canvasRect.height))
    }
  }

  // ── Drag ─────────────────────────────────────────────────────────────────
  function getScreenPoint(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: clientX - canvasRect.left,
      y: clientY - canvasRect.top
    }
  }

  function onPointerDown(e, token) {
    if (!canDrag(token)) return
    e.preventDefault(); e.stopPropagation()
    const sp = getScreenPoint(e)
    const cur = dragPos[token.charId]
      ? normToScreen(dragPos[token.charId].x, dragPos[token.charId].y)
      : normToScreen(...Object.values(toNorm(token.x ?? 0.5, token.y ?? 0.5)))
    draggingRef.current = {
      charId: token.charId,
      startSX: sp.x, startSY: sp.y,
      origSX: cur.x, origSY: cur.y
    }
  }

  const onPointerMove = useCallback((e) => {
    if (!draggingRef.current) return
    const sp = getScreenPoint(e)
    const { charId, startSX, startSY, origSX, origSY } = draggingRef.current
    const newSX = origSX + sp.x - startSX
    const newSY = origSY + sp.y - startSY
    const norm = screenToNorm(newSX, newSY)
    setDragPos(prev => ({ ...prev, [charId]: norm }))
  }, [canvasRect])

  const onPointerUp = useCallback(() => {
    if (!draggingRef.current) return
    const { charId } = draggingRef.current
    const pos = dragPos[charId]
    if (pos) moveToken(charId, pos.x, pos.y)
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
  if (!partyId) return null
  const tokenList = Object.values(tokens)
  console.log('[TokenNorm] render — partyId:', partyId, 'tokens:', tokenList.length, 'canvasRect:', canvasRect)
  const R = 20  // radio del token en px CSS

  return (
    <div
      className="token-layer-norm"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 3,
      }}
    >
      {tokenList.map(token => {
        if (!token.visible && !isMaster) return null
        const rawPos = dragPos[token.charId] ?? toNorm(token.x ?? 0.5, token.y ?? 0.5)
        const pos = rawPos
        const { x: sx, y: sy } = normToScreen(pos.x, pos.y)
        const color = tokenColor(token)
        const avatar = tokenAvatar(token)
        const hidden = !token.visible
        const draggable = canDrag(token)
        const isDragging = draggingRef.current?.charId === token.charId

        return (
          <div
            key={token.charId}
            className={`token-norm ${draggable ? 'token-draggable' : ''} ${isDragging ? 'token-dragging' : ''} ${hidden ? 'token-hidden' : ''}`}
            style={{
              position: 'absolute',
              left: sx,
              top: sy,
              transform: 'translate(-50%, -50%)',
              pointerEvents: draggable ? 'auto' : 'none',
              width: R * 2,
              height: R * 2,
            }}
            onMouseDown={e => onPointerDown(e, token)}
            onTouchStart={e => onPointerDown(e, token)}
          >
            {/* Círculo de fondo */}
            <div className="token-norm-circle" style={{ background: color }}>
              {avatar
                ? <img src={avatar} alt={token.charName} className="token-norm-img" />
                : <span className="token-norm-initials">{tokenInitials(token)}</span>
              }
            </div>
            {/* Sombra */}
            <div className="token-norm-shadow" />
            {/* Nombre */}
            <div className="token-norm-name">{token.charName}</div>
            {/* Oculto */}
            {hidden && <div className="token-norm-hidden">👁‍🗨</div>}
          </div>
        )
      })}
    </div>
  )
}
