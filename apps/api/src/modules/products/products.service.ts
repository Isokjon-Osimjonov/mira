import { db } from '../../config/db'
import {
  products,
  productRegionalConfigs,
  inventoryBatches,
  exchangeRateSnapshots,
  categories,
  cartItems,
} from '@mira/db'
import { eq, and, isNull, sql, desc, asc, ilike, or, inArray } from 'drizzle-orm'
import type { CreateProductDto, UpdateProductDto, UpdatePricingDto } from './products.schema'

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
  isAdmin?: boolean
}) {
  const page = query.page || 1
  const limit = query.limit || 20
  const offset = (page - 1) * limit

  const rate = await getLatestExchangeRate()
  const krwToUzs = rate?.krwToUzs || 0

  let where = and(isNull(products.deletedAt))
  if (!query.isAdmin) {
    where = and(where, eq(products.isActive, true))
  }

  if (query.category) {
    where = and(where, eq(products.categoryId, query.category))
  }
  if (query.brand) {
    where = and(where, eq(products.brandName, query.brand))
  }
  if (query.q) {
    where = gardens(
      where,
      or(
        ilike(products.name, `%${query.q}%`),
        ilike(products.barcode, `%${query.q}%`),
        ilike(products.sku, `%${query.q}%`),
        ilike(products.brandName, `%${query.q}%`)
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
  let orderBy = desc(products.createdAt)
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

  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1)

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

export async function getBrands() {
  const result = await db
    .selectDistinct({ brandName: products.brandName })
    .from(products)
    .where(and(eq(products.isActive, true), isNull(products.deletedAt)))
    .orderBy(products.brandName)

  return result.map((r) => r.brandName)
}

export async function getProductsByCategorySlug(slug: string, query: any) {
  const [category] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1)

  if (!category) throw { status: 404, message: 'Kategoriya topilmadi' }

  return getProducts({ ...query, category: category.id })
}

export async function createProduct(data: CreateProductDto) {
  return await db.transaction(async (tx) => {
    const { regionalConfigs, ...productData } = data

    // Check unique barcode/sku
    const [existing] = await tx
      .select()
      .from(products)
      .where(or(eq(products.barcode, data.barcode), eq(products.sku, data.sku)))
      .limit(1)

    if (existing) {
      throw { status: 400, message: 'Bunday barkod yoki SKU ga ega mahsulot mavjud' }
    }

    const [newProduct] = await tx
      .insert(products)
      .values(productData as any)
      .returning()

    // Create regional configs
    const regions: ('UZB' | 'KOR')[] = ['UZB', 'KOR']
    for (const region of regions) {
      const config = regionalConfigs?.find((c) => c.regionCode === region)
      await tx.insert(productRegionalConfigs).values({
        productId: newProduct.id,
        regionCode: region,
        retailPrice: BigInt(config?.retailPrice || 0),
        wholesalePrice: BigInt(config?.wholesalePrice || 0),
        currency: 'KRW',
        minWholesaleQty: config?.minWholesaleQty || 5,
        minOrderQty: config?.minOrderQty || 1,
        isAvailable: config?.isAvailable ?? true,
      })
    }

    return newProduct
  })
}

export async function updateProduct(id: string, data: UpdateProductDto) {
  const { regionalConfigs, ...productData } = data

  const [updated] = await db
    .update(products)
    .set({ ...productData, updatedAt: new Date() } as any)
    .where(eq(products.id, id))
    .returning()

  if (!updated) throw { status: 404, message: 'Mahsulot topilmadi' }
  return updated
}

export async function deleteProduct(id: string) {
  return await db.transaction(async (tx) => {
    const [deleted] = await tx
      .update(products)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning()

    if (!deleted) throw { status: 404, message: 'Mahsulot topilmadi' }

    // Clear cart items rule
    await tx.delete(cartItems).where(eq(cartItems.productId, id))

    return deleted
  })
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
