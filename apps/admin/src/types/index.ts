// Pagination
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ApiResponse<T> {
  data: T | null
  error: { message: string; code: string } | null
  meta?: PaginationMeta
}

// Order statuses
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_SUBMITTED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_REJECTED'
  | 'PACKING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELED'
  | 'REFUNDED'

export type Region = 'KOR' | 'UZB'

// Entities
export interface OrderListItem {
  id: string
  orderNumber: string
  status: OrderStatus
  region: Region
  totalAmount: number
  customerName: string
  customerPhone: string
  itemCount: number
  createdAt: string
  paymentDeadline?: string
}

export interface Product {
  id: string
  nameKo: string
  nameUz?: string
  brandName: string
  barcode: string
  sku?: string
  imageUrls: string[]
  isActive: boolean
  categoryId?: string
}

export interface Customer {
  id: string
  firstName: string
  lastName?: string
  phone: string
  region: Region
  isBlocked: boolean
  orderCount: number
  totalSpentKrw: number
  createdAt: string
}

export interface StockItem {
  productId: string
  productName: string
  brandName: string
  barcode: string
  totalStock: number
  reservedStock: number
  availableStock: number
  status: 'ok' | 'low' | 'out' | 'dead'
  imageUrl?: string
}

export interface Box {
  id: string
  name: string
  priceKrw: number
  widthCm?: number
  heightCm?: number
  depthCm?: number
  isActive: boolean
}
