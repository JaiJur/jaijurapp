import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import MinisHeader from './MinisHeader'
import MinisFooter from './MinisFooter'
import MinisLightbox from './MinisLightbox'
import './Minis.css'

function PhotoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <circle cx="9" cy="10" r="2"/>
      <path d="M21 15l-4.5-4.5a2 2 0 0 0-2.8 0L5 19"/>
    </svg>
  )
}

export default function MinisServicios() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [trabajos, setTrabajos] = useState([])
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [lightboxIndex, setLightboxIndex] = useState(null)

  useEffect(() => {
    fetch('/api/minis/trabajos').then(r => r.json()).then(d => setTrabajos(Array.isArray(d) ? d : []))
    fetch('/api/minis/config').then(r => r.json()).then(d => { setWhatsapp(d.whatsapp || ''); setEmail(d.email || '') })
  }, [])


  return (
    <div className="minis-root">
      <MinisHeader user={user} navigate={navigate} />

      <main className="minis-main">
        <button className="minis-back" onClick={() => navigate('/minis')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Volver al catálogo
        </button>

        <h1 className="minis-detail-name">Pintura de miniaturas por encargo</h1>
        <p className="minis-detail-desc">
          Pinto miniaturas a mano con acabado profesional: capa base, sombreados, luces y detalles finales, con la técnica y el nivel de acabado que necesites, desde piezas para jugar hasta miniaturas de exhibición.
        </p>
        <p className="minis-detail-desc">
          Trabajo con miniaturas propias o que me envíes, de cualquier juego o fabricante (Warhammer, D&D, Kingdom Death, Frostgrave...). Aquí abajo tienes algunos trabajos ya terminados.
        </p>

        {trabajos.length === 0 ? (
          <div className="minis-empty">Todavía no hay trabajos publicados en la galería.</div>
        ) : (
          <div className="minis-grid servicios-grid">
            {trabajos.map((t, i) => (
              <button key={t.id} className="minis-card" onClick={() => setLightboxIndex(i)}>
                <div className="minis-card-photo">
                  {t.url ? <img src={t.url} alt={t.titulo || 'Trabajo realizado'} /> : <PhotoIcon />}
                </div>
                {t.titulo && (
                  <div className="minis-card-body">
                    <p className="minis-card-name">{t.titulo}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="servicios-contacto">
          <p className="minis-detail-juego">¿Quieres pedir presupuesto o preguntar algo?</p>
          {whatsapp && (
            <a
              className="minis-link-btn minis-whatsapp-btn"
              href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hola! Te escribo por el servicio de pintura de miniaturas que vi en jaijur.com/minis')}`}
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
              href={`mailto:${email}?subject=${encodeURIComponent('Consulta sobre el servicio de pintura')}&body=${encodeURIComponent('Hola! Te escribo por el servicio de pintura de miniaturas que vi en jaijur.com/minis')}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>
              Escríbeme por email
            </a>
          )}
        </div>
      </main>
      <MinisFooter navigate={navigate} />

      {lightboxIndex !== null && trabajos[lightboxIndex] && (
        <MinisLightbox
          items={trabajos.map(t => ({ url: t.url, alt: t.titulo || 'Trabajo realizado' }))}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
