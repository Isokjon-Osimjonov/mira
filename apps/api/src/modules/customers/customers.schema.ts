import { z } from 'zod'

export const updateCustomerNotesSchema = z.object({
  notes: z.string(),
})

export const blockCustomerSchema = z.object({
  reason: z.string().optional(),
})

export const assignCouponSchema = z.object({
  couponId: z.string().uuid(),
})

export const createWalkInCustomerSchema = z.object({
  firstName: z.string()
    .min(2)
    .max(50)
    .regex(/^[\p{L}\s'-]+$/u, {
      message: "Ism faqat harflardan iborat bo'lishi kerak"
    }),
  lastName: z.string()
    .max(50)
    .regex(/^[\p{L}\s'-]+$/u, {
      message: "Familiya faqat harflardan iborat bo'lishi kerak"
    })
    .nullable()
    .optional()
    .transform(val => val?.trim() === '' ? undefined : val),
  phone: z.string().optional(),
  region: z.enum(['UZB', 'KOR']),
  note: z.string().max(500).optional(),
})

export type UpdateCustomerNotesDto = z.infer<typeof updateCustomerNotesSchema>
export type BlockCustomerDto = z.infer<typeof blockCustomerSchema>
export type AssignCouponDto = z.infer<typeof assignCouponSchema>
export type CreateWalkInCustomerDto = z.infer<typeof createWalkInCustomerSchema>
