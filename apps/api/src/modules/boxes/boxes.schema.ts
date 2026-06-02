import { z } from 'zod'

export const createBoxSchema = z.object({
  name: z.string().min(1, 'Nomini kiriting'),
  maxWeightKg: z.coerce.number().positive("Maksimal vazn musbat bo'lishi kerak"),
  boxWeightKg: z.coerce.number().positive("Quti vazni musbat bo'lishi kerak"),
  priceUsd: z.coerce.number().min(0, "Narx 0 dan kichik bo'lmaydi"),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
})

export const updateBoxSchema = createBoxSchema.partial()

export type CreateBoxDto = z.infer<typeof createBoxSchema>
export type UpdateBoxDto = z.infer<typeof updateBoxSchema>
