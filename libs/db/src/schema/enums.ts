import { pgEnum } from 'drizzle-orm/pg-core'

export const regionEnum = pgEnum('region', ['UZB', 'KOR'])

export const orderStatusEnum = pgEnum('order_status', [
  'DRAFT',
  'PENDING_PAYMENT',
  'PAYMENT_SUBMITTED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_REJECTED',
  'PACKING',
  'SHIPPED',
  'DELIVERED',
  'CANCELED',
  'REFUNDED',
])

export const paymentMethodEnum = pgEnum('payment_method', ['KOREAN_BANK', 'UZB_BANK', 'E9PAY'])

export const orderSourceEnum = pgEnum('order_source', ['STOREFRONT', 'MANUAL'])

export const deliveryCoveredByEnum = pgEnum('delivery_covered_by', ['CUSTOMER', 'BUSINESS'])

export const couponTypeEnum = pgEnum('coupon_type', ['PERCENTAGE', 'FIXED', 'FREE_SHIPPING'])

export const couponScopeEnum = pgEnum('coupon_scope', ['ALL', 'PRODUCT', 'CATEGORY', 'CUSTOMER'])

export const couponStatusEnum = pgEnum('coupon_status', [
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'EXPIRED',
  'ARCHIVED',
])

export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
  'STOCK_IN',
  'RESERVED',
  'RESERVATION_RELEASED',
  'DEDUCTED',
  'ADJUSTED',
  'RETURNED',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'GIFT',
  'SAMPLE',
  'WRITE_OFF',
  'EXPIRED',
  'DAMAGED',
  'ADJUSTMENT',
])

export const stockReservationStatusEnum = pgEnum('stock_reservation_status', [
  'ACTIVE',
  'RELEASED',
  'CONVERTED',
])

export const telegramPostStatusEnum = pgEnum('telegram_post_status', [
  'DRAFT',
  'SCHEDULED',
  'SENT',
  'FAILED',
  'ARCHIVED',
])

export const notificationTypeEnum = pgEnum('notification_type', [
  'ORDER_STATUS',
  'PAYMENT_CONFIRMED',
  'PAYMENT_REJECTED',
  'SHIPPED',
  'DELIVERED',
  'STOCK_BACK',
  'PRICE_DROP',
  'PROMO',
  'SYSTEM',
])

export const notificationChannelEnum = pgEnum('notification_channel', ['PUSH', 'TELEGRAM', 'BOTH'])

export const notificationStatusEnum = pgEnum('notification_status', ['SENT', 'FAILED', 'PENDING'])

export const exchangeRateSourceEnum = pgEnum('exchange_rate_source', ['API', 'MANUAL'])

export const orderExpenseTypeEnum = pgEnum('order_expense_type', [
  'CARGO_COST',
  'COUPON_DISCOUNT',
  'DELIVERY_ABSORBED',
  'CUSTOMS',
  'PACKAGING',
  'OTHER',
])

export const revokeReasonEnum = pgEnum('revoke_reason', [
  'LOGOUT',
  'ROTATION',
  'SECURITY',
  'EXPIRED',
  'ADMIN',
])

export const pickPackActionEnum = pgEnum('pick_pack_action', [
  'SCAN_SUCCESS',
  'SCAN_MISMATCH',
  'MANUAL_FALLBACK',
  'ITEM_CONFIRMED',
  'ORDER_PACKED',
])

export const pickPackResultEnum = pgEnum('pick_pack_result', ['OK', 'ERROR'])
