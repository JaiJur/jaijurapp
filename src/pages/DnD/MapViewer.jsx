import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import './MapViewer.css'

function hexCenter(col, row, size) {
  const w = size * 2; const h = Math.sqrt(3) * size
  return { x: col * w * 0.75 + size, y: row * h + (col % 2 === 1 ? h / 2 : 0) + h / 2 }
}
function hexCorners(cx, cy, size) {
  return Array.from({ length: 6 }, (_, i) => ({
    x: cx + size * Math.cos((Math.PI / 180) * (60 * i)),
    y: cy + size * Math.sin((Math.PI / 180) * (60 * i)),
  }))
}

function tracePolyPath(ctx, pts, smooth) {
  if (!pts || pts.length < 3) return
  ctx.beginPath()
  if (!smooth) {
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
  } else {
    const n = pts.length
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n]
      const p1 = pts[i]
      const p2 = pts[(i + 1) % n]
      const p3 = pts[(i + 2) % n]
      if (i === 0) ctx.moveTo(p1.x, p1.y)
      ctx.bezierCurveTo(
        p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6,
        p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6,
        p2.x, p2.y
      )
    }
  }
  ctx.closePath()
}

function texToPoints(tex) {
  if (Array.isArray(tex.points) && tex.points.length >= 3) return tex.points
  if (typeof tex.x === 'number' && typeof tex.w === 'number') {
    return [
      { x: tex.x, y: tex.y },
      { x: tex.x + tex.w, y: tex.y },
      { x: tex.x + tex.w, y: tex.y + tex.h },
      { x: tex.x, y: tex.y + tex.h },
    ]
  }
  return null
}

function pointsBbox(pts) {
  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity
  pts.forEach(p => { if(p.x<minX)minX=p.x; if(p.y<minY)minY=p.y; if(p.x>maxX)maxX=p.x; if(p.y>maxY)maxY=p.y })
  return { minX, minY, maxX, maxY }
}

