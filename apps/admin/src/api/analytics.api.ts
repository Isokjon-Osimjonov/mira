import { api } from '../lib/api'

export type DashboardPeriod = '7d' | '30d' | 'month'

export const analyticsApi = {
  // Dashboard endpoints (used by DashboardPage)
  getDashboardOverview: async (period: DashboardPeriod = '7d') => {
    const res = await api.get('/admin/dashboard/overview', { params: { period } })
    return res.data.data
  },
  getDashboardRevenue: async (period: DashboardPeriod = '7d') => {
    const res = await api.get('/admin/dashboard/revenue', { params: { period } })
    return res.data.data
  },
  getOrdersByStatus: async (period: DashboardPeriod = '7d') => {
    const res = await api.get('/admin/dashboard/orders-by-status', { params: { period } })
    return res.data.data
  },
  getDashboardProducts: async (period: DashboardPeriod = '7d') => {
    const res = await api.get('/admin/dashboard/products', { params: { period, limit: 5 } })
    return res.data.data
  },
  getInventory: async () => {
    const res = await api.get('/admin/dashboard/inventory')
    return res.data.data
  },

  // New analytics endpoints (used by AnalitikPage)
  getOverview: async (params: { from: string; to: string }) => {
    const res = await api.get('/admin/analytics/overview', { params })
    return res.data.data
  },

  getRevenue: async (params: { from: string; to: string; groupBy: 'day' | 'week' | 'month' }) => {
    const res = await api.get('/admin/analytics/revenue', { params })
    return res.data.data
  },

  getTopProducts: async (params: { from: string; to: string; limit?: number }) => {
    const res = await api.get('/admin/analytics/top-products', { params })
    return res.data.data
  },

  getPL: async (params: { year: number; month?: number }) => {
    const res = await api.get('/admin/analytics/pl', { params })
    return res.data.data
  },

  getOrderFunnel: async (params: { from: string; to: string }) => {
    const res = await api.get('/admin/analytics/order-funnel', { params })
    return res.data.data
  },

  getCustomers: async (params: { from: string; to: string }) => {
    const res = await api.get('/admin/analytics/customers', { params })
    return res.data.data
  },

  getCouponStats: async (params: { from: string; to: string }) => {
    const res = await api.get('/admin/analytics/coupons', { params })
    return res.data.data
  },

  getCouponPerformance: async (params: { from: string; to: string }) => {
    const res = await api.get('/admin/analytics/coupon-performance', { params })
    return res.data.data
  },

  exportCSV: async (params: { type: 'pl' | 'orders' | 'products'; from: string; to: string }) => {
    const res = await api.get('/admin/analytics/export', { params, responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `${params.type}-${params.from}-${params.to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  },
}
