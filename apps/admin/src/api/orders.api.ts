import { api } from '../lib/api'
import type { ApiResponse, OrderListItem, PaginationMeta } from '../types'
import { useAuthStore } from '../stores/auth.store'

export interface OrdersParams {
  page?: number
  limit?: number
  status?: string
  region?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  shippedDate?: string
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

  adminCreate: async (payload: any) => {
    const res = await api.post('/admin/orders', payload)
    return res.data
  },

  updateStatus: async (
    id: string,
    payload: {
      status: string
      trackingNumber?: string
      note?: string
    }
  ) => {
    const res = await api.patch(`/admin/orders/${id}/status`, payload)
    return res.data
  },

  confirmPayment: async (id: string, confirmed: boolean, note?: string) => {
    const res = await api.post(`/admin/orders/${id}/confirm-payment`, { confirmed, note })
    return res.data
  },

  updateDeliveryEstimate: async (
    id: string,
    estimatedDeliveryStart: string,
    estimatedDeliveryEnd: string
  ) => {
    const res = await api.patch(`/admin/orders/${id}/delivery-estimate`, {
      estimatedDeliveryStart,
      estimatedDeliveryEnd,
    })
    return res.data
  },

  getStatusCounts: async () => {
    const res = await api.get('/admin/orders/status-counts')
    return res.data.data as Record<string, number>
  },

  downloadInvoice: async (id: string): Promise<void> => {
    const res = await api.get(`/admin/orders/${id}/invoice`, {
      responseType: 'blob',
      headers: { Accept: 'application/pdf' },
    })
    // Create blob URL and trigger download
    const blob = new Blob([res.data], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `invoice-${id}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  },

  createManual: async (payload: unknown) => {
    const res = await api.post('/admin/orders/manual', payload)
    return res.data
  },

  scanOrderItem: async (id: string, barcode: string) => {
    const res = await api.post(`/admin/orders/${id}/scan-item`, { barcode })
    return res.data
  },
}
