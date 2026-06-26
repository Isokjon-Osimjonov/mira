import { z } from 'zod'

// Non-negative integer (or undefined). Used for flat price fields coming from the form.
const priceField = z.coerce.number().int().min(0).optional()

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
  isNew: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  showStockCount: z.boolean().default(false),
  sortOrder: z.number().int().default(0),

  // Regional pricing — flat fields, all optional.
  // A region is configured only if its retail price > 0.
  // Wholesale is required when retail is set, and must be <= retail (DB CHECK).
  korRetailPrice: priceField,
  korWholesalePrice: priceField,
  uzbRetailPrice: priceField,
  uzbWholesalePrice: priceField,
  minOrderQty: z.coerce.number().int().min(1).default(1),
  minWholesaleQty: z.coerce.number().int().min(1).default(5),
})

export const UpdateProductSchema = CreateProductSchema.partial()

// Used by the dedicated /pricing endpoint — keeps the array form for
// explicit per-region updates after the product exists.
export const RegionalConfigSchema = z.object({
  regionCode: z.enum(['UZB', 'KOR']),
  retailPrice: z.coerce.string(), // bigint serialized as string
  wholesalePrice: z.coerce.string(),
  currency: z.literal('KRW').default('KRW'),
  minWholesaleQty: z.number().int().min(1).default(5),
  minOrderQty: z.number().int().min(1).default(1),
  isAvailable: z.boolean().default(true),
})

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
