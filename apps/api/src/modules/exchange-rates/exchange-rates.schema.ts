import { z } from 'zod'

export const createExchangeRateSchema = z.object({
  krwToUzs: z.number().positive(),
  usdToKrw: z.number().positive(),
  note: z.string().optional(),
})

export type CreateExchangeRateDto = z.infer<typeof createExchangeRateSchema>
