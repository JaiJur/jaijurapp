import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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

export default function Minis() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    fetch('/api/minis')
      .then(r => r.json())
      .then(data => setProductos(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  const irHome = () => { if (user?.role === 'master') navigate('/') }

  return (
    <div className="minis-root">
      <MinisHeader user={user} navigate={navigate} />

      <main className="minis-main">
        {loading ? null : productos.length === 0 ? (
          <div className="minis-empty">Todavía no hay miniaturas publicadas.</div>
        ) : (
          <div className="minis-grid">
            {productos.map(p => (
              <button key={p.id} className={`minis-card ${p.estado}`} onClick={() => navigate(`/minis/${p.id}`)}>
                <div className="minis-card-photo">
                  {p.fotos?.[0] ? <img src={p.fotos[0]} alt={p.nombre} /> : <PhotoIcon />}
                  <span className={`minis-badge ${p.estado}`}>{ESTADO_LABEL[p.estado] || p.estado}</span>
                </div>
                <div className="minis-card-body">
                  <p className="minis-card-name">{p.nombre}</p>
                  <p className="minis-card-juego">{p.juego || '—'}</p>
                  <p className={`minis-card-precio ${p.estado === 'vendida' ? 'tachado' : ''}`}>{p.precio} €</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
      <MinisFooter navigate={navigate} />
    </div>
  )
}
