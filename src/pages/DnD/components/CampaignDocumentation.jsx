import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { createPortal } from 'react-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import { generateHTML } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'

// Normaliza initialPages a un array [{id, html, name, folderId}] válido, aceptando:
// - array nuevo [{id, html, name, folderId}]
// - string legado (documentación antigua de una sola página)
// - undefined/null (documentación nueva vacía)
function normalizePages(initialPages) {
  if (Array.isArray(initialPages) && initialPages.length > 0) {
    return initialPages.map((p, i) => ({
      id: p?.id ?? (Date.now() + i),
      html: typeof p?.html === 'string' ? p.html : '',
      name: (typeof p?.name === 'string' && p.name.trim()) ? p.name.trim() : null,
      folderId: (typeof p?.folderId === 'number') ? p.folderId : null
    }))
  }
  if (typeof initialPages === 'string' && initialPages.trim()) {
    return [{ id: 1, html: initialPages, name: null, folderId: null }]
  }
  return [{ id: Date.now(), html: '', name: null, folderId: null }]
}

// Normaliza initialFolders a un array [{id, name}] válido.
function normalizeFolders(initialFolders) {
  if (!Array.isArray(initialFolders)) return []
  return initialFolders.map((f, i) => ({
    id: f?.id ?? (Date.now() + i),
    name: (typeof f?.name === 'string' && f.name.trim()) ? f.name.trim() : `Carpeta ${i + 1}`
  }))
}



