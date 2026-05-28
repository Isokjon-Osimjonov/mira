import { pgEnum } from 'drizzle-orm/pg-core'

export const regionEnum   = pgEnum('region',    ['UZB', 'KOR'])
export const userRoleEnum = pgEnum('user_role', ['customer', 'admin'])
export const orderStatusEnum = pgEnum('order_status', [
  'pending_payment', 'payment_rejected', 'payment_confirmed',
  'order_confirmed', 'packaging', 'shipped',
  'customs', 'delivering', 'delivered', 'cancelled',
])
export const deliveryTypeEnum  = pgEnum('delivery_type',  ['international_cargo', 'domestic_courier'])
export const paymentMethodEnum = pgEnum('payment_method', ['korean_bank', 'uzb_bank', 'e9pay'])
