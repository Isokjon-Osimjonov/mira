import { api } from '../lib/api'

export interface Category {
  id:           string
  nameKo:       string
  nameUz?:      string
  parentId?:    string
  parentName?:  string
  sortOrder:    number
  productCount: number
  isActive:     boolean
  children?:    Category[]
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
    nameKo:    string
    nameUz?:   string
    parentId?: string
    sortOrder?: number
  }) => {
    const res = await api.post('/admin/categories', payload)
    return res.data
  },

  update: async (id: string, payload: {
    nameKo?:   string
    nameUz?:   string
    parentId?: string
    sortOrder?: number
  }) => {
    const res = await api.patch(`/admin/categories/${id}`, payload)
    return res.data
  },

  delete: async (id: string) => {
    const res = await api.delete(`/admin/categories/${id}`)
    return res.data
  },
}
