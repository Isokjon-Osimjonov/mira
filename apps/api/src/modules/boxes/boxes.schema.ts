import { z } from 'zod'

export const createBoxSchema = z.object({
  name: z.string().min(1, 'Nomini kiriting'),
  sizeLabel: z.string().optional().nullable(),
  lengthCm: z.coerce.number().min(0).optional().nullable(),
  widthCm: z.coerce.number().min(0).optional().nullable(),
  heightCm: z.coerce.number().min(0).optional().nullable(),
  costKrw: z.coerce.number().int().min(0).default(0),
  stockCount: z.coerce.number().int().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(10),
  imageUrls: z.array(z.string()).optional().default([]),
  isActive: z.boolean().optional().default(true),

  // Legacy fields (optional)
  maxWeightKg: z.coerce.number().positive().optional().nullable(),
  boxWeightKg: z.coerce.number().positive().optional().nullable(),
  priceUsd: z.coerce.number().min(0).optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
})

export const updateBoxSchema = createBoxSchema.partial()

export const adjustStockSchema = z.object({
  qty: z.number().int().positive("Miqdor musbat bo'lishi kerak"),
  type: z.enum(['add', 'use']),
})

export type CreateBoxDto = z.infer<typeof createBoxSchema>
export type UpdateBoxDto = z.infer<typeof updateBoxSchema>
export type AdjustStockDto = z.infer<typeof adjustStockSchema>
