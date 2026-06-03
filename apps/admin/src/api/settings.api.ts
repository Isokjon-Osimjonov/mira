import { api } from '../lib/api'

export const settingsApi = {
  list:     async (params = {}) => api.get('/admin/settings', { params }),
  getById:  async (id: string) => api.get(`/admin/settings/${id}`),
  create:   async (payload: unknown) => api.post('/admin/settings', payload),
  update:   async (id: string, payload: unknown) => api.patch(`/admin/settings/${id}`, payload),
  delete:   async (id: string) => api.delete(`/admin/settings/${id}`),
}
