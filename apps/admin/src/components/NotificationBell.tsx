import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, X, Check, ShoppingBag, AlertTriangle, CreditCard, Package } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { api } from '../lib/api'
import { formatRelative } from '../utils/date'
import { cn } from '@/lib/utils'

const notifApi = {
  getAll: async () => {
    const res = await api.get('/admin/notifications?limit=20')
    return res.data.data ?? []
  },
  getUnreadCount: async () => {
    const res = await api.get('/admin/notifications/unread-count')
    return res.data.data?.count ?? 0
  },
  markAllRead: async () => {
    await api.post('/admin/notifications/mark-all-read')
  },
  clear: async () => {
    await api.delete('/admin/notifications/clear')
  },
}

const NOTIF_ICONS: Record<string, any> = {
  NEW_ORDER: ShoppingBag,
  PAYMENT_CONFIRMED: CreditCard,
  LOW_STOCK: AlertTriangle,
  WRITE_OFF: Package,
  PO_RECEIVED: Package,
  SYSTEM_ERROR: AlertTriangle,
}

const NOTIF_COLORS: Record<string, string> = {
  NEW_ORDER: 'text-blue-600 bg-blue-50',
  PAYMENT_CONFIRMED: 'text-green-600 bg-green-50',
  LOW_STOCK: 'text-amber-600 bg-amber-50',
  WRITE_OFF: 'text-red-600 bg-red-50',
  SYSTEM_ERROR: 'text-red-600 bg-red-50',
  PO_RECEIVED: 'text-purple-600 bg-purple-50',
}

export function NotificationBell() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notifApi.getAll,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: notifApi.getUnreadCount,
    staleTime: 10_000,
    refetchInterval: 30_000,
  })

  const markMutation = useMutation({
    mutationFn: notifApi.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const clearMutation = useMutation({
    mutationFn: notifApi.clear,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const handleNotifClick = (notif: any) => {
    setOpen(false)
    if (notif.link) navigate({ to: notif.link as any })
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen(!open)
          if (!open && unreadCount > 0) {
            markMutation.mutate()
          }
        }}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
      >
        <Bell className="h-4 w-4 text-gray-600" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border-[0.5px] border-border shadow-lg z-40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <p className="text-sm font-semibold text-gray-900">
                Bildirishnomalar
                {unreadCount > 0 && (
                  <span className="ml-2 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full">
                    {unreadCount} yangi
                  </span>
                )}
              </p>
              <div className="flex gap-1">
                {notifications.length > 0 && (
                  <button
                    onClick={() => clearMutation.mutate()}
                    className="text-[11px] text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    Tozalash
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="h-8 w-8 text-gray-200 mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-xs text-muted-foreground">Bildirishnomalar yo'q</p>
                </div>
              ) : (
                notifications.map((notif: any) => {
                  const Icon = NOTIF_ICONS[notif.type] ?? Bell
                  const colorClass = NOTIF_COLORS[notif.type] ?? 'text-gray-600 bg-gray-50'

                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      className={cn(
                        'w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-border/30 last:border-0',
                        !notif.isRead && 'bg-blue-50/30'
                      )}
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                          colorClass
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-gray-900">{notif.title}</p>
                          {!notif.isRead && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatRelative(notif.createdAt)}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
