import { db } from '../../config/db'
import {
  products,
  productRegionalConfigs,
  inventoryBatches,
  exchangeRateSnapshots,
  categories,
  cartItems,
  regionEnum,
} from '@mira/db'
import { eq, and, isNull, sql, desc, asc, ilike, or, inArray } from 'drizzle-orm'
import { escapeLikeQuery } from '../../lib/sanitize'
import { validateSort } from '../../lib/sort-whitelist'
import { isValidCloudinaryUrl } from '../../lib/validate-url'
import { cacheGet, cacheSet, CACHE_TTL } from '../../lib/cache'
import type { CreateProductDto, UpdateProductDto, UpdatePricingDto } from './products.schema'

// Flat regional-pricing fields stripped from the product payload before update.
const REGIONAL_PRICE_KEYS = [
  'korRetailPrice',
  'korWholesalePrice',
  'uzbRetailPrice',
  'uzbWholesalePrice',
  'minOrderQty',
  'minWholesaleQty',
] as const

/**
 * Build the per-region rows to insert for a product from the flat DTO fields.
 *
 * Rules:
 *  - A region is only included if its retail price > 0.
 *  - When retail is set, wholesale is required and must be > 0.
 *  - wholesale must be <= retail (DB CHECK: product_regional_configs_price_compare_check).
 *  - Returns an array (possibly empty). Caller decides whether empty is an error.
 *
 * Throws clean { status, code, message } on validation failure.
 */
type RegionalPriceInput = {
  korRetailPrice?: number
  korWholesalePrice?: number
  minOrderQty?: number
  minWholesaleQty?: number
}

export function buildRegionalConfigs(
  data: RegionalPriceInput
): Array<{
  regionCode: 'UZB' | 'KOR'
  retailPrice: bigint
  wholesalePrice: bigint
  currency: 'KRW'
  minWholesaleQty: number
  minOrderQty: number
  isAvailable: boolean
}> {
  const retail = data.korRetailPrice
  const wholesale = data.korWholesalePrice

  if (!retail || retail <= 0) {
    throw {
      status: 400,
      code: 'PRODUCT_NO_REGIONAL_CONFIG',
      message: 'KOR retail narxi kiritilishi shart',
    }
  }

  if (!wholesale || wholesale <= 0) {
    throw {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'KOR wholesale narxi kiritilishi shart',
    }
  }

  if (wholesale > retail) {
    throw {
      status: 400,
      code: 'INVALID_DISCOUNT',
      message: "Wholesale narx retail narxdan katta bo'lmasligi kerak",
    }
  }

  return [
    {
      regionCode: 'KOR',
      retailPrice: BigInt(retail),
      wholesalePrice: BigInt(wholesale),
      currency: 'KRW',
      minWholesaleQty: data.minWholesaleQty ?? 5,
      minOrderQty: data.minOrderQty ?? 1,
      isAvailable: true,
    },
  ]
}

/** Strip flat regional-pricing keys so we don't try to write them to `products` table. */
function pickProductColumns<T extends Record<string, any>>(data: T): Omit<T, typeof REGIONAL_PRICE_KEYS[number]> {
  const out: any = { ...data }
  for (const key of REGIONAL_PRICE_KEYS) delete out[key]
  return out
}

export async function getLatestExchangeRate() {
  const [rate] = await db
    .select()
    .from(exchangeRateSnapshots)
    .orderBy(desc(exchangeRateSnapshots.createdAt))
    .limit(1)
  return rate
}

