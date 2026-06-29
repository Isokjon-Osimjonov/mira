import { z } from 'zod'

export const CreateBatchSchema = z.object({
  productId: z.string().uuid("Mahsulot ID noto'g'ri"),
  batchRef: z.string().optional().nullable(),
  initialQty: z.number().int().positive("Miqdor musbat bo'lishi kerak"),
  costPrice: z.coerce.string(),
  costCurrency: z.string().default('KRW'),
  expiryDate: z.string().optional().nullable(), // ISO date string
  notes: z.string().optional().nullable(),
})

export const UpdateBatchSchema = z.object({
  currentQty: z.number().int().min(0).optional(),
  expiryDate: z.string().optional().nullable(),
  costPrice: z.coerce.string().optional(),
  reason: z.string().min(1, 'Sababini kiriting'),
})

export const WriteOffStockSchema = z
  .object({
    batchId: z.string().uuid(),
    quantity: z.number().int(),
    type: z.enum(['GIFT', 'SAMPLE', 'DAMAGED', 'EXPIRED', 'LOST', 'ADJUSTMENT']),
    reason: z.string().max(500).optional(),
    recipientName: z.string().max(200).optional(),
    recipientPhone: z.string().max(30).optional(),
    createExpense: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.type === 'GIFT' && !data.recipientName) return false
      return true
    },
    { message: "Sovg'a oluvchi ismi kerak", path: ['recipientName'] }
  )
  .refine(
    (data) => {
      if (data.type !== 'ADJUSTMENT' && data.quantity <= 0) return false
      return true
    },
    { message: "Miqdor musbat bo'lishi kerak", path: ['quantity'] }
  )

export type CreateBatchDto = z.infer<typeof CreateBatchSchema>
export type UpdateBatchDto = z.infer<typeof UpdateBatchSchema>
export type WriteOffStockDto = z.infer<typeof WriteOffStockSchema>
