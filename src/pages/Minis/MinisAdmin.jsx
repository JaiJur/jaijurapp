import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AppHeader from '../../components/AppHeader'
import './MinisAdmin.css'

const hdrs = (uid) => ({ 'Content-Type': 'application/json', 'x-user-id': uid })
const ESTADOS = [
  { v: 'disponible', label: 'Disponible' },
  { v: 'reservada', label: 'Reservada' },
  { v: 'pintando', label: 'Pintando' },
  { v: 'vendida', label: 'Vendida' },
]

const VACIO = { nombre: '', juego: '', descripcion: '', precio: '', estado: 'disponible', fotos: [], enlaces: [] }

function Icon({ path }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={path}/></svg>
}

export default function MinisAdmin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [productos, setProductos] = useState([])
  const [vista, setVista] = useState('lista') // lista | formulario | galeria
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(VACIO)
  const [subiendo, setSubiendo] = useState(false)
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [guardandoWa, setGuardandoWa] = useState(false)
  const fileRef = useRef(null)
  const cameraRef = useRef(null)
  const [trabajos, setTrabajos] = useState([])
  const [subiendoTrabajo, setSubiendoTrabajo] = useState(false)
  const trabajoFileRef = useRef(null)
  const trabajoCameraRef = useRef(null)

  const cargarTrabajos = () => fetch('/api/minis/trabajos').then(r => r.json()).then(setTrabajos)
  useEffect(() => { cargarTrabajos() }, [])

  const cargar = () => fetch('/api/minis').then(r => r.json()).then(setProductos)
  useEffect(() => { cargar() }, [])
  useEffect(() => { fetch('/api/minis/config').then(r => r.json()).then(d => { setWhatsapp(d.whatsapp || ''); setEmail(d.email || '') }) }, [])

  // Si venimos de la ficha pública con ?editar=<id>, abrir el formulario directamente
  useEffect(() => {
    const editar = searchParams.get('editar')
    if (editar && productos.length > 0) {
      const p = productos.find(pr => String(pr.id) === editar)
      if (p) {
        abrirEditar(p)
        setSearchParams({}, { replace: true })
      }
    }
  }, [productos])

  const guardarWhatsapp = async () => {
    setGuardandoWa(true)
    await fetch('/api/minis/config', { method: 'PUT', headers: hdrs(user.id), body: JSON.stringify({ whatsapp, email }) })
    setGuardandoWa(false)
  }

  const abrirNuevo = () => { setForm(VACIO); setEditId(null); setVista('formulario') }
  const abrirEditar = (p) => {
    setForm({ ...VACIO, ...p, precio: String(p.precio) })
    setEditId(p.id)
    setVista('formulario')
  }
  const cancelar = () => { setVista('lista'); setForm(VACIO); setEditId(null) }

  const guardar = async () => {
    if (!form.nombre.trim()) return alert('El nombre es obligatorio')
    const body = { ...form, precio: Number(form.precio) || 0 }
    const url = editId ? `/api/minis/${editId}` : '/api/minis'
    const method = editId ? 'PUT' : 'POST'
    await fetch(url, { method, headers: hdrs(user.id), body: JSON.stringify(body) })
    await cargar()
    cancelar()
  }

  const borrar = async (id) => {
    if (!confirm('¿Borrar esta miniatura?')) return
    await fetch(`/api/minis/${id}`, { method: 'DELETE', headers: hdrs(user.id) })
    await cargar()
  }

  const subirFotos = async (e) => {
    const inputEl = e.target
    const files = Array.from(inputEl.files || [])
    if (!files.length) return
    setSubiendo(true)
    let fallos = 0
    try {
      for (const file of files) {
        try {
          const url = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
            reader.onload = async () => {
              try {
                const res = await fetch('/api/minis/upload', {
                  method: 'POST',
                  headers: hdrs(user.id),
                  body: JSON.stringify({ data: reader.result, filename: file.name }),
                })
                if (!res.ok) throw new Error('Error al subir')
                const data = await res.json()
                resolve(data.url || null)
              } catch (err) { reject(err) }
            }
            reader.readAsDataURL(file)
          })
          if (url) setForm(f => ({ ...f, fotos: [...f.fotos, url] }))
        } catch (err) {
          console.error('Error subiendo foto', file.name, err)
          fallos++
        }
      }
    } finally {
      setSubiendo(false)
      if (inputEl) inputEl.value = ''
    }
    if (fallos > 0) alert(`${fallos} foto${fallos === 1 ? '' : 's'} no se ${fallos === 1 ? 'pudo' : 'pudieron'} subir. Prueba a subirla${fallos === 1 ? '' : 's'} de nuevo.`)
  }

  const quitarFoto = (i) => setForm(f => ({ ...f, fotos: f.fotos.filter((_, idx) => idx !== i) }))

  const addEnlace = () => setForm(f => ({ ...f, enlaces: [...f.enlaces, { tienda: '', url: '' }] }))
  const setEnlace = (i, key, val) => setForm(f => ({ ...f, enlaces: f.enlaces.map((e, idx) => idx === i ? { ...e, [key]: val } : e) }))
  const quitarEnlace = (i) => setForm(f => ({ ...f, enlaces: f.enlaces.filter((_, idx) => idx !== i) }))

  const subirTrabajos = async (e) => {
    const inputEl = e.target
    const files = Array.from(inputEl.files || [])
    if (!files.length) return
    setSubiendoTrabajo(true)
    let fallos = 0
    try {
      for (const file of files) {
        try {
          const url = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
            reader.onload = async () => {
              try {
                const res = await fetch('/api/minis/upload', {
                  method: 'POST',
                  headers: hdrs(user.id),
                  body: JSON.stringify({ data: reader.result, filename: file.name }),
                })
                if (!res.ok) throw new Error('Error al subir')
                const data = await res.json()
                resolve(data.url || null)
              } catch (err) { reject(err) }
            }
            reader.readAsDataURL(file)
          })
          if (url) {
            await fetch('/api/minis/trabajos', { method: 'POST', headers: hdrs(user.id), body: JSON.stringify({ url, titulo: '' }) })
          }
        } catch (err) {
          console.error('Error subiendo trabajo', file.name, err)
          fallos++
        }
      }
    } finally {
      setSubiendoTrabajo(false)
      if (inputEl) inputEl.value = ''
      await cargarTrabajos()
    }
    if (fallos > 0) alert(`${fallos} foto${fallos === 1 ? '' : 's'} no se ${fallos === 1 ? 'pudo' : 'pudieron'} subir.`)
  }

  const renombrarTrabajo = async (id, titulo) => {
    await fetch(`/api/minis/trabajos/${id}`, { method: 'PUT', headers: hdrs(user.id), body: JSON.stringify({ titulo }) })
  }

  const borrarTrabajo = async (id) => {
    if (!confirm('¿Quitar esta foto de la galería de servicios?')) return
    await fetch(`/api/minis/trabajos/${id}`, { method: 'DELETE', headers: hdrs(user.id) })
    await cargarTrabajos()
  }

  return (
    <div className="ma-root">
      <AppHeader appName="Miniaturas · Gestión" />
      <main className="ma-main">
        <button className="ma-back" onClick={() => navigate('/minis')}>
          <Icon path="M19 12H5M12 19l-7-7 7-7" />
          Volver al catálogo
        </button>

        {vista === 'lista' && (
          <>
            <div className="ma-field ma-whatsapp-config">
              <label className="ma-label">Contacto (WhatsApp y email)</label>
              <div className="ma-contact-row">
                <input className="ma-input" placeholder="+34600000000" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
                <input className="ma-input" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                <button className="ma-btn-secondary" onClick={guardarWhatsapp} disabled={guardandoWa}>
                  {guardandoWa ? '...' : 'Guardar'}
                </button>
              </div>
            </div>

            <div className="ma-toolbar">
              <span className="ma-title">{productos.length} producto{productos.length === 1 ? '' : 's'}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="ma-btn-secondary" onClick={() => setVista('galeria')}>Galería servicios</button>
                <button className="ma-btn-primary" onClick={abrirNuevo}>
                  <Icon path="M12 5v14M5 12h14" />Nueva
                </button>
              </div>
            </div>

            {productos.length === 0 ? (
              <div className="ma-empty">Todavía no has añadido ninguna miniatura.</div>
            ) : (
              <div className="ma-list">
                {productos.map(p => (
                  <div key={p.id} className="ma-row">
                    <div className="ma-row-photo">
                      {p.fotos?.[0] ? <img src={p.fotos[0]} alt="" /> : <Icon path="M3 5h18v14H3zM8 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM21 15l-5-5-9 9" />}
                    </div>
                    <div className="ma-row-info">
                      <p className="ma-row-name">{p.nombre}</p>
                      <p className="ma-row-meta">{p.juego || '—'} · {p.precio} € · {p.estado}</p>
                    </div>
                    <div className="ma-row-actions">
                      <button className="ma-icon-btn" onClick={() => navigate(`/minis/${p.id}`)} aria-label="Ver">
                        <Icon path="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                      </button>
                      <button className="ma-icon-btn" onClick={() => abrirEditar(p)} aria-label="Editar">
                        <Icon path="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                      </button>
                      <button className="ma-icon-btn danger" onClick={() => borrar(p.id)} aria-label="Borrar">
                        <Icon path="M3 6h18M8 6V4h8v2m-1 0v14a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V6h8z" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {vista === 'formulario' && (
          <>
            <div className="ma-toolbar">
              <span className="ma-title">{editId ? 'Editar miniatura' : 'Nueva miniatura'}</span>
            </div>

            <div className="ma-field">
              <label className="ma-label">Nombre</label>
              <input className="ma-input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Caballero Gris" />
            </div>

            <div className="ma-row2">
              <div className="ma-field">
                <label className="ma-label">Juego / facción</label>
                <input className="ma-input" value={form.juego} onChange={e => setForm(f => ({ ...f, juego: e.target.value }))} placeholder="Warhammer 40.000" />
              </div>
              <div className="ma-field">
                <label className="ma-label">Precio (€)</label>
                <input className="ma-input" type="number" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} placeholder="25" />
              </div>
            </div>

            <div className="ma-field">
              <label className="ma-label">Estado</label>
              <select className="ma-select" value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                {ESTADOS.map(e => <option key={e.v} value={e.v}>{e.label}</option>)}
              </select>
            </div>

            <div className="ma-field">
              <label className="ma-label">Descripción</label>
              <textarea className="ma-textarea" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Técnica de pintado, peana, escala..." />
            </div>

            <div className="ma-field">
              <label className="ma-label">Fotos</label>
              <div className="ma-photos">
                {form.fotos.map((f, i) => (
                  <div key={i} className="ma-photo-thumb">
                    <img src={f} alt="" />
                    <button className="ma-photo-remove" onClick={() => quitarFoto(i)} aria-label="Quitar foto">
                      <Icon path="M18 6L6 18M6 6l12 12" />
                    </button>
                  </div>
                ))}
                <button className="ma-upload-btn" onClick={() => cameraRef.current?.click()} disabled={subiendo} aria-label="Hacer foto">
                  <Icon path={subiendo ? 'M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8' : 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'} />
                </button>
                <button className="ma-upload-btn" onClick={() => fileRef.current?.click()} disabled={subiendo} aria-label="Elegir de galería">
                  <Icon path={subiendo ? 'M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8' : 'M12 5v14M5 12h14'} />
                </button>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={subirFotos} />
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple style={{ display: 'none' }} onChange={subirFotos} />
              </div>
              <p className="ma-hint">
                <Icon path="M12 8v4M12 16h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />
                Cámara para hacer una foto, galería para elegir varias a la vez
              </p>
            </div>

            <div className="ma-field">
              <label className="ma-label">Enlaces a tiendas externas</label>
              {form.enlaces.map((e, i) => (
                <div key={i} className="ma-enlace-row">
                  <input className="ma-input" style={{ maxWidth: 110 }} placeholder="Wallapop" value={e.tienda} onChange={ev => setEnlace(i, 'tienda', ev.target.value)} />
                  <input className="ma-input" placeholder="https://..." value={e.url} onChange={ev => setEnlace(i, 'url', ev.target.value)} />
                  <button className="ma-icon-btn danger" onClick={() => quitarEnlace(i)} aria-label="Quitar enlace"><Icon path="M18 6L6 18M6 6l12 12" /></button>
                </div>
              ))}
              <button className="ma-btn-secondary" onClick={addEnlace}>+ Añadir enlace</button>
            </div>

            <div className="ma-form-actions">
              <button className="ma-btn-secondary" onClick={cancelar}>Cancelar</button>
              <button className="ma-btn-primary" onClick={guardar}>Guardar</button>
            </div>
          </>
        )}

        {vista === 'galeria' && (
          <>
            <div className="ma-toolbar">
              <span className="ma-title">Galería de servicios ({trabajos.length})</span>
              <button className="ma-btn-secondary" onClick={() => setVista('lista')}>← Volver</button>
            </div>

            <div className="ma-photos">
              {trabajos.map(t => (
                <div key={t.id} className="ma-photo-thumb" style={{ width: 84, height: 84 }}>
                  <img src={t.url} alt={t.titulo || ''} />
                  <button className="ma-photo-remove" onClick={() => borrarTrabajo(t.id)} aria-label="Quitar">
                    <Icon path="M18 6L6 18M6 6l12 12" />
                  </button>
                </div>
              ))}
              <button className="ma-upload-btn" onClick={() => trabajoCameraRef.current?.click()} disabled={subiendoTrabajo} aria-label="Hacer foto" style={{ width: 84, height: 84 }}>
                <Icon path={subiendoTrabajo ? 'M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8' : 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'} />
              </button>
              <button className="ma-upload-btn" onClick={() => trabajoFileRef.current?.click()} disabled={subiendoTrabajo} aria-label="Elegir de galería" style={{ width: 84, height: 84 }}>
                <Icon path={subiendoTrabajo ? 'M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8' : 'M12 5v14M5 12h14'} />
              </button>
              <input ref={trabajoCameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={subirTrabajos} />
              <input ref={trabajoFileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple style={{ display: 'none' }} onChange={subirTrabajos} />
            </div>

            {trabajos.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <label className="ma-label">Títulos (opcional)</label>
                {trabajos.map(t => (
                  <div key={t.id} className="ma-enlace-row">
                    <div className="ma-photo-thumb" style={{ width: 36, height: 36, flexShrink: 0 }}><img src={t.url} alt="" /></div>
                    <input
                      className="ma-input"
                      placeholder="Título (opcional)"
                      defaultValue={t.titulo}
                      onBlur={(ev) => renombrarTrabajo(t.id, ev.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
