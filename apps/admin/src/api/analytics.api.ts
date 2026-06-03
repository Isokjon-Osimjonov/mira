import { api } from '../lib/api'

export const analyticsApi = {
  list:     async (params = {}) => api.get('/admin/analytics', { params }),
  getById:  async (id: string) => api.get(`/admin/analytics/${id}`),
  create:   async (payload: unknown) => api.post('/admin/analytics', payload),
  update:   async (id: string, payload: unknown) => api.patch(`/admin/analytics/${id}`, payload),
  delete:   async (id: string) => api.delete(`/admin/analytics/${id}`),
}
