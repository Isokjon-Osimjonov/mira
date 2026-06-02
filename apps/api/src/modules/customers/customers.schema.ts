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

export type UpdateCustomerNotesDto = z.infer<typeof updateCustomerNotesSchema>
export type BlockCustomerDto = z.infer<typeof blockCustomerSchema>
export type AssignCouponDto = z.infer<typeof assignCouponSchema>
