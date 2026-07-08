import api from '../lib/api'

export interface ApiResponse<T> {
  data: T | null
  error: { message: string; code: string } | null
}

export interface Product {
  id: string
  name: string
  brandName: string
  categoryName: string
  imageUrls: string[]
  retailPrice: number
  wholesalePrice: number
  totalStock: number
  isNew: boolean
  isFeatured: boolean
  isAvailable: boolean
  isActive: boolean
  createdAt: string
  // detail fields
  descriptionUz?: string
  howToUseUz?: string
  ingredients?: string[]
  skinTypes?: string[]
  benefits?: string[]
  weightGrams?: number
  volumeMl?: number | null
  volumeUnit?: string | null
  regionalConfigs?: Array<{
    regionCode: 'UZB' | 'KOR'
    retailPrice: number
    wholesalePrice: number
    currency: string
    isAvailable: boolean
    minOrderQty: number
    minWholesaleQty: number
  }>
}

export interface ProductsResponse {
  data: Product[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ExchangeRate {
  rate: number
  updatedAt: string
}

export interface ShippingTier {
  id: string
  label: string
  maxOrderKrw: number | null
  cargoFeeKrw: number
}

export const productService = {
  getProducts: async (params?: {
    featured?: boolean
    isNew?: boolean
    sort?: 'newest' | 'bestselling'
    limit?: number
    page?: number
    category?: string
    categoryId?: string
    region?: string
    q?: string
  }): Promise<ProductsResponse> => {
    const res = await api.get('/products', { params })
    return res.data
  },

  getProductById: async (id: string): Promise<Product> => {
    const res = await api.get<ApiResponse<Product>>(`/products/${id}`)
    return res.data.data!
  },

  getExchangeRate: async (): Promise<ExchangeRate> => {
    const res = await api.get<ApiResponse<ExchangeRate>>('/exchange-rates/current')
    return res.data.data!
  },

  getCategories: async (): Promise<any[]> => {
    const res = await api.get('/categories')
    return res.data.data ?? res.data
  },

  getKorShippingTiers: async (): Promise<ShippingTier[]> => {
    const res = await api.get('/kor-shipping-tiers')
    return res.data.data ?? []
  },

  getPaymentInfo: async (): Promise<{
    kor: { isEnabled: boolean; bankName: string; bankNumber: string; bankHolder: string }
    uzb: { isEnabled: boolean; bankName: string; bankNumber: string; bankHolder: string }
    e9pay: { isEnabled: boolean; name: string; account: string }
  }> => {
    const res = await api.get('/settings/payment-info')
    return res.data.data
  },
}

export const calculateKorCargo = (subtotalKrw: number, tiers: ShippingTier[]): number => {
  const sorted = [...tiers].sort(
    (a, b) => (a.maxOrderKrw ?? Infinity) - (b.maxOrderKrw ?? Infinity)
  )
  for (const tier of sorted) {
    if (tier.maxOrderKrw === null || subtotalKrw <= tier.maxOrderKrw) {
      return tier.cargoFeeKrw
    }
  }
  return 0
}
