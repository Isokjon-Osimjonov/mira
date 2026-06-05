import { z } from 'zod'

export const poItemSchema = z.object({
  productId: z.string().uuid(),
  quantityOrdered: z.number().int().positive(),
  unitCostKrw: z.coerce.number().min(0),
})

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  orderDate: z.string().date(),
  expectedDeliveryDate: z.string().date().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(poItemSchema).min(1, "Kamida bitta mahsulot qo'shing"),
})

export const updatePurchaseOrderSchema = createPurchaseOrderSchema.partial().extend({
  items: z.array(poItemSchema).min(1).optional(),
})

export const updatePOStatusSchema = z.object({
  status: z.enum(['ORDERED', 'CANCELLED']),
})

export const recordPaymentSchema = z.object({
  amountKrw: z.coerce.number().positive(),
})

export const receivePOItemSchema = z.object({
  purchaseOrderItemId: z.string().uuid(),
  quantityReceived: z.number().int().min(0),
  expiryDate: z.string().date().optional().nullable(),
})

export const receivePOSchema = z.object({
  actualDeliveryDate: z.string().date(),
  items: z.array(receivePOItemSchema).min(1),
})

export type CreatePurchaseOrderDto = z.infer<typeof createPurchaseOrderSchema>
export type UpdatePurchaseOrderDto = z.infer<typeof updatePurchaseOrderSchema>
export type UpdatePOStatusDto = z.infer<typeof updatePOStatusSchema>
export type ReceivePODto = z.infer<typeof receivePOSchema>
export type RecordPaymentDto = z.infer<typeof recordPaymentSchema>
