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
      isEnabled?: boolean
      bankName?: string
      accountNumber?: string
      holderName?: string
      instructions?: string
    }
  ) => {
    const res = await api.patch(`/admin/settings/payment-methods/${method}`, payload)
    return res.data
  },

  // Shipping tiers
  getShippingTiers: async () => {
    const res = await api.get('/admin/kor-shipping-tiers')
    return res.data.data
  },

  createShippingTier: async (payload: { maxOrderKrw: number | null; cargoFeeKrw: number }) => {
    const res = await api.post('/admin/kor-shipping-tiers', payload)
    return res.data
  },

  updateShippingTier: async (
    id: string,
    payload: { maxOrderKrw?: number | null; cargoFeeKrw?: number }
  ) => {
    const res = await api.patch(`/admin/kor-shipping-tiers/${id}`, payload)
    return res.data
  },

  deleteShippingTier: async (id: string) => {
    const res = await api.delete(`/admin/kor-shipping-tiers/${id}`)
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

  fetchLiveRate: async () => {
    const res = await api.get('/admin/settings/exchange-rates/live')
    return res.data.data as { rate: number; source: string }
  },

  // Order settings
  getOrderSettings: async () => {
    const res = await api.get('/admin/settings/order')
    return res.data.data
  },

  updateOrderSettings: async (payload: {
    paymentTimeoutMinutes?: number
    minOrderKorKrw?: number
    minOrderUzbUzs?: number
    usdToKrw?: number
    uzbCargoUsdPerKg?: number
  }) => {
    const res = await api.patch('/admin/settings/order', payload)
    return res.data
  },
}
