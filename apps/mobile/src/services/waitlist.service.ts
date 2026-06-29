import api from '../lib/api'

export interface WaitlistItem {
  id: string
  name: string
  brandName: string
  imageUrls: string[]
  retailPrice: number
  currency: string
  createdAt: string
}

export const waitlistService = {
  getWaitlist: async (): Promise<WaitlistItem[]> => {
    const res = await api.get('/waitlists')
    return res.data.data ?? []
  },

  addToWaitlist: async (
    productId: string
  ): Promise<{
    inStock: boolean
    message: string
  }> => {
    const res = await api.post('/waitlists', { productId })
    return res.data.data
  },

  removeFromWaitlist: async (productId: string): Promise<void> => {
    await api.delete(`/waitlists/${productId}`)
  },
}
