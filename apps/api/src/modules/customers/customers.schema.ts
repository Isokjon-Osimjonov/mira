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
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  phone: z.string().optional(),
  region: z.enum(['UZB', 'KOR']),
  note: z.string().max(500).optional(),
})

export type UpdateCustomerNotesDto = z.infer<typeof updateCustomerNotesSchema>
export type BlockCustomerDto = z.infer<typeof blockCustomerSchema>
export type AssignCouponDto = z.infer<typeof assignCouponSchema>
export type CreateWalkInCustomerDto = z.infer<typeof createWalkInCustomerSchema>
