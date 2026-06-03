import { api } from '../lib/api'

export const customersApi = {
  list:     async (params = {}) => api.get('/admin/customers', { params }),
  getById:  async (id: string) => api.get(`/admin/customers/${id}`),
  create:   async (payload: unknown) => api.post('/admin/customers', payload),
  update:   async (id: string, payload: unknown) => api.patch(`/admin/customers/${id}`, payload),
  delete:   async (id: string) => api.delete(`/admin/customers/${id}`),
}
