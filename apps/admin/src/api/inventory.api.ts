import { api } from '../lib/api'

export const inventoryApi = {
  list:     async (params = {}) => api.get('/admin/inventory', { params }),
  getById:  async (id: string) => api.get(`/admin/inventory/${id}`),
  create:   async (payload: unknown) => api.post('/admin/inventory', payload),
  update:   async (id: string, payload: unknown) => api.patch(`/admin/inventory/${id}`, payload),
  delete:   async (id: string) => api.delete(`/admin/inventory/${id}`),
}
