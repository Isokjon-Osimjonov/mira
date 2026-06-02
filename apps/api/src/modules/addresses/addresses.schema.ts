import { z } from 'zod'

export const baseAddressSchema = z.object({
  label: z.string().max(50).optional(),
  regionCode: z.enum(['UZB', 'KOR']),
  fullName: z.string().min(2).max(100),
  phone: z.string().min(7).max(20),
  postalCode: z.string().max(10),
  isDefault: z.boolean().default(false),
  province: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  addressLine1: z.string().min(5).max(300),
  addressLine2: z.string().max(200).optional(),
})

export const createAddressSchema = baseAddressSchema.superRefine((data, ctx) => {
  if (data.regionCode === 'UZB') {
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
    if (data.postalCode?.length !== 5) {
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

// Use baseAddressSchema.partial() for updates to avoid refinement issues
export const updateAddressSchema = baseAddressSchema.partial()

export type CreateAddressDto = z.infer<typeof createAddressSchema>
export type UpdateAddressDto = z.infer<typeof updateAddressSchema>
