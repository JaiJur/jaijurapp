import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

/**
 * Hook de conexión al WebSocket de Star Control.
 * Scaffold multijugador: hoy solo controlamos una nave, pero la sala ya
 * soporta varios jugadores para cuando se añada multijugador de verdad.
 */
export function useGameSocket(userId, roomId = 'main', enabled = true) {
  const socketRef = useRef(null)
  const [ships, setShips] = useState({}) // { [userId]: { x, y, vx, vy, heading, color, name } }
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!enabled || !userId) return

    const socket = io(window.location.origin, {
      query: { game: 'starcontrol', userId: String(userId), roomId },
      transports: ['websocket', 'polling']
    })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('sc:sync', (data) => setShips(data || {}))
    socket.on('sc:update', (data) => setShips(data || {}))

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [userId, roomId, enabled])

  const sendState = useCallback((state) => {
    socketRef.current?.emit('sc:state', state)
  }, [])

  return { ships, connected, sendState }
}
