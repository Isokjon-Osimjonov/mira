import { api } from '../lib/api'

export const boxesApi = {
  list:     async (params = {}) => api.get('/admin/boxes', { params }),
  getById:  async (id: string) => api.get(`/admin/boxes/${id}`),
  create:   async (payload: unknown) => api.post('/admin/boxes', payload),
  update:   async (id: string, payload: unknown) => api.patch(`/admin/boxes/${id}`, payload),
  delete:   async (id: string) => api.delete(`/admin/boxes/${id}`),
}
