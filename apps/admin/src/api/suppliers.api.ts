import { api } from '../lib/api'

export const suppliersApi = {
  list: async () => {
    const res = await api.get('/admin/suppliers')
    return res.data.data
  },

  create: async (payload: {
    name: string
    contactName?: string | null
    phone?: string | null
    email?: string | null
    country?: string
    address?: string | null
    paymentTerms?: string | null
    notes?: string | null
  }) => {
    const res = await api.post('/admin/suppliers', payload)
    return res.data
  },

  update: async (id: string, payload: any) => {
    const res = await api.patch(`/admin/suppliers/${id}`, payload)
    return res.data
  },

  delete: async (id: string) => {
    const res = await api.delete(`/admin/suppliers/${id}`)
    return res.data
  },

  getBatches: async (id: string) => {
    const res = await api.get(`/admin/suppliers/${id}/batches`)
    return res.data.data
  },
}
