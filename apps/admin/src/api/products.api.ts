import { api } from '../lib/api'

export const productsApi = {
  list: async (params = {}) => {
    const res = await api.get('/admin/products', { params })
    return res.data
  },
  getById: async (id: string) => {
    const res = await api.get(`/admin/products/${id}`)
    return res.data
  },
  create: async (payload: unknown) => {
    const res = await api.post('/admin/products', payload)
    return res.data
  },
  update: async (id: string, payload: unknown) => {
    const res = await api.patch(`/admin/products/${id}`, payload)
    return res.data
  },
  delete: async (id: string) => {
    const res = await api.delete(`/admin/products/${id}`)
    return res.data
  },
  aiFill: async (id: string) => {
    const res = await api.post(`/admin/products/${id}/ai-fill`)
    return res.data
  },
  reorderImages: async (id: string, imageUrls: string[]) => {
    const res = await api.put(`/admin/products/${id}/images`, { imageUrls })
    return res.data
  },
}
