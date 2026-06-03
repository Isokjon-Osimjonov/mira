import { api } from '../lib/api'

export const couponsApi = {
  list:     async (params = {}) => api.get('/admin/coupons', { params }),
  getById:  async (id: string) => api.get(`/admin/coupons/${id}`),
  create:   async (payload: unknown) => api.post('/admin/coupons', payload),
  update:   async (id: string, payload: unknown) => api.patch(`/admin/coupons/${id}`, payload),
  delete:   async (id: string) => api.delete(`/admin/coupons/${id}`),
}
