import { z } from 'zod'

export const updateSettingsSchema = z.object({
  paymentTimeoutMinutes: z.number().optional(),
  lowStockThreshold: z.number().optional(),
  uzbCargoUsdPerKg: z.number().optional(),

  standardShippingFeeKrw: z.coerce.number().optional(),
  freeShippingThresholdKrw: z.coerce.number().optional(),
  minOrderKorKrw: z.coerce.number().optional(),
  minOrderUzbUzs: z.coerce.number().optional(),

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

export const updatePaymentMethodSchema = z.object({
  isEnabled: z.boolean().optional(),
  bankName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  holderName: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
})

export const createShippingTierSchema = z.object({
  region: z.enum(['KOR', 'UZB']),
  minOrderAmount: z.coerce.number().min(0),
  shippingCost: z.coerce.number().min(0),
  currency: z.string().length(3).default('KRW'),
})

export const updateShippingTierSchema = createShippingTierSchema.partial()

export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>
export type UpdatePaymentMethodDto = z.infer<typeof updatePaymentMethodSchema>
export type CreateShippingTierDto = z.infer<typeof createShippingTierSchema>
export type UpdateShippingTierDto = z.infer<typeof updateShippingTierSchema>