export async function getProducts(query: {
  page?: number
  limit?: number
  category?: string
  brand?: string
  region?: 'UZB' | 'KOR'
  sort?: string
  q?: string
  isActive?: boolean | string
  isAdmin?: boolean
  showDeleted?: boolean
}) {
  const page = query.page || 1
  const limit = query.limit || 20
  const offset = (page - 1) * limit

  const rate = await getLatestExchangeRate()
  const krwToUzs = rate?.krwToUzs || 0

  let where: any = query.showDeleted ? sql`${products.deletedAt} IS NOT NULL` : isNull(products.deletedAt)

  if (!query.isAdmin) {
    where = and(where, eq(products.isActive, true))
  } else if (query.isActive !== undefined) {
    const active = typeof query.isActive === 'string' ? query.isActive === 'true' : query.isActive
    where = and(where, eq(products.isActive, active))
  }

  if (query.category) {
    where = and(where, eq(products.categoryId, query.category))
  }
  if (query.brand) {
    where = and(where, eq(products.brandName, query.brand))
  }
  if (query.q) {
    where = and(
      where,
      or(
        ilike(products.name, `%${escapeLikeQuery(query.q)}%`),
        ilike(products.barcode, `%${escapeLikeQuery(query.q)}%`),
        ilike(products.sku, `%${escapeLikeQuery(query.q)}%`),
        ilike(products.brandName, `%${escapeLikeQuery(query.q)}%`)
      )
    )
  }

  // Stock subquery
  const stockSq = db
    .select({
      productId: inventoryBatches.productId,
      totalStock: sql<number>`SUM(${inventoryBatches.currentQty})`.as('total_stock'),
    })
    .from(inventoryBatches)
    .groupBy(inventoryBatches.productId)
    .as('stock_sq')

  const baseQuery = db
    .select({
      id: products.id,
      name: products.name,
      barcode: products.barcode,
      sku: products.sku,
      brandName: products.brandName,
      imageUrls: products.imageUrls,
      isActive: products.isActive,
      sortOrder: products.sortOrder,
      totalStock: sql<number>`COALESCE(${stockSq.totalStock}, 0)`,
      // Regional config for the requested region
      regionalConfig: {
        retailPrice: productRegionalConfigs.retailPrice,
        wholesalePrice: productRegionalConfigs.wholesalePrice,
        currency: productRegionalConfigs.currency,
        isAvailable: productRegionalConfigs.isAvailable,
      },
    })
    .from(products)
    .leftJoin(stockSq, eq(products.id, stockSq.productId))
    .leftJoin(
      productRegionalConfigs,
      and(
        eq(products.id, productRegionalConfigs.productId),
        eq(productRegionalConfigs.regionCode, query.region || 'UZB')
      )
    )
    .where(where)

  // Count
  const [totalCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(where)

  // Sorting
  const safeSort = validateSort('products', query.sort || 'createdAt')
  let orderBy: any = desc((products as any)[safeSort])
  
  if (query.sort === 'price_asc') orderBy = asc(productRegionalConfigs.retailPrice)
  if (query.sort === 'price_desc') orderBy = desc(productRegionalConfigs.retailPrice)
  if (query.sort === 'newest') orderBy = desc(products.createdAt)
  if (query.sort === 'popular') orderBy = desc(products.sortOrder)

  const items = await baseQuery.orderBy(orderBy).limit(limit).offset(offset)

  const processedItems = items.map((item) => {
    const retailPriceKrw = Number(item.regionalConfig?.retailPrice || 0)
    const wholesalePriceKrw = Number(item.regionalConfig?.wholesalePrice || 0)

    return {
      ...item,
      regionalConfig: item.regionalConfig
        ? {
            ...item.regionalConfig,
            retailPriceKrw,
            wholesalePriceKrw,
            retailPriceUzs: Math.round((retailPriceKrw * krwToUzs) / 100) * 100,
            wholesalePriceUzs: Math.round((wholesalePriceKrw * krwToUzs) / 100) * 100,
          }
        : null,
    }
  })

  return {
    items: processedItems,
    meta: {
      total: Number(totalCount.count),
      page,
      limit,
      totalPages: Math.ceil(Number(totalCount.count) / limit),
    },
  }
}

// Fixed ilike where clause in getProducts
function gardens(where: any, cond: any) {
  return and(where, cond)
}

export async function getProductById(id: string, region: 'UZB' | 'KOR' = 'UZB') {
  const rate = await getLatestExchangeRate()
  const krwToUzs = rate?.krwToUzs || 0

  const [product] = await db.select().from(products).where(and(eq(products.id, id), isNull(products.deletedAt))).limit(1)

  if (!product) throw { status: 404, message: 'Mahsulot topilmadi' }

  const configs = await db
    .select()
    .from(productRegionalConfigs)
    .where(eq(productRegionalConfigs.productId, id))

  const stock = await db
    .select({ total: sql<number>`SUM(${inventoryBatches.currentQty})` })
    .from(inventoryBatches)
    .where(eq(inventoryBatches.productId, id))

  const processedConfigs = configs.map((c) => {
    const retailPriceKrw = Number(c.retailPrice)
    const wholesalePriceKrw = Number(c.wholesalePrice)
    return {
      ...c,
      retailPriceKrw,
      wholesalePriceKrw,
      retailPriceUzs: Math.round((retailPriceKrw * krwToUzs) / 100) * 100,
      wholesalePriceUzs: Math.round((wholesalePriceKrw * krwToUzs) / 100) * 100,
    }
  })

  return {
    ...product,
    totalStock: Number(stock[0]?.total || 0),
    regionalConfigs: processedConfigs,
    exchangeRate: rate,
  }
}

export async function getAdminProductById(id: string) {
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1)

  if (!product) {
    throw { status: 404, code: 'PRODUCT_NOT_FOUND', message: 'Mahsulot topilmadi' }
  }

  const configs = await db
    .select()
    .from(productRegionalConfigs)
    .where(eq(productRegionalConfigs.productId, id))

  const processedConfigs = configs.map((c) => ({
    ...c,
    retailPriceKrw: Number(c.retailPrice),
    wholesalePriceKrw: Number(c.wholesalePrice),
  }))

  return {
    ...product,
    korRegionalConfig: processedConfigs.find((c) => c.regionCode === 'KOR') || null,
    uzbRegionalConfig: processedConfigs.find((c) => c.regionCode === 'UZB') || null,
  }
}

