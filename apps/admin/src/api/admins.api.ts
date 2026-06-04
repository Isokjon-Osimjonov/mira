import { api } from '../lib/api'

export const adminsApi = {
  list: async () => {
    const res = await api.get('/admin/admins')
    return res.data.data
  },

  invite: async (payload: {
    email:    string
    fullName: string
    roleId:   string
  }) => {
    const res = await api.post('/admin/admins/invite', payload)
    return res.data
  },

  updateRole: async (id: string, roleId: string) => {
    const res = await api.patch(`/admin/admins/${id}/role`, { roleId })
    return res.data
  },

  deactivate: async (id: string) => {
    const res = await api.post(`/admin/admins/${id}/deactivate`)
    return res.data
  },

  reactivate: async (id: string) => {
    const res = await api.post(`/admin/admins/${id}/reactivate`)
    return res.data
  },

  getRoles: async () => {
    const res = await api.get('/admin/roles')
    return res.data.data
  },
}
