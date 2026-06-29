import { api } from '../lib/api'

export const expensesApi = {
  list: async (
    params: {
      page?: number
      limit?: number
      category?: string
      dateFrom?: string
      dateTo?: string
      search?: string
    } = {}
  ) => {
    const res = await api.get('/admin/expenses', { params })
    return res.data
  },

  getCategories: async () => {
    const res = await api.get('/admin/expenses/categories')
    return res.data.data
  },

  createCategory: async (payload: { name: string; description?: string; color?: string }) => {
    const res = await api.post('/admin/expenses/categories', payload)
    return res.data
  },

  updateCategory: async (
    id: string,
    payload: {
      name?: string
      isActive?: boolean
      color?: string
      description?: string
    }
  ) => {
    const res = await api.patch(`/admin/expenses/categories/${id}`, payload)
    return res.data
  },

  deleteCategory: async (id: string) => {
    const res = await api.delete(`/admin/expenses/categories/${id}`)
    return res.data
  },

  create: async (payload: {
    amountKrw: number
    categoryId: string
    description: string
    date: string
    note?: string
  }) => {
    const res = await api.post('/admin/expenses', payload)
    return res.data
  },

  delete: async (id: string) => {
    const res = await api.delete(`/admin/expenses/${id}`)
    return res.data
  },

  getSummary: async (
    params: {
      dateFrom?: string
      dateTo?: string
    } = {}
  ) => {
    const res = await api.get('/admin/expenses/summary', { params })
    return res.data.data
  },
}
