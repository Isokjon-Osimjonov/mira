import { api } from '../lib/api'

export const boxesApi = {
  list: async () => {
    const res = await api.get('/admin/boxes')
    return res.data.data
  },

  create: async (payload: {
    name: string
    sizeLabel?: string | null
    lengthCm?: number | null
    widthCm?: number | null
    heightCm?: number | null
    costKrw: number
    stockCount: number
    minStock: number
    imageUrls?: string[]
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

  uploadBoxImage: async (file: File): Promise<string> => {
    const sigRes = await api.get('/admin/upload/sign', {
      params: { folder: 'boxes' },
    })
    const sig = sigRes.data.data
    const formData = new FormData()
    formData.append('file', file)
    formData.append('signature', sig.signature)
    formData.append('timestamp', sig.timestamp.toString())
    formData.append('api_key', sig.apiKey)
    if (sig.folder) formData.append('folder', sig.folder)

    const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (!data.secure_url) throw new Error('Upload failed')
    return data.secure_url as string
  },
}
