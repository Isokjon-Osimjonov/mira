import api from '../lib/api'

export interface CartItem {
  id: string
  productId: string
  name: string
  brandName: string
  imageUrls: string[]
  quantity: number
  unitPrice: number
  isWholesale: boolean
  subtotal: number
  currency: string
  weightGrams: number
  stockAvailable: number
  inStock: boolean
  isActive: boolean
}

export interface Cart {
  id: string | null
  regionCode: string
  items: CartItem[]
  summary: {
    itemCount: number
    subtotal: number
    currency: string
  }
  autoApplyCoupons: any[]
}

export const cartService = {
  getCart: async (): Promise<Cart> => {
    const res = await api.get('/cart')
    return res.data.data
  },

  addItem: async (productId: string, quantity: number): Promise<Cart> => {
    const res = await api.post('/cart/items', {
      productId,
      quantity,
    })
    return res.data.data
  },

  updateItem: async (itemId: string, quantity: number): Promise<void> => {
    await api.patch(`/cart/items/${itemId}`, { quantity })
  },

  removeItem: async (itemId: string): Promise<void> => {
    await api.delete(`/cart/items/${itemId}`)
  },

  clearCart: async (): Promise<void> => {
    await api.delete('/cart')
  },

  validateCoupon: async (
    code: string
  ): Promise<{
    valid: boolean
    coupon: { id: string; code: string; type: string }
    discountAmount: number
    eligibleSubtotal: number
  }> => {
    const res = await api.post('/cart/validate-coupon', { code })
    return res.data.data
  },
}
