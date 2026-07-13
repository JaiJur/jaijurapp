import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import MinisHeader from './MinisHeader'
import MinisFooter from './MinisFooter'
import './Minis.css'

export default function MinisLegal() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="minis-root">
      <MinisHeader user={user} navigate={navigate} />

      <main className="minis-main">
        <button className="minis-back" onClick={() => navigate('/minis')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Volver al catálogo
        </button>

        <h1 className="minis-detail-name">Privacidad</h1>
        <p className="minis-detail-desc">
          Esta página es un proyecto personal para mostrar y vender miniaturas pintadas a mano. No usa cookies de seguimiento ni analíticas, y no guarda ningún dato personal de quien la visita.
        </p>
        <p className="minis-detail-desc">
          Los botones de contacto (WhatsApp y email) abren directamente esas aplicaciones externas para escribir un mensaje. Esa conversación queda en WhatsApp o en tu correo, no pasa ni se almacena en este servidor. Cada uno de esos servicios tiene su propia política de privacidad.
        </p>
        <p className="minis-detail-desc">
          Los enlaces a tiendas externas (Wallapop u otras) llevan a plataformas de terceros con sus propias condiciones y políticas, ajenas a esta web.
        </p>
      </main>

      <MinisFooter navigate={navigate} />
    </div>
  )
}
