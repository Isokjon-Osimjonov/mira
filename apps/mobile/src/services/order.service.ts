import api from '../lib/api'

export interface OrderAddress {
  regionCode: 'UZB' | 'KOR'
  recipientName: string
  phone: string
  // UZB fields
  viloyat?: string
  shahar?: string
  street?: string
  // KOR fields
  postalCode?: string
  roadAddress?: string
  detailAddress?: string
}

export interface CheckoutPayload {
  addressId: string
  paymentMethod: 'KOREAN_BANK' | 'UZB_BANK' | 'E9PAY'
  couponCode?: string
  boxId?: string
  customerNote?: string
}

export interface CheckoutResult {
  order: {
    id: string
    orderNumber: string
    status: string
    totalAmount: number
    paymentDeadline: string | null
  }
  paymentInfo: {
    method: string
    korBankName: string | null
    korBankHolder: string | null
    korBankNumber: string | null
    korE9payName: string | null
    korE9payAccount: string | null
    uzbBankName: string | null
    uzbBankHolder: string | null
    uzbBankNumber: string | null
  }
}

export interface Order {
  id: string
  orderNumber: string
  status: string
  paymentExpiresAt: string | null
  totalAmount: number
  currency: string
  createdAt: string
  items: Array<{
    id: string
    productName: string
    brandName: string
    imageUrl: string
    quantity: number
    unitPrice: number
    subtotal: number
  }>
  address: OrderAddress
}

export const orderService = {
  checkout: async (payload: CheckoutPayload): Promise<CheckoutResult> => {
    const res = await api.post('/orders', payload)
    return res.data.data
  },

  getOrders: async (
    page = 1
  ): Promise<{
    items: Order[]
    meta: { total: number; page: number }
  }> => {
    const res = await api.get('/orders', { params: { page, limit: 20 } })
    return res.data
  },

  getOrderById: async (id: string): Promise<Order> => {
    const res = await api.get(`/orders/${id}`)
    return res.data.data
  },

  uploadReceipt: async (
    orderId: string,
    data: {
      receiptUrl: string
      paymentAmount: number
      paymentCurrency: 'KRW' | 'UZS'
    }
  ): Promise<void> => {
    await api.post(`/orders/${orderId}/receipt`, data)
  },

  cancelOrder: async (orderId: string, reason?: string): Promise<void> => {
    await api.post(`/orders/${orderId}/cancel`, { reason })
  },
}
