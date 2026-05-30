import { io, type Socket } from 'socket.io-client'
import type { SocketEvents, ClientSocketEvents } from '@mira/shared-types'
import { getAccessToken } from './auth-store'

type MiraAdminSocket = Socket<SocketEvents, ClientSocketEvents>

let socket: MiraAdminSocket | null = null

export function connectSocket(): MiraAdminSocket {
  if (socket?.connected) return socket

  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string

  socket = io(SOCKET_URL, {
    auth:             { token: getAccessToken() },
    transports:       ['websocket'],
    reconnection:     true,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 5_000,
    reconnectionAttempts: 10,
  }) as MiraAdminSocket

  socket.on('connect',    () => console.log('🔌 Socket connected'))
  socket.on('disconnect', (reason) => console.log('🔌 Socket disconnected:', reason))
  socket.on('connect_error', (err) => console.error('🔌 Socket error:', err.message))

  return socket
}

export function getSocket(): MiraAdminSocket | null {
  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}

// Type-safe event listener helper
export function onSocketEvent<K extends keyof SocketEvents>(
  event: K,
  handler: (data: SocketEvents[K]) => void
): () => void {
  const s = getSocket()
  if (!s) return () => {}

  s.on(event as any, handler as any)
  return () => s.off(event as any, handler as any)
}
