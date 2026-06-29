import { api } from '../lib/api'

export interface Category {
  id: string
  name: string
  imageUrl?: string
  parentId?: string
  parentName?: string
  sortOrder: number
  productCount: number
  isActive: boolean
  children?: Category[]
}

export const categoriesApi = {
  getTree: async () => {
    const res = await api.get('/categories')
    return res.data.data as Category[]
  },

  getFlat: async () => {
    const res = await api.get('/admin/categories')
    return res.data.data as Category[]
  },

  create: async (payload: {
    name: string
    imageUrl?: string
    parentId?: string
    sortOrder?: number
  }) => {
    const res = await api.post('/admin/categories', payload)
    return res.data
  },

  update: async (
    id: string,
    payload: {
      name?: string
      imageUrl?: string
      parentId?: string
      sortOrder?: number
    }
  ) => {
    const res = await api.patch(`/admin/categories/${id}`, payload)
    return res.data
  },

  delete: async (id: string) => {
    const res = await api.delete(`/admin/categories/${id}`)
    return res.data
  },

  uploadCategoryImage: async (file: File): Promise<string> => {
    // GET /admin/upload/sign?folder=categories
    const sigRes = await api.get('/admin/upload/sign', {
      params: { folder: 'categories' },
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
