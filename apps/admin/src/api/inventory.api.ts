import { api } from '../lib/api'

export const inventoryApi = {
  getOverview: async (
    params: {
      filter?: 'low' | 'out' | 'expiring'
      search?: string
      categoryId?: string
      page?: number
      limit?: number
    } = {}
  ) => {
    const res = await api.get('/admin/inventory/stock', { params })
    return res.data
  },

  getProductBatches: async (productId: string) => {
    const res = await api.get(`/admin/inventory/batches/${productId}`)
    return res.data.data
  },

  getMovements: async (productId: string, params = {}) => {
    const res = await api.get(`/admin/inventory/${productId}/movements`, { params })
    return res.data.data
  },

  addBatch: async (
    productId: string,
    payload: {
      quantity: number
      costPrice?: number
      supplierId?: string
      expiryDate?: string | null
      note?: string
    }
  ) => {
    const res = await api.post('/admin/inventory/batches', {
      productId,
      initialQty: payload.quantity,
      costPrice: payload.costPrice?.toString() || '0',
      expiryDate: payload.expiryDate,
      notes: payload.note,
    })
    return res.data
  },

  writeOff: async (payload: {
    productId: string
    batchId?: string
    quantity: number
    type: string
    reason?: string
    recipientName?: string
    note?: string
    createExpense?: boolean
    expenseCategoryId?: string
  }) => {
    // If batchId is not provided, we might need a separate logic or the backend handles it.
    // Based on current service, batchId is required.
    const res = await api.post('/admin/inventory/write-off', {
      batchId: payload.batchId,
      quantity: payload.quantity,
      type: payload.type,
      reason: payload.reason || payload.note,
      recipientName: payload.recipientName,
      createExpense: payload.createExpense || false,
      expenseCategoryId: payload.expenseCategoryId,
    })
    return res.data
  },

  getWriteOffReasons: async () => {
    const res = await api.get('/admin/inventory/write-off-reasons')
    return res.data.data as string[]
  },

  deleteBatch: async (id: string) => {
    const res = await api.delete(`/admin/inventory/batches/${id}`)
    return res.data
  },
}
