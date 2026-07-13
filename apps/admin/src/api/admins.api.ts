import { api } from '../lib/api'

export const adminsApi = {
  list: async () => {
    const res = await api.get('/admin/users')
    return res.data.data
  },

  invite: async (payload: { email: string; fullName: string; roleId: string; password?: string }) => {
    const res = await api.post('/admin/users', payload)
    return res.data
  },

  updateRole: async (id: string, roleId: string) => {
    const res = await api.put(`/admin/users/${id}`, { roleId })
    return res.data
  },

  deactivate: async (id: string) => {
    const res = await api.patch(`/admin/users/${id}`, { isActive: false })
    return res.data
  },

  reactivate: async (id: string) => {
    const res = await api.patch(`/admin/users/${id}`, { isActive: true })
    return res.data
  },

  getRoles: async () => {
    const res = await api.get('/admin/roles')
    return res.data.data
  },
}
