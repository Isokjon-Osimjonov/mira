import api from '../lib/api'

export interface Notification {
  id: string
  type: string
  title: string
  body: string
  isRead: boolean
  orderId: string | null
  createdAt: string
}

export const notificationService = {
  getNotifications: async (
    page = 1
  ): Promise<{
    items: Notification[]
    meta: { total: number; hasNext: boolean }
  }> => {
    const res = await api.get('/notifications', {
      params: { page, limit: 20 },
    })
    const items = (res.data.data || []).map((n: any) => ({
      ...n,
      isRead: !!n.readAt,
    }))
    return {
      items,
      meta: res.data.meta,
    }
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`)
  },

  markAllAsRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all')
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await api.get('/notifications/unread-count')
    return res.data.data?.count ?? 0
  },
}
