import { z } from 'zod'

export const baseAddressSchema = z.object({
  label: z.string().max(50).optional().nullable().default('Manzil'),
  regionCode: z.enum(['UZB', 'KOR']),
  fullName: z.string()
    .min(2)
    .max(100)
    .regex(/^[\p{L}\s'-]+$/u, {
      message: "Ism faqat harflardan iborat bo'lishi kerak",
    }),
  phone: z.string().min(7).max(20),
  postalCode: z.string().max(10).optional().nullable(),
  isDefault: z.boolean().default(false),
  province: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  addressLine1: z.string().min(5, { message: "Iltimos batafsil yozing" }).max(300),
  addressLine2: z.string().max(200).optional(),
})

export const createAddressSchema = baseAddressSchema.superRefine((data, ctx) => {
  const korPhoneRegex = /^\+82[0-9]{9,10}$/
  const uzbPhoneRegex = /^\+998[0-9]{9}$/

  if (data.regionCode === 'UZB') {
    if (!uzbPhoneRegex.test(data.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message: "O'zbekiston raqami +998 bilan boshlanishi va 13 belgidan iborat bo'lishi kerak"
      })
    }
    if (!data.province) {
      ctx.addIssue({
        code: 'custom',
        message: 'Viloyat kiritish majburiy',
        path: ['province'],
      })
    }
    if (!data.city) {
      ctx.addIssue({
        code: 'custom',
        message: 'Shahar kiritish majburiy',
        path: ['city'],
      })
    }
  }
  if (data.regionCode === 'KOR') {
    if (!korPhoneRegex.test(data.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message: "Koreya raqami +82 bilan boshlanishi va 12-13 belgidan iborat bo'lishi kerak"
      })
    }
    if (data.postalCode && data.postalCode.length !== 5) {
      ctx.addIssue({
        code: 'custom',
        message: 'KOR pochta indeksi 5 ta raqam',
        path: ['postalCode'],
      })
    }
    if (!data.addressLine2) {
      ctx.addIssue({
        code: 'custom',
        message: 'Xona/kvartira raqami majburiy',
        path: ['addressLine2'],
      })
    }
  }
})

export const updateAddressSchema = baseAddressSchema.partial()

export type CreateAddressDto = z.infer<typeof createAddressSchema>
export type UpdateAddressDto = z.infer<typeof updateAddressSchema>