export async function getBrands() {
  const CACHE_KEY = 'products:brands'
  const cached = await cacheGet<string[]>(CACHE_KEY)
  if (cached) return cached

  const result = await db
    .selectDistinct({ brandName: products.brandName })
    .from(products)
    .where(and(eq(products.isActive, true), isNull(products.deletedAt)))
    .orderBy(products.brandName)

  const brands = result.map((r) => r.brandName)
  await cacheSet(CACHE_KEY, brands, CACHE_TTL.BRANDS)
  return brands
}

export async function getProductsByCategorySlug(slug: string, query: any) {
  const [category] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1)

  if (!category) throw { status: 404, message: 'Kategoriya topilmadi' }

  return getProducts({ ...query, category: category.id })
}

export async function getProductByBarcode(barcode: string) {
  const rate = await getLatestExchangeRate()
  const krwToUzs = rate?.krwToUzs || 0

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.barcode, barcode), isNull(products.deletedAt)))
    .limit(1)

  if (!product) throw { status: 404, code: 'PRODUCT_NOT_FOUND', message: 'Mahsulot topilmadi' }

  const configs = await db
    .select()
    .from(productRegionalConfigs)
    .where(eq(productRegionalConfigs.productId, product.id))

  const stock = await db
    .select({ total: sql<number>`SUM(${inventoryBatches.currentQty})` })
    .from(inventoryBatches)
    .where(eq(inventoryBatches.productId, product.id))

  const processedConfigs = configs.map((c) => {
    const retailPriceKrw = Number(c.retailPrice)
    const wholesalePriceKrw = Number(c.wholesalePrice)
    return {
      ...c,
      retailPriceKrw,
      wholesalePriceKrw,
      retailPriceUzs: Math.round((retailPriceKrw * krwToUzs) / 100) * 100,
      wholesalePriceUzs: Math.round((wholesalePriceKrw * krwToUzs) / 100) * 100,
    }
  })

  return {
    id: product.id,
    name: product.name,
    brandName: product.brandName,
    barcode: product.barcode,
    sku: product.sku,
    currentStock: Number(stock[0]?.total || 0),
    imageUrl: product.imageUrls?.[0] || null,
    korRegionalConfig: processedConfigs.find((c) => c.regionCode === 'KOR'),
    uzbRegionalConfig: processedConfigs.find((c) => c.regionCode === 'UZB'),
  }
}

