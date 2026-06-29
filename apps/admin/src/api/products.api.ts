import { api } from '../lib/api'

export const productsApi = {
  list: async (
    params: {
      page?: number
      limit?: number
      q?: string
      category?: string
      brand?: string
      isActive?: boolean | string
    } = {}
  ) => {
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

  restore: async (id: string) => {
    const res = await api.post(`/admin/products/${id}/restore`)
    return res.data
  },

  aiFill: async (payload: {
    productId?: string
    productName?: string
    barcode?: string
    imageUrl?: string
  }) => {
    const res = await api.post('/admin/ai/fill-product', payload)
    return res.data
  },

  // Sign Cloudinary upload
  getUploadSignature: async () => {
    const res = await api.get('/admin/upload/sign', { params: { folder: 'products' } })
    return res.data.data as {
      signature: string
      timestamp: number
      apiKey: string
      cloudName: string
      uploadPreset?: string
      folder?: string
    }
  },

  // Upload image to Cloudinary
  uploadImage: async (file: File): Promise<string> => {
    const sig = await productsApi.getUploadSignature()
    const formData = new FormData()
    formData.append('file', file)
    formData.append('signature', sig.signature)
    formData.append('timestamp', sig.timestamp.toString())
    formData.append('api_key', sig.apiKey)
    if (sig.folder) formData.append('folder', sig.folder)

    // Aligned with backend: apps/api/src/config/cloudinary.ts
    formData.append('transformation', 'q_auto,f_auto,w_1200')

    const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()

    if (data.error) {
      console.error('Cloudinary Error:', data.error)
      throw new Error(data.error.message)
    }

    return data.secure_url as string
  },
}

// Separate APIs for selects
export const brandsApi = {
  list: async () => {
    const res = await api.get('/brands')
    return res.data.data
  },
}
