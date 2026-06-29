import { z } from 'zod'

export const createSupplierSchema = z.object({
  name: z.string().min(2, "Yetkazib beruvchi nomi kamida 2 ta belgi bo'lishi kerak").max(200),
  country: z.string().min(2).max(5).optional().default('KR'),
  contactName: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z
    .string()
    .email("Noto'g'ri email formati")
    .max(200)
    .optional()
    .nullable()
    .or(z.literal('')),
  address: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  website: z.string().url("Noto'g'ri URL formati").max(300).optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

export const updateSupplierSchema = createSupplierSchema.partial()

export type CreateSupplierDto = z.infer<typeof createSupplierSchema>
export type UpdateSupplierDto = z.infer<typeof updateSupplierSchema>
