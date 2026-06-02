import { z } from 'zod'

export const RegionalConfigSchema = z.object({
  regionCode: z.enum(['UZB', 'KOR']),
  retailPrice: z.coerce.string(), // Use string to handle bigint as string from client
  wholesalePrice: z.coerce.string(),
  currency: z.literal('KRW').default('KRW'),
  minWholesaleQty: z.number().int().min(1).default(5),
  minOrderQty: z.number().int().min(1).default(1),
  isAvailable: z.boolean().default(true),
})

export const CreateProductSchema = z.object({
  barcode: z.string().min(1, 'Barkod kiriting'),
  sku: z.string().min(1, 'SKU kiriting'),
  name: z.string().min(1, 'Nomini kiriting'),
  brandName: z.string().min(1, 'Brend nomini kiriting'),
  categoryId: z.string().uuid("Kategoriya ID noto'g'ri"),
  descriptionUz: z.string().optional().nullable(),
  howToUseUz: z.string().optional().nullable(),
  ingredients: z.array(z.string()).default([]),
  skinTypes: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  weightGrams: z.number().int().default(0),
  volumeMl: z.number().int().optional().nullable(),
  volumeUnit: z.string().optional().nullable(),
  imageUrls: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  showStockCount: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  regionalConfigs: z.array(RegionalConfigSchema).optional(),
})

export const UpdateProductSchema = CreateProductSchema.partial()

export const UpdatePricingSchema = z.object({
  configs: z.array(
    RegionalConfigSchema.pick({
      regionCode: true,
      retailPrice: true,
      wholesalePrice: true,
      minWholesaleQty: true,
      minOrderQty: true,
      isAvailable: true,
    })
  ),
})

export type CreateProductDto = z.infer<typeof CreateProductSchema>
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>
export type UpdatePricingDto = z.infer<typeof UpdatePricingSchema>
