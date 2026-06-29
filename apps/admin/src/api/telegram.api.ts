import { api } from '../lib/api'

export const telegramApi = {
  getPosts: async (
    params: {
      page?: number
      limit?: number
      status?: string
    } = {}
  ) => {
    const res = await api.get('/admin/telegram/posts', { params })
    return res.data
  },

  createPost: async (payload: TelegramPostPayload) => {
    const res = await api.post('/admin/telegram/posts', payload)
    return res.data
  },

  deletePost: async (id: string) => {
    const res = await api.delete(`/admin/telegram/posts/${id}`)
    return res.data
  },

  reschedule: async (id: string, scheduledAt: string) => {
    const res = await api.put(`/admin/telegram/posts/${id}`, { scheduledAt })
    return res.data
  },

  generateCaption: async (payload: {
    productId: string
    showRetail: boolean
    showWholesale: boolean
    phone?: string
    language?: 'uz' | 'ko'
  }) => {
    const res = await api.post('/admin/telegram/caption', payload)
    return res.data.data as { caption: string; hashtags: string[] }
  },

  getChannels: async () => {
    const res = await api.get('/admin/telegram/channels')
    return res.data.data
  },

  addChannel: async (payload: { chatId: string; channelName: string }) => {
    const res = await api.post('/admin/telegram/channels', payload)
    return res.data
  },

  removeChannel: async (id: string) => {
    const res = await api.delete(`/admin/telegram/channels/${id}`)
    return res.data
  },

  testChannel: async (channelId: string) => {
    const res = await api.post(`/admin/telegram/channels/${channelId}/test`)
    return res.data
  },

  getPostSettings: async () => {
    const res = await api.get('/admin/telegram/post-settings')
    return res.data
  },

  updatePostSettings: async (payload: {
    phone?: string
    link1Label?: string
    link1Url?: string
    link2Label?: string
    link2Url?: string
    link3Label?: string
    link3Url?: string
  }) => {
    const res = await api.patch('/admin/telegram/post-settings', payload)
    return res.data
  },
}

export interface TelegramPostPayload {
  productId?: string | null
  channelIds: string[]
  title: string
  content: string
  imageUrl?: string | null
  scheduledAt?: string | null
}
