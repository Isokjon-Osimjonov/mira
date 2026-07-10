import { io, Socket } from 'socket.io-client'
import { env } from '../config/env'
import { useAuthStore } from '../stores/auth.store'
import { toast } from 'sonner'
import { queryClient } from './query-client'
import { QK } from '../constants/query-keys'

let socket: Socket | null = null

export function connectSocket(): Socket {
  if (socket?.connected) return socket

  socket = io(env.socketUrl, {
    auth: {
      token: useAuthStore.getState().accessToken,
    },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  })

  socket.on('connect', () => {
    socket!.emit('join-admin-room')

  })

  socket.on('disconnect', () => {

  })

  // ── Admin events ───────────────────────

  // New order
  socket.on('order:new', (data) => {
    toast.info(`🛍 Yangi buyurtma!`, {
      description: `#${data.orderNumber} — ${data.customerName}`,
      duration: 8000,
      action: {
        label: "Ko'rish",
        onClick: () => (window.location.href = `/orders/${data.orderId}`),
      },
    })
    queryClient.invalidateQueries({ queryKey: ['orders'] })
  })

  // Payment submitted
  socket.on('payment:receipt_uploaded', (data) => {
    toast.warning(`💳 To'lov kvitansiyasi`, {
      description: `#${data.orderNumber} — tekshirish kerak`,
      duration: 10000,
    })
    queryClient.invalidateQueries({ queryKey: ['orders'] })
  })

  // Payment confirmed
  socket.on('payment:confirmed', (data) => {
    toast.success(`✅ To'lov tasdiqlandi`, {
      description: `#${data.orderNumber}`,
    })
    queryClient.invalidateQueries({ queryKey: ['orders'] })
  })

  // Low stock
  socket.on('inventory:stock_low', (data) => {
    toast.warning(`⚠️ Kam qolgan!`, {
      description: `${data.productName}: ${data.currentQty} ta`,
      duration: 10000,
    })
    queryClient.invalidateQueries({ queryKey: QK.INVENTORY_STOCK })
  })

  // Settings updated
  socket.on('settings:updated', () => {
    queryClient.invalidateQueries({ queryKey: QK.SETTINGS })
  })

  // Exchange rate updated
  socket.on('exchange_rate:updated', () => {
    queryClient.invalidateQueries({ queryKey: QK.EXCHANGE_LATEST })
  })

  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}

export function getSocket(): Socket | null {
  return socket
}
