import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import AppHeader from '../../components/AppHeader'
import './Notes.css'

const API = (path) => `/api/notes${path}`
const hdrs = (uid) => ({ 'Content-Type': 'application/json', 'x-user-id': uid })
const DEBOUNCE_MS = 600

export default function Notes() {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])
  const [selected, setSelected] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const debounceRef = useRef(null)
  const selectedRef = useRef(null)
  const titleRef = useRef('')

  selectedRef.current = selected

  const load = useCallback(async () => {
    const res = await fetch(API(''), { headers: hdrs(user.id) })
    if (res.ok) setNotes(await res.json())
  }, [user.id])

  useEffect(() => { load() }, [load])

  // ── Autosave: ONLY body changes trigger this ──
  const autosaveBody = useCallback((newBody, sel) => {
    clearTimeout(debounceRef.current)
    // only autosave if note already exists (not 'new')
    if (sel === 'new' || !sel?.id) return
    setSaveStatus('saving')
    debounceRef.current = setTimeout(async () => {
      try {
        await fetch(API(`/${sel.id}`), {
          method: 'PUT',
          headers: hdrs(user.id),
          body: JSON.stringify({ title: titleRef.current.trim(), body: newBody.trim() }),
        })
        setSaveStatus('saved')
        load()
        setTimeout(() => setSaveStatus(s => s === 'saved' ? '' : s), 1500)
      } catch { setSaveStatus('') }
    }, DEBOUNCE_MS)
  }, [user.id, load])

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  const changeTitle = (v) => {
    setTitle(v)
    titleRef.current = v
    // no autosave — title is saved on close
  }
  const changeBody = (v) => {
    setBody(v)
    autosaveBody(v, selectedRef.current)
  }

  const openNew = () => {
    setSelected('new')
    setTitle('')
    setBody('')
    titleRef.current = ''
    setSaveStatus('')
  }

  const openNote = (note) => {
    setSelected(note)
    setTitle(note.title)
    setBody(note.body)
    titleRef.current = note.title
    setSaveStatus('')
  }

  // ── Close: create new note or save title changes ──
  const close = async () => {
    clearTimeout(debounceRef.current)
    const sel = selectedRef.current
    const t = titleRef.current.trim()

    if (sel === 'new' && t) {
      // create the note on close
      await fetch(API(''), {
        method: 'POST',
        headers: hdrs(user.id),
        body: JSON.stringify({ title: t, body: body.trim() }),
      })
      await load()
    } else if (sel && sel !== 'new' && t && t !== sel.title) {
      // title changed — save it
      await fetch(API(`/${sel.id}`), {
        method: 'PUT',
        headers: hdrs(user.id),
        body: JSON.stringify({ title: t, body: body.trim() }),
      })
      await load()
    }

    setSelected(null)
    setSaveStatus('')
  }

  const remove = async () => {
    const sel = selectedRef.current
    if (!sel || sel === 'new') return
    if (!confirm('¿Eliminar esta nota?')) return
    await fetch(API(`/${sel.id}`), {
      method: 'DELETE',
      headers: hdrs(user.id),
    })
    await load()
    setSelected(null)
    setSaveStatus('')
  }

  const fmtDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="notes-root">
      <AppHeader />
      <main className="notes-main">
        <div className="notes-toolbar">
          <button className="notes-btn-new" onClick={openNew}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Nueva nota
          </button>
        </div>

        <div className="notes-grid">
          {notes.length === 0 && (
            <div className="notes-empty">Sin notas todavía — ¡crea una!</div>
          )}
          {notes.map(n => (
            <div key={n.id} className="note-card" onClick={() => openNote(n)}>
              <div className="note-card-title">{n.title}</div>
              {n.body && <div className="note-card-preview">{n.body}</div>}
              <div className="note-card-date">{fmtDate(n.updatedAt)}</div>
            </div>
          ))}
        </div>

        {selected && (
          <div className="notes-overlay" onClick={(e) => { if (e.target === e.currentTarget) close() }}>
            <div className="notes-modal">
              <input
                className="notes-modal-title-input"
                placeholder="Título"
                value={title}
                onChange={e => changeTitle(e.target.value)}
                autoFocus={selected === 'new'}
              />
              <div className="notes-modal-body">
                <textarea
                  className="notes-modal-body-input"
                  placeholder="Escribe tu nota…"
                  value={body}
                  onChange={e => changeBody(e.target.value)}
                />
              </div>
              <div className="notes-modal-footer">
                <span className="notes-modal-date">
                  {saveStatus === 'saving' && '⟳ Guardando…'}
                  {saveStatus === 'saved' && '✓ Guardado'}
                  {!saveStatus && selected !== 'new' && fmtDate(selected.updatedAt)}
                </span>
                <div className="notes-modal-actions">
                  {selected !== 'new' && (
                    <button className="notes-btn notes-btn-del" onClick={remove}>Eliminar</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
