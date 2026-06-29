import { api } from '../lib/api'

export const purchaseOrdersApi = {
  list: async (
    params: {
      page?: number
      limit?: number
      status?: string
      paymentStatus?: string
    } = {}
  ) => {
    const res = await api.get('/admin/purchase-orders', { params })
    return res.data
  },

  getById: async (id: string) => {
    const res = await api.get(`/admin/purchase-orders/${id}`)
    return res.data.data
  },

  create: async (payload: {
    supplierId: string
    orderDate: string
    items: Array<{
      productId: string
      quantityOrdered: number
      unitCostKrw: number
    }>
    expectedDeliveryDate?: string
    notes?: string
  }) => {
    const res = await api.post('/admin/purchase-orders', payload)
    return res.data
  },

  updateStatus: async (id: string, status: string) => {
    const res = await api.patch(`/admin/purchase-orders/${id}/status`, { status })
    return res.data
  },

  receiveItems: async (
    id: string,
    payload: {
      actualDeliveryDate: string
      items: Array<{
        purchaseOrderItemId: string
        quantityReceived: number
        expiryDate?: string
      }>
    }
  ) => {
    const res = await api.post(`/admin/purchase-orders/${id}/receive`, payload)
    return res.data
  },

  recordPayment: async (id: string, amountKrw: number) => {
    const res = await api.post(`/admin/purchase-orders/${id}/payment`, { amountKrw })
    return res.data
  },

  delete: async (id: string) => {
    const res = await api.delete(`/admin/purchase-orders/${id}`)
    return res.data
  },
}
