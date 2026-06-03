import { z } from 'zod'

export const addCartItemSchema = z.object({
  productId: z.string().uuid('Yaroqsiz mahsulot ID si'),
  quantity: z.number().int().positive("Miqdor 0 dan katta bo'lishi kerak"),
})

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0, "Miqdor manfiy bo'lmaydi"),
})

export const validateCouponSchema = z.object({
  code: z.string().trim().toUpperCase().min(1, 'Kupon kodini kiriting'),
})

export type AddCartItemDto = z.infer<typeof addCartItemSchema>
export type UpdateCartItemDto = z.infer<typeof updateCartItemSchema>
export type ValidateCouponDto = z.infer<typeof validateCouponSchema>
