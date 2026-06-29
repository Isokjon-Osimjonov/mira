import { api } from '../lib/api'

export interface Permission {
  resource: string
  action: 'read' | 'write' | 'delete'
}

export interface Role {
  id: string
  name: string
  description?: string | null
  permissions: Permission[]
  is_active: boolean
  adminCount?: number
}

export const rolesApi = {
  list: async () => {
    const res = await api.get('/admin/roles')
    return res.data.data as Role[]
  },

  create: async (payload: {
    name: string
    description?: string | null
    permissions: Permission[]
  }) => {
    const res = await api.post('/admin/roles', payload)
    return res.data
  },

  update: async (
    id: string,
    payload: {
      name?: string
      description?: string | null
      permissions?: Permission[]
    }
  ) => {
    const res = await api.put(`/admin/roles/${id}`, payload)
    return res.data
  },

  updateGranular: async (
    id: string,
    payload: {
      operation: 'add' | 'remove'
      resource: string
      action: string
    }
  ) => {
    const res = await api.patch(`/admin/roles/${id}/permissions`, payload)
    return res.data
  },

  delete: async (id: string) => {
    const res = await api.delete(`/admin/roles/${id}`)
    return res.data
  },
}
