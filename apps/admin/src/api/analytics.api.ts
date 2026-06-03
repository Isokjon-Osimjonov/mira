import { api } from '../lib/api'

export type DashboardPeriod = '7d' | '30d' | 'month'

export const analyticsApi = {
  // KPI overview (today stats + period stats)
  getOverview: async (period: DashboardPeriod = '7d') => {
    const res = await api.get('/admin/dashboard/overview', { params: { period } })
    return res.data.data
  },

  // Revenue chart data (daily breakdown)
  getRevenue: async (period: DashboardPeriod = '7d') => {
    const res = await api.get('/admin/dashboard/revenue', { params: { period } })
    return res.data.data
  },

  // Orders by status (for donut chart)
  getOrdersByStatus: async (period: DashboardPeriod = '7d') => {
    const res = await api.get('/admin/dashboard/orders-by-status', { params: { period } })
    return res.data.data
  },

  // Top selling products
  getTopProducts: async (period: DashboardPeriod = '7d') => {
    const res = await api.get('/admin/dashboard/products', { params: { period, limit: 5 } })
    return res.data.data
  },

  // Inventory stats (count + value)
  getInventory: async () => {
    const res = await api.get('/admin/dashboard/inventory')
    return res.data.data
  },

  // P&L summary
  getPL: async (period: DashboardPeriod = '7d') => {
    const res = await api.get('/admin/dashboard/pl', { params: { period } })
    return res.data.data
  },
}
