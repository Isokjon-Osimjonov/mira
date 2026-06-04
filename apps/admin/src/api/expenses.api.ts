import { api } from '../lib/api'

export const expensesApi = {
  list: async (params: {
    page?:      number
    limit?:     number
    category?:  string
    dateFrom?:  string
    dateTo?:    string
    search?:    string
  } = {}) => {
    const res = await api.get('/admin/expenses', { params })
    return res.data
  },

  getCategories: async () => {
    const res = await api.get('/admin/expense-categories')
    return res.data.data
  },

  create: async (payload: {
    amountKrw:   number
    category:    string
    description: string
    date:        string
    note?:       string
  }) => {
    const res = await api.post('/admin/expenses', payload)
    return res.data
  },

  delete: async (id: string) => {
    const res = await api.delete(`/admin/expenses/${id}`)
    return res.data
  },

  getSummary: async (params: {
    year?: number; month?: number
  } = {}) => {
    const res = await api.get('/admin/expenses/summary', { params })
    return res.data.data
  },
}
