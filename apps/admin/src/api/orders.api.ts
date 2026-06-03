import { api } from '../lib/api'
import type { ApiResponse, OrderListItem, PaginationMeta } from '../types'

export interface OrdersParams {
  page?:    number
  limit?:   number
  status?:  string
  region?:  string
  search?:  string
  dateFrom?: string
  dateTo?:  string
}

export const ordersApi = {
  list: async (params: OrdersParams = {}) => {
    const res = await api.get('/admin/orders', { params })
    return res.data as ApiResponse<OrderListItem[]> & {
      meta: PaginationMeta
    }
  },

  getById: async (id: string) => {
    const res = await api.get(`/admin/orders/${id}`)
    return res.data
  },

  updateStatus: async (id: string, payload: {
    status: string
    note?: string
  }) => {
    const res = await api.patch(`/admin/orders/${id}/status`, payload)
    return res.data
  },

  confirmPayment: async (id: string, payload: {
    confirmed: boolean
    note?: string
  }) => {
    const res = await api.post(`/admin/orders/${id}/confirm-payment`, payload)
    return res.data
  },

  downloadInvoice: (id: string, token: string) =>
    `${import.meta.env.VITE_API_URL}/api/v1/admin/orders/${id}/invoice?token=${token}`,

  createManual: async (payload: unknown) => {
    const res = await api.post('/admin/orders/manual', payload)
    return res.data
  },
}
