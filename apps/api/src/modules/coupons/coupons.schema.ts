import { z } from 'zod'

const baseCouponSchema = z.object({
  code: z.string().trim().toUpperCase().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.enum(['PERCENTAGE', 'FIXED', 'FREE_SHIPPING']),
  value: z.coerce.number().min(0),
  valueKrw: z.coerce.number().optional().nullable(),
  maxDiscountCap: z.coerce.number().int().min(0).optional().nullable(),
  maxDiscountKrw: z.coerce.number().optional().nullable(),
  scope: z.enum(['ALL', 'PRODUCT', 'CATEGORY', 'CUSTOMER']),
  productId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  applicableResourceIds: z.array(z.string().uuid()).optional().nullable(),
  applicableBrands: z.array(z.string()).optional().nullable(),
  minOrderAmount: z.coerce.number().optional(),
  minOrderKrw: z.coerce.number().optional().nullable(),
  minOrderQty: z.number().int().optional(),
  regionCode: z.string().optional().nullable(),
  firstOrderOnly: z.boolean().optional().default(false),
  onePerCustomer: z.boolean().optional().default(false),
  excludeWholesale: z.boolean().optional().default(false),
  targetCustomerIds: z.array(z.string().uuid()).optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  maxUsesTotal: z.number().int().optional().nullable(),
  maxUsesPerCustomer: z.number().int().optional(),
  autoApply: z.boolean().optional(),
  status: z.enum(['DRAFT', 'ACTIVE']).default('DRAFT'),
  isStackable: z.boolean().optional(),
  isPromotional: z.boolean().optional(),
  promoDisplayText: z.string().optional().nullable(),
})

const couponRefinement = (data: { startsAt?: string | null; expiresAt?: string | null }) => {
  if (data.startsAt && data.expiresAt) {
    return new Date(data.startsAt) < new Date(data.expiresAt)
  }
  return true
}

const couponRefinementOptions = {
  message: "Boshlanish vaqti tugash vaqtidan oldin bo'lishi kerak",
  path: ['startsAt'],
}

export const createCouponSchema = baseCouponSchema.refine(couponRefinement, couponRefinementOptions)

export const updateCouponSchema = baseCouponSchema
  .omit({ code: true })
  .refine(couponRefinement, couponRefinementOptions)

export const updateCouponStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']),
})

export type CreateCouponDto = z.infer<typeof createCouponSchema>
export type UpdateCouponDto = z.infer<typeof updateCouponSchema>
export type UpdateCouponStatusDto = z.infer<typeof updateCouponStatusSchema>
