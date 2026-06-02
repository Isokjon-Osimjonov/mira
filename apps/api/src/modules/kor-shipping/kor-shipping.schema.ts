import { z } from 'zod'

export const createTierSchema = z.object({
  label: z.string().optional().nullable(),
  maxOrderKrw: z.coerce.number().nullable(),
  cargoFeeKrw: z.coerce.number().min(0, "Narx 0 dan kichik bo'lmaydi"),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
})

export const updateTierSchema = createTierSchema.partial()

export type CreateTierDto = z.infer<typeof createTierSchema>
export type UpdateTierDto = z.infer<typeof updateTierSchema>
