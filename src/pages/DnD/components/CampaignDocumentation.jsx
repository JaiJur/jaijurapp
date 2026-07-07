import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { generateHTML } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'

// Normaliza initialPages a un array [{id, html, name}] válido, aceptando:
// - array nuevo [{id, html, name}]
// - string legado (documentación antigua de una sola página)
// - undefined/null (documentación nueva vacía)
function normalizePages(initialPages) {
  if (Array.isArray(initialPages) && initialPages.length > 0) {
    return initialPages.map((p, i) => ({
      id: p?.id ?? (Date.now() + i),
      html: typeof p?.html === 'string' ? p.html : '',
      name: (typeof p?.name === 'string' && p.name.trim()) ? p.name.trim() : null
    }))
  }
  if (typeof initialPages === 'string' && initialPages.trim()) {
    return [{ id: 1, html: initialPages, name: null }]
  }
  return [{ id: Date.now(), html: '', name: null }]
}



export default function CampaignDocumentation({ saveUrl, initialPages, headers }) {
  const [pages, setPages] = useState(() => normalizePages(initialPages))
  const [activeIdx, setActiveIdx] = useState(0)
  const [editing, setEditing] = useState(false)
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved
  const saveTimer = useRef(null)
  const isFirstLoad = useRef(true)
  const activeIdxRef = useRef(0)
  const dragIdRef = useRef(null)
  const tabsContainerRef = useRef(null)
  const touchStartRef = useRef(null)

  useEffect(() => { activeIdxRef.current = activeIdx }, [activeIdx])

  const saveNow = useCallback(async (pagesToSave) => {
    setSaveState('saving')
    try {
      await fetch(saveUrl, {
        method: 'PUT', headers, body: JSON.stringify({ pages: pagesToSave })
      })
      setSaveState('saved')
      setTimeout(() => setSaveState(s => (s === 'saved' ? 'idle' : s)), 1500)
    } catch (e) {
      console.error('save documentation error:', e)
      setSaveState('idle')
    }
  }, [saveUrl, headers])

  const scheduleSave = useCallback((pagesToSave) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveNow(pagesToSave), 1200)
  }, [saveNow])

  const editorExtensions = [
    StarterKit.configure({
      heading: { levels: [1, 2] } // Título (H1) y subtítulo (H2)
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
      // Permite marcar/desmarcar checkboxes incluso en modo lectura (editable: false).
      onReadOnlyChecked: (node, checked) => {
        if (!editor) return false
        const { state, view } = editor
        let pos = null
        state.doc.descendants((n, p) => {
          if (pos !== null) return false
          if (n === node) { pos = p; return false }
        })
        if (pos === null) return false
        const tr = state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, checked })
        view.dispatch(tr)
        const html = editor.getHTML()
        setPages(prev => {
          const next = [...prev]
          next[activeIdxRef.current] = { ...next[activeIdxRef.current], html }
          scheduleSave(next)
          return next
        })
        return true
      }
    }),
    Placeholder.configure({
      placeholder: 'Escribe aquí la documentación...'
    })
  ]

  const editor = useEditor({
    extensions: editorExtensions,
    content: pages[0]?.html || '',
    editable: false,
    onUpdate: ({ editor }) => {
      if (isFirstLoad.current) { isFirstLoad.current = false; return }
      const html = editor.getHTML()
      setPages(prev => {
        const next = [...prev]
        next[activeIdxRef.current] = { ...next[activeIdxRef.current], html }
        scheduleSave(next)
        return next
      })
    }
  })

  const goToPage = useCallback((idx) => {
    if (!editor) return
    setPages(prev => {
      if (idx < 0 || idx >= prev.length || idx === activeIdxRef.current) return prev
      setActiveIdx(idx)
      editor.commands.setContent(prev[idx]?.html || '', false)
      if (editing) editor.commands.focus('end')
      return prev
    })
  }, [editor, editing])

  // Mantiene la pestaña activa visible en el scroll horizontal del paginador.
  useEffect(() => {
    const el = tabsContainerRef.current?.querySelector('.dnd-docs-pager-tab.active')
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeIdx])

  // Swipe táctil sobre el contenido para cambiar de página (solo en modo lectura,
  // para no interferir con la selección de texto al editar).
  const handleTouchStart = useCallback((e) => {
    if (editing) return
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY }
  }, [editing])

  const handleTouchEnd = useCallback((e) => {
    if (editing || !touchStartRef.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStartRef.current.x
    const dy = t.clientY - touchStartRef.current.y
    touchStartRef.current = null
    const SWIPE_THRESHOLD = 55
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goToPage(activeIdxRef.current + 1) // swipe a la izquierda → página siguiente
      else goToPage(activeIdxRef.current - 1) // swipe a la derecha → página anterior
    }
  }, [editing, goToPage])

  const addPage = useCallback(() => {
    if (!editor) return
    setPages(prev => {
      const newPage = { id: Date.now(), html: '', name: null }
      const next = [...prev, newPage]
      const newIdx = next.length - 1
      setActiveIdx(newIdx)
      editor.commands.setContent('', false)
      saveNow(next)
      return next
    })
  }, [editor, saveNow])

  // Salto de página: todo el contenido desde el cursor en adelante pasa a una página nueva,
  // insertada justo después de la actual. Lo anterior al cursor se queda en la página actual.
  const insertPageBreak = useCallback(() => {
    if (!editor) return
    const { state } = editor
    const pos = state.selection.from
    const docSize = state.doc.content.size
    if (pos <= 0 || pos >= docSize) return // nada que partir (cursor al principio o al final)

    const beforeHTML = generateHTML(state.doc.cut(0, pos).toJSON(), editorExtensions)
    const afterHTML = generateHTML(state.doc.cut(pos, docSize).toJSON(), editorExtensions)

    if (saveTimer.current) clearTimeout(saveTimer.current)
    setPages(prev => {
      const idx = activeIdxRef.current
      const next = [...prev]
      next[idx] = { ...next[idx], html: beforeHTML }
      next.splice(idx + 1, 0, { id: Date.now(), html: afterHTML, name: null })
      saveNow(next)
      return next
    })
    editor.commands.setContent(beforeHTML, false)
    editor.commands.focus('end')
  }, [editor, saveNow, editorExtensions])

  const deletePage = useCallback((idx) => {
    setPages(prev => {
      if (prev.length <= 1) return prev
      if (!window.confirm('¿Borrar esta página? Se perderá su contenido.')) return prev
      const next = prev.filter((_, i) => i !== idx)
      let newActive = activeIdxRef.current
      if (idx === activeIdxRef.current) {
        newActive = Math.max(0, idx - 1)
      } else if (idx < activeIdxRef.current) {
        newActive = activeIdxRef.current - 1
      }
      setActiveIdx(newActive)
      if (editor) editor.commands.setContent(next[newActive]?.html || '', false)
      saveNow(next)
      return next
    })
  }, [editor, saveNow])

  const renamePage = useCallback((idx) => {
    setPages(prev => {
      const current = prev[idx]
      const currentName = current?.name || String(idx + 1)
      const input = window.prompt('Nombre de la página (ej. "Rumores", "PNJs"):', currentName)
      if (input === null) return prev // cancelado
      const trimmed = input.trim()
      const next = [...prev]
      next[idx] = { ...next[idx], name: trimmed || null }
      saveNow(next)
      return next
    })
  }, [saveNow])

  const reorderPages = useCallback((fromId, toId) => {
    setPages(prev => {
      if (fromId === toId) return prev
      const ids = prev.map(p => p.id)
      const fromIdx = ids.indexOf(fromId)
      const toIdx = ids.indexOf(toId)
      if (fromIdx === -1 || toIdx === -1) return prev
      const activePageId = prev[activeIdxRef.current]?.id
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      const newActive = next.findIndex(p => p.id === activePageId)
      if (newActive !== -1) setActiveIdx(newActive)
      saveNow(next)
      return next
    })
  }, [saveNow])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editing)
    if (editing) editor.commands.focus('end')
  }, [editing, editor])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  if (!editor) return null

  return (
    <div className="dnd-campaign-docs">
      <div className="dnd-docs-toolbar-row">
        {editing && (
          <div className="dnd-docs-toolbar">
            <button type="button" className={editor.isActive('heading', { level: 1 }) ? 'active' : ''}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Título">T1</button>
            <button type="button" className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Subtítulo">T2</button>
            <button type="button" className={editor.isActive('paragraph') ? 'active' : ''}
              onClick={() => editor.chain().focus().setParagraph().run()} title="Cuerpo de texto">¶</button>
            <span className="dnd-docs-sep" />
            <button type="button" className={editor.isActive('bold') ? 'active' : ''}
              onClick={() => editor.chain().focus().toggleBold().run()} title="Negrita"><b>B</b></button>
            <button type="button" className={editor.isActive('italic') ? 'active' : ''}
              onClick={() => editor.chain().focus().toggleItalic().run()} title="Cursiva"><i>I</i></button>
            <span className="dnd-docs-sep" />
            <button type="button" className={editor.isActive('bulletList') ? 'active' : ''}
              onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista con viñetas">• ⋮</button>
            <button type="button" className={editor.isActive('orderedList') ? 'active' : ''}
              onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">1.</button>
            <button type="button" className={editor.isActive('taskList') ? 'active' : ''}
              onClick={() => editor.chain().focus().toggleTaskList().run()} title="Checkbox">☑</button>
            <span className="dnd-docs-sep" />
            <button type="button" onClick={() => editor.chain().focus().sinkListItem('listItem').run()} title="Aumentar sangría">→|</button>
            <button type="button" onClick={() => editor.chain().focus().liftListItem('listItem').run()} title="Reducir sangría">|←</button>
            <span className="dnd-docs-sep" />
            <button type="button" onClick={insertPageBreak} title="Salto de página: todo desde el cursor pasa a una página nueva">⤓ Salto pág.</button>
            <span className="dnd-docs-savestate">
              {saveState === 'saving' && 'Guardando…'}
              {saveState === 'saved' && '✓ Guardado'}
            </span>
          </div>
        )}
        <button
          type="button"
          className="dnd-btn-sm dnd-docs-edit-btn"
          onClick={() => {
            if (editing && saveTimer.current) { clearTimeout(saveTimer.current); saveNow(pages) }
            setEditing(e => !e)
          }}
        >
          {editing ? '✓ Listo' : '✏️ Editar'}
        </button>
      </div>

      <EditorContent
        editor={editor}
        className={`dnd-docs-content ${editing ? 'is-editing' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />

      <div className="dnd-docs-pager">
        <button type="button" className="dnd-docs-pager-arrow" disabled={activeIdx === 0}
          onClick={() => goToPage(activeIdx - 1)} title="Página anterior">‹</button>

        <div className="dnd-docs-pager-tabs" ref={tabsContainerRef}>
          {pages.map((p, idx) => (
            <div
              key={p.id}
              className={`dnd-docs-pager-tab ${idx === activeIdx ? 'active' : ''}`}
              draggable={editing}
              onDragStart={e => { dragIdRef.current = p.id; e.dataTransfer.effectAllowed = 'move' }}
              onDragOver={e => { if (editing) { e.preventDefault(); e.currentTarget.classList.add('dnd-docs-page-dragover') } }}
              onDragLeave={e => e.currentTarget.classList.remove('dnd-docs-page-dragover')}
              onDrop={e => {
                e.preventDefault(); e.currentTarget.classList.remove('dnd-docs-page-dragover')
                if (dragIdRef.current != null) reorderPages(dragIdRef.current, p.id)
                dragIdRef.current = null
              }}
              onClick={() => goToPage(idx)}
              title={p.name || `Página ${idx + 1}`}
            >
              <span className="dnd-docs-page-label">{p.name || (idx + 1)}</span>
              {editing && (
                <span className="dnd-docs-page-rename" onClick={e => { e.stopPropagation(); renamePage(idx) }} title="Renombrar página">✎</span>
              )}
              {editing && pages.length > 1 && (
                <span className="dnd-docs-page-del" onClick={e => { e.stopPropagation(); deletePage(idx) }} title="Borrar página">✕</span>
              )}
            </div>
          ))}
        </div>

        <button type="button" className="dnd-docs-pager-arrow" disabled={activeIdx === pages.length - 1}
          onClick={() => goToPage(activeIdx + 1)} title="Página siguiente">›</button>

        {editing && (
          <button type="button" className="dnd-btn-sm dnd-docs-page-add" onClick={addPage} title="Nueva página">+ Página</button>
        )}
      </div>
    </div>
  )
}
