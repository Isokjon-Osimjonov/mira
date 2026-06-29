import { api } from '../lib/api'

export const couponsApi = {
  list: async (
    params: {
      page?: number
      limit?: number
      search?: string
      status?: string
      type?: string
    } = {}
  ) => {
    const res = await api.get('/admin/coupons', { params })
    return res.data
  },

  getById: async (id: string) => {
    const res = await api.get(`/admin/coupons/${id}`)
    return res.data
  },

  getUsages: async (id: string, params: { page?: number; limit?: number } = {}) => {
    const res = await api.get(`/admin/coupons/${id}/redemptions`, { params })
    return res.data
  },

  create: async (payload: CouponCreatePayload) => {
    const res = await api.post('/admin/coupons', payload)
    return res.data
  },

  update: async (id: string, payload: Partial<CouponCreatePayload>) => {
    const res = await api.put(`/admin/coupons/${id}`, payload)
    return res.data
  },

  updateStatus: async (id: string, status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED') => {
    const res = await api.patch(`/admin/coupons/${id}/status`, { status })
    return res.data
  },

  delete: async (id: string) => {
    const res = await api.delete(`/admin/coupons/${id}`)
    return res.data
  },

  generateCode: async (): Promise<string> => {
    const res = await api.get('/admin/coupons/generate-code')
    return res.data.data.code
  },
}

export interface CouponCreatePayload {
  code: string
  name: string
  type: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING'
  value: number
  valueKrw?: number | null
  maxDiscountCap?: number | null
  maxDiscountKrw?: number | null
  scope: 'ALL' | 'PRODUCT' | 'CATEGORY' | 'CUSTOMER'
  productId?: string | null
  categoryId?: string | null
  customerId?: string | null
  applicableResourceIds?: string[] | null
  applicableBrands?: string[] | null
  minOrderAmount?: number
  minOrderKrw?: number | null
  minOrderQty?: number
  regionCode?: string | null
  firstOrderOnly?: boolean
  onePerCustomer?: boolean
  excludeWholesale?: boolean
  startsAt?: string | null
  expiresAt?: string | null
  maxUsesTotal?: number | null
  maxUsesPerCustomer?: number
  autoApply?: boolean
  isStackable?: boolean
  isPromotional?: boolean
  promoDisplayText?: string | null
  description?: string | null
}
