import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import MinisHeader from './MinisHeader'
import MinisFooter from './MinisFooter'
import './Minis.css'

const ESTADO_LABEL = {
  disponible: 'Disponible',
  reservada: 'Reservada',
  pintando: 'Pintando',
  vendida: 'Vendida',
}

function PhotoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <circle cx="9" cy="10" r="2"/>
      <path d="M21 15l-4.5-4.5a2 2 0 0 0-2.8 0L5 19"/>
    </svg>
  )
}

export default function MiniDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [producto, setProducto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fotoActiva, setFotoActiva] = useState(0)
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const touchX = useRef(null)

  useEffect(() => {
    fetch('/api/minis/config').then(r => r.json()).then(d => { setWhatsapp(d.whatsapp || ''); setEmail(d.email || '') })
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/minis/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setProducto(data); setFotoActiva(0) })
      .catch(() => setProducto(null))
      .finally(() => setLoading(false))
  }, [id])

  const fotos0 = producto?.fotos || []
  const siguienteFoto = () => setFotoActiva(i => (i + 1) % fotos0.length)
  const anteriorFoto = () => setFotoActiva(i => (i - 1 + fotos0.length) % fotos0.length)

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (touchX.current == null) return
    const delta = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(delta) > 40 && fotos0.length > 1) {
      if (delta < 0) siguienteFoto()
      else anteriorFoto()
    }
    touchX.current = null
  }

  if (loading) return <div className="minis-root" />
  if (!producto) {
    return (
      <div className="minis-root">
        <MinisHeader user={user} navigate={navigate} />
        <main className="minis-main">
          <button className="minis-back" onClick={() => navigate('/minis')}>← Volver al catálogo</button>
          <div className="minis-empty">Miniatura no encontrada.</div>
        </main>
        <MinisFooter navigate={navigate} />
      </div>
    )
  }

  const vendida = producto.estado === 'vendida'
  const fotos = producto.fotos || []

  return (
    <div className="minis-root">
      <MinisHeader
        user={user}
        navigate={navigate}
        rightLabel="Editar"
        rightIcon="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"
        onRightClick={() => navigate(`/minis/gestion?editar=${producto.id}`)}
      />
      <main className="minis-main">
        <button className="minis-back" onClick={() => navigate('/minis')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Volver al catálogo
        </button>

        <div className="minis-detail-layout">
          <div className="minis-detail-gallery">
            <div className="minis-detail-gallery-main" onClick={() => fotos.length > 0 && setLightboxOpen(true)} role={fotos.length > 0 ? 'button' : undefined} aria-label={fotos.length > 0 ? 'Ver foto a pantalla completa' : undefined}>
              {fotos[fotoActiva] ? <img src={fotos[fotoActiva]} alt={producto.nombre} /> : <PhotoIcon />}
            </div>
            {fotos.length > 1 && (
              <div className="minis-detail-thumbs">
                {fotos.map((f, i) => (
                  <button key={i} className={`minis-thumb ${i === fotoActiva ? 'active' : ''}`} onClick={() => setFotoActiva(i)}>
                    <img src={f} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="minis-detail-info">
            <span className={`minis-badge ${producto.estado}`}>{ESTADO_LABEL[producto.estado] || producto.estado}</span>
            <p className="minis-detail-juego">{producto.juego}</p>
            <h1 className="minis-detail-name">{producto.nombre}</h1>
            {producto.descripcion && <p className="minis-detail-desc">{producto.descripcion}</p>}
            <p className={`minis-detail-precio ${vendida ? 'tachado' : ''}`}>{producto.precio} €</p>

            {vendida ? (
              <div className="minis-sold-notice">Esta miniatura ya está vendida</div>
            ) : (
              <div className="minis-links">
                {(producto.enlaces || []).map((e, i) => (
                  <a key={i} className="minis-link-btn" href={e.url} target="_blank" rel="noreferrer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    Ver en {e.tienda}
                  </a>
                ))}
              </div>
            )}

            {whatsapp && (
              <a
                className="minis-link-btn minis-whatsapp-btn"
                href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola! Te escribo por la miniatura "${producto.nombre}" que vi en jaijur.com/minis`)}`}
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.4 0-.5C11.5 9 11 7.8 10.8 7.3c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1s1 2.5 1.1 2.6c.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.7-.7 1.9-1.3.2-.6.2-1.1.2-1.3-.1-.1-.2-.2-.5-.3z"/><path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.3c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.2.8.9-3.1-.2-.3C4 14.9 3.6 13.5 3.6 12c0-4.6 3.8-8.4 8.4-8.4s8.4 3.8 8.4 8.4-3.8 8.3-8.4 8.3z"/></svg>
                Escríbeme por WhatsApp
              </a>
            )}

            {email && (
              <a
                className="minis-link-btn minis-email-btn"
                href={`mailto:${email}?subject=${encodeURIComponent(`Consulta por "${producto.nombre}"`)}&body=${encodeURIComponent(`Hola! Te escribo por la miniatura "${producto.nombre}" que vi en jaijur.com/minis`)}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>
                Escríbeme por email
              </a>
            )}
          </div>
        </div>
      </main>
      <MinisFooter navigate={navigate} />

      {lightboxOpen && fotos.length > 0 && (
        <div className="minis-lightbox" onClick={() => setLightboxOpen(false)}>
          <button className="minis-lightbox-close" onClick={() => setLightboxOpen(false)} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>

          <img
            src={fotos[fotoActiva]}
            alt={producto.nombre}
            className="minis-lightbox-img"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          />

          {fotos.length > 1 && (
            <>
              <button className="minis-lightbox-arrow left" onClick={(e) => { e.stopPropagation(); anteriorFoto() }} aria-label="Foto anterior">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button className="minis-lightbox-arrow right" onClick={(e) => { e.stopPropagation(); siguienteFoto() }} aria-label="Foto siguiente">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
              <div className="minis-lightbox-count">{fotoActiva + 1} / {fotos.length}</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
