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

// ── Render de brush strokes a offscreen canvas ──
function renderBrushLayer(tex, cw, ch, img) {
  if (!tex.brushStrokes || !tex.brushStrokes.length || !img) return null
  const off = document.createElement('canvas')
  off.width = cw; off.height = ch
  const ctx = off.getContext('2d')

  tex.brushStrokes.forEach(stroke => {
    if (!stroke.points || stroke.points.length < 1) return
    const r = (stroke.brushSize || 40) / 2
    const feather = stroke.feather ?? 0

    if (stroke.eraser) {
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      for (let i = 0; i < stroke.points.length; i++) {
        const p = stroke.points[i]
        if (i > 0) {
          const prev = stroke.points[i - 1]
          const dist = Math.hypot(p.x - prev.x, p.y - prev.y)
          const step = Math.max(r * 0.25, 2)
          const steps = Math.ceil(dist / step)
          for (let s = 1; s < steps; s++) {
            const t = s / steps
            const ix = prev.x + (p.x - prev.x) * t
            const iy = prev.y + (p.y - prev.y) * t
            ctx.beginPath(); ctx.arc(ix, iy, r, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(0,0,0,1)'; ctx.fill()
          }
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,0,0,1)'; ctx.fill()
      }
      ctx.restore()
      return
    }

    // Textured brush with radial feather
    const mask = document.createElement('canvas')
    mask.width = cw; mask.height = ch
    const mctx = mask.getContext('2d')

    for (let i = 0; i < stroke.points.length; i++) {
      const p = stroke.points[i]
      const stampAt = (sx, sy) => {
        if (feather > 0) {
          const innerR = r * (1 - feather)
          const grad = mctx.createRadialGradient(sx, sy, innerR, sx, sy, r)
          grad.addColorStop(0, 'rgba(255,255,255,1)')
          grad.addColorStop(1, 'rgba(255,255,255,0)')
          mctx.beginPath(); mctx.arc(sx, sy, r, 0, Math.PI * 2)
          mctx.fillStyle = grad; mctx.fill()
        } else {
          mctx.beginPath(); mctx.arc(sx, sy, r, 0, Math.PI * 2)
          mctx.fillStyle = 'rgba(255,255,255,1)'; mctx.fill()
        }
      }
      if (i > 0) {
        const prev = stroke.points[i - 1]
        const dist = Math.hypot(p.x - prev.x, p.y - prev.y)
        const step = Math.max(r * 0.25, 2)
        const steps = Math.ceil(dist / step)
        for (let s = 1; s < steps; s++) {
          const t = s / steps
          stampAt(prev.x + (p.x - prev.x) * t, prev.y + (p.y - prev.y) * t)
        }
      }
      stampAt(p.x, p.y)
    }

    const pat = ctx.createPattern(img, 'repeat')
    if (!pat) return
    const scale = tex.scale || 1
    const dm = new DOMMatrix(); dm.a = scale; dm.d = scale
    pat.setTransform(dm)

    const tex2 = document.createElement('canvas')
    tex2.width = cw; tex2.height = ch
    const tctx = tex2.getContext('2d')
    tctx.fillStyle = pat
    tctx.fillRect(0, 0, cw, ch)
    tctx.globalCompositeOperation = 'destination-in'
    tctx.drawImage(mask, 0, 0)

    ctx.drawImage(tex2, 0, 0)
  })

  return off
}

export default function MapViewer() {
  const { channel: channelParam } = useParams()
  const channel = channelParam && ['main','tablet'].includes(channelParam) ? channelParam : 'main'
  const canvasRef = useRef(null)
  const [viewerState, setViewerState] = useState(null) // { mode, mapId, imageUrl, partyId, ... }
  const [map, setMap] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const imgCache = useRef({})
  const pollRef = useRef(null)
  const lastMapIdRef = useRef(null)
  const lastUpdatedRef = useRef(0)

  // ── Particle system refs ──
  const particleCanvasRef = useRef(null)
  const particlesRef = useRef({})  // { layerId: [{ x, y, vx, vy, size, alpha, phase }] }
  const particleRafRef = useRef(null)
  const particleLayersRef = useRef([]) // desacoplado de map para evitar remount del RAF

  // ── Sound command listener ──
  const lastSoundTsRef = useRef(0)
  const audioRef = useRef(null)
  const firstSoundPollRef = useRef(true)

  useEffect(() => {
    async function pollSound() {
      try {
        const r = await fetch('/api/dnd/sound-command')
        if (!r.ok) return
        const cmd = await r.json()
        if (!cmd || cmd.ts <= lastSoundTsRef.current) return
        // Primer poll: solo guardar el ts sin reproducir
        if (firstSoundPollRef.current) {
          firstSoundPollRef.current = false
          lastSoundTsRef.current = cmd.ts
          return
        }
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
  const lastMapJsonRef = useRef('')
  useEffect(() => {
    if (!viewerState || viewerState.mode !== 'map' || !viewerState.mapId) return
    const id = viewerState.mapId
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/dnd/maps/${id}`)
        if (!r.ok) return
        const text = await r.text()
        // Solo actualizar si el JSON cambió — evita re-render + redibujado innecesario
        if (text === lastMapJsonRef.current) return
        lastMapJsonRef.current = text
        setMap(JSON.parse(text))
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

    // Suelo base — negro para fundirse con la niebla
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Capas de textura — separar debajo/encima de props
    const allTex = [...textureLayers].reverse()
    const texBelow = allTex.filter(t => !t.aboveProps)
    const texAbove = allTex.filter(t => t.aboveProps)

    function renderTex(tex) {
      if (tex.visible === false) return
      if (!imgCache.current[tex.imgUrl]) {
        const img = new Image(); img.src = tex.imgUrl
        img.onload = () => { imgCache.current[tex.imgUrl] = img; setMap(mm => mm ? {...mm} : mm) }
        return
      }
      const f = tex.filter || {}
      const filterStr = `brightness(${f.brightness??100}%) saturate(${f.saturate??100}%) hue-rotate(${f.hue??0}deg)`

      if (tex.type === 'brush') {
        const brushCanvas = renderBrushLayer(tex, canvas.width, canvas.height, imgCache.current[tex.imgUrl])
        if (brushCanvas) {
          ctx.save()
          ctx.filter = filterStr
          ctx.drawImage(brushCanvas, 0, 0)
          ctx.filter = 'none'
          ctx.restore()
        }
      } else {
        const pts = texToPoints(tex)
        if (!pts || pts.length < 3) return
        const bb = pointsBbox(pts)
        ctx.save()
        const scale = tex.scale || 1
        ctx.filter = filterStr
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
      }
    }

    // Pasada 1: texturas debajo de props
    texBelow.forEach(renderTex)

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

    // Pasada 2: texturas encima de props
    texAbove.forEach(renderTex)

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

  // ── Particle engine (desacoplado del state map — RAF nunca se destruye por poll) ──

  // Sync particleLayersRef cuando cambia map (sin destruir el RAF)
  useEffect(() => {
    if (!map || viewerState?.mode !== 'map') {
      particleLayersRef.current = []
      return
    }
    particleLayersRef.current = (map.particleLayers || []).filter(l => l.visible)
  }, [map, viewerState?.mode])

  // RAF loop — se monta cuando hay canvas de partículas (modo map), lee layers de ref
  useEffect(() => {
    if (viewerState?.mode !== 'map') return
    // Pequeño delay para que React monte el canvas antes de leerlo
    const startDelay = setTimeout(() => {
      const pc = particleCanvasRef.current
      if (!pc) return
      const ctx = pc.getContext('2d')
      const pMap = particlesRef.current
      let running = true
      const FRAME_MS = 33.33 // ~30fps
      let lastT = 0

      // Cache de fog sprites por color+size
      const fogSpriteCache = {}

      function getFogSprite(layer) {
        const key = `${layer.color}|${layer.sizeMax}`
        if (fogSpriteCache[key]) return fogSpriteCache[key]
        const hex = layer.color || '#ffffff'
        const r = parseInt(hex.slice(1,3), 16)
        const g = parseInt(hex.slice(3,5), 16)
        const b = parseInt(hex.slice(5,7), 16)
        const spriteSize = Math.ceil((layer.sizeMax || 80) * 2)
        const s = document.createElement('canvas')
        s.width = spriteSize; s.height = spriteSize
        const sctx = s.getContext('2d')
        const cx = spriteSize / 2
        const grad = sctx.createRadialGradient(cx, cx, 0, cx, cx, cx)
        grad.addColorStop(0, `rgba(${r},${g},${b},0.8)`)
        grad.addColorStop(0.5, `rgba(${r},${g},${b},0.3)`)
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
        sctx.fillStyle = grad
        sctx.fillRect(0, 0, spriteSize, spriteSize)
        fogSpriteCache[key] = s
        return s
      }

      const rgbCache = {}
      function getRgb(hex) {
        if (rgbCache[hex]) return rgbCache[hex]
        const r = parseInt(hex.slice(1,3), 16)
        const g = parseInt(hex.slice(3,5), 16)
        const b = parseInt(hex.slice(5,7), 16)
        const s = `rgb(${r},${g},${b})`
        rgbCache[hex] = s
        return s
      }

      function tick(now) {
        if (!running) return
        if (now - lastT < FRAME_MS) { particleRafRef.current = requestAnimationFrame(tick); return }
        const dt = Math.min((now - lastT) / 16.667, 3)
        lastT = now

        const layers = particleLayersRef.current
        const cw = pc.width
        const ch = pc.height

        if (!layers.length || !cw) {
          ctx.clearRect(0, 0, cw || 1, ch || 1)
          particleRafRef.current = requestAnimationFrame(tick)
          return
        }

        ctx.clearRect(0, 0, cw, ch)

        for (let li = 0; li < layers.length; li++) {
          const layer = layers[li]
          const parts = pMap[layer.id]
          if (!parts || !parts.length) continue

          const randomDir = layer.direction === -1
          const dirRad = randomDir ? 0 : (layer.direction || 0) * Math.PI / 180
          const baseVx = randomDir ? 0 : Math.cos(dirRad)
          const baseVy = randomDir ? 0 : Math.sin(dirRad)
          const drift = layer.drift || 0
          const opacity = layer.opacity || 0.5
          const margin = (layer.sizeMax || 4) * 2
          const isFog = layer.type === 'fog'
          const isFirefly = layer.type === 'fireflies'
          const hasGlow = layer.glow && !isFog
          const rgbStr = getRgb(layer.color || '#ffffff')
          const fogSprite = isFog ? getFogSprite(layer) : null

          if (hasGlow) { ctx.shadowColor = rgbStr; ctx.shadowBlur = (layer.sizeMax || 4) * 3 }
          if (!isFog) ctx.fillStyle = rgbStr

          for (let i = 0; i < parts.length; i++) {
            const p = parts[i]
            const speed = p.speed * dt
            const vx = randomDir ? p.dirX : baseVx
            const vy = randomDir ? p.dirY : baseVy
            p.x += vx * speed + Math.sin(p.phase + now * 0.001) * drift * dt
            p.y += vy * speed + Math.cos(p.phase + now * 0.0013) * drift * dt * 0.7
            p.phase += 0.01 * dt

            // Respawn en posición aleatoria al salir del canvas
            if (p.x < -margin || p.x > cw + margin || p.y < -margin || p.y > ch + margin) {
              p.x = Math.random() * cw
              p.y = Math.random() * ch
              if (randomDir) {
                const rd = Math.random() * 6.2832
                p.dirX = Math.cos(rd)
                p.dirY = Math.sin(rd)
              }
            }

            let alpha = opacity * p.baseAlpha
            if (isFirefly) {
              const pulse = Math.sin(now * 0.002 * p.pulseSpeed + p.phase)
              alpha *= 0.3 + 0.7 * (pulse * pulse * 0.25 + 0.175)
            }

            ctx.globalAlpha = alpha
            if (isFog && fogSprite) {
              const sz = p.size * 2
              ctx.drawImage(fogSprite, p.x - p.size, p.y - p.size, sz, sz)
            } else {
              ctx.beginPath()
              ctx.arc(p.x, p.y, p.size, 0, 6.2832)
              ctx.fill()
            }
          }

          if (hasGlow) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0 }
        }
        ctx.globalAlpha = 1

        particleRafRef.current = requestAnimationFrame(tick)
      }
      particleRafRef.current = requestAnimationFrame(tick)

      // Cleanup guardado en ref para el return
      particleRafRef._cleanup = () => { running = false; cancelAnimationFrame(particleRafRef.current) }
    }, 100) // delay para que el canvas se monte

    return () => {
      clearTimeout(startDelay)
      if (particleRafRef._cleanup) { particleRafRef._cleanup(); particleRafRef._cleanup = null }
    }
  }, [viewerState?.mode]) // solo cambia al cambiar de modo, NO con cada poll de mapa

  // Reconcile particles cuando cambian las layers (sin tocar el RAF)
  useEffect(() => {
    const layers = particleLayersRef.current
    const pc = particleCanvasRef.current
    if (!pc) return
    const pMap = particlesRef.current

    // Resize canvas para coincidir con el mapa — ANTES de spawnear
    if (map) {
      const nw = map.canvasW || 1600
      const nh = map.canvasH || 1000
      if (pc.width !== nw || pc.height !== nh) { pc.width = nw; pc.height = nh }
    }

    const cw = pc.width || 1600
    const ch = pc.height || 1000

    layers.forEach(layer => {
      const existing = pMap[layer.id] || []
      const target = layer.count || 50
      while (existing.length < target) existing.push(spawnParticle(layer, cw, ch, true))
      if (existing.length > target) existing.length = target
      pMap[layer.id] = existing
    })
    // Cleanup removed layers
    const activeIds = new Set(layers.map(l => l.id))
    Object.keys(pMap).forEach(id => { if (!activeIds.has(parseInt(id))) delete pMap[id] })
  }, [map, viewerState?.mode])

  function spawnParticle(layer, cw, ch, randomPos) {
    const sMin = layer.sizeMin || 1
    const sMax = layer.sizeMax || 4
    const randDir = Math.random() * Math.PI * 2
    return {
      x: randomPos ? Math.random() * cw : -20,
      y: randomPos ? Math.random() * ch : Math.random() * ch,
      size: sMin + Math.random() * (sMax - sMin),
      speed: (layer.speedMin || 0.1) + Math.random() * ((layer.speedMax || 0.5) - (layer.speedMin || 0.1)),
      phase: Math.random() * Math.PI * 2,
      baseAlpha: 0.5 + Math.random() * 0.5,
      pulseSpeed: 0.5 + Math.random() * 1.5,
      dirX: Math.cos(randDir),  // dirección individual (para mode aleatorio)
      dirY: Math.sin(randDir),
    }
  }

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
          <canvas ref={particleCanvasRef} className="viewer-particle-canvas" />
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
