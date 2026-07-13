import { useState, useRef } from 'react'

function distancia(touches) {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.hypot(dx, dy)
}

function centro(touches) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  }
}

export default function MinisLightbox({ items, index, onIndexChange, onClose }) {
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [animando, setAnimando] = useState(false)
  const pinch = useRef(null)
  const swipeX = useRef(null)

  const total = items.length
  const item = items[index]
  if (!item) return null

  const siguiente = () => onIndexChange((index + 1) % total)
  const anterior = () => onIndexChange((index - 1 + total) % total)

  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinch.current = {
        startDist: distancia(e.touches),
        startScale: scale,
        startCenter: centro(e.touches),
        startTranslate: translate,
      }
      swipeX.current = null
    } else if (e.touches.length === 1 && scale === 1) {
      swipeX.current = e.touches[0].clientX
    }
  }

  const onTouchMove = (e) => {
    if (e.touches.length === 2 && pinch.current) {
      e.preventDefault()
      const d = distancia(e.touches)
      const nextScale = Math.min(4, Math.max(1, pinch.current.startScale * (d / pinch.current.startDist)))
      const c = centro(e.touches)
      const dx = c.x - pinch.current.startCenter.x
      const dy = c.y - pinch.current.startCenter.y
      setScale(nextScale)
      setTranslate({ x: pinch.current.startTranslate.x + dx, y: pinch.current.startTranslate.y + dy })
    }
  }

  const onTouchEnd = (e) => {
    if (pinch.current) {
      if (e.touches.length < 2) {
        pinch.current = null
        setAnimando(true)
        setScale(1)
        setTranslate({ x: 0, y: 0 })
        setTimeout(() => setAnimando(false), 200)
      }
      return
    }
    if (swipeX.current != null && e.changedTouches?.length) {
      const delta = e.changedTouches[0].clientX - swipeX.current
      if (Math.abs(delta) > 40 && total > 1) {
        if (delta < 0) siguiente()
        else anterior()
      }
      swipeX.current = null
    }
  }

  return (
    <div className="minis-lightbox" onClick={onClose}>
      <button className="minis-lightbox-close" onClick={onClose} aria-label="Cerrar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>

      <img
        src={item.url}
        alt={item.alt || ''}
        className="minis-lightbox-img"
        style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`, transition: animando ? 'transform .2s ease' : 'none' }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />

      {total > 1 && scale === 1 && (
        <>
          <button className="minis-lightbox-arrow left" onClick={(e) => { e.stopPropagation(); anterior() }} aria-label="Anterior">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button className="minis-lightbox-arrow right" onClick={(e) => { e.stopPropagation(); siguiente() }} aria-label="Siguiente">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <div className="minis-lightbox-count">{index + 1} / {total}</div>
        </>
      )}
    </div>
  )
}
