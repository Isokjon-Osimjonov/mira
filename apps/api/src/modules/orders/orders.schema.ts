import { z } from 'zod'

export const checkoutSchema = z.object({
  addressId: z.string().uuid('Manzilni tanlang'),
  paymentMethod: z.enum(['KOREAN_BANK', 'UZB_BANK', 'E9PAY'], { message: "To'lov turini tanlang" }),
  boxId: z.string().uuid().optional(),
  couponCode: z.string().trim().toUpperCase().optional(),
  customerNote: z.string().optional(),
})

export const uploadReceiptSchema = z.object({
  receiptUrl: z.string().url('Kvitansiya rasmi yaroqsiz'),
  paymentAmount: z.coerce.number().positive("To'lov summasini kiriting"),
  paymentCurrency: z.enum(['KRW', 'UZS']),
})

export const manualOrderSchema = z
  .object({
    customerId: z.string().uuid(),
    addressId: z.string().uuid().optional(),
    paymentMethod: z.enum(['KOREAN_BANK', 'UZB_BANK', 'E9PAY']),
    paymentMode: z.enum(['RECEIPT', 'IMMEDIATE']).default('RECEIPT'),
    orderDiscountPct: z.number().int().min(0).max(100).optional(),
    orderDiscountFlat: z.number().int().min(0).optional(),
    boxId: z.string().uuid().optional(),
    couponCode: z.string().trim().toUpperCase().optional(),
    adminNote: z.string().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().int().positive(),
          negotiatedPriceKrw: z.coerce.number().min(0).optional(),
        })
      )
      .min(1, "Kamida bitta mahsulot qo'shing"),
  })
  .refine((d) => !(d.orderDiscountPct && d.orderDiscountFlat), {
    message: 'Faqat bir tur chegirma tanlang (foiz yoki summa)',
    path: ['orderDiscountPct'],
  })

export const confirmPaymentSchema = z.object({
  confirmed: z.boolean(),
  note: z.string().optional(),
})

export const rejectPaymentSchema = z.object({
  reason: z.string().min(1, 'Rad etish sababini yozing'),
})

export const shipOrderSchema = z.object({
  trackingNumber: z.string().optional(),
})

export const cancelOrderSchema = z.object({
  reason: z.string().optional(),
})

export const refundOrderSchema = z.object({
  refundAmount: z.coerce.number().positive(),
  refundNote: z.string().optional(),
})

export const requestRefundSchema = z.object({
  reason: z.string().min(10).max(1000),
})

export const addExpenseSchema = z.object({
  type: z.enum(['CUSTOMS', 'PACKAGING', 'OTHER']),
  amountKrw: z.coerce.number().min(0),
  note: z.string().optional(),
})

export type CheckoutDto = z.infer<typeof checkoutSchema>
export type UploadReceiptDto = z.infer<typeof uploadReceiptSchema>
export type ManualOrderDto = z.infer<typeof manualOrderSchema>
export type ConfirmPaymentDto = z.infer<typeof confirmPaymentSchema>
export type RejectPaymentDto = z.infer<typeof rejectPaymentSchema>
export type ShipOrderDto = z.infer<typeof shipOrderSchema>
export type CancelOrderDto = z.infer<typeof cancelOrderSchema>
export type RefundOrderDto = z.infer<typeof refundOrderSchema>
export type AddExpenseDto = z.infer<typeof addExpenseSchema>
