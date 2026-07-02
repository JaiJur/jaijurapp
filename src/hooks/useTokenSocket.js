import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

/**
 * Hook para conectar al WebSocket de tokens de jugadores.
 * @param {string|null} partyId  - ID de la party activa
 * @param {number|null} userId   - ID del usuario actual
 * @param {boolean} enabled      - activar/desactivar conexión
 */
export function useTokenSocket(partyId, userId, enabled = true) {
  const socketRef = useRef(null)
  const [tokens, setTokens] = useState({})       // { [charId]: { x, y, charName, color, visible, ... } }
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!enabled || !partyId || !userId) return

    const socket = io(window.location.origin, {
      query: { partyId: String(partyId), userId: String(userId) },
      transports: ['websocket', 'polling']
    })
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[TokenWS] conectado, sala party:', partyId)
      setConnected(true)
    })
    socket.on('disconnect', () => {
      console.log('[TokenWS] desconectado')
      setConnected(false)
    })

    // Estado completo al conectar
    socket.on('tokens:sync', (data) => {
      console.log('[TokenWS] tokens:sync', data)
      setTokens(data || {})
    })

    // Actualización parcial/total
    socket.on('tokens:update', (data) => {
      console.log('[TokenWS] tokens:update', data)
      setTokens(data || {})
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [partyId, userId, enabled])

  /** Mover token propio */
  const moveToken = useCallback((charId, x, y) => {
    socketRef.current?.emit('token:move', { charId, x, y })
  }, [])

  /** (Master) Inicializar token en el mapa */
  const initToken = useCallback((charId, x, y, color, name, portrait) => {
    console.log('[TokenWS] emitiendo token:init', { charId, x, y, color, name, socket: socketRef.current?.id })
    socketRef.current?.emit('token:init', { charId, x, y, color, name, portrait })
  }, [])

  /** (Master) Eliminar token del mapa */
  const removeToken = useCallback((charId) => {
    socketRef.current?.emit('token:remove', { charId })
  }, [])

  /** (Master) Toggle visibilidad */
  const setTokenVisible = useCallback((charId, visible) => {
    socketRef.current?.emit('token:setVisible', { charId, visible })
  }, [])

  return { tokens, connected, moveToken, initToken, removeToken, setTokenVisible }
}
