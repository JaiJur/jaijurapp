import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './MapEditor.css'

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
function pixelToHex(px, py, size) {
  const w = size * 2; const h = Math.sqrt(3) * size
  const col = Math.round((px - size) / (w * 0.75))
  const row = Math.round((py - h / 2 - (col % 2 === 1 ? h / 2 : 0)) / h)
  return { col, row }
}
function hexKey(col, row) { return `${col},${row}` }

// ── Helpers polígono de niebla ───────────────────────
// Convierte una fog layer al array de puntos. Soporta formato antiguo (x,y,w,h) como rectángulo.
function fogToPoints(fog) {
  if (Array.isArray(fog.points) && fog.points.length >= 3) return fog.points
  if (typeof fog.x === 'number' && typeof fog.w === 'number') {
    return [
      { x: fog.x,          y: fog.y },
      { x: fog.x + fog.w,  y: fog.y },
      { x: fog.x + fog.w,  y: fog.y + fog.h },
      { x: fog.x,          y: fog.y + fog.h },
    ]
  }
  return null
}
function pointsBbox(pts) {
  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity
  pts.forEach(p => { if(p.x<minX)minX=p.x; if(p.y<minY)minY=p.y; if(p.x>maxX)maxX=p.x; if(p.y>maxY)maxY=p.y })
  return { minX, minY, maxX, maxY }
}
function pointInPolygon(x, y, pts) {
  let inside = false
  for (let i=0, j=pts.length-1; i<pts.length; j=i++) {
    const xi=pts[i].x, yi=pts[i].y, xj=pts[j].x, yj=pts[j].y
    const intersect = ((yi>y) !== (yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

// Traza un path cerrado con polígono recto o Bézier suavizado
function tracePolyPath(ctx, pts, smooth) {
  if (!pts || pts.length < 3) return
  ctx.beginPath()
  if (!smooth) {
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
  } else {
    // Catmull-Rom → Bézier cúbico con cierre suave
    const n = pts.length
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n]
      const p1 = pts[i]
      const p2 = pts[(i + 1) % n]
      const p3 = pts[(i + 2) % n]
      if (i === 0) ctx.moveTo(p1.x, p1.y)
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
    }
  }
  ctx.closePath()
}

// Convierte texLayer a puntos (soporta formato rect antiguo)
function texToPoints(tex) {
  if (Array.isArray(tex.points) && tex.points.length >= 3) return tex.points
  if (typeof tex.x === 'number' && typeof tex.w === 'number') {
    return [
      { x: tex.x,          y: tex.y },
      { x: tex.x + tex.w,  y: tex.y },
      { x: tex.x + tex.w,  y: tex.y + tex.h },
      { x: tex.x,          y: tex.y + tex.h },
    ]
  }
  return null
}

export default function MapEditor() {
  const { mapId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const canvasRef = useRef(null)

  // ── Estado React (solo para panel UI) ──────────────
  const [map, setMap] = useState(null)
  const [tool, setTool] = useState('prop')
  const [selectedProp, setSelectedProp] = useState(null)
  const [selectedFog, setSelectedFog] = useState(null)
  const [selectedTexLayer, setSelectedTexLayer] = useState(null)
  const [multiSelection, setMultiSelection] = useState([]) // ids de props seleccionados con shift
  const [status, setStatus] = useState('')
  const [propAssets, setPropAssets] = useState({ path: '', folders: [], files: [] })
  const [propRootFolders, setPropRootFolders] = useState([]) // carpetas raíz siempre visibles
  const [activePropFolder, setActivePropFolder] = useState(null) // carpeta seleccionada
  const [floorAssets, setFloorAssets] = useState([])
  const [selectedTexture, setSelectedTexture] = useState(null)
  const [texMode, setTexMode] = useState('polygon') // 'polygon' | 'brush'
  const [brushSize, setBrushSize] = useState(40)
  const [brushFeather, setBrushFeather] = useState(0.3) // 0 = hard, 1 = full soft
  const [brushEraser, setBrushEraser] = useState(false)
  const [clipboard, setClipboard] = useState(null)
  const [drawingFog, setDrawingFog] = useState(null) // { points: [{x,y}], cursor: {x,y} } — polígono en construcción
  const [drawingTex, setDrawingTex] = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [collapsed, setCollapsed] = useState({ fog: true, scene: true, inspector: true, textures: true, groups: true, tools: true, grid: true, props: true, leftTex: true })
  const [expandedGroups, setExpandedGroups] = useState({})
  const [zoom, setZoom] = useState(1)

  // ── Refs (no causan re-render) ──────────────────────
  const mapRef = useRef(null)
  const imgCache = useRef({})
  const patternCache = useRef({})   // B: caché de CanvasPattern
  const bgCanvas = useRef(null)     // B: canvas offscreen para suelo
  const bgKey = useRef('')          // B: clave para invalidar bgCanvas
  const rafRef = useRef(null)
  const dirtyRef = useRef(true)        // solo redibujar si hay cambios
  const lastMapRef = useRef(null)      // para detectar cambios
  const dragModeRef = useRef(null)
  const dragStartRef = useRef(null)
  const draggingIdRef = useRef(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const hoveredPropRef = useRef(null) // A: ref en vez de estado
  const fogStartRef = useRef(null)
  const texStartRef = useRef(null)
  const selectedPropRef = useRef(null)
  const multiSelRef = useRef([]) // ref para acceso en handlers sin re-render
  const selectedFogRef = useRef(null)
  const selectedTexRef = useRef(null)
  const toolRef = useRef('prop')
  const drawingFogRef = useRef(null)
  const drawingTexRef = useRef(null)
  const zoomRef = useRef(1)
  const texModeRef = useRef('polygon')
  const brushSizeRef = useRef(40)
  const brushFeatherRef = useRef(0.3)
  const brushEraserRef = useRef(false)
  const brushStrokeRef = useRef(null) // trazo en curso: { points, texture, brushSize, feather, eraser }
  const brushCacheRef = useRef({}) // offscreen canvas cache por layer id

  const headers = { 'Content-Type': 'application/json', 'x-user-id': user.id }

  // Mantener refs sincronizados con estado
  useEffect(() => { selectedPropRef.current = selectedProp; dirtyRef.current = true }, [selectedProp])
  useEffect(() => { multiSelRef.current = multiSelection; dirtyRef.current = true }, [multiSelection])
  useEffect(() => { selectedFogRef.current = selectedFog; dirtyRef.current = true }, [selectedFog])
  useEffect(() => { selectedTexRef.current = selectedTexLayer; dirtyRef.current = true }, [selectedTexLayer])
  useEffect(() => { toolRef.current = tool }, [tool])
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { texModeRef.current = texMode }, [texMode])
  useEffect(() => { brushSizeRef.current = brushSize }, [brushSize])
  useEffect(() => { brushFeatherRef.current = brushFeather }, [brushFeather])
  useEffect(() => { brushEraserRef.current = brushEraser }, [brushEraser])

  // Al cambiar de herramienta, cancelar polígonos en curso
  useEffect(() => {
    if (tool !== 'fog' && drawingFogRef.current) cancelPolygonFog()
    if (tool !== 'texture' && drawingTexRef.current) cancelPolygonTex()
  }, [tool])

  // Atajos: Enter cierra polígono, Esc cancela, Backspace quita último punto
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (toolRef.current === 'fog' && drawingFogRef.current) {
        if (e.key === 'Enter')     { e.preventDefault(); closePolygonFog() }
        else if (e.key === 'Escape')   { e.preventDefault(); cancelPolygonFog() }
        else if (e.key === 'Backspace'){ e.preventDefault(); popLastVertex() }
      }
      if (toolRef.current === 'texture' && drawingTexRef.current) {
        if (e.key === 'Enter')     { e.preventDefault(); closePolygonTex() }
        else if (e.key === 'Escape')   { e.preventDefault(); cancelPolygonTex() }
        else if (e.key === 'Backspace'){ e.preventDefault(); popLastTexVertex() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Carga inicial ───────────────────────────────────
  useEffect(() => {
    // Cargar carpetas raíz de props
    fetch('/api/assets/props').then(r => r.json()).then(data => {
      setPropAssets(data)
      setPropRootFolders(data.folders || [])
    })
  }, [])
  useEffect(() => { fetch('/api/assets/floors').then(r => r.json()).then(setFloorAssets) }, [])

  async function loadPropAssets(path) {
    try {
      const q = path ? `?path=${encodeURIComponent(path)}` : ''
      const r = await fetch(`/api/assets/props${q}`)
      if (r.ok) {
        const data = await r.json()
        setPropAssets(data)
      }
    } catch {}
  }

  function selectPropFolder(folder) {
    setActivePropFolder(folder.path)
    loadPropAssets(folder.path)
  }
  useEffect(() => {
    fetch(`/api/dnd/maps/${mapId}`, { headers })
      .then(r => r.json()).then(data => { setMap(data); mapRef.current = data })
  }, [mapId])

  // ── B: Invalidar bgCanvas cuando cambia configuración del suelo ──
  useEffect(() => {
    if (!map) return
    const key = `${map.hexSize}|${map.canvasW||1600}|${map.canvasH||1000}`
    if (key !== bgKey.current) {
      bgKey.current = key
      bgCanvas.current = null // forzar rebuild en próximo frame
    }
  }, [map?.hexSize, map?.canvasW, map?.canvasH, map?.gridColor])

  // ── Render de brush strokes en offscreen canvas ──
  function renderBrushLayer(tex, cw, ch) {
    if (!tex.brushStrokes || !tex.brushStrokes.length) return null
    const cacheKey = `${tex.id}|${tex.brushStrokes.length}|${cw}|${ch}`
    if (brushCacheRef.current[cacheKey]) return brushCacheRef.current[cacheKey]
    const off = document.createElement('canvas')
    off.width = cw; off.height = ch
    const ctx = off.getContext('2d')
    const img = imgCache.current[tex.imgUrl]
    if (!img) return null

    tex.brushStrokes.forEach(stroke => {
      if (!stroke.points || stroke.points.length < 1) return
      const r = (stroke.brushSize || 40) / 2
      const feather = stroke.feather ?? 0 // 0 = hard, 0-1 = where 50% opacity sits

      if (stroke.eraser) {
        // Eraser: stamp circles with destination-out
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

      // ── Textured brush with radial feather ──
      // 1. Build a mask canvas with alpha gradient stamps
      const mask = document.createElement('canvas')
      mask.width = cw; mask.height = ch
      const mctx = mask.getContext('2d')

      // Stamp alpha circles along the stroke path
      for (let i = 0; i < stroke.points.length; i++) {
        const p = stroke.points[i]
        const stampAt = (sx, sy) => {
          if (feather > 0) {
            // Radial gradient: solid from center to (1-feather)*r, then fade to 0 at r
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
        // Interpolate between points for smooth coverage
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

      // 2. Create a textured canvas (pattern fill over the bounding area)
      const pat = ctx.createPattern(img, 'repeat')
      if (!pat) return
      const scale = tex.scale || 1
      const dm = new DOMMatrix(); dm.a = scale; dm.d = scale
      pat.setTransform(dm)

      // 3. Composite: use mask as alpha for the texture
      // Draw texture into a temp canvas, then mask it
      const tex2 = document.createElement('canvas')
      tex2.width = cw; tex2.height = ch
      const tctx = tex2.getContext('2d')
      tctx.fillStyle = pat
      tctx.fillRect(0, 0, cw, ch)
      // Apply mask: keep only where mask has alpha
      tctx.globalCompositeOperation = 'destination-in'
      tctx.drawImage(mask, 0, 0)

      // 4. Draw result onto the layer canvas
      ctx.drawImage(tex2, 0, 0)
    })

    Object.keys(brushCacheRef.current).forEach(k => {
      if (k.startsWith(`${tex.id}|`) && k !== cacheKey) delete brushCacheRef.current[k]
    })
    brushCacheRef.current[cacheKey] = off
    return off
  }

  // ── A: RAF loop principal ────────────────────────────
  useEffect(() => {
    let running = true
    function loop() {
      if (!running) return
      const canvas = canvasRef.current
      const m = mapRef.current
      if (canvas && m && (dirtyRef.current || m !== lastMapRef.current)) {
        const ctx = canvas.getContext('2d')
        drawFrame(ctx, m)
        lastMapRef.current = m
        dirtyRef.current = false
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { running = false; cancelAnimationFrame(rafRef.current) }
  }, []) // solo se monta una vez

  // ── B: Rebuild del canvas offscreen de suelo ────────
  function getBgCanvas(m, canvasW, canvasH) {
    if (bgCanvas.current) return bgCanvas.current
    const { hexSize } = m
    const bg = document.createElement('canvas')
    bg.width = canvasW; bg.height = canvasH
    const ctx = bg.getContext('2d')
    const cols = Math.ceil(canvasW / (hexSize * 1.5)) + 2
    const rows = Math.ceil(canvasH / (Math.sqrt(3) * hexSize)) + 2
    // Solo suelo — el grid va encima de todo en drawFrame
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const { x, y } = hexCenter(col, row, hexSize)
        const corners = hexCorners(x, y, hexSize - 1)
        ctx.beginPath(); ctx.moveTo(corners[0].x, corners[0].y)
        corners.forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath()
        ctx.fillStyle = '#1a1a22'; ctx.fill()
      }
    }
    bgCanvas.current = bg
    return bg
  }

  // ── B: Obtener CanvasPattern cacheado ───────────────
  function getPattern(ctx, imgUrl, scale) {
    const key = `${imgUrl}|${scale}`
    if (patternCache.current[key]) return patternCache.current[key]
    const img = imgCache.current[imgUrl]; if (!img) return null
    const pat = ctx.createPattern(img, 'repeat')
    patternCache.current[key] = pat
    return pat
  }

  // ── A: Función de render principal (llamada por RAF) ─
  function drawFrame(ctx, m) {
    const cw = m.canvasW || 1600; const ch = m.canvasH || 1000
    const canvas = ctx.canvas
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw; canvas.height = ch
    }
    ctx.clearRect(0, 0, cw, ch)

    // B: Suelo + grid desde offscreen cacheado
    const bg = getBgCanvas(m, cw, ch)
    ctx.drawImage(bg, 0, 0)

    // Capas de textura
    const hiddenTexIds = new Set(
      (m.groups||[]).filter(g=>!g.visible).flatMap(g=>g.texIds||[])
    )
    ;(m.textureLayers || []).forEach(tex => {
      if (tex.visible === false) return
      if (hiddenTexIds.has(tex.id)) return
      if (!imgCache.current[tex.imgUrl]) {
        const img = new Image(); img.src = tex.imgUrl
        img.onload = () => {
          imgCache.current[tex.imgUrl] = img
          Object.keys(patternCache.current).forEach(k => { if (k.startsWith(tex.imgUrl)) delete patternCache.current[k] })
          dirtyRef.current = true
        }
        return
      }
      const f = tex.filter || {}
      const filterStr = `brightness(${f.brightness??100}%) saturate(${f.saturate??100}%) hue-rotate(${f.hue??0}deg)`

      if (tex.type === 'brush') {
        // ── Render brush layer ──
        const brushCanvas = renderBrushLayer(tex, cw, ch)
        if (brushCanvas) {
          ctx.save()
          ctx.filter = filterStr
          ctx.drawImage(brushCanvas, 0, 0)
          ctx.filter = 'none'
          ctx.restore()
        }
        // Highlight selección: borde alrededor del bounding box de los strokes
        if (tex.id === selectedTexRef.current && tex.brushStrokes?.length) {
          let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity
          tex.brushStrokes.forEach(s => s.points?.forEach(p => {
            const r = (s.brushSize||40)/2
            if(p.x-r<minX) minX=p.x-r; if(p.y-r<minY) minY=p.y-r
            if(p.x+r>maxX) maxX=p.x+r; if(p.y+r>maxY) maxY=p.y+r
          }))
          ctx.save()
          ctx.strokeStyle = 'rgba(99,102,241,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([6,3])
          ctx.strokeRect(minX, minY, maxX-minX, maxY-minY)
          ctx.setLineDash([]); ctx.restore()
        }
      } else {
        // ── Render polygon layer (existente) ──
        const pts = texToPoints(tex)
        if (!pts || pts.length < 3) return
        const bb = pointsBbox(pts)
        ctx.save()
        const scale = tex.scale || 1
        ctx.filter = filterStr
        tracePolyPath(ctx, pts, tex.smooth)
        ctx.clip()
        const pat = getPattern(ctx, tex.imgUrl, scale)
        if (pat) {
          const dm = new DOMMatrix(); dm.a = scale; dm.d = scale; dm.e = bb.minX; dm.f = bb.minY
          pat.setTransform(dm)
          ctx.fillStyle = pat
          ctx.fillRect(bb.minX, bb.minY, bb.maxX - bb.minX, bb.maxY - bb.minY)
        }
        ctx.filter = 'none'; ctx.restore()
        if (tex.id === selectedTexRef.current) {
          ctx.save()
          tracePolyPath(ctx, pts, tex.smooth)
          ctx.strokeStyle = 'rgba(99,102,241,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([6,3])
          ctx.stroke(); ctx.setLineDash([])
          pts.forEach(p => {
            ctx.fillStyle = 'rgba(99,102,241,0.9)'
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill()
          })
          ctx.restore()
        }
      }
    })

    // ── Render del trazo de pincel en curso (preview en tiempo real) ──
    const activeStroke = brushStrokeRef.current
    if (activeStroke && activeStroke.points.length >= 1) {
      const img = imgCache.current[activeStroke.texture]
      if (img) {
        const r = (activeStroke.brushSize || 40) / 2
        const feather = activeStroke.feather ?? 0
        if (activeStroke.eraser) {
          ctx.save()
          ctx.globalCompositeOperation = 'destination-out'
          for (let i = 0; i < activeStroke.points.length; i++) {
            const p = activeStroke.points[i]
            if (i > 0) {
              const prev = activeStroke.points[i - 1]
              const dist = Math.hypot(p.x - prev.x, p.y - prev.y)
              const step = Math.max(r * 0.25, 2)
              const steps = Math.ceil(dist / step)
              for (let s = 1; s < steps; s++) {
                const t = s / steps
                ctx.beginPath(); ctx.arc(prev.x+(p.x-prev.x)*t, prev.y+(p.y-prev.y)*t, r, 0, Math.PI*2)
                ctx.fillStyle = 'rgba(0,0,0,1)'; ctx.fill()
              }
            }
            ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI*2)
            ctx.fillStyle = 'rgba(0,0,0,1)'; ctx.fill()
          }
          ctx.restore()
        } else {
          // Preview con máscara radial (simplificado para rendimiento)
          const pat = ctx.createPattern(img, 'repeat')
          if (pat) {
            const scale = activeStroke.scale || 1
            const dm = new DOMMatrix(); dm.a = scale; dm.d = scale
            pat.setTransform(dm)
            if (feather > 0) {
              // Stamp con gradiente radial
              for (let i = 0; i < activeStroke.points.length; i++) {
                const p = activeStroke.points[i]
                const stampPrev = (sx, sy) => {
                  ctx.save()
                  const innerR = r * (1 - feather)
                  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.clip()
                  ctx.fillStyle = pat; ctx.fillRect(sx - r, sy - r, r * 2, r * 2)
                  // Fade edges con gradiente
                  ctx.globalCompositeOperation = 'destination-in'
                  const grad = ctx.createRadialGradient(sx, sy, innerR, sx, sy, r)
                  grad.addColorStop(0, 'rgba(0,0,0,1)')
                  grad.addColorStop(1, 'rgba(0,0,0,0)')
                  ctx.fillStyle = grad; ctx.fillRect(sx - r, sy - r, r * 2, r * 2)
                  ctx.restore()
                }
                if (i > 0) {
                  const prev = activeStroke.points[i - 1]
                  const dist = Math.hypot(p.x - prev.x, p.y - prev.y)
                  const step = Math.max(r * 0.4, 3)
                  const steps = Math.ceil(dist / step)
                  for (let s = 1; s < steps; s++) {
                    const t = s / steps
                    stampPrev(prev.x + (p.x - prev.x) * t, prev.y + (p.y - prev.y) * t)
                  }
                }
                stampPrev(p.x, p.y)
              }
            } else {
              // Hard brush: simple stroke
              ctx.save()
              ctx.lineCap = 'round'; ctx.lineJoin = 'round'
              ctx.lineWidth = activeStroke.brushSize || 40
              ctx.strokeStyle = pat
              ctx.beginPath()
              ctx.moveTo(activeStroke.points[0].x, activeStroke.points[0].y)
              for (let i = 1; i < activeStroke.points.length; i++) {
                const prev = activeStroke.points[i - 1]
                const cur = activeStroke.points[i]
                ctx.quadraticCurveTo(prev.x, prev.y, (prev.x+cur.x)/2, (prev.y+cur.y)/2)
              }
              const last = activeStroke.points[activeStroke.points.length - 1]
              ctx.lineTo(last.x, last.y)
              ctx.stroke()
              ctx.restore()
            }
          }
        }
      }
    }

    // Props
    const hiddenPropIds = new Set(
      (m.groups||[]).filter(g=>!g.visible).flatMap(g=>g.propIds||[])
    )
    const multiSel = multiSelRef.current
    ;(m.props || []).forEach(prop => {
      if (hiddenPropIds.has(prop.id)) return // prop oculto por grupo
      if (prop.visible === false) return // prop oculto individualmente
      ctx.save(); ctx.translate(prop.x, prop.y); ctx.rotate((prop.rotation || 0) * Math.PI / 180)
      const w = prop.width || 80; const h = prop.height || 80
      if (prop.imgUrl) {
        if (!imgCache.current[prop.imgUrl]) {
          const img = new Image(); img.src = prop.imgUrl
          img.onload = () => { imgCache.current[prop.imgUrl] = img }
          ctx.restore(); return
        }
        const f = prop.filter || {}
        const fStr = `brightness(${f.brightness??100}%) saturate(${f.saturate??100}%) contrast(${f.contrast??100}%)`
        if (fStr !== 'brightness(100%) saturate(100%) contrast(100%)') ctx.filter = fStr
        ctx.drawImage(imgCache.current[prop.imgUrl], -w/2, -h/2, w, h)
        ctx.filter = 'none'
      } else {
        ctx.fillStyle = 'rgba(200,169,110,0.3)'; ctx.strokeStyle = '#c8a96e'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.rect(-w/2, -h/2, w, h); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#c8a96e'; ctx.font = `${Math.min(w,h)*0.35}px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(prop.label || '📦', 0, 0)
      }
      ctx.restore()
      if (prop.id === selectedPropRef.current) {
        ctx.save(); ctx.translate(prop.x, prop.y); ctx.rotate((prop.rotation || 0) * Math.PI / 180)
        ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.5; ctx.setLineDash([5,3])
        ctx.strokeRect(-w/2-4, -h/2-4, w+8, h+8); ctx.setLineDash([]); ctx.restore()
      } else if (multiSel.includes(prop.id)) {
        ctx.save(); ctx.translate(prop.x, prop.y); ctx.rotate((prop.rotation || 0) * Math.PI / 180)
        ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.setLineDash([4,3])
        ctx.strokeRect(-w/2-4, -h/2-4, w+8, h+8); ctx.setLineDash([]); ctx.restore()
      }
    })

    // Niebla (polígonos)
    ;(m.fogLayers || []).forEach(fog => {
      const pts = fogToPoints(fog)
      if (!pts || pts.length < 3) return
      if (!fog.visible) {
        ctx.fillStyle = `rgba(0,0,0,${fog.opacity??1})`
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i=1; i<pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
        ctx.closePath()
        ctx.fill()
      }
      if (fog.id === selectedFogRef.current) {
        ctx.strokeStyle = 'rgba(250,204,21,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([6,3])
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i=1; i<pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
        ctx.closePath()
        ctx.stroke()
        ctx.setLineDash([])
        // Vértices como pequeños círculos
        pts.forEach(p => {
          ctx.fillStyle = 'rgba(250,204,21,0.9)'
          ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill()
        })
      }
    })

    // Grid — encima de todo
    if (m.showGrid) {
      const cols = Math.ceil(cw / (m.hexSize * 1.5)) + 2
      const rows = Math.ceil(ch / (Math.sqrt(3) * m.hexSize)) + 2
      ctx.strokeStyle = m.gridColor || 'rgba(255,255,255,0.08)'; ctx.lineWidth = 0.8
      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
          const { x, y } = hexCenter(col, row, m.hexSize)
          const corners = hexCorners(x, y, m.hexSize - 1)
          ctx.beginPath(); ctx.moveTo(corners[0].x, corners[0].y)
          corners.forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath()
          ctx.stroke()
        }
      }
    }
  }

  // ── Utilidades canvas ───────────────────────────────
  function getCanvasPos(e) {
    const canvas = canvasRef.current; const rect = canvas.getBoundingClientRect()
    const z = zoomRef.current
    return { x: (e.clientX-rect.left)*(canvas.width/rect.width)/z, y: (e.clientY-rect.top)*(canvas.height/rect.height)/z }
  }
  function findPropAt(x, y) {
    const m = mapRef.current; if (!m?.props) return null
    const hiddenIds = new Set((m.groups||[]).filter(g=>!g.visible).flatMap(g=>g.propIds||[]))
    return [...m.props].reverse().find(p => {
      if (hiddenIds.has(p.id)) return false
      if (p.visible === false) return false
      if (p.locked) return false
      const w = (p.width||60)/2+6; const h = (p.height||60)/2+6
      return x >= p.x-w && x <= p.x+w && y >= p.y-h && y <= p.y+h
    })
  }
  function findFogAt(x, y) {
    const m = mapRef.current; if (!m?.fogLayers) return null
    return [...m.fogLayers].reverse().find(f => {
      if (f.locked) return false
      const pts = fogToPoints(f); if (!pts) return false
      return pointInPolygon(x, y, pts)
    })
  }
  function findTexAt(x, y) {
    const m = mapRef.current; if (!m?.textureLayers) return null
    return [...m.textureLayers].reverse().find(t => {
      if (t.locked) return false
      if (t.type === 'brush') {
        // Brush layers: check if point is within any stroke's bounding area
        return (t.brushStrokes||[]).some(s => s.points?.some(p => {
          const r = (s.brushSize||40)/2 + 5
          return Math.abs(x-p.x) < r && Math.abs(y-p.y) < r
        }))
      }
      const pts = texToPoints(t); if (!pts) return false
      return pointInPolygon(x, y, pts)
    })
  }

  // ── A: Mouse handlers sin setMap durante drag ───────
  function handleMouseDown(e) {
    const { x, y } = getCanvasPos(e)
    const tool = toolRef.current

    if (tool === 'fog') {
      // Polígono: cada click añade un vértice
      setSelectedProp(null); setSelectedFog(null); setSelectedTexLayer(null)
      const cur = drawingFogRef.current
      if (!cur) {
        const poly = { points: [{x,y}], cursor: {x,y} }
        drawingFogRef.current = poly; setDrawingFog(poly)
      } else {
        const poly = { ...cur, points: [...cur.points, {x,y}], cursor: {x,y} }
        drawingFogRef.current = poly; setDrawingFog(poly)
      }
      return
    }
    if (tool === 'texture') {
      setSelectedProp(null); setSelectedFog(null); setSelectedTexLayer(null)
      if (!selectedTexture) return
      if (texModeRef.current === 'brush') {
        // Brush mode: empezar trazo
        brushStrokeRef.current = {
          points: [{x,y}],
          texture: selectedTexture.url,
          brushSize: brushSizeRef.current,
          feather: brushFeatherRef.current,
          eraser: brushEraserRef.current,
          scale: 1
        }
        dirtyRef.current = true
        return
      }
      // Polygon mode: cada click añade un vértice
      const cur = drawingTexRef.current
      if (!cur) {
        const poly = { points: [{x,y}], cursor: {x,y} }
        drawingTexRef.current = poly; setDrawingTex(poly)
      } else {
        const poly = { ...cur, points: [...cur.points, {x,y}], cursor: {x,y} }
        drawingTexRef.current = poly; setDrawingTex(poly)
      }
      return
    }

    const fogHit = findFogAt(x, y)
    if (fogHit && tool !== 'erase') {
      setSelectedFog(fogHit.id); setSelectedProp(null); setSelectedTexLayer(null)
      dragModeRef.current = 'fog'
      const basePts = fogToPoints(fogHit) || []
      dragStartRef.current = { x, y, basePts: basePts.map(p => ({...p})) }
      draggingIdRef.current = fogHit.id; return
    }
    if (fogHit && tool === 'erase') { deleteFog(fogHit.id); return }

    const texHit = findTexAt(x, y)
    if (texHit && tool !== 'erase') {
      setSelectedTexLayer(texHit.id); setSelectedProp(null); setSelectedFog(null)
      dragModeRef.current = 'tex-move'
      const basePts = texToPoints(texHit) || []
      dragStartRef.current = { x, y, basePts: basePts.map(p => ({...p})) }
      draggingIdRef.current = texHit.id; return
    }
    if (texHit && tool === 'erase') { deleteTexLayer(texHit.id); return }

    const hit = findPropAt(x, y)
    if (tool === 'erase' && hit) {
      setMap(m => ({ ...m, props: m.props.filter(p => p.id !== hit.id) }))
      mapRef.current = { ...mapRef.current, props: mapRef.current.props.filter(p => p.id !== hit.id) }
      setSelectedProp(null); return
    }
    if (hit) {
      if (e.shiftKey) {
        // Shift+click: añadir/quitar de selección múltiple
        setMultiSelection(prev => prev.includes(hit.id) ? prev.filter(id=>id!==hit.id) : [...prev, hit.id])
        setSelectedProp(null); return
      }
      setSelectedProp(hit.id); setSelectedFog(null); setMultiSelection([])
      dragModeRef.current = 'move'
      dragStartRef.current = { x, y }
      draggingIdRef.current = hit.id
      dragOffsetRef.current = { x: x - hit.x, y: y - hit.y }; return
    }
    setSelectedProp(null); setSelectedFog(null); setMultiSelection([])
  }

  function startTexHandleDrag(e, mode) {
    e.stopPropagation()
    const { x, y } = getCanvasPos(e)
    const tex = mapRef.current?.textureLayers?.find(t => t.id === selectedTexRef.current); if (!tex) return
    dragModeRef.current = mode
    dragStartRef.current = { x, y, tx: tex.x, ty: tex.y, tw: tex.w, th: tex.h, rotation: tex.rotation||0 }
    draggingIdRef.current = tex.id
  }
  function startHandleDrag(e, mode) {
    e.stopPropagation()
    const { x, y } = getCanvasPos(e)
    const prop = mapRef.current?.props?.find(p => p.id === selectedPropRef.current); if (!prop) return
    dragModeRef.current = mode
    dragStartRef.current = { x, y, rotation: prop.rotation||0, width: prop.width||80, height: prop.height||80 }
    draggingIdRef.current = prop.id
  }

  // ── A: handleMouseMove — actualiza mapRef directamente, sin setMap ──
  function handleMouseMove(e) {
    const { x, y } = getCanvasPos(e)
    const id = draggingIdRef.current
    const mode = dragModeRef.current

    // A: cursor via ref, sin setState
    const hit = findPropAt(x, y)
    if (hit?.id !== hoveredPropRef.current) {
      hoveredPropRef.current = hit?.id || null
      if (canvasRef.current) canvasRef.current.style.cursor = hit ? 'grab' : (toolRef.current==='fog'||toolRef.current==='texture' ? 'crosshair' : 'default')
    }

    if (!id || !mode) {
      // Brush: añadir puntos al trazo en curso
      if (brushStrokeRef.current) {
        const pts = brushStrokeRef.current.points
        const last = pts[pts.length - 1]
        const dist = Math.hypot(x - last.x, y - last.y)
        if (dist > 3) { // mínimo 3px entre puntos para no saturar
          brushStrokeRef.current = { ...brushStrokeRef.current, points: [...pts, {x,y}] }
          dirtyRef.current = true
        }
        return
      }
      // Preview del polígono en construcción: actualizar posición del cursor
      if (drawingFogRef.current) {
        const poly = { ...drawingFogRef.current, cursor: {x,y} }
        drawingFogRef.current = poly; setDrawingFog(poly)
      }
      if (drawingTexRef.current) {
        const poly = { ...drawingTexRef.current, cursor: {x,y} }
        drawingTexRef.current = poly; setDrawingTex(poly)
      }
      return
    }

    const m = mapRef.current; if (!m) return
    const ds = dragStartRef.current

    if (mode === 'fog') {
      const fog = m.fogLayers?.find(f => f.id===id); if (!fog) return
      const dx = x-ds.x, dy = y-ds.y
      const basePts = ds.basePts
      const movedPts = basePts.map(p => ({ x: p.x+dx, y: p.y+dy }))
      mapRef.current = { ...m, fogLayers: m.fogLayers.map(f => f.id===id ? {...f, points: movedPts} : f) }
      dirtyRef.current = true
    } else if (mode === 'move') {
      mapRef.current = { ...m, props: m.props.map(p => p.id===id ? {...p, x:x-dragOffsetRef.current.x, y:y-dragOffsetRef.current.y} : p) }
      dirtyRef.current = true
    } else if (mode === 'rotate') {
      const prop = m.props?.find(p => p.id===id); if (!prop) return
      const startAngle = Math.atan2(ds.y-prop.y, ds.x-prop.x)
      const newRot = (((ds.rotation+(Math.atan2(y-prop.y,x-prop.x)-startAngle)*180/Math.PI)%360)+360)%360
      mapRef.current = { ...m, props: m.props.map(p => p.id===id ? {...p, rotation:Math.round(newRot)} : p) }
      dirtyRef.current = true
    } else if (mode === 'scale') {
      const delta = ((x-ds.x)+(y-ds.y))/2
      mapRef.current = { ...m, props: m.props.map(p => p.id===id ? {...p, width:Math.max(10,Math.round(ds.width+delta)), height:Math.max(10,Math.round(ds.height+delta))} : p) }
      dirtyRef.current = true
    } else if (mode === 'tex-move') {
      const dx = x-ds.x, dy = y-ds.y
      const basePts = ds.basePts
      const movedPts = basePts.map(p => ({ x: p.x+dx, y: p.y+dy }))
      const bb = pointsBbox(movedPts)
      mapRef.current = { ...m, textureLayers: m.textureLayers.map(t => t.id===id ? {...t, points: movedPts, x: bb.minX, y: bb.minY, w: bb.maxX-bb.minX, h: bb.maxY-bb.minY} : t) }
      dirtyRef.current = true
    } else if (mode === 'tex-rotate') {
      const tex = m.textureLayers?.find(t => t.id===id); if (!tex) return
      const cx = tex.x+tex.w/2; const cy = tex.y+tex.h/2
      const startAngle = Math.atan2(ds.y-cy, ds.x-cx)
      const newRot = (((ds.rotation+(Math.atan2(y-cy,x-cx)-startAngle)*180/Math.PI)%360)+360)%360
      mapRef.current = { ...m, textureLayers: m.textureLayers.map(t => t.id===id ? {...t, rotation:Math.round(newRot)} : t) }
      dirtyRef.current = true
    } else if (mode === 'tex-scale') {
      const delta = ((x-ds.x)+(y-ds.y))/2
      mapRef.current = { ...m, textureLayers: m.textureLayers.map(t => t.id===id ? {...t, w:Math.max(10,Math.round(ds.tw+delta)), h:Math.max(10,Math.round(ds.th+delta))} : t) }
      dirtyRef.current = true
    }
  }

  function handleMouseUp() {
    // ── Brush: confirmar trazo ──
    if (brushStrokeRef.current) {
      const stroke = brushStrokeRef.current
      brushStrokeRef.current = null
      if (stroke.points.length >= 2 && selectedTexture) {
        // Buscar o crear la brush layer para esta textura
        const m = mapRef.current
        let brushLayer = (m.textureLayers || []).find(t => t.type === 'brush' && t.imgUrl === stroke.texture)
        if (!brushLayer) {
          brushLayer = {
            id: Date.now(), type: 'brush', name: `🖌 ${selectedTexture.name}`,
            imgUrl: stroke.texture, scale: 1,
            filter: { brightness: 100, saturate: 100, hue: 0 },
            brushStrokes: []
          }
          mapRef.current = { ...m, textureLayers: [...(m.textureLayers || []), brushLayer] }
        }
        // Añadir el stroke simplificado (redondear coords)
        const simplified = {
          points: stroke.points.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })),
          brushSize: stroke.brushSize,
          feather: stroke.feather,
          eraser: stroke.eraser
        }
        // Invalidar cache de este layer
        Object.keys(brushCacheRef.current).forEach(k => {
          if (k.startsWith(`${brushLayer.id}|`)) delete brushCacheRef.current[k]
        })
        mapRef.current = {
          ...mapRef.current,
          textureLayers: mapRef.current.textureLayers.map(t =>
            t.id === brushLayer.id ? { ...t, brushStrokes: [...(t.brushStrokes || []), simplified] } : t
          )
        }
        dirtyRef.current = true
        setMap({ ...mapRef.current })
        setSelectedTexLayer(brushLayer.id)
        setTimeout(autoSave, 100)
      }
      return
    }

    const mode = dragModeRef.current
    const hadDrag = !!draggingIdRef.current
    dragModeRef.current = null; draggingIdRef.current = null

    if (hadDrag) {
      // Sincronizar estado React con mapRef al soltar
      setMap({ ...mapRef.current })
      setTimeout(autoSave, 50)
    }

    // Los polígonos de niebla y textura NO se cierran al soltar — se cierran con doble click o botón "Cerrar"
  }

  // ── Helpers de mapa (siempre sincronizan mapRef + state) ──
  function updateMap(updater) {
    const next = updater(mapRef.current)
    mapRef.current = next
    dirtyRef.current = true
    setMap(next)
  }

  async function autoSave() {
    const current = mapRef.current; if (!current) return
    await fetch(`/api/dnd/maps/${mapId}`, { method:'PUT', headers, body:JSON.stringify(current) })
    setStatus('Guardado ✓'); setTimeout(() => setStatus(''), 1500)
  }

  function closePolygonFog() {
    const poly = drawingFogRef.current
    if (!poly || poly.points.length < 3) {
      // Cancelar si hay menos de 3 puntos
      drawingFogRef.current = null; setDrawingFog(null)
      return
    }
    const fog = {
      id: Date.now(),
      name: `Capa ${(mapRef.current?.fogLayers||[]).length+1}`,
      points: poly.points.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })),
      visible: false,
      opacity: 1
    }
    updateMap(m => ({ ...m, fogLayers: [...(m.fogLayers||[]), fog] }))
    drawingFogRef.current = null; setDrawingFog(null)
    setSelectedFog(fog.id); setTimeout(autoSave, 100)
  }
  function cancelPolygonFog() {
    drawingFogRef.current = null; setDrawingFog(null)
  }
  function popLastVertex() {
    const poly = drawingFogRef.current
    if (!poly) return
    if (poly.points.length <= 1) { cancelPolygonFog(); return }
    const next = { ...poly, points: poly.points.slice(0, -1) }
    drawingFogRef.current = next; setDrawingFog(next)
  }

  function handleCanvasDoubleClick(e) {
    if (toolRef.current === 'fog' && drawingFogRef.current) {
      e.preventDefault(); e.stopPropagation()
      closePolygonFog()
    }
    if (toolRef.current === 'texture' && drawingTexRef.current) {
      e.preventDefault(); e.stopPropagation()
      closePolygonTex()
    }
  }

  function handleWheel(e) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(z => Math.min(5, Math.max(0.2, Math.round((z + delta) * 10) / 10)))
  }

  function closePolygonTex() {
    const poly = drawingTexRef.current
    if (!poly || poly.points.length < 3 || !selectedTexture) {
      drawingTexRef.current = null; setDrawingTex(null); return
    }
    const pts = poly.points.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }))
    const bb = pointsBbox(pts)
    const tex = {
      id: Date.now(), name: selectedTexture.name, imgUrl: selectedTexture.url,
      points: pts, smooth: false,
      x: bb.minX, y: bb.minY, w: bb.maxX - bb.minX, h: bb.maxY - bb.minY,
      scale: 1, rotation: 0,
      filter: { brightness: 100, saturate: 100, hue: 0 }
    }
    updateMap(m => ({ ...m, textureLayers: [...(m.textureLayers || []), tex] }))
    drawingTexRef.current = null; setDrawingTex(null)
    setSelectedTexLayer(tex.id); setTimeout(autoSave, 100)
  }
  function cancelPolygonTex() {
    drawingTexRef.current = null; setDrawingTex(null)
  }
  function popLastTexVertex() {
    const poly = drawingTexRef.current
    if (!poly) return
    if (poly.points.length <= 1) { cancelPolygonTex(); return }
    const next = { ...poly, points: poly.points.slice(0, -1) }
    drawingTexRef.current = next; setDrawingTex(next)
  }

  function commitTexture(rect) {
    const x=Math.min(rect.x1,rect.x2); const y=Math.min(rect.y1,rect.y2)
    const w=Math.abs(rect.x2-rect.x1); const h=Math.abs(rect.y2-rect.y1)
    if (w<5||h<5||!selectedTexture) return
    const tex = { id:Date.now(), name:selectedTexture.name, imgUrl:selectedTexture.url, x,y,w,h, filter:{brightness:100,saturate:100,hue:0} }
    updateMap(m => ({ ...m, textureLayers:[...(m.textureLayers||[]),tex] }))
    setSelectedTexLayer(tex.id); setTimeout(autoSave,100)
  }
  function toggleFog(id) {
    updateMap(m => ({ ...m, fogLayers:m.fogLayers.map(f => f.id===id?{...f,visible:!f.visible}:f) }))
    setTimeout(autoSave,100)
  }
  function updateFogField(id,field,val) { updateMap(m => ({ ...m, fogLayers:m.fogLayers.map(f => f.id===id?{...f,[field]:val}:f) })) }
  function deleteFog(id) {
    updateMap(m => ({ ...m, fogLayers:m.fogLayers.filter(f => f.id!==id) }))
    if (selectedFogRef.current===id) setSelectedFog(null)
    setTimeout(autoSave,100)
  }
  function updateTexLayer(id,field,val) { updateMap(m => ({ ...m, textureLayers:m.textureLayers.map(t => t.id===id?{...t,[field]:val}:t) })) }
  function updateTexLayerFilter(id,key,val) {
    updateMap(m => ({ ...m, textureLayers:m.textureLayers.map(t => t.id===id?{...t,filter:{...t.filter,[key]:val}}:t) }))
    // invalidar caché de patrones al cambiar filtros
    const tex = mapRef.current?.textureLayers?.find(t=>t.id===id)
    if (tex) Object.keys(patternCache.current).forEach(k => { if(k.startsWith(tex.imgUrl)) delete patternCache.current[k] })
  }
  function deleteTexLayer(id) {
    // Limpiar brush cache si es brush layer
    Object.keys(brushCacheRef.current).forEach(k => { if (k.startsWith(`${id}|`)) delete brushCacheRef.current[k] })
    updateMap(m => ({ ...m, textureLayers:m.textureLayers.filter(t => t.id!==id) }))
    if (selectedTexRef.current===id) setSelectedTexLayer(null)
    setTimeout(autoSave,100)
  }
  function undoBrushStroke(id) {
    const tex = mapRef.current?.textureLayers?.find(t => t.id === id)
    if (!tex || !tex.brushStrokes?.length) return
    Object.keys(brushCacheRef.current).forEach(k => { if (k.startsWith(`${id}|`)) delete brushCacheRef.current[k] })
    updateMap(m => ({ ...m, textureLayers: m.textureLayers.map(t =>
      t.id === id ? { ...t, brushStrokes: t.brushStrokes.slice(0, -1) } : t
    )}))
    setTimeout(autoSave, 100)
  }
  // DnD reorder texturas
  const texDragItemRef = useRef(null); const texDragOverRef = useRef(null)
  function handleTexDragStart(id) { texDragItemRef.current = id }
  function handleTexDragOver(e, id) { e.preventDefault(); texDragOverRef.current = id }
  function handleTexDrop() {
    if (!texDragItemRef.current || !texDragOverRef.current || texDragItemRef.current === texDragOverRef.current) return
    updateMap(m => {
      const layers = [...(m.textureLayers||[])]
      const fi = layers.findIndex(t => t.id === texDragItemRef.current)
      const ti = layers.findIndex(t => t.id === texDragOverRef.current)
      if (fi === -1 || ti === -1) return m
      const [item] = layers.splice(fi, 1); layers.splice(ti, 0, item)
      return { ...m, textureLayers: layers }
    })
    texDragItemRef.current = null; texDragOverRef.current = null
    setTimeout(autoSave, 100)
  }
  function toggleTexLock(id) {
    updateMap(m => ({ ...m, textureLayers:m.textureLayers.map(t => t.id===id?{...t, locked: !t.locked}:t) }))
    setTimeout(autoSave, 100)
  }
  function toggleTexVisible(id) {
    updateMap(m => ({ ...m, textureLayers:(m.textureLayers||[]).map(t => t.id===id?{...t, visible: t.visible === false ? true : false}:t) }))
    setTimeout(autoSave, 100)
  }
  function toggleFogLock(id) {
    updateMap(m => ({ ...m, fogLayers:m.fogLayers.map(f => f.id===id?{...f, locked: !f.locked}:f) }))
    setTimeout(autoSave, 100)
  }

  // Bloqueo masivo
  function lockAllProps(lock) {
    updateMap(m => ({ ...m, props: m.props.map(p => ({...p, locked: lock})) }))
    setTimeout(autoSave, 100)
  }
  function lockAllTextures(lock) {
    updateMap(m => ({ ...m, textureLayers: (m.textureLayers||[]).map(t => ({...t, locked: lock})) }))
    setTimeout(autoSave, 100)
  }
  function lockAllFog(lock) {
    updateMap(m => ({ ...m, fogLayers: (m.fogLayers||[]).map(f => ({...f, locked: lock})) }))
    setTimeout(autoSave, 100)
  }
  function addProp(asset) {
    const canvas = canvasRef.current; const img = new Image(); img.src = asset.url
    img.onload = () => {
      imgCache.current[asset.url] = img
      const prop = { id:Date.now(), label:asset.name, imgUrl:asset.url,
        x:canvas.width/2, y:canvas.height/2, width:img.naturalWidth, height:img.naturalHeight,
        rotation:0, filter:{brightness:100,saturate:100,contrast:100} }
      updateMap(m => ({ ...m, props:[...(m.props||[]),prop] }))
      setSelectedProp(prop.id); setTool('prop')
    }
  }
  function updatePropField(field,val) { updateMap(m => ({ ...m, props:m.props.map(p => p.id===selectedPropRef.current?{...p,[field]:val}:p) })) }
  function togglePropVisible(id) {
    updateMap(m => ({ ...m, props:m.props.map(p => p.id===id?{...p, visible: p.visible === false ? true : false}:p) }))
    setTimeout(autoSave, 100)
  }
  function togglePropLock(id) {
    updateMap(m => ({ ...m, props:m.props.map(p => p.id===id?{...p, locked: !p.locked}:p) }))
    setTimeout(autoSave, 100)
  }
  function renameProp(id,name) { updateMap(m => ({ ...m, props:m.props.map(p => p.id===id?{...p,label:name}:p) })) }
  function copyProp() { const p=mapRef.current?.props?.find(p=>p.id===selectedPropRef.current); if(p) setClipboard({...p}) }
  function pasteProp() {
    if (!clipboard) return
    const np = {...clipboard, id:Date.now(), x:clipboard.x+30, y:clipboard.y+30}
    updateMap(m => ({ ...m, props:[...(m.props||[]),np] })); setSelectedProp(np.id)
  }

  // ── Grupos ───────────────────────────────────────────
  function createGroup() {
    const ids = multiSelRef.current; if (ids.length < 2) return
    const group = { id: Date.now(), name: `Grupo ${((mapRef.current?.groups||[]).length)+1}`, visible: true, propIds: [...ids], texIds: [] }
    updateMap(m => ({ ...m, groups: [...(m.groups||[]), group] }))
    setMultiSelection([]); setTimeout(autoSave, 100)
  }
  function addTexToGroup(groupId, texId) {
    updateMap(m => ({ ...m, groups: m.groups.map(g => g.id===groupId ? {...g, texIds: [...(g.texIds||[]), texId]} : g) }))
    setTimeout(autoSave, 100)
  }
  function removePropFromGroup(groupId, propId) {
    updateMap(m => ({ ...m, groups: m.groups.map(g => g.id===groupId ? {...g, propIds: (g.propIds||[]).filter(id=>id!==propId)} : g) }))
    setTimeout(autoSave, 100)
  }
  function removeTexFromGroup(groupId, texId) {
    updateMap(m => ({ ...m, groups: m.groups.map(g => g.id===groupId ? {...g, texIds: (g.texIds||[]).filter(id=>id!==texId)} : g) }))
    setTimeout(autoSave, 100)
  }
  function toggleGroup(id) {
    updateMap(m => ({ ...m, groups: m.groups.map(g => g.id===id ? {...g, visible:!g.visible} : g) }))
    setTimeout(autoSave, 100)
  }
  function renameGroup(id, name) { updateMap(m => ({ ...m, groups: m.groups.map(g => g.id===id ? {...g,name} : g) })) }
  function deleteGroup(id) {
    updateMap(m => ({ ...m, groups: (m.groups||[]).filter(g => g.id!==id) }))
    setTimeout(autoSave, 100)
  }

  // DnD lista de escena
  const dragItemRef = useRef(null); const dragOverRef = useRef(null)
  function handleDragStart(id) { dragItemRef.current = id }
  function handleDragOver(e,id) { e.preventDefault(); dragOverRef.current = id }
  function handleDrop() {
    if (!dragItemRef.current||!dragOverRef.current||dragItemRef.current===dragOverRef.current) return
    updateMap(m => {
      const props=[...m.props]
      const fi=props.findIndex(p=>p.id===dragItemRef.current); const ti=props.findIndex(p=>p.id===dragOverRef.current)
      if(fi===-1||ti===-1) return m
      const [item]=props.splice(fi,1); props.splice(ti,0,item); return {...m,props}
    })
    dragItemRef.current=null; dragOverRef.current=null; setTimeout(autoSave,100)
  }
  const toggleCollapse = key => setCollapsed(c => ({...c,[key]:!c[key]}))

  function startEditName() {
    setNameDraft(map?.name || '')
    setEditingName(true)
  }
  function commitEditName() {
    const name = nameDraft.trim()
    if (!name || name === map.name) { setEditingName(false); return }
    updateMap(m => ({ ...m, name }))
    setEditingName(false)
    setTimeout(autoSave, 100)
  }
  function cancelEditName() { setEditingName(false) }

  if (!map) return <div className="editor-loading">Cargando mapa...</div>

  const selProp = map?.props?.find(p => p.id === selectedProp)
  const selFog = map?.fogLayers?.find(f => f.id === selectedFog)
  const selTexLayer = map?.textureLayers?.find(t => t.id === selectedTexLayer)

  // Overlay del polígono de niebla en construcción (SVG)
  const fogPolyOverlay = (() => {
    const canvas = canvasRef.current
    if (!canvas || !drawingFog || !drawingFog.points?.length) return null
    const sx = canvas.clientWidth / canvas.width
    const sy = canvas.clientHeight / canvas.height
    const pts = drawingFog.points.map(p => ({ x: p.x * sx, y: p.y * sy }))
    const cursor = drawingFog.cursor ? { x: drawingFog.cursor.x * sx, y: drawingFog.cursor.y * sy } : null
    return { pts, cursor, svgW: canvas.clientWidth, svgH: canvas.clientHeight }
  })()

  // Overlay del polígono de textura en construcción (SVG)
  const texPolyOverlay = (() => {
    const canvas = canvasRef.current
    if (!canvas || !drawingTex || !drawingTex.points?.length) return null
    const sx = canvas.clientWidth / canvas.width
    const sy = canvas.clientHeight / canvas.height
    const pts = drawingTex.points.map(p => ({ x: p.x * sx, y: p.y * sy }))
    const cursor = drawingTex.cursor ? { x: drawingTex.cursor.x * sx, y: drawingTex.cursor.y * sy } : null
    return { pts, cursor, svgW: canvas.clientWidth, svgH: canvas.clientHeight }
  })()

  return (
    <div className="editor-root">
      <div className="editor-topbar">
        <button className="editor-back" onClick={() => navigate('/dnd')}>← Volver</button>
        {editingName ? (
          <input
            className="editor-mapname-input"
            value={nameDraft}
            autoFocus
            onChange={e => setNameDraft(e.target.value)}
            onBlur={commitEditName}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEditName()
              else if (e.key === 'Escape') cancelEditName()
            }}
          />
        ) : (
          <span className="editor-mapname editor-mapname-clickable" onClick={startEditName} title="Click para renombrar">
            {map.name} <span className="editor-mapname-edit-icon">✏</span>
          </span>
        )}
        <div className="editor-topbar-right">
          <span className="editor-status">{status}</span>
          <button className="editor-save-btn" onClick={autoSave}>Guardar</button>
          <button className="editor-viewer-btn" onClick={async () => {
            await autoSave()
            await fetch('/api/dnd/viewer/main', { method:'PUT', headers, body: JSON.stringify({ mode:'map', mapId: parseInt(mapId) }) })
            setStatus('📺 Main ✓'); setTimeout(() => setStatus(''), 1800)
          }}>📺 Main</button>
          <button className="editor-viewer-btn" onClick={async () => {
            await autoSave()
            await fetch('/api/dnd/viewer/tablet', { method:'PUT', headers, body: JSON.stringify({ mode:'map', mapId: parseInt(mapId) }) })
            setStatus('📱 Tablet ✓'); setTimeout(() => setStatus(''), 1800)
          }}>📱 Tablet</button>
          <button className="editor-viewer-btn" title="Rotar visor Main 90°" onClick={async () => {
            const r = await fetch('/api/dnd/viewer/main')
            if (!r.ok) return
            const state = await r.json()
            const next = ((state.rotation || 0) + 90) % 360
            await fetch('/api/dnd/viewer/main/rotate', { method:'PATCH', headers, body: JSON.stringify({ rotation: next }) })
            setStatus(`↻ ${next}°`); setTimeout(() => setStatus(''), 1200)
          }}>↻</button>
          <button className="editor-viewer-btn" style={{opacity:0.65}} onClick={() => window.open('/dnd/viewer/main','_blank')}>🖥</button>
        </div>
      </div>
      <div className="editor-body">

        {/* ── Panel izquierdo ── */}
        <div className="editor-panel">

          {/* Grid / Canvas */}
          <section className="editor-section">
            <div className="section-header" onClick={() => toggleCollapse('grid')}>
              <label className="editor-label" style={{cursor:'pointer',margin:0}}>⬡ Grid y Canvas</label>
              <span className="section-chevron">{collapsed.grid?'▸':'▾'}</span>
            </div>
            {!collapsed.grid && <>
              <label className="editor-label" style={{marginTop:4}}>Hex Size: {map.hexSize}px</label>
              <input type="range" min="20" max="80" value={map.hexSize} className="editor-range"
                onChange={e => { bgCanvas.current=null; updateMap(m=>({...m,hexSize:parseInt(e.target.value)})) }} />
              <label className="editor-checkbox-label">
                <input type="checkbox" checked={map.showGrid}
                  onChange={e => { bgCanvas.current=null; updateMap(m=>({...m,showGrid:e.target.checked})) }} /> Mostrar grid
              </label>
              <div className="editor-grid-color">
                <span className="editor-field-label">Color grid</span>
                <div className="editor-grid-swatches">
                  {['rgba(255,255,255,0.15)','rgba(255,255,255,0.4)','rgba(0,0,0,0.3)','rgba(0,0,0,0.6)'].map((c,i) => (
                    <button key={c} className={`editor-swatch ${(map.gridColor||'rgba(255,255,255,0.08)')===c?'active':''}`}
                      style={{background:['#555','#999','#333','#111'][i]}}
                      onClick={() => { bgCanvas.current=null; updateMap(m=>({...m,gridColor:c})) }} />
                  ))}
                </div>
                <input type="range" min="0" max="100" className="editor-range"
                  value={Math.round((parseFloat((map.gridColor||'rgba(255,255,255,0.08)').split(',')[3])||0.08)*100)}
                  onChange={e => { bgCanvas.current=null; const base=(map.gridColor||'').includes('0,0,0')?'0,0,0':'255,255,255'; updateMap(m=>({...m,gridColor:`rgba(${base},${(e.target.value/100).toFixed(2)})`})) }} />
              </div>
              <div style={{marginTop:8}}>
                <span className="editor-field-label">Tamaño canvas</span>
                <div className="editor-field-row" style={{marginTop:4}}>
                  <span className="editor-field-unit">W</span>
                  <input type="number" className="editor-num-input" min="400" max="8000" step="100" value={map.canvasW||1600}
                    onChange={e => { bgCanvas.current=null; updateMap(m=>({...m,canvasW:Math.max(400,parseInt(e.target.value)||1600)})) }} />
                  <span className="editor-field-unit">H</span>
                  <input type="number" className="editor-num-input" min="300" max="6000" step="100" value={map.canvasH||1000}
                    onChange={e => { bgCanvas.current=null; updateMap(m=>({...m,canvasH:Math.max(300,parseInt(e.target.value)||1000)})) }} />
                </div>
              </div>
            </>}
          </section>

          {/* Herramientas */}
          <section className="editor-section">
            <div className="section-header" onClick={() => toggleCollapse('tools')}>
              <label className="editor-label" style={{cursor:'pointer',margin:0}}>🛠 Herramientas</label>
              <span className="section-chevron">{collapsed.tools?'▸':'▾'}</span>
            </div>
            {!collapsed.tools && <div className="editor-tools">
              {[{id:'fog',icon:'⬛',label:'Niebla'},{id:'texture',icon:'🖼',label:'Textura'},{id:'prop',icon:'✋',label:'Mover'},{id:'erase',icon:'🗑',label:'Borrar'}]
                .map(t => <button key={t.id} className={`editor-tool-btn ${tool===t.id?'active':''}`} onClick={()=>setTool(t.id)}>{t.icon} {t.label}</button>)}
            </div>}
          </section>

          {/* Texturas (panel izquierdo) */}
          <section className="editor-section">
            <div className="section-header" onClick={() => toggleCollapse('leftTex')}>
              <label className="editor-label" style={{cursor:'pointer',margin:0}}>🖼 Texturas ({floorAssets.length})</label>
              <span className="section-chevron">{collapsed.leftTex?'▸':'▾'}</span>
            </div>
            {!collapsed.leftTex && <>
              {/* Sub-selector: Polígono / Pincel */}
              <div className="tex-mode-selector">
                <button className={`tex-mode-btn ${texMode==='polygon'?'active':''}`}
                  onClick={() => { setTexMode('polygon'); setBrushEraser(false) }}>⬡ Polígono</button>
                <button className={`tex-mode-btn ${texMode==='brush'?'active':''}`}
                  onClick={() => { setTexMode('brush'); setBrushEraser(false) }}>🖌 Pincel</button>
              </div>
              {/* Controles del pincel */}
              {texMode === 'brush' && (
                <div className="brush-controls">
                  <div className="editor-filter-row">
                    <span className="editor-filter-label">⊕ Tamaño</span>
                    <input type="range" min="5" max="200" value={brushSize} className="editor-range"
                      onChange={e => setBrushSize(parseInt(e.target.value))} />
                    <input type="number" min="5" max="200" value={brushSize} className="editor-filter-num"
                      onChange={e => setBrushSize(Math.min(200, Math.max(5, parseInt(e.target.value)||40)))} />
                  </div>
                  <div className="editor-filter-row">
                    <span className="editor-filter-label">◎ Degradado</span>
                    <input type="range" min="0" max="0.95" step="0.05" value={brushFeather} className="editor-range"
                      onChange={e => setBrushFeather(parseFloat(e.target.value))} />
                    <span className="editor-filter-num" style={{textAlign:'center',cursor:'default'}}>
                      {brushFeather === 0 ? 'Off' : Math.round(brushFeather * 100) + '%'}
                    </span>
                  </div>
                  <button className={`tex-mode-btn eraser-btn ${brushEraser?'active':''}`}
                    onClick={() => setBrushEraser(v => !v)}>
                    {brushEraser ? '🧽 Borrador ON' : '🧽 Borrador'}
                  </button>
                </div>
              )}
              {/* Galería de texturas */}
              <div className="editor-prop-gallery tex-picker">
                {floorAssets.map(asset => (
                  <button key={asset.url} className={`editor-prop-thumb ${selectedTexture?.url===asset.url?'tex-active':''}`}
                    onClick={() => { setSelectedTexture(asset); setTool('texture') }} title={asset.name}>
                    <img src={asset.url} alt={asset.name} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.fontSize='1.1rem'}} />
                    <span>{asset.name}</span>
                  </button>
                ))}
              </div>
            </>}
          </section>

          {/* Props */}
          <section className="editor-section">
            <div className="section-header" onClick={() => toggleCollapse('props')}>
              <label className="editor-label" style={{cursor:'pointer',margin:0}}>📦 Props ({propAssets.files?.length || 0})</label>
              <span className="section-chevron">{collapsed.props?'▸':'▾'}</span>
            </div>
            {!collapsed.props && <div className="editor-prop-browser">
              {/* Carpetas raíz — siempre visibles */}
              <div className="prop-root-folders">
                {propRootFolders.map(f => (
                  <button key={f.path} className={`prop-root-btn ${activePropFolder === f.path ? 'active' : ''}`}
                    onClick={() => selectPropFolder(f)}>
                    📁 {f.name}
                  </button>
                ))}
              </div>
              {/* Breadcrumb dentro de subcarpetas (solo si estamos más profundo que la raíz) */}
              {activePropFolder && propAssets.path && propAssets.path !== activePropFolder && (
                <div className="prop-breadcrumb">
                  <button className="prop-crumb" onClick={() => { loadPropAssets(activePropFolder) }}>
                    ← {activePropFolder.split('/').pop()}
                  </button>
                  {propAssets.path.replace(activePropFolder + '/', '').split('/').map((seg, i, arr) => (
                    <span key={i}>
                      <span className="prop-crumb-sep"> / </span>
                      <button className="prop-crumb" onClick={() => loadPropAssets(activePropFolder + '/' + arr.slice(0, i + 1).join('/'))}>
                        {seg}
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {/* Contenido: subcarpetas + archivos */}
              {activePropFolder && (
                <div className="editor-prop-gallery">
                  {/* Subcarpetas como items navegables */}
                  {(propAssets.folders || []).map(f => (
                    <button key={f.path} className="editor-prop-thumb prop-subfolder-thumb"
                      onClick={() => loadPropAssets(f.path)} title={f.name}>
                      <span className="prop-subfolder-icon">📁</span>
                      <span>{f.name}</span>
                    </button>
                  ))}
                  {/* Props */}
                  {(propAssets.files || []).map(asset => (
                    <button key={asset.url} className="editor-prop-thumb" onClick={() => addProp(asset)} title={asset.name}>
                      <img src={asset.url} alt={asset.name} loading="lazy" onError={e=>{e.target.style.display='none';e.target.nextSibling.style.fontSize='1.5rem'}} />
                      <span>{asset.name}</span>
                    </button>
                  ))}
                  {(propAssets.files || []).length === 0 && (propAssets.folders || []).length === 0 && (
                    <div className="editor-empty-scene">Carpeta vacía</div>
                  )}
                </div>
              )}
              {!activePropFolder && (
                <div className="editor-empty-scene" style={{marginTop:4}}>Selecciona una categoría</div>
              )}
            </div>}
          </section>

        </div>

        {/* ── Canvas ── */}
        <div className="editor-canvas-wrap" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
          <div className="editor-canvas-zoom" style={{transform: `scale(${zoom})`, transformOrigin: '0 0', width: map.canvasW||1600, height: map.canvasH||1000}}>
          <canvas ref={canvasRef} width={map.canvasW||1600} height={map.canvasH||1000} className="editor-canvas"
            style={{cursor: tool==='fog'||tool==='texture' ? 'crosshair' : 'default'}}
            onMouseDown={handleMouseDown} onDoubleClick={handleCanvasDoubleClick} />
          {fogPolyOverlay && (
            <svg className="fog-poly-overlay" width={fogPolyOverlay.svgW} height={fogPolyOverlay.svgH}
                 viewBox={`0 0 ${fogPolyOverlay.svgW} ${fogPolyOverlay.svgH}`}>
              {/* Polígono cerrado preview (si hay ≥3 puntos + cursor) */}
              {fogPolyOverlay.pts.length >= 2 && fogPolyOverlay.cursor && (
                <polygon
                  points={[...fogPolyOverlay.pts, fogPolyOverlay.cursor].map(p=>`${p.x},${p.y}`).join(' ')}
                  fill="rgba(250,204,21,0.12)" stroke="none" />
              )}
              {/* Líneas entre vértices confirmados */}
              {fogPolyOverlay.pts.length >= 2 && (
                <polyline points={fogPolyOverlay.pts.map(p=>`${p.x},${p.y}`).join(' ')}
                  fill="none" stroke="rgba(250,204,21,0.9)" strokeWidth="2" />
              )}
              {/* Línea del último punto al cursor */}
              {fogPolyOverlay.cursor && fogPolyOverlay.pts.length >= 1 && (
                <line x1={fogPolyOverlay.pts[fogPolyOverlay.pts.length-1].x}
                      y1={fogPolyOverlay.pts[fogPolyOverlay.pts.length-1].y}
                      x2={fogPolyOverlay.cursor.x} y2={fogPolyOverlay.cursor.y}
                      stroke="rgba(250,204,21,0.5)" strokeWidth="1.5" strokeDasharray="4 3" />
              )}
              {/* Vértices */}
              {fogPolyOverlay.pts.map((p,i) => (
                <circle key={i} cx={p.x} cy={p.y} r={i===0 ? 5 : 4}
                  fill={i===0 ? 'rgba(250,204,21,1)' : 'rgba(250,204,21,0.85)'}
                  stroke="#1a1a22" strokeWidth="1.5" />
              ))}
            </svg>
          )}
          {drawingFog && drawingFog.points?.length >= 1 && (
            <div className="fog-poly-toolbar">
              <span className="fog-poly-count">{drawingFog.points.length} punto{drawingFog.points.length!==1?'s':''}</span>
              {drawingFog.points.length >= 3 && (
                <button className="fog-poly-btn fog-poly-btn-ok" onClick={closePolygonFog}>✓ Cerrar</button>
              )}
              {drawingFog.points.length >= 1 && (
                <button className="fog-poly-btn" onClick={popLastVertex} title="Backspace">↶ Quitar</button>
              )}
              <button className="fog-poly-btn fog-poly-btn-cancel" onClick={cancelPolygonFog} title="Esc">✕</button>
            </div>
          )}
          {tool === 'fog' && !drawingFog && (
            <div className="fog-poly-hint">Click para empezar polígono · Doble click o Enter para cerrar · Esc cancela</div>
          )}
          {/* Overlay polígono de textura en construcción */}
          {texPolyOverlay && (
            <svg className="fog-poly-overlay" width={texPolyOverlay.svgW} height={texPolyOverlay.svgH}
                 viewBox={`0 0 ${texPolyOverlay.svgW} ${texPolyOverlay.svgH}`}>
              {texPolyOverlay.pts.length >= 2 && texPolyOverlay.cursor && (
                <polygon
                  points={[...texPolyOverlay.pts, texPolyOverlay.cursor].map(p=>`${p.x},${p.y}`).join(' ')}
                  fill="rgba(99,102,241,0.12)" stroke="none" />
              )}
              {texPolyOverlay.pts.length >= 2 && (
                <polyline points={texPolyOverlay.pts.map(p=>`${p.x},${p.y}`).join(' ')}
                  fill="none" stroke="rgba(99,102,241,0.9)" strokeWidth="2" />
              )}
              {texPolyOverlay.cursor && texPolyOverlay.pts.length >= 1 && (
                <line x1={texPolyOverlay.pts[texPolyOverlay.pts.length-1].x}
                      y1={texPolyOverlay.pts[texPolyOverlay.pts.length-1].y}
                      x2={texPolyOverlay.cursor.x} y2={texPolyOverlay.cursor.y}
                      stroke="rgba(99,102,241,0.5)" strokeWidth="1.5" strokeDasharray="4 3" />
              )}
              {texPolyOverlay.pts.map((p,i) => (
                <circle key={i} cx={p.x} cy={p.y} r={i===0 ? 5 : 4}
                  fill={i===0 ? 'rgba(99,102,241,1)' : 'rgba(99,102,241,0.85)'}
                  stroke="#1a1a22" strokeWidth="1.5" />
              ))}
            </svg>
          )}
          {drawingTex && drawingTex.points?.length >= 1 && (
            <div className="fog-poly-toolbar" style={{borderColor:'rgba(99,102,241,0.4)'}}>
              <span className="fog-poly-count" style={{color:'#a5b4fc'}}>{drawingTex.points.length} punto{drawingTex.points.length!==1?'s':''}</span>
              {drawingTex.points.length >= 3 && (
                <button className="fog-poly-btn fog-poly-btn-ok" onClick={closePolygonTex}>✓ Cerrar</button>
              )}
              {drawingTex.points.length >= 1 && (
                <button className="fog-poly-btn" onClick={popLastTexVertex} title="Backspace">↶ Quitar</button>
              )}
              <button className="fog-poly-btn fog-poly-btn-cancel" onClick={cancelPolygonTex} title="Esc">✕</button>
            </div>
          )}
          {tool === 'texture' && !drawingTex && selectedTexture && texMode === 'polygon' && (
            <div className="fog-poly-hint">Click para empezar polígono de textura · Doble click o Enter para cerrar</div>
          )}
          {tool === 'texture' && !drawingTex && selectedTexture && texMode === 'brush' && (
            <div className="fog-poly-hint" style={{borderColor: brushEraser ? 'rgba(248,113,113,0.3)' : 'rgba(99,102,241,0.3)'}}>
              {brushEraser ? '🧽 Borrador — Arrastra para borrar' : `🖌 Pincel (${brushSize}px) — Arrastra para pintar`}
            </div>
          )}
          {tool === 'texture' && !drawingTex && !selectedTexture && (
            <div className="fog-poly-hint">Selecciona una textura en el panel izquierdo</div>
          )}
          {selProp && (() => {
            const canvas=canvasRef.current; if(!canvas) return null
            const sx=canvas.clientWidth/canvas.width; const sy=canvas.clientHeight/canvas.height
            return <div className="prop-overlay" style={{left:selProp.x*sx,top:selProp.y*sy,width:(selProp.width||80)*sx,height:(selProp.height||80)*sy,transform:`translate(-50%,-50%) rotate(${selProp.rotation||0}deg)`}}>
              <div className="prop-handle prop-handle-rotate" onMouseDown={e=>startHandleDrag(e,'rotate')}>↺</div>
              <div className="prop-handle prop-handle-scale" onMouseDown={e=>startHandleDrag(e,'scale')}>⤢</div>
            </div>
          })()}
          </div>{/* cierre editor-canvas-zoom */}
          <div className="editor-zoom-controls">
            <button className="dnd-btn-sm" onClick={() => setZoom(z => Math.min(5, Math.round((z + 0.2) * 10) / 10))}>+</button>
            <span className="editor-zoom-label">{Math.round(zoom * 100)}%</span>
            <button className="dnd-btn-sm" onClick={() => setZoom(z => Math.max(0.2, Math.round((z - 0.2) * 10) / 10))}>−</button>
            <button className="dnd-btn-sm" onClick={() => setZoom(1)}>1:1</button>
          </div>
        </div>

        {/* ── Panel derecho ── */}
        <div className="editor-panel editor-panel-right">

          <section className="editor-section">
            <div className="section-header" onClick={() => toggleCollapse('fog')}>
              <label className="editor-label" style={{cursor:'pointer',margin:0}}>⬛ Niebla ({(map.fogLayers||[]).length})</label>
              <span className="section-chevron">{collapsed.fog?'▸':'▾'}</span>
            </div>
            {!collapsed.fog && <>
              {(map.fogLayers||[]).length > 0 && (
                <div className="editor-lock-all-bar">
                  {(map.fogLayers||[]).some(f => !f.locked)
                    ? <button className="dnd-btn-sm editor-lock-all-btn" onClick={()=>lockAllFog(true)}>🔒 Bloquear todo</button>
                    : <button className="dnd-btn-sm editor-lock-all-btn" onClick={()=>lockAllFog(false)}>🔓 Desbloquear todo</button>
                  }
                </div>
              )}
              {!(map.fogLayers||[]).length && <div className="editor-empty-scene">Sin capas — usa ⬛ Niebla</div>}
              <div className="editor-scene-list">
                {(map.fogLayers||[]).map(fog => {
                  const isSel = selectedFog===fog.id
                  const isLocked = !!fog.locked
                  return <div key={fog.id} className={`editor-scene-item ${isSel?'selected':''} ${fog.visible?'fog-visible':''} ${isLocked?'prop-locked':''}`}
                    onClick={() => setSelectedFog(isSel?null:fog.id)}>
                    <span className="editor-scene-icon">{fog.visible?'👁':'⬛'}</span>
                    <span className="editor-scene-name">{fog.name}</span>
                    <div className="editor-scene-actions">
                      <button onClick={e=>{e.stopPropagation();toggleFogLock(fog.id)}} title={isLocked?'Desbloquear':'Bloquear'}>{isLocked?'🔒':'🔓'}</button>
                      <button onClick={e=>{e.stopPropagation();toggleFog(fog.id)}}>{fog.visible?'⬛':'👁'}</button>
                      <button className="editor-scene-del" onClick={e=>{e.stopPropagation();deleteFog(fog.id)}}>✕</button>
                    </div>
                  </div>
                })}
              </div>
              {selFog && (() => {
                const selPts = fogToPoints(selFog) || []
                const bb = selPts.length ? pointsBbox(selPts) : null
                return <div className="fog-inspector">
                <input className="editor-input-name" value={selFog.name||''} placeholder="Nombre..." onChange={e=>updateFogField(selFog.id,'name',e.target.value)} />
                <div className="editor-inspector-field">
                  <span className="editor-field-label">Opacidad</span>
                  <div className="editor-field-row">
                    <input type="range" min="0" max="1" step="0.05" value={selFog.opacity??1} className="editor-range" onChange={e=>updateFogField(selFog.id,'opacity',parseFloat(e.target.value))} />
                    <input type="number" min="0" max="1" step="0.05" value={selFog.opacity??1} className="editor-filter-num" onChange={e=>updateFogField(selFog.id,'opacity',Math.min(1,Math.max(0,parseFloat(e.target.value)||0)))} />
                  </div>
                </div>
                <div className="editor-inspector-field">
                  <span className="editor-field-label">Geometría</span>
                  <div style={{fontSize:'0.72rem',color:'#8b7d5c',padding:'4px 0'}}>
                    {selPts.length} vértice{selPts.length!==1?'s':''}
                    {bb && <> · {Math.round(bb.maxX-bb.minX)} × {Math.round(bb.maxY-bb.minY)}px</>}
                  </div>
                </div>
                <div className="editor-prop-actions-row">
                  <button className={`editor-prop-action-btn ${selFog.visible?'zone-btn-hide':'zone-btn-show'}`} onClick={()=>toggleFog(selFog.id)}>{selFog.visible?'⬛ Ocultar':'👁 Revelar'}</button>
                  <button className="editor-prop-action-btn" style={selFog.locked?{color:'#f59e0b',borderColor:'rgba(245,158,11,0.4)'}:{}} onClick={()=>toggleFogLock(selFog.id)}>
                    {selFog.locked ? '🔒' : '🔓'}
                  </button>
                  <button className="editor-prop-action-btn" style={{color:'#f87171'}} onClick={()=>deleteFog(selFog.id)}>✕ Borrar</button>
                </div>
              </div>
              })()}
            </>}
          </section>
          <div className="editor-section-divider" />

          <section className="editor-section">
            <div className="section-header" onClick={() => toggleCollapse('scene')}>
              <label className="editor-label" style={{cursor:'pointer',margin:0}}>🏛 Escena ({(map.props||[]).length})</label>
              <span className="section-chevron">{collapsed.scene?'▸':'▾'}</span>
            </div>
            {!collapsed.scene && <>
              <div className="editor-lock-all-bar">
                {(map.props||[]).some(p => !p.locked)
                  ? <button className="dnd-btn-sm editor-lock-all-btn" onClick={e=>{e.stopPropagation();lockAllProps(true)}}>🔒 Bloquear todo</button>
                  : <button className="dnd-btn-sm editor-lock-all-btn" onClick={e=>{e.stopPropagation();lockAllProps(false)}}>🔓 Desbloquear todo</button>
                }
              </div>
              <div className="editor-scene-list" onDragOver={e=>e.preventDefault()}>
              {[...(map.props||[])].reverse().map(prop => {
                const isSel = prop.id===selectedProp
                const isHidden = prop.visible === false
                const isLocked = !!prop.locked
                return <div key={prop.id} className={`editor-scene-item ${isSel?'selected':''} ${isHidden?'prop-hidden':''} ${isLocked?'prop-locked':''}`}
                  draggable={!isLocked} onDragStart={()=>handleDragStart(prop.id)} onDragOver={e=>handleDragOver(e,prop.id)} onDrop={handleDrop}
                  onClick={()=>{setSelectedProp(isSel?null:prop.id);setSelectedFog(null)}}>
                  <span className="editor-scene-drag">⠿</span>
                  <span className="editor-scene-name">{prop.label||'Prop'}</span>
                  <div className="editor-scene-actions">
                    <button onClick={e=>{e.stopPropagation();togglePropLock(prop.id)}} title={isLocked?'Desbloquear':'Bloquear'}>{isLocked?'🔒':'🔓'}</button>
                    <button onClick={e=>{e.stopPropagation();togglePropVisible(prop.id)}} title={isHidden?'Mostrar':'Ocultar'}>{isHidden?'🙈':'👁'}</button>
                    <button className="editor-scene-del" onClick={e=>{e.stopPropagation();updateMap(m=>({...m,props:m.props.filter(p=>p.id!==prop.id)}));if(isSel)setSelectedProp(null)}}>✕</button>
                  </div>
                </div>
              })}
            </div>
            </>}
          </section>
          <div className="editor-section-divider" />

          {selProp && <section className="editor-section">
            <div className="section-header" onClick={() => toggleCollapse('inspector')}>
              <label className="editor-label" style={{cursor:'pointer',margin:0}}>🔧 Inspector</label>
              <span className="section-chevron">{collapsed.inspector?'▸':'▾'}</span>
            </div>
            {!collapsed.inspector && <div className="editor-prop-inspector">
              <input className="editor-input-name" value={selProp.label||''} onChange={e=>renameProp(selProp.id,e.target.value)} placeholder="Nombre..." />
              <div className="editor-inspector-field">
                <span className="editor-field-label">Rotación</span>
                <div className="editor-field-row">
                  <input type="number" className="editor-num-input" value={selProp.rotation||0} onChange={e=>updatePropField('rotation',Math.round(parseFloat(e.target.value)||0))} />
                  <span className="editor-field-unit">°</span>
                </div>
                <div className="editor-presets">{[0,45,90,135,180,270].map(d=><button key={d} className="editor-preset-btn" onClick={()=>updatePropField('rotation',d)}>{d}</button>)}</div>
              </div>
              <div className="editor-inspector-field">
                <span className="editor-field-label">Tamaño</span>
                <div className="editor-field-row">
                  <span className="editor-field-unit">W</span><input type="number" className="editor-num-input" value={selProp.width||80} onChange={e=>updatePropField('width',Math.round(parseFloat(e.target.value)||10))} />
                  <span className="editor-field-unit">H</span><input type="number" className="editor-num-input" value={selProp.height||80} onChange={e=>updatePropField('height',Math.round(parseFloat(e.target.value)||10))} />
                </div>
              </div>
              <div className="editor-inspector-field">
                <span className="editor-field-label">Posición</span>
                <div className="editor-field-row">
                  <span className="editor-field-unit">X</span><input type="number" className="editor-num-input" value={Math.round(selProp.x||0)} onChange={e=>updatePropField('x',parseFloat(e.target.value)||0)} />
                  <span className="editor-field-unit">Y</span><input type="number" className="editor-num-input" value={Math.round(selProp.y||0)} onChange={e=>updatePropField('y',parseFloat(e.target.value)||0)} />
                </div>
              </div>
              <div className="editor-inspector-field">
                <span className="editor-field-label">Imagen</span>
                {[{key:'brightness',label:'☀'},{key:'saturate',label:'🎨'},{key:'contrast',label:'◑'}].map(({key,label}) => {
                  const val=(selProp.filter||{})[key]??100
                  return <div key={key} className="editor-filter-row">
                    <span className="editor-filter-label">{label}</span>
                    <input type="range" min="0" max="300" value={val} className="editor-range" onChange={e=>updatePropField('filter',{...(selProp.filter||{}),[key]:parseInt(e.target.value)})} />
                    <input type="number" min="0" max="300" value={val} className="editor-filter-num" onChange={e=>updatePropField('filter',{...(selProp.filter||{}),[key]:Math.min(300,Math.max(0,parseInt(e.target.value)||0))})} />
                  </div>
                })}
                <button className="editor-btn-reset" onClick={()=>updatePropField('filter',{brightness:100,saturate:100,contrast:100})}>Reset imagen</button>
              </div>
              <div className="editor-prop-actions-row">
                <button className="editor-prop-action-btn" onClick={copyProp}>📋 Copiar</button>
                <button className="editor-prop-action-btn" onClick={pasteProp} disabled={!clipboard}>📌 Pegar</button>
                <button className="editor-prop-action-btn" onClick={()=>togglePropVisible(selProp.id)}>
                  {selProp.visible === false ? '🙈 Oculto' : '👁 Visible'}
                </button>
                <button className="editor-prop-action-btn" onClick={()=>togglePropLock(selProp.id)} style={selProp.locked?{color:'#f59e0b',borderColor:'rgba(245,158,11,0.4)'}:{}}>
                  {selProp.locked ? '🔒 Bloqueado' : '🔓 Libre'}
                </button>
              </div>
              <button className="editor-prop-delete" onClick={()=>{updateMap(m=>({...m,props:m.props.filter(p=>p.id!==selectedProp)}));setSelectedProp(null)}}>Eliminar</button>
            </div>}
          </section>}
          <div className="editor-section-divider" />

          <section className="editor-section">
            <div className="section-header" onClick={() => toggleCollapse('textures')}>
              <label className="editor-label" style={{cursor:'pointer',margin:0}}>🖼 Texturas ({(map.textureLayers||[]).length})</label>
              <span className="section-chevron">{collapsed.textures?'▸':'▾'}</span>
            </div>
            {!collapsed.textures && <>
              {(map.textureLayers||[]).length > 0 && (
                <div className="editor-lock-all-bar">
                  {(map.textureLayers||[]).some(t => !t.locked)
                    ? <button className="dnd-btn-sm editor-lock-all-btn" onClick={()=>lockAllTextures(true)}>🔒 Bloquear todo</button>
                    : <button className="dnd-btn-sm editor-lock-all-btn" onClick={()=>lockAllTextures(false)}>🔓 Desbloquear todo</button>
                  }
                </div>
              )}
              {!(map.textureLayers||[]).length && <div className="editor-empty-scene">Sin capas — dibuja con 🖼 Textura</div>}
              <div className="editor-scene-list" style={{marginTop:6}} onDragOver={e=>e.preventDefault()}>
                {(map.textureLayers||[]).map(tex => {
                  const isSel = selectedTexLayer===tex.id
                  const isLocked = !!tex.locked
                  const isHidden = tex.visible === false
                  return <div key={tex.id} className={`editor-scene-item ${isSel?'selected':''} ${isLocked?'prop-locked':''} ${isHidden?'prop-hidden':''}`}
                    draggable={!isLocked}
                    onDragStart={()=>handleTexDragStart(tex.id)}
                    onDragOver={e=>handleTexDragOver(e,tex.id)}
                    onDrop={handleTexDrop}
                    onClick={()=>setSelectedTexLayer(isSel?null:tex.id)}>
                    <span className="editor-scene-drag">⠿</span>
                    <img src={tex.imgUrl} style={{width:20,height:20,objectFit:'cover',borderRadius:3,flexShrink:0}} alt="" />
                    <span className="editor-scene-name">{tex.type==='brush'?'🖌 ':''}{tex.name}</span>
                    <div className="editor-scene-actions">
                      <button onClick={e=>{e.stopPropagation();toggleTexVisible(tex.id)}} title={isHidden?'Mostrar':'Ocultar'}>{isHidden?'🙈':'👁'}</button>
                      <button onClick={e=>{e.stopPropagation();toggleTexLock(tex.id)}} title={isLocked?'Desbloquear':'Bloquear'}>{isLocked?'🔒':'🔓'}</button>
                      <button className="editor-scene-del" onClick={e=>{e.stopPropagation();deleteTexLayer(tex.id)}}>✕</button>
                    </div>
                  </div>
                })}
              </div>
              {selTexLayer && (() => {
                const isBrush = selTexLayer.type === 'brush'
                const selPts = isBrush ? [] : (texToPoints(selTexLayer) || [])
                const bb = selPts.length ? pointsBbox(selPts) : null
                return <div className="fog-inspector" style={{borderColor:'rgba(99,102,241,0.3)'}}>
                <input className="editor-input-name" value={selTexLayer.name||''} placeholder="Nombre..." onChange={e=>updateTexLayer(selTexLayer.id,'name',e.target.value)} />
                {isBrush ? (
                  <>
                    <div className="editor-inspector-field">
                      <span className="editor-field-label">Trazos</span>
                      <div style={{fontSize:'0.72rem',color:'#8b7d5c',padding:'4px 0'}}>
                        {selTexLayer.brushStrokes?.length || 0} trazo{(selTexLayer.brushStrokes?.length||0)!==1?'s':''}
                      </div>
                    </div>
                    {(selTexLayer.brushStrokes?.length||0) > 0 && (
                      <button className="editor-prop-action-btn" style={{width:'100%',marginBottom:6,color:'#fbbf24',borderColor:'rgba(251,191,36,0.3)'}}
                        onClick={()=>undoBrushStroke(selTexLayer.id)}>
                        ↶ Deshacer último trazo
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="editor-inspector-field">
                      <span className="editor-field-label">Geometría</span>
                      <div style={{fontSize:'0.72rem',color:'#8b7d5c',padding:'4px 0'}}>
                        {selPts.length} vértice{selPts.length!==1?'s':''}
                        {bb && <> · {Math.round(bb.maxX-bb.minX)} × {Math.round(bb.maxY-bb.minY)}px</>}
                      </div>
                    </div>
                    <button className="editor-prop-action-btn" style={{width:'100%',marginBottom:6,color:'#a5b4fc'}}
                      onClick={()=>{const cw=map.canvasW||1600;const ch=map.canvasH||1000;updateMap(m=>({...m,textureLayers:m.textureLayers.map(t=>t.id===selTexLayer.id?{...t,points:[{x:0,y:0},{x:cw,y:0},{x:cw,y:ch},{x:0,y:ch}],x:0,y:0,w:cw,h:ch,smooth:false}:t)}))}}>
                      ⛶ Cubrir canvas
                    </button>
                    <label className="editor-checkbox-label">
                      <input type="checkbox" checked={selTexLayer.smooth || false}
                        onChange={e => updateTexLayer(selTexLayer.id, 'smooth', e.target.checked)} /> ∿ Suavizar curvas (Bézier)
                    </label>
                  </>
                )}
                {[{key:'brightness',label:'☀ Brillo',min:0,max:300},{key:'saturate',label:'🎨 Sat',min:0,max:300},{key:'hue',label:'🌈 Tono',min:0,max:360}].map(({key,label,min,max}) => {
                  const val=(selTexLayer.filter||{})[key]??(key==='hue'?0:100)
                  return <div key={key} className="editor-filter-row">
                    <span className="editor-filter-label">{label}</span>
                    <input type="range" min={min} max={max} value={val} className="editor-range" onChange={e=>updateTexLayerFilter(selTexLayer.id,key,parseFloat(e.target.value))} />
                    <input type="number" min={min} max={max} value={val} className="editor-filter-num" onChange={e=>updateTexLayerFilter(selTexLayer.id,key,Math.min(max,Math.max(min,parseFloat(e.target.value)||0)))} />
                  </div>
                })}
                <div className="editor-filter-row">
                  <span className="editor-filter-label">⬜ Escala tile</span>
                  <input type="range" min="0.1" max="5" step="0.05" value={selTexLayer.scale||1} className="editor-range"
                    onChange={e=>{const v=parseFloat(e.target.value);const k=`${selTexLayer.imgUrl}|${selTexLayer.scale||1}`;delete patternCache.current[k];updateTexLayer(selTexLayer.id,'scale',v)}} />
                  <input type="number" min="0.1" max="5" step="0.05" value={selTexLayer.scale||1} className="editor-filter-num"
                    onChange={e=>{const v=Math.min(5,Math.max(0.1,parseFloat(e.target.value)||1));const k=`${selTexLayer.imgUrl}|${selTexLayer.scale||1}`;delete patternCache.current[k];updateTexLayer(selTexLayer.id,'scale',v)}} />
                </div>
                <button className="editor-prop-action-btn" style={{color:'#f87171',width:'100%',marginTop:4}} onClick={()=>deleteTexLayer(selTexLayer.id)}>✕ Borrar capa</button>
                <button className="editor-prop-action-btn" style={{width:'100%',marginTop:4,...(selTexLayer.locked?{color:'#f59e0b',borderColor:'rgba(245,158,11,0.4)'}:{})}} onClick={()=>toggleTexLock(selTexLayer.id)}>
                  {selTexLayer.locked ? '🔒 Bloqueada' : '🔓 Libre'}
                </button>
                <button className="editor-prop-action-btn" style={{width:'100%',marginTop:4}} onClick={()=>toggleTexVisible(selTexLayer.id)}>
                  {selTexLayer.visible === false ? '🙈 Oculta' : '👁 Visible'}
                </button>
                {(map.groups||[]).length > 0 && (
                  <div className="editor-group-add-bar">
                    <span style={{fontSize:'0.72rem',color:'#8b7d5c'}}>Añadir a grupo:</span>
                    {(map.groups||[]).map(g => (
                      <button key={g.id} className="dnd-btn-sm" style={{fontSize:'0.68rem'}}
                        disabled={(g.texIds||[]).includes(selTexLayer.id)}
                        onClick={()=>addTexToGroup(g.id, selTexLayer.id)}>
                        {(g.texIds||[]).includes(selTexLayer.id) ? '✓' : '+'} {g.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              })()}
            </>}
          </section>

          <div className="editor-section-divider" />

          {/* Grupos */}
          <section className="editor-section">
            <div className="section-header" onClick={() => toggleCollapse('groups')}>
              <label className="editor-label" style={{cursor:'pointer',margin:0}}>🗂 Grupos ({(map.groups||[]).length})</label>
              <span className="section-chevron">{collapsed.groups?'▸':'▾'}</span>
            </div>
            {!collapsed.groups && <>
              {multiSelection.length >= 2 && (
                <button className="editor-prop-action-btn" style={{width:'100%',marginBottom:6,color:'#6ee7b7',borderColor:'rgba(110,231,183,0.3)'}}
                  onClick={createGroup}>
                  + Agrupar {multiSelection.length} seleccionados
                </button>
              )}
              {multiSelection.length === 1 && <div className="editor-empty-scene">Shift+click para añadir más props</div>}
              {multiSelection.length === 0 && !(map.groups||[]).length && <div className="editor-empty-scene">Shift+click props para seleccionar</div>}
              <div className="editor-scene-list">
                {(map.groups||[]).map(group => {
                  const propCount = (group.propIds||[]).length
                  const texCount = (group.texIds||[]).length
                  const totalCount = propCount + texCount
                  const isExpanded = expandedGroups[group.id]
                  return (
                    <div key={group.id} className="editor-group-block">
                      <div className={`editor-scene-item ${!group.visible?'fog-visible':''}`} onClick={()=>setExpandedGroups(prev=>({...prev,[group.id]:!prev[group.id]}))}>
                        <span className="dnd-chevron" style={{fontSize:'0.7rem'}}>{isExpanded?'▾':'▸'}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <input className="editor-scene-name" style={{background:'transparent',border:'none',outline:'none',color:'#c8a96e',width:'100%',padding:0,cursor:'text'}}
                            value={group.name} onChange={e=>renameGroup(group.id,e.target.value)} onClick={e=>e.stopPropagation()} />
                          <div style={{fontSize:'0.65rem',color:'#555'}}>{propCount} prop{propCount!==1?'s':''}{texCount > 0 ? ` · ${texCount} tex` : ''}</div>
                        </div>
                        <div className="editor-scene-actions">
                          <button onClick={e=>{e.stopPropagation();toggleGroup(group.id)}}>{group.visible?'🙈':'👁'}</button>
                          <button className="editor-scene-del" onClick={e=>{e.stopPropagation();deleteGroup(group.id)}}>✕</button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="editor-group-contents">
                          {(group.propIds||[]).map(pid => {
                            const prop = map.props?.find(p=>p.id===pid)
                            if (!prop) return null
                            return (
                              <div key={pid} className="editor-group-member">
                                <span className="editor-group-member-icon">📦</span>
                                <span className="editor-group-member-name">{prop.label||'Prop'}</span>
                                <button className="editor-group-member-remove" onClick={()=>removePropFromGroup(group.id,pid)} title="Sacar del grupo">↗</button>
                              </div>
                            )
                          })}
                          {(group.texIds||[]).map(tid => {
                            const tex = map.textureLayers?.find(t=>t.id===tid)
                            if (!tex) return null
                            return (
                              <div key={tid} className="editor-group-member">
                                <span className="editor-group-member-icon">🖼</span>
                                <span className="editor-group-member-name">{tex.name||'Textura'}</span>
                                <button className="editor-group-member-remove" onClick={()=>removeTexFromGroup(group.id,tid)} title="Sacar del grupo">↗</button>
                              </div>
                            )
                          })}
                          {totalCount === 0 && <div className="dnd-empty-sm" style={{padding:'4px 8px'}}>Grupo vacío</div>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>}
          </section>

        </div>
      </div>
    </div>
  )
}
