import { Server, type Socket } from 'socket.io'
import type { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import { env } from './env'
import type { SocketEvents } from '@mira/shared-types'

let _io: Server | null = null

function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token as string | undefined
  if (!token) return next(new Error('Authentication required'))
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as any
    if (payload.type !== 'admin') return next(new Error('Admin only'))
    ;(socket as any).adminId = payload.sub
    next()
  } catch {
    next(new Error('Invalid token'))
  }
}

export function initSocket(server: HttpServer): Server {
  _io = new Server(server, {
    cors: { origin: env.SOCKET_CORS_ORIGINS.split(','), credentials: true },
    transports: ['websocket', 'polling'],
    pingTimeout: 60_000,
    pingInterval: 25_000,
  })
  _io.use(socketAuthMiddleware)
  _io.on('connection', (socket: Socket) => {
    socket.join('admins')
    socket.join(`admin:${(socket as any).adminId}`)
    socket.on('admin:join', (data: any) => {
      if (data?.adminId) socket.join(`admin:${data.adminId}`)
    })
    socket.on('order:viewed', (_data: any) => {})
    socket.on('disconnect', () => socket.leave('admins'))
  })
  return _io
}

export function getIO(): Server {
  if (!_io) throw new Error('Socket.io not initialized')
  return _io
}

export const emit = {
  orderNew: (data: SocketEvents['order:new']) => getIO().to('admins').emit('order:new', data),
  orderStatusChanged: (data: SocketEvents['order:status_changed']) =>
    getIO().to('admins').emit('order:status_changed', data),
  orderAutoCanceled: (data: SocketEvents['order:auto_canceled']) =>
    getIO().to('admins').emit('order:auto_canceled', data),
  paymentReceiptUploaded: (data: SocketEvents['payment:receipt_uploaded']) =>
    getIO().to('admins').emit('payment:receipt_uploaded', data),
  paymentConfirmed: (data: SocketEvents['payment:confirmed']) =>
    getIO().to('admins').emit('payment:confirmed', data),
  paymentRejected: (data: SocketEvents['payment:rejected']) =>
    getIO().to('admins').emit('payment:rejected', data),
  stockLow: (data: SocketEvents['stock:low']) => getIO().to('admins').emit('stock:low', data),
  stockOut: (data: SocketEvents['stock:out']) => getIO().to('admins').emit('stock:out', data),
  stockBack: (data: SocketEvents['stock:back']) => getIO().to('admins').emit('stock:back', data),
  exchangeRateUpdated: (data: SocketEvents['exchange_rate:updated']) =>
    getIO().to('admins').emit('exchange_rate:updated', data),
  settingsUpdated: () => getIO().to('admins').emit('settings:updated', {}),
  notificationCount: (data: SocketEvents['notification:count']) =>
    getIO().to('admins').emit('notification:count', data),
}
