import { api } from '../lib/api'

export const settingsApi = {
  // Payment methods
  getPaymentMethods: async () => {
    const res = await api.get('/admin/settings/payment-methods')
    return res.data.data
  },

  updatePaymentMethod: async (
    method: string,
    payload: {
      isEnabled: boolean
      enabledRegions?: string[]
      accountInfo?: string
      instructions?: string
    }
  ) => {
    const res = await api.patch(`/admin/settings/payment-methods/${method}`, payload)
    return res.data
  },

  // Shipping tiers
  getShippingTiers: async () => {
    const res = await api.get('/admin/settings/shipping-tiers')
    return res.data.data
  },

  createShippingTier: async (payload: {
    region: string
    minQty: number
    shippingCost: number
  }) => {
    const res = await api.post('/admin/settings/shipping-tiers', payload)
    return res.data
  },

  updateShippingTier: async (
    id: string,
    payload: { minQty?: number; shippingCost?: number }
  ) => {
    const res = await api.patch(`/admin/settings/shipping-tiers/${id}`, payload)
    return res.data
  },

  deleteShippingTier: async (id: string) => {
    const res = await api.delete(`/admin/settings/shipping-tiers/${id}`)
    return res.data
  },

  // Exchange rate
  getExchangeRates: async (limit = 7) => {
    const res = await api.get('/admin/exchange-rates', { params: { limit } })
    return res.data.data
  },

  updateExchangeRate: async (rate: number) => {
    const res = await api.post('/admin/exchange-rates', { krwToUzs: rate })
    return res.data
  },

  // Order settings
  getOrderSettings: async () => {
    const res = await api.get('/admin/settings/order')
    return res.data.data
  },

  updateOrderSettings: async (payload: {
    paymentTimeoutMinutes?: number
    maxOrderQty?: number
    minOrderAmountKrw?: number
  }) => {
    const res = await api.patch('/admin/settings/order', payload)
    return res.data
  },
}