export default function MapViewer() {
  const { channel: channelParam } = useParams()
  const channel = channelParam && ['main','tablet'].includes(channelParam) ? channelParam : 'main'
  const canvasRef = useRef(null)
  const [viewerState, setViewerState] = useState(null) // { mode, mapId, imageUrl, ... }
  const [map, setMap] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const imgCache = useRef({})
  const pollRef = useRef(null)
  const lastMapIdRef = useRef(null)
  const lastUpdatedRef = useRef(0)

  // ── Sound command listener ──
  const lastSoundTsRef = useRef(0)
  const audioRef = useRef(null)

  useEffect(() => {
    async function pollSound() {
      try {
        const r = await fetch('/api/dnd/sound-command')
        if (!r.ok) return
        const cmd = await r.json()
        if (!cmd || cmd.ts <= lastSoundTsRef.current) return
        lastSoundTsRef.current = cmd.ts
        // Play the sound
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        }
        const audio = new Audio(cmd.url)
        audio.volume = cmd.volume ?? 1
        audioRef.current = audio
        audio.play().catch(() => {})
      } catch {}
    }
    const iv = setInterval(pollSound, 2000)
    pollSound()
    return () => clearInterval(iv)
  }, [])

  // ── Zoom/pan para imágenes (solo canal tablet) ──
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })
  const pinchRef = useRef(null)   // { startDist, startZoom, startPan, centerX, centerY }
  const panStartRef = useRef(null) // { x, y, startPan }
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { panRef.current = pan }, [pan])

  // Reset zoom al cambiar de imagen/modo
  useEffect(() => {
    setZoom(1); setPan({ x: 0, y: 0 })
  }, [viewerState?.imageUrl, viewerState?.mode])

  function resetZoom() { setZoom(1); setPan({ x: 0, y: 0 }) }
  function zoomIn()    { setZoom(z => Math.min(8, +(z * 1.25).toFixed(3))) }
  function zoomOut()   { setZoom(z => {
    const next = Math.max(1, +(z / 1.25).toFixed(3))
    if (next === 1) setPan({ x: 0, y: 0 })
    return next
  }) }

  // Polling: cada 2s pide estado del canal
  useEffect(() => {
    async function poll() {
      try {
        const r = await fetch(`/api/dnd/viewer/${channel}`)
        if (!r.ok) return
        const state = await r.json()
        setViewerState(prev => {
          // Solo actualizar si cambió algo real
          if (prev && prev.updatedAt === state.updatedAt) return prev
          return state
        })
      } catch {}
    }
    poll()
    pollRef.current = setInterval(poll, 2000)
    return () => clearInterval(pollRef.current)
  }, [channel])

  // Cuando cambia a modo 'map', cargar el mapa correspondiente
  useEffect(() => {
    if (!viewerState) return
    if (viewerState.mode !== 'map' || !viewerState.mapId) {
      setMap(null)
      lastMapIdRef.current = null
      return
    }
    // Recargar mapa si cambió el mapId o hay un update más reciente
    const mustReload = viewerState.mapId !== lastMapIdRef.current
      || viewerState.updatedAt !== lastUpdatedRef.current
    if (!mustReload) return

    fetch(`/api/dnd/maps/${viewerState.mapId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setMap(data)
          lastMapIdRef.current = viewerState.mapId
          lastUpdatedRef.current = viewerState.updatedAt
        }
      })
      .catch(() => {})
  }, [viewerState])

  // Poll del mapa también: si estamos en modo 'map', refrescar cada 2s
  // (para ver cambios que haga el DM en tiempo real)
  useEffect(() => {
    if (!viewerState || viewerState.mode !== 'map' || !viewerState.mapId) return
    const id = viewerState.mapId
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/dnd/maps/${id}`)
        if (r.ok) setMap(await r.json())
      } catch {}
    }, 2000)
    return () => clearInterval(interval)
  }, [viewerState?.mode, viewerState?.mapId])

  // Render del canvas cuando cambia el mapa
  useEffect(() => {
    if (!map || viewerState?.mode !== 'map') return
    const canvas = canvasRef.current; if (!canvas) return
    canvas.width = map.canvasW || window.innerWidth
    canvas.height = map.canvasH || window.innerHeight
    drawMap(canvas.getContext('2d'), map)
  }, [map, viewerState?.mode])

  useEffect(() => {
    function onResize() {
      if (!map || viewerState?.mode !== 'map') return
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = map.canvasW || window.innerWidth
      canvas.height = map.canvasH || window.innerHeight
      drawMap(canvas.getContext('2d'), map)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [map, viewerState?.mode])

  function drawMap(ctx, m) {
    const { hexSize, showGrid, gridColor, props } = m
    const fogLayers = m.fogLayers || []
    const textureLayers = m.textureLayers || []
    const canvas = ctx.canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const cols = Math.ceil(canvas.width / (hexSize * 1.5)) + 2
    const rows = Math.ceil(canvas.height / (Math.sqrt(3) * hexSize)) + 2

    // Suelo base — color neutro
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const { x, y } = hexCenter(col, row, hexSize)
        const corners = hexCorners(x, y, hexSize - 1)
        ctx.beginPath(); ctx.moveTo(corners[0].x, corners[0].y)
        corners.forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath()
        ctx.fillStyle = '#1a1a22'
        ctx.fill()
      }
    }

    // Capas de textura (polígono con clip; soporta rect antiguo)
    textureLayers.forEach(tex => {
      if (!imgCache.current[tex.imgUrl]) {
        const img = new Image(); img.src = tex.imgUrl
        img.onload = () => { imgCache.current[tex.imgUrl] = img; setMap(mm => mm ? {...mm} : mm) }
        return
      }
      const pts = texToPoints(tex)
      if (!pts || pts.length < 3) return
      const bb = pointsBbox(pts)
      ctx.save()
      const f = tex.filter || {}
      const scale = tex.scale || 1
      ctx.filter = `brightness(${f.brightness??100}%) saturate(${f.saturate??100}%) hue-rotate(${f.hue??0}deg)`
      tracePolyPath(ctx, pts, tex.smooth)
      ctx.clip()
      const pat = ctx.createPattern(imgCache.current[tex.imgUrl], 'repeat')
      const dm = new DOMMatrix()
      dm.a = scale; dm.d = scale; dm.e = bb.minX; dm.f = bb.minY
      pat.setTransform(dm)
      ctx.fillStyle = pat
      ctx.fillRect(bb.minX, bb.minY, bb.maxX - bb.minX, bb.maxY - bb.minY)
      ctx.filter = 'none'
      ctx.restore()
    })

    // Props
    ;(props || []).forEach(prop => {
      if (prop.visible === false) return
      ctx.save(); ctx.translate(prop.x, prop.y); ctx.rotate((prop.rotation || 0) * Math.PI / 180)
      const w = prop.width || 80; const h = prop.height || 80
      if (prop.imgUrl) {
        if (!imgCache.current[prop.imgUrl]) {
          const img = new Image(); img.src = prop.imgUrl
          img.onload = () => { imgCache.current[prop.imgUrl] = img; setMap(mm => mm ? {...mm} : mm) }
          ctx.restore(); return
        }
        const f = prop.filter || {}
        ctx.filter = `brightness(${f.brightness ?? 100}%) saturate(${f.saturate ?? 100}%) contrast(${f.contrast ?? 100}%)`
        ctx.drawImage(imgCache.current[prop.imgUrl], -w / 2, -h / 2, w, h)
        ctx.filter = 'none'
      } else {
        ctx.fillStyle = 'rgba(200,169,110,0.25)'; ctx.strokeStyle = 'rgba(200,169,110,0.5)'; ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#c8a96e'; ctx.font = `${Math.min(w,h)*0.4}px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(prop.label || '📦', 0, 0)
      }
      ctx.restore()
    })

    // Capas de niebla (polígonos; soporta formato antiguo x,y,w,h)
    fogLayers.forEach(fog => {
      if (fog.visible) return
      let pts
      if (Array.isArray(fog.points) && fog.points.length >= 3) {
        pts = fog.points
      } else if (typeof fog.x === 'number' && typeof fog.w === 'number') {
        pts = [
          { x: fog.x,          y: fog.y },
          { x: fog.x + fog.w,  y: fog.y },
          { x: fog.x + fog.w,  y: fog.y + fog.h },
          { x: fog.x,          y: fog.y + fog.h },
        ]
      } else return
      ctx.fillStyle = `rgba(0,0,0,${fog.opacity ?? 1})`
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i=1; i<pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.closePath()
      ctx.fill()
    })

    // Grid hex
    if (showGrid) {
      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
          const { x, y } = hexCenter(col, row, hexSize)
          const corners = hexCorners(x, y, hexSize - 1)
          ctx.beginPath(); ctx.moveTo(corners[0].x, corners[0].y)
          corners.forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath()
          ctx.strokeStyle = gridColor || 'rgba(255,255,255,0.07)'
          ctx.lineWidth = 0.8; ctx.stroke()
        }
      }
    }
  }

  // ── Handlers táctiles: pinch zoom + pan ──
  function touchDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX
    const dy = t1.clientY - t2.clientY
    return Math.hypot(dx, dy)
  }
  function handleTouchStart(e) {
    if (e.touches.length === 2) {
      // Pinch zoom: guardar distancia inicial y centro
      const [t1, t2] = e.touches
      const dist = touchDistance(t1, t2)
      const cx = (t1.clientX + t2.clientX) / 2
      const cy = (t1.clientY + t2.clientY) / 2
      pinchRef.current = {
        startDist: dist,
        startZoom: zoomRef.current,
        startPan: { ...panRef.current },
        centerX: cx, centerY: cy
      }
      panStartRef.current = null
    } else if (e.touches.length === 1 && zoomRef.current > 1) {
      // Pan con un dedo — solo si hay zoom
      panStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        startPan: { ...panRef.current }
      }
      pinchRef.current = null
    }
  }
  function handleTouchMove(e) {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault()
      const [t1, t2] = e.touches
      const dist = touchDistance(t1, t2)
      const ratio = dist / pinchRef.current.startDist
      const newZoom = Math.min(8, Math.max(1, pinchRef.current.startZoom * ratio))
      // Pan acompaña el centro del pinch para que el zoom sienta anclado a los dedos
      const cx = (t1.clientX + t2.clientX) / 2
      const cy = (t1.clientY + t2.clientY) / 2
      const dx = cx - pinchRef.current.centerX
      const dy = cy - pinchRef.current.centerY
      setZoom(newZoom)
      if (newZoom > 1) {
        setPan({
          x: pinchRef.current.startPan.x + dx,
          y: pinchRef.current.startPan.y + dy
        })
      } else {
        setPan({ x: 0, y: 0 })
      }
    } else if (e.touches.length === 1 && panStartRef.current && zoomRef.current > 1) {
      e.preventDefault()
      const dx = e.touches[0].clientX - panStartRef.current.x
      const dy = e.touches[0].clientY - panStartRef.current.y
      setPan({
        x: panStartRef.current.startPan.x + dx,
        y: panStartRef.current.startPan.y + dy
      })
    }
  }
  function handleTouchEnd(e) {
    if (e.touches.length < 2) pinchRef.current = null
    if (e.touches.length === 0) panStartRef.current = null
  }

  function toggleFullscreen() {
    const el = document.documentElement
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const mode = viewerState?.mode || 'blank'

  return (
    <div className="viewer-root">
      {!viewerState && <div className="viewer-loading">Conectando con el visor...</div>}

      {mode === 'blank' && viewerState && (
        <div className="viewer-blank">
          <div className="viewer-blank-inner">
            <div className="viewer-blank-sigil">⚔️</div>
          </div>
        </div>
      )}

      {mode === 'image' && viewerState?.imageUrl && (
        <div
          className="viewer-image-wrap"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={viewerState.imageUrl}
            alt={viewerState.imageName || ''}
            className="viewer-image"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${viewerState.rotation || 0}deg)`,
              transition: pinchRef.current || panStartRef.current ? 'none' : 'transform 0.15s ease-out',
              maxWidth: (viewerState.rotation === 90 || viewerState.rotation === 270) ? '100vh' : '100vw',
              maxHeight: (viewerState.rotation === 90 || viewerState.rotation === 270) ? '100vw' : '100vh',
            }}
            draggable={false}
          />
          {channel === 'tablet' && (
            <div className="viewer-zoom-controls">
              <button className="viewer-zoom-btn" onClick={zoomIn} aria-label="Acercar">＋</button>
              <div className="viewer-zoom-level">{Math.round(zoom * 100)}%</div>
              <button className="viewer-zoom-btn" onClick={zoomOut} aria-label="Alejar">－</button>
              <button className="viewer-zoom-btn viewer-zoom-reset" onClick={resetZoom} aria-label="Reset">⟲</button>
            </div>
          )}
        </div>
      )}

      {mode === 'map' && (
        <div className="viewer-map-wrap" style={{
          transform: `translate(-50%, -50%) rotate(${viewerState?.rotation || 0}deg)`,
          width: (viewerState?.rotation === 90 || viewerState?.rotation === 270) ? '100vh' : '100vw',
          height: (viewerState?.rotation === 90 || viewerState?.rotation === 270) ? '100vw' : '100vh',
        }}>
          <canvas ref={canvasRef} className="viewer-canvas" />
        </div>
      )}

      <button className="viewer-fullscreen-btn" onClick={toggleFullscreen}>
        {isFullscreen ? '✕ Salir' : '⤢ Fullscreen'}
      </button>
      <div className="viewer-channel-tag">
        {channel === 'tablet' ? '📱 Tablet' : '📺 Main'}
      </div>
    </div>
  )
}
