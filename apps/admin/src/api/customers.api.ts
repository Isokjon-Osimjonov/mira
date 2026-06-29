import { api } from '../lib/api'

export const customersApi = {
  list: async (
    params: {
      page?: number
      limit?: number
      search?: string
      region?: string
      isActive?: boolean
      isBlocked?: boolean
    } = {}
  ) => {
    const res = await api.get('/admin/customers', { params })
    return res.data
  },

  getById: async (id: string) => {
    const res = await api.get(`/admin/customers/${id}`)
    return res.data
  },

  getOrders: async (id: string, params = {}) => {
    const res = await api.get(`/admin/customers/${id}/orders`, { params })
    return res.data
  },

  block: async (id: string, reason?: string) => {
    const res = await api.patch(`/admin/customers/${id}/block`, { reason })
    return res.data
  },

  unblock: async (id: string) => {
    const res = await api.patch(`/admin/customers/${id}/unblock`)
    return res.data
  },

  addNote: async (id: string, notes: string) => {
    const res = await api.patch(`/admin/customers/${id}/notes`, { notes })
    return res.data
  },

  createWalkIn: async (payload: {
    firstName: string
    lastName?: string
    phone?: string
    region: string
    note?: string
  }) => {
    const res = await api.post('/admin/customers/walk-in', payload)
    return res.data
  },

  delete: async (id: string) => {
    const res = await api.delete(`/admin/customers/${id}`)
    return res.data
  },
}
