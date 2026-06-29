import { api } from '../lib/api'

export const bannersApi = {
  list: async () => {
    const res = await api.get('/admin/banners')
    return res.data
  },

  create: async (payload: any) => {
    const res = await api.post('/admin/banners', payload)
    return res.data
  },

  update: async (id: string, payload: any) => {
    const res = await api.patch(`/admin/banners/${id}`, payload)
    return res.data
  },

  delete: async (id: string) => {
    const res = await api.delete(`/admin/banners/${id}`)
    return res.data
  },

  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('banner', file)

    const res = await api.post('/admin/upload/banner', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return res.data.data.url
  },
}
