import { z } from 'zod'

export const CreateBatchSchema = z.object({
  productId: z.string().uuid('Mahsulot ID noto\'g\'ri'),
  batchRef: z.string().optional().nullable(),
  initialQty: z.number().int().positive('Miqdor musbat bo\'lishi kerak'),
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

export type CreateBatchDto = z.infer<typeof CreateBatchSchema>
export type UpdateBatchDto = z.infer<typeof UpdateBatchSchema>
