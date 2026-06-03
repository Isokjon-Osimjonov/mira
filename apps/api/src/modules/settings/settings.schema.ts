import { z } from 'zod'

export const updateSettingsSchema = z.object({
  paymentTimeoutMinutes: z.number().optional(),
  lowStockThreshold: z.number().optional(),
  uzbCargoUsdPerKg: z.number().optional(),

  standardShippingFeeKrw: z.coerce.number().optional(),
  freeShippingThresholdKrw: z.coerce.number().optional(),
  minOrderUzbKrw: z.coerce.number().optional(),
  minOrderKorKrw: z.coerce.number().optional(),

  korBankEnabled: z.boolean().optional(),
  korBankName: z.string().optional().nullable(),
  korBankHolder: z.string().optional().nullable(),
  korBankNumber: z.string().optional().nullable(),

  korE9payEnabled: z.boolean().optional(),
  korE9payName: z.string().optional().nullable(),
  korE9payAccount: z.string().optional().nullable(),

  uzbBankEnabled: z.boolean().optional(),
  uzbBankName: z.string().optional().nullable(),
  uzbBankHolder: z.string().optional().nullable(),
  uzbBankNumber: z.string().optional().nullable(),

  telegramUrl: z.string().url().optional().nullable(),
  instagramUrl: z.string().url().optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),
})

export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>
