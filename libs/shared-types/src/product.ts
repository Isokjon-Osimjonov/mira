import { z } from 'zod'

export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  brand: z.string(),
  category_id: z.string().uuid(),
  description: z.string().nullable(),
  weight_g: z.number().int().positive(),
  retail_price_krw: z.number().int().positive(),
  wholesale_price_krw: z.number().int().positive().nullable(),
  wholesale_min_qty: z.number().int().positive().nullable(),
  stock: z.number().int().nonnegative(),
  images: z.array(z.string()),
  is_active: z.boolean(),
  created_at: z.string(),
})
export type Product = z.infer<typeof ProductSchema>
