import { z } from 'zod'

export const OrderStatusSchema = z.enum([
  'pending_payment',
  'payment_rejected',
  'payment_confirmed',
  'order_confirmed',
  'packaging',
  'shipped',
  'customs',
  'delivering',
  'delivered',
  'cancelled',
])
export type OrderStatus = z.infer<typeof OrderStatusSchema>

export const DeliveryTypeSchema = z.enum(['international_cargo', 'domestic_courier'])
export type DeliveryType = z.infer<typeof DeliveryTypeSchema>

export const PaymentMethodSchema = z.enum(['korean_bank', 'uzb_bank', 'e9pay'])
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>