export async function createProduct(data: CreateProductDto) {
  return await db.transaction(async (tx) => {
    // Strip flat regional-pricing keys from the product insert payload.
    const productData = pickProductColumns(data)

    // Check unique barcode/sku
    const [existing] = await tx
      .select()
      .from(products)
      .where(or(eq(products.barcode, data.barcode), eq(products.sku, data.sku)))
      .limit(1)

    if (existing) {
      throw {
        status: 400,
        code: 'DUPLICATE_BARCODE',
        message: 'Bunday barkod yoki SKU ga ega mahsulot mavjud',
      }
    }

    const [newProduct] = await tx
      .insert(products)
      .values(productData as any)
      .returning()

    // Build regional configs from the flat fields. Skips regions where
    // retail price is 0/undefined. Throws on bad wholesale price.
    const regionalConfigs = buildRegionalConfigs(data)

    if (regionalConfigs.length === 0) {
      throw {
        status: 400,
        code: 'PRODUCT_NO_REGIONAL_CONFIG',
        message: "Kamida bitta mintaqa (KOR yoki UZB) uchun retail narx kiritilishi kerak",
      }
    }

    await tx.insert(productRegionalConfigs).values(
      regionalConfigs.map((c) => ({
        ...c,
        productId: newProduct.id,
      }))
    )

    return newProduct
  })
}

export async function updateProduct(id: string, data: UpdateProductDto) {
  // Validate images
  if (data.imageUrls?.some((url) => !isValidCloudinaryUrl(url))) {
    throw { status: 400, code: 'INVALID_URL', message: 'Faqat Cloudinary URL qabul qilinadi' }
  }

  return await db.transaction(async (tx) => {
    // Strip flat regional-pricing keys (and any other non-product fields).
    const productData = pickProductColumns(data)

    const [updated] = await tx
      .update(products)
      .set({ ...productData, updatedAt: new Date() } as any)
      .where(eq(products.id, id))
      .returning()

    if (!updated) throw { status: 404, message: 'Mahsulot topilmadi' }

    // Update regional configs if prices provided
    const regionalConfigs = buildRegionalConfigs(data as any)
    if (regionalConfigs.length > 0) {
      await tx.delete(productRegionalConfigs).where(eq(productRegionalConfigs.productId, id))
      await tx.insert(productRegionalConfigs).values(
        regionalConfigs.map((c) => ({
          ...c,
          productId: id,
        }))
      )
    }

    return updated
  })
}

export async function updateProductImages(id: string, imageUrls: string[]) {
  // Validate images
  if (imageUrls.some((url) => !isValidCloudinaryUrl(url))) {
    throw { status: 400, code: 'INVALID_URL', message: 'Faqat Cloudinary URL qabul qilinadi' }
  }

  const [updated] = await db
    .update(products)
    .set({ imageUrls, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning()

  if (!updated) throw { status: 404, code: 'PRODUCT_NOT_FOUND', message: 'Mahsulot topilmadi' }

  return updated.imageUrls
}

export async function deleteProduct(id: string) {
  return await db.transaction(async (tx) => {
    const [deleted] = await tx
      .update(products)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning()

    if (!deleted) throw { status: 404, message: 'Mahsulot topilmadi' }

    // Clear cart items rule
    await tx.delete(cartItems).where(eq(cartItems.productId, id))

    return deleted
  })
}

export async function restoreProduct(id: string) {
  const [restored] = await db
    .update(products)
    .set({ deletedAt: null, isActive: true, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning()

  if (!restored) throw { status: 404, message: 'Mahsulot topilmadi' }
  return restored
}

export async function updatePricing(id: string, data: UpdatePricingDto) {
  return await db.transaction(async (tx) => {
    for (const config of data.configs) {
      await tx
        .update(productRegionalConfigs)
        .set({
          retailPrice: BigInt(config.retailPrice),
          wholesalePrice: BigInt(config.wholesalePrice),
          minWholesaleQty: config.minWholesaleQty,
          minOrderQty: config.minOrderQty,
          isAvailable: config.isAvailable,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(productRegionalConfigs.productId, id),
            eq(productRegionalConfigs.regionCode, config.regionCode)
          )
        )
    }
    return { success: true }
  })
}