const CampaignDocumentation = forwardRef(function CampaignDocumentation({ saveUrl, initialPages, initialFolders, headers, onEditingChange }, ref) {
  const [pages, setPages] = useState(() => normalizePages(initialPages))
  const [folders, setFolders] = useState(() => normalizeFolders(initialFolders))
  const [collapsedFolders, setCollapsedFolders] = useState(() => new Set())
  const [openFolderMenu, setOpenFolderMenu] = useState(null) // { folderId, top, left } | null — carpeta abierta en modo lectura (flotante)
  const [activeIdx, setActiveIdx] = useState(0)
  const [editing, setEditing] = useState(false)
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved
  const saveTimer = useRef(null)
  const isFirstLoad = useRef(true)
  const activeIdxRef = useRef(0)
  const pagesRef = useRef(pages)
  const foldersRef = useRef(folders)
  const dragItemRef = useRef(null) // { type: 'page'|'folder', id } — ítem que se está arrastrando
  const tabsContainerRef = useRef(null)
  const touchStartRef = useRef(null)

  useEffect(() => { activeIdxRef.current = activeIdx }, [activeIdx])
  useEffect(() => { pagesRef.current = pages }, [pages])
  useEffect(() => { foldersRef.current = folders }, [folders])

  const saveNow = useCallback(async (pagesToSave, foldersToSave) => {
    setSaveState('saving')
    try {
      await fetch(saveUrl, {
        method: 'PUT', headers,
        body: JSON.stringify({ pages: pagesToSave, folders: foldersToSave ?? foldersRef.current })
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
    }),
    // Enlaces internos entre páginas del mismo documento (ancla a otra página, no URL externa).
    Link.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          'data-page-id': {
            default: null,
            parseHTML: element => element.getAttribute('data-page-id'),
            renderHTML: attributes => {
              if (!attributes['data-page-id']) return {}
              return { 'data-page-id': attributes['data-page-id'] }
            }
          }
        }
      }
    }).configure({
      openOnClick: false,
      autolink: false,
      HTMLAttributes: { class: 'dnd-docs-page-link' }
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

  // Notifica al padre (que renderiza el botón Editar/Listo fuera de este componente).
  useEffect(() => { onEditingChange?.(editing) }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleEditing = useCallback(() => {
    if (editing && saveTimer.current) { clearTimeout(saveTimer.current); saveNow(pagesRef.current) }
    setOpenFolderMenu(null)
    setEditing(e => !e)
  }, [editing, saveNow])

  useImperativeHandle(ref, () => ({ toggleEditing }), [toggleEditing])

  // Mantiene la pestaña activa visible en el scroll horizontal del paginador.
  useEffect(() => {
    const el = tabsContainerRef.current?.querySelector('.dnd-docs-pager-tab.active')
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeIdx])

  // Convierte el texto seleccionado en un enlace a otra página del documento.
  const linkToPage = useCallback(() => {
    if (!editor) return
    const { from, to } = editor.state.selection
    if (from === to) { window.alert('Selecciona primero el texto que quieres convertir en enlace.'); return }
    const list = pages.map((p, i) => `${i + 1}. ${p.name || (i + 1)}`).join('\n')
    const input = window.prompt(`¿A qué página quieres enlazar? Escribe el número:\n${list}`, '')
    if (input === null) return
    const idx = parseInt(input.trim(), 10) - 1
    if (isNaN(idx) || idx < 0 || idx >= pages.length) { window.alert('Número de página no válido.'); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: '#page', 'data-page-id': String(pages[idx].id) }).run()
  }, [editor, pages])

  const unlinkPage = useCallback(() => {
    if (!editor) return
    editor.chain().focus().unsetLink().run()
  }, [editor])

  // Al hacer click en un enlace a página en modo lectura, navega a esa página en vez de seguir el href.
  const handleContentClick = useCallback((e) => {
    if (editing) return
    const linkEl = e.target.closest?.('a[data-page-id]')
    if (!linkEl) return
    e.preventDefault()
    const targetId = linkEl.getAttribute('data-page-id')
    const idx = pages.findIndex(p => String(p.id) === String(targetId))
    if (idx !== -1) goToPage(idx)
  }, [editing, pages, goToPage])

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
      const newPage = { id: Date.now(), html: '', name: null, folderId: null }
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
      next.splice(idx + 1, 0, { id: Date.now(), html: afterHTML, name: null, folderId: null })
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

  const createFolder = useCallback(() => {
    const input = window.prompt('Nombre de la carpeta (ej. "Rivavieja"):')
    if (!input || !input.trim()) return
    setFolders(prev => {
      const next = [...prev, { id: Date.now(), name: input.trim() }]
      saveNow(pagesRef.current, next)
      return next
    })
  }, [saveNow])

  const renameFolder = useCallback((folderId) => {
    setFolders(prev => {
      const current = prev.find(f => f.id === folderId)
      const input = window.prompt('Nombre de la carpeta:', current?.name || '')
      if (input === null || !input.trim()) return prev
      const next = prev.map(f => f.id === folderId ? { ...f, name: input.trim() } : f)
      saveNow(pagesRef.current, next)
      return next
    })
  }, [saveNow])

  const deleteFolder = useCallback((folderId) => {
    if (!window.confirm('¿Borrar esta carpeta? Las páginas no se borran, solo se desagrupan.')) return
    setFolders(prevFolders => {
      const nextFolders = prevFolders.filter(f => f.id !== folderId)
      setPages(prevPages => {
        const nextPages = prevPages.map(p => p.folderId === folderId ? { ...p, folderId: null } : p)
        saveNow(nextPages, nextFolders)
        return nextPages
      })
      return nextFolders
    })
  }, [saveNow])

  const toggleFolderCollapse = useCallback((folderId) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }, [])

  // En edición, colapsa/expande la carpeta en la propia línea. En lectura, abre/cierra
  // un menú flotante (posición fija) con las páginas de la carpeta, sin desplazar el documento.
  const handleFolderClick = useCallback((folderId, e) => {
    if (editing) { toggleFolderCollapse(folderId); return }
    // Calculamos el rect aquí, de forma síncrona: dentro del updater de setState,
    // e.currentTarget ya puede haberse anulado (React libera el evento tras esta fase).
    const rect = e.currentTarget.getBoundingClientRect()
    setOpenFolderMenu(prev => {
      if (prev && prev.folderId === folderId) return null
      return { folderId, top: rect.bottom + 6, left: rect.left }
    })
  }, [editing, toggleFolderCollapse])

  // Mueve una página a una carpeta (o la desagrupa con folderId=null), manteniendo
  // contiguas entre sí las páginas de una misma carpeta dentro del array.
  const movePageToFolder = useCallback((idx, folderId) => {
    setPages(prev => {
      const next = [...prev]
      const [moved] = next.splice(idx, 1)
      const updated = { ...moved, folderId }
      let insertAt
      if (folderId != null) {
        const lastMemberIdx = next.map(p => p.folderId).lastIndexOf(folderId)
        insertAt = lastMemberIdx !== -1 ? lastMemberIdx + 1 : idx
      } else {
        insertAt = idx // al desagrupar, se queda donde estaba
      }
      next.splice(insertAt, 0, updated)
      const activePageId = prev[activeIdxRef.current]?.id
      const newActive = next.findIndex(p => p.id === activePageId)
      if (newActive !== -1) setActiveIdx(newActive)
      saveNow(next)
      return next
    })
  }, [saveNow])

  const movePageToFolderPrompt = useCallback((idx) => {
    const page = pagesRef.current[idx]
    const options = ['0. Sin carpeta', ...folders.map((f, i) => `${i + 1}. ${f.name}`)].join('\n')
    const input = window.prompt(`¿A qué carpeta quieres mover esta página?\n${options}`, '')
    if (input === null) return
    const n = parseInt(input.trim(), 10)
    if (isNaN(n) || n < 0 || n > folders.length) { window.alert('Opción no válida.'); return }
    const folderId = n === 0 ? null : folders[n - 1].id
    if (folderId === page.folderId) return
    movePageToFolder(idx, folderId)
  }, [folders, movePageToFolder])

  // Mueve un ítem arrastrado (página o carpeta entera) justo delante de un ítem destino
  // (página o carpeta). Si el arrastrado es una página y el destino es una carpeta, entra
  // en ella (folderId = destino). Si el destino es una página, adopta su folderId (entra
  // o sale de carpeta según corresponda). Si el arrastrado es una carpeta, se mueve el
  // bloque contiguo completo de sus páginas.
  const moveItem = useCallback((dragged, target) => {
    if (!dragged || !target) return
    if (dragged.type === target.type && dragged.id === target.id) return
    setPages(prev => {
      const next = [...prev]
      const activePageId = prev[activeIdxRef.current]?.id

      if (dragged.type === 'page') {
        const fromIdx = next.findIndex(p => p.id === dragged.id)
        if (fromIdx === -1) return prev
        const [moved] = next.splice(fromIdx, 1)

        if (target.type === 'folder') {
          moved.folderId = target.id
          const lastIdx = next.map(p => p.folderId).lastIndexOf(target.id)
          next.splice(lastIdx !== -1 ? lastIdx + 1 : next.length, 0, moved)
        } else {
          const targetIdx = next.findIndex(p => p.id === target.id)
          if (targetIdx === -1) { next.splice(fromIdx, 0, moved); return prev }
          moved.folderId = next[targetIdx].folderId
          next.splice(targetIdx, 0, moved)
        }
      } else if (dragged.type === 'folder') {
        const groupIdx = next.map((p, i) => ({ p, i })).filter(x => x.p.folderId === dragged.id).map(x => x.i)
        if (groupIdx.length === 0) return prev
        const groupItems = groupIdx.map(i => next[i])
        groupIdx.slice().reverse().forEach(i => next.splice(i, 1))

        let insertAt
        if (target.type === 'folder') {
          const idxs = next.map((p, i) => ({ p, i })).filter(x => x.p.folderId === target.id).map(x => x.i)
          insertAt = idxs.length ? idxs[0] : next.length
        } else {
          const targetIdx = next.findIndex(p => p.id === target.id)
          insertAt = targetIdx === -1 ? next.length : targetIdx
        }
        next.splice(insertAt, 0, ...groupItems)
      }

      const newActive = next.findIndex(p => p.id === activePageId)
      if (newActive !== -1) setActiveIdx(newActive)
      saveNow(next)
      return next
    })
  }, [saveNow])

  // Fallback: soltar sobre espacio vacío del paginador saca el ítem de cualquier carpeta
  // (o mueve la carpeta entera) y lo deja al final, suelto.
  const moveItemToEnd = useCallback((dragged) => {
    if (!dragged) return
    setPages(prev => {
      const next = [...prev]
      const activePageId = prev[activeIdxRef.current]?.id

      if (dragged.type === 'page') {
        const fromIdx = next.findIndex(p => p.id === dragged.id)
        if (fromIdx === -1) return prev
        const [moved] = next.splice(fromIdx, 1)
        moved.folderId = null
        next.push(moved)
      } else if (dragged.type === 'folder') {
        const groupIdx = next.map((p, i) => ({ p, i })).filter(x => x.p.folderId === dragged.id).map(x => x.i)
        if (groupIdx.length === 0) return prev
        const groupItems = groupIdx.map(i => next[i])
        groupIdx.slice().reverse().forEach(i => next.splice(i, 1))
        next.push(...groupItems)
      }

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

  // Tab individual de página (reutilizado suelta, dentro de una carpeta en edición, o en el menú flotante).
  const renderTab = (p, idx, { closeFolderMenu } = {}) => (
    <div
      key={p.id}
      className={`dnd-docs-pager-tab ${idx === activeIdx ? 'active' : ''}`}
      draggable={editing}
      onDragStart={e => { dragItemRef.current = { type: 'page', id: p.id }; e.dataTransfer.effectAllowed = 'move' }}
      onDragOver={e => { if (editing) e.preventDefault() }}
      onDrop={e => {
        if (!editing) return
        e.preventDefault(); e.stopPropagation()
        if (dragItemRef.current) { moveItem(dragItemRef.current, { type: 'page', id: p.id }); dragItemRef.current = null }
      }}
      onClick={() => { goToPage(idx); if (closeFolderMenu) setOpenFolderMenu(null) }}
      title={p.name || `Página ${idx + 1}`}
    >
      <span className="dnd-docs-page-label">{p.name || (idx + 1)}</span>
      {editing && (
        <span className="dnd-docs-page-rename" onClick={e => { e.stopPropagation(); renamePage(idx) }} title="Renombrar página">✎</span>
      )}
      {editing && (
        <span className="dnd-docs-page-folder" onClick={e => { e.stopPropagation(); movePageToFolderPrompt(idx) }} title="Mover a carpeta">📁</span>
      )}
      {editing && pages.length > 1 && (
        <span className="dnd-docs-page-del" onClick={e => { e.stopPropagation(); deletePage(idx) }} title="Borrar página">✕</span>
      )}
    </div>
  )

  // Agrupa las pestañas: páginas sueltas tal cual, y páginas con folderId contiguas
  // envueltas en un grupo de carpeta (colapsable en edición, menú flotante en lectura).
  const pagerElements = []
  {
    let i = 0
    while (i < pages.length) {
      const p = pages[i]
      if (p.folderId != null) {
        const folder = folders.find(f => f.id === p.folderId)
        const collapsed = collapsedFolders.has(p.folderId)
        const group = []
        let j = i
        while (j < pages.length && pages[j].folderId === p.folderId) { group.push({ page: pages[j], idx: j }); j++ }
        pagerElements.push(
          <div key={`folder-${p.folderId}`} className="dnd-docs-folder-group">
            <div className="dnd-docs-folder-tab"
              draggable={editing}
              onDragStart={e => { dragItemRef.current = { type: 'folder', id: p.folderId }; e.dataTransfer.effectAllowed = 'move' }}
              onDragOver={e => { if (editing) e.preventDefault() }}
              onDrop={e => {
                if (!editing) return
                e.preventDefault(); e.stopPropagation()
                if (dragItemRef.current) { moveItem(dragItemRef.current, { type: 'folder', id: p.folderId }); dragItemRef.current = null }
              }}
              onClick={e => handleFolderClick(p.folderId, e)}
              title={folder?.name || 'Carpeta'}
            >
              <span className="dnd-chevron" style={{ fontSize: '0.7rem' }}>
                {editing ? (collapsed ? '▸' : '▾') : (openFolderMenu?.folderId === p.folderId ? '▾' : '▸')}
              </span>
              {folder?.name || 'Carpeta'}
              {editing && (
                <span className="dnd-docs-page-rename" onClick={e => { e.stopPropagation(); renameFolder(p.folderId) }} title="Renombrar carpeta">✎</span>
              )}
              {editing && (
                <span className="dnd-docs-page-del" onClick={e => { e.stopPropagation(); deleteFolder(p.folderId) }} title="Borrar carpeta">✕</span>
              )}
            </div>
            {editing && !collapsed && group.map(({ page, idx }) => renderTab(page, idx))}
          </div>
        )
        i = j
      } else {
        pagerElements.push(renderTab(p, i))
        i++
      }
    }
  }

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
            <button type="button" onClick={linkToPage} title="Enlazar el texto seleccionado a otra página">🔗 Página</button>
            <button type="button" onClick={unlinkPage} title="Quitar enlace">🔗✕</button>
            <span className="dnd-docs-savestate">
              {saveState === 'saving' && 'Guardando…'}
              {saveState === 'saved' && '✓ Guardado'}
            </span>
          </div>
        )}
      </div>

      <div className="dnd-docs-pager">
        <button type="button" className="dnd-docs-pager-arrow" disabled={activeIdx === 0}
          onClick={() => goToPage(activeIdx - 1)} title="Página anterior">‹</button>

        <div className="dnd-docs-pager-tabs" ref={tabsContainerRef}
          onDragOver={e => { if (editing) e.preventDefault() }}
          onDrop={e => {
            if (!editing) return
            e.preventDefault()
            if (dragItemRef.current) { moveItemToEnd(dragItemRef.current); dragItemRef.current = null }
          }}
        >
          {pagerElements}
        </div>

        <button type="button" className="dnd-docs-pager-arrow" disabled={activeIdx === pages.length - 1}
          onClick={() => goToPage(activeIdx + 1)} title="Página siguiente">›</button>

        {editing && (
          <>
            <button type="button" className="dnd-btn-sm dnd-docs-page-add" onClick={addPage} title="Nueva página">+ Página</button>
            <button type="button" className="dnd-btn-sm dnd-docs-page-add" onClick={createFolder} title="Nueva carpeta">📁 + Carpeta</button>
          </>
        )}
      </div>

      <EditorContent
        editor={editor}
        className={`dnd-docs-content ${editing ? 'is-editing' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleContentClick}
      />

      {!editing && openFolderMenu && createPortal(
        <>
          <div className="dnd-docs-folder-overlay" onClick={() => setOpenFolderMenu(null)} />
          <div className="dnd-docs-folder-dropdown" style={{ top: openFolderMenu.top, left: openFolderMenu.left }}>
            {pages
              .map((p, idx) => ({ p, idx }))
              .filter(({ p }) => p.folderId === openFolderMenu.folderId)
              .map(({ p, idx }) => renderTab(p, idx, { closeFolderMenu: true }))}
          </div>
        </>,
        document.body
      )}
    </div>
  )
})

export default CampaignDocumentation
