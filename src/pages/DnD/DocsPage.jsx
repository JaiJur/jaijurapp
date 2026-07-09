import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AppHeader from '../../components/AppHeader'
import CampaignDocumentation from './components/CampaignDocumentation'
import './DnD.css'

export default function DocsPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const isMaster = user?.role === 'master' || user?.role === 'dndMaster'
  const headers = { 'Content-Type': 'application/json', 'x-user-id': user?.id }
  const docRef = useRef(null)
  const [editing, setEditing] = useState(false)

  const [state, setState] = useState({ loading: true, error: null, data: null })

  useEffect(() => {
    if (authLoading || !isMaster) return
    let cancelled = false
    setState({ loading: true, error: null, data: null })
    fetch(`/api/dnd/docs/${slug}`, { headers })
      .then(async r => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'No encontrado')
        return r.json()
      })
      .then(data => { if (!cancelled) setState({ loading: false, error: null, data }) })
      .catch(e => { if (!cancelled) setState({ loading: false, error: e.message, data: null }) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, authLoading, isMaster])

  if (authLoading) {
    return <div className="dnd-root"><div className="dnd-bg" /><AppHeader /><main className="dnd-main"><p style={{color:'#a89a80'}}>Cargando…</p></main></div>
  }

  if (!isMaster) {
    return (
      <div className="dnd-root">
        <div className="dnd-bg" />
        <AppHeader />
        <main className="dnd-main">
          <p style={{ color: '#d97' }}>No tienes permiso para ver esta página.</p>
          <button className="dnd-btn-sm" onClick={() => navigate('/dnd')}>← Volver a D&amp;D</button>
        </main>
      </div>
    )
  }

  return (
    <div className="dnd-root">
      <div className="dnd-bg" />
      <AppHeader />
      <main className="dnd-main dnd-docs-page-main">
        <div className="dnd-docs-page-header">
          <div className="dnd-docs-page-title">
            {state.data && (
              <h1 className="dnd-title" style={{ fontSize: '1.4rem' }}>
                {state.data.type === 'chapter'
                  ? `${state.data.name} - ${state.data.campaignName}`
                  : state.data.name}
              </h1>
            )}
          </div>
          {state.data && (
            <button
              type="button"
              className="dnd-btn-sm dnd-docs-edit-btn"
              onClick={() => docRef.current?.toggleEditing()}
            >
              {editing ? '✓ Listo' : '✏️ Editar'}
            </button>
          )}
        </div>

        {state.loading && <p style={{ color: '#a89a80' }}>Cargando documentación…</p>}
        {state.error && <p style={{ color: '#d97' }}>⚠️ {state.error}</p>}

        {state.data && (
          <CampaignDocumentation
            ref={docRef}
            key={slug}
            saveUrl={state.data.saveUrl}
            initialPages={state.data.pages}
            initialFolders={state.data.folders}
            headers={headers}
            onEditingChange={setEditing}
          />
        )}
      </main>
    </div>
  )
}
