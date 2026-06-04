import { api } from '../lib/api'

export const boxesApi = {
  list: async () => {
    const res = await api.get('/admin/boxes')
    return res.data.data
  },

  create: async (payload: {
    name:       string
    sizeLabel?: string | null
    lengthCm?:  number | null
    widthCm?:   number | null
    heightCm?:  number | null
    costKrw:    number
    stockCount: number
    minStock:   number
  }) => {
    const res = await api.post('/admin/boxes', payload)
    return res.data
  },

  update: async (id: string, payload: any) => {
    const res = await api.patch(`/admin/boxes/${id}`, payload)
    return res.data
  },

  delete: async (id: string) => {
    const res = await api.delete(`/admin/boxes/${id}`)
    return res.data
  },

  adjustStock: async (id: string, qty: number, type: 'add' | 'use') => {
    const res = await api.post(`/admin/boxes/${id}/stock`, { qty, type })
    return res.data
  },
}
