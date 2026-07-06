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
    cargoFee: number
    subtotal: number
    discountAmount: number
    boxCostKrw: number
  }
  paymentInfo: {
    method: string
    bankName: string | null
    accountNumber: string | null
    holderName: string | null
    instructions: string | null
  }
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  brandName: string
  imageUrl: string | null
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface Order {
  id: string
  orderNumber: string
  status: string
  currency: string
  paymentMethod: string
  subtotal: number
  cargoFee: number
  discountAmount: number
  totalAmount: number
  paymentDeadline: string | null
  paymentReceiptUrl: string | null
  paymentRejectedReason: string | null
  trackingNumber: string | null
  estimatedDeliveryStart: string | null
  estimatedDeliveryEnd: string | null
  refundRequestedAt: string | null
  deliveryFullName: string | null
  deliveryPhone: string | null
  deliveryAddressLine1: string | null
  deliveryAddressLine2: string | null
  deliveryCity: string | null
  deliveryPostalCode: string | null
  deliveryRegion: string | null
  createdAt: string
  items: OrderItem[]
  couponCode?: string | null
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
    return {
      items: res.data.data,
      meta: res.data.meta,
    }
  },

  getOrderById: async (id: string): Promise<Order> => {
    const res = await api.get(`/orders/${id}`)
    return res.data.data
  },

  uploadReceipt: async (
    orderId: string,
    receiptUrl: string,
    paymentAmount: number,
    paymentCurrency: 'KRW' | 'UZS'
  ): Promise<void> => {
    await api.post(`/orders/${orderId}/receipt`, {
      receiptUrl,
      paymentAmount,
      paymentCurrency,
    })
  },

  cancelOrder: async (orderId: string, reason?: string): Promise<void> => {
    await api.post(`/orders/${orderId}/cancel`, { reason })
  },
}
