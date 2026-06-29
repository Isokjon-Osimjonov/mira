import { db } from '../../config/db'
import { products, productRegionalConfigs, inventoryBatches, categories, cartItems } from '@mira/db'
import { eq, and, isNull, sql, desc, asc, ilike, or, isNotNull } from 'drizzle-orm'
import { escapeLikeQuery } from '../../lib/sanitize'
import { validateSort } from '../../lib/sort-whitelist'
import { isValidCloudinaryUrl } from '../../lib/validate-url'
import { cloudinary, UPLOAD_FOLDERS } from '../../config/cloudinary'
import { cacheGet, cacheSet, CACHE_TTL } from '../../lib/cache'
import type { CreateProductDto, UpdateProductDto, UpdatePricingDto } from './products.schema'

async function processImageUrls(urls: string[], existingUrls: string[] = []): Promise<string[]> {
  const processedUrls: string[] = []
  for (const url of urls) {
    if (isValidCloudinaryUrl(url)) {
      processedUrls.push(url)
    } else if (existingUrls.includes(url)) {
      processedUrls.push(url)
    } else {
      try {
        const result = await cloudinary.uploader.upload(url, {
          folder: UPLOAD_FOLDERS.products,
        })
        processedUrls.push(result.secure_url)
      } catch (err) {
        console.error('Cloudinary upload error:', err)
        throw { status: 400, code: 'UPLOAD_FAILED', message: `Rasmni yuklashda xatolik: ${url}` }
      }
    }
  }
  return processedUrls
}
import { logAudit } from '../../lib/audit'

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
 */
type RegionalPriceInput = {
  korRetailPrice?: number
  korWholesalePrice?: number
  uzbRetailPrice?: number
  uzbWholesalePrice?: number
  minOrderQty?: number
  minWholesaleQty?: number
}

export function buildRegionalConfigs(data: RegionalPriceInput): Array<{
  regionCode: 'UZB' | 'KOR'
  retailPrice: bigint
  wholesalePrice: bigint
  minOrderQty: number
  minWholesaleQty: number
}> {
  const configs: any[] = []

  // KOREA
  if (data.korRetailPrice && data.korRetailPrice > 0) {
    if (!data.korWholesalePrice || data.korWholesalePrice <= 0) {
      throw {
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Koreya uchun ulgurji narx kiritilishi shart',
      }
    }
    configs.push({
      regionCode: 'KOR',
      retailPrice: BigInt(data.korRetailPrice),
      wholesalePrice: BigInt(data.korWholesalePrice),
      minOrderQty: data.minOrderQty || 1,
      minWholesaleQty: data.minWholesaleQty || 5,
    })
  }

  // UZBEKISTAN
  if (data.uzbRetailPrice && data.uzbRetailPrice > 0) {
    if (!data.uzbWholesalePrice || data.uzbWholesalePrice <= 0) {
      throw {
        status: 400,
        code: 'BAD_REQUEST',
        message: "O'zbekiston uchun ulgurji narx kiritilishi shart",
      }
    }
    configs.push({
      regionCode: 'UZB',
      retailPrice: BigInt(data.uzbRetailPrice),
      wholesalePrice: BigInt(data.uzbWholesalePrice),
      minOrderQty: data.minOrderQty || 1,
      minWholesaleQty: data.minWholesaleQty || 5,
    })
  }

  return configs
}

function pickProductColumns(data: any) {
  const productData = { ...data }
  REGIONAL_PRICE_KEYS.forEach((k) => delete productData[k])
  return productData
}

export async function getProducts(query: {
  page?: number
  limit?: number
  category?: string
  brand?: string
  region?: 'UZB' | 'KOR'
  sort?: string
  featured?: boolean
  q?: string
  isActive?: string
  showDeleted?: boolean
  isAdmin?: boolean
}) {
  const page = query.page || 1
  const limit = query.limit || 20
  const offset = (page - 1) * limit
  const region = query.region || 'KOR'

  let where: any = query.showDeleted ? isNotNull(products.deletedAt) : isNull(products.deletedAt)

  if (query.category) {
    const [cat] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, query.category))
      .limit(1)
    if (cat) {
      where = and(where, eq(products.categoryId, cat.id))
    }
  }

  if (query.brand) {
    where = and(where, eq(products.brandName, query.brand))
  }

  if (query.featured === true) {
    where = and(where, eq(products.isFeatured, true))
  }

  if (!query.isAdmin) {
    where = and(where, eq(products.isActive, true))
  } else if (query.isActive !== undefined) {
    where = and(where, eq(products.isActive, query.isActive === 'true'))
  }

  if (query.q) {
    const pattern = `%${escapeLikeQuery(query.q)}%`
    where = and(where, or(ilike(products.name, pattern), ilike(products.barcode, pattern)))
  }

  const sortField = validateSort('products', query.sort || 'createdAt')
  let orderBy: any = desc(products.createdAt)

  if (sortField === 'name') orderBy = asc(products.name)
  if (sortField === 'price') orderBy = asc(productRegionalConfigs.retailPrice)
  if (sortField === 'brandName') orderBy = asc(products.brandName)
  if (query.sort === 'newest') orderBy = desc(products.createdAt)
  if (query.sort === 'bestselling') {
    orderBy = desc(
      sql`(SELECT COALESCE(SUM(ib.current_qty), 0)
           FROM inventory_batches ib
           WHERE ib.product_id = ${products.id})`
    )
  }

  const items = await db
    .select({
      id: products.id,
      name: products.name,
      brandName: products.brandName,
      categoryName: categories.name,
      barcode: products.barcode,
      sku: products.sku,
      imageUrls: products.imageUrls,
      isActive: products.isActive,
      isNew: products.isNew,
      isFeatured: products.isFeatured,
      createdAt: products.createdAt,
      retailPrice: productRegionalConfigs.retailPrice,
      wholesalePrice: productRegionalConfigs.wholesalePrice,
      isAvailable: productRegionalConfigs.isAvailable,
      totalStock: sql<number>`(SELECT COALESCE(SUM(current_qty), 0) FROM inventory_batches WHERE product_id = ${products.id})`,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(
      productRegionalConfigs,
      and(
        eq(products.id, productRegionalConfigs.productId),
        eq(productRegionalConfigs.regionCode, region)
      )
    )
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset)

  const [countRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(where)
  const total = Number(countRes?.count || 0)

  return {
    items: items.map((i) => ({
      ...i,
      retailPrice: i.retailPrice ? Number(i.retailPrice) : null,
      wholesalePrice: i.wholesalePrice ? Number(i.wholesalePrice) : null,
      totalStock: Number(i.totalStock || 0),
      isAvailable: i.isAvailable ?? true,
    })),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: offset + limit < total,
      hasPrev: page > 1,
    },
  }
}

export async function getProductById(id: string, region: 'UZB' | 'KOR' = 'UZB') {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .limit(1)

  if (!product) throw { status: 404, message: 'Mahsulot topilmadi' }

  const configs = await db
    .select()
    .from(productRegionalConfigs)
    .where(eq(productRegionalConfigs.productId, id))

  const [stockRes] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${inventoryBatches.currentQty}), 0)`.mapWith(Number),
    })
    .from(inventoryBatches)
    .where(eq(inventoryBatches.productId, id))

  const currentRegionConfig = configs.find((c) => c.regionCode === region) || configs[0]

  return {
    ...product,
    totalStock: Number(stockRes?.total ?? 0),
    currentStock: Number(stockRes?.total ?? 0),
    retailPrice: currentRegionConfig ? Number(currentRegionConfig.retailPrice) : null,
    wholesalePrice: currentRegionConfig ? Number(currentRegionConfig.wholesalePrice) : null,
    regionalConfigs: configs.map((c) => ({
      ...c,
      retailPrice: Number(c.retailPrice),
      wholesalePrice: Number(c.wholesalePrice),
    })),
  }
}

export async function getBrands() {
  const rows = await db
    .select({ brand: products.brandName })
    .from(products)
    .where(isNull(products.deletedAt))
    .groupBy(products.brandName)
    .orderBy(asc(products.brandName))
  return rows.map((r) => r.brand).filter(Boolean)
}

export async function getProductsByCategorySlug(
  slug: string,
  query: {
    page?: number
    limit?: number
    brand?: string
    region?: 'UZB' | 'KOR'
    sort?: string
    q?: string
  }
) {
  const [cat] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1)
  if (!cat) throw { status: 404, message: 'Kategoriya topilmadi' }

  return getProducts({ ...query, category: cat.id })
}

export async function getProductByBarcode(barcode: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.barcode, barcode), isNull(products.deletedAt)))
    .limit(1)
  if (!product) return null
  return getAdminProductById(product.id)
}

export async function getAdminProductById(id: string) {
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1)

  if (!product) throw { status: 404, message: 'Mahsulot topilmadi' }

  const processedConfigs = await db
    .select()
    .from(productRegionalConfigs)
    .where(eq(productRegionalConfigs.productId, id))

  const stock = await db
    .select({ total: sql<number>`SUM(current_qty)` })
    .from(inventoryBatches)
    .where(eq(inventoryBatches.productId, id))

  return {
    ...product,
    brandName: product.brandName,
    barcode: product.barcode,
    sku: product.sku,
    currentStock: Number(stock[0]?.total || 0),
    imageUrl: product.imageUrls?.[0] || null,
    korRegionalConfig: processedConfigs.find((c) => c.regionCode === 'KOR'),
    uzbRegionalConfig: processedConfigs.find((c) => c.regionCode === 'UZB'),
  }
}

export async function createProduct(data: CreateProductDto, adminId?: string, adminName?: string) {
  if (data.imageUrls) {
    data.imageUrls = await processImageUrls(data.imageUrls)
  }

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

    // Build regional configs from the flat fields.
    const regionalConfigs = buildRegionalConfigs(data)

    if (regionalConfigs.length === 0) {
      throw {
        status: 400,
        code: 'PRODUCT_NO_REGIONAL_CONFIG',
        message: 'Kamida bitta mintaqa (KOR yoki UZB) uchun retail narx kiritilishi kerak',
      }
    }

    await tx.insert(productRegionalConfigs).values(
      regionalConfigs.map((c) => ({
        ...c,
        productId: newProduct.id,
      }))
    )

    if (adminId) {
      await logAudit({
        adminId,
        adminName: adminName ?? 'Admin',
        action: 'product:create',
        entityType: 'product',
        entityId: newProduct.id,
        newValue: { name: data.name, barcode: data.barcode },
      })
    }

    return newProduct
  })
}

export async function updateProduct(
  id: string,
  data: UpdateProductDto,
  adminId?: string,
  adminName?: string
) {
  const [existing] = await db
    .select({ imageUrls: products.imageUrls })
    .from(products)
    .where(eq(products.id, id))
    .limit(1)
  if (!existing) throw { status: 404, message: 'Mahsulot topilmadi' }

  if (data.imageUrls) {
    data.imageUrls = await processImageUrls(data.imageUrls, (existing.imageUrls as string[]) || [])
  }

  return await db.transaction(async (tx) => {
    // Strip flat regional-pricing keys.
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

    if (adminId) {
      await logAudit({
        adminId,
        adminName: adminName ?? 'Admin',
        action: 'product:update',
        entityType: 'product',
        entityId: id,
        newValue: productData,
      })
    }

    return updated
  })
}

export async function updateProductImages(id: string, imageUrls: string[]) {
  const [existing] = await db
    .select({ imageUrls: products.imageUrls })
    .from(products)
    .where(eq(products.id, id))
    .limit(1)
  if (!existing) throw { status: 404, message: 'Mahsulot topilmadi' }

  const processedUrls = await processImageUrls(imageUrls, (existing.imageUrls as string[]) || [])

  const [updated] = await db
    .update(products)
    .set({ imageUrls: processedUrls, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning()

  if (!updated) throw { status: 404, code: 'PRODUCT_NOT_FOUND', message: 'Mahsulot topilmadi' }

  return updated.imageUrls
}

export async function deleteProduct(id: string, adminId?: string, adminName?: string) {
  return await db.transaction(async (tx) => {
    const [deleted] = await tx
      .update(products)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning()

    if (!deleted) throw { status: 404, message: 'Mahsulot topilmadi' }

    await tx.delete(cartItems).where(eq(cartItems.productId, id))

    if (adminId) {
      await logAudit({
        adminId,
        adminName: adminName ?? 'Admin',
        action: 'product:delete',
        entityType: 'product',
        entityId: id,
      })
    }

    return deleted
  })
}

export async function restoreProduct(id: string) {
  const [restored] = await db
    .update(products)
    .set({ deletedAt: sql`NULL`, isActive: true, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning()

  if (!restored) throw { status: 404, message: 'Mahsulot topilmadi' }

  return restored
}

export async function updatePricing(id: string, data: UpdatePricingDto) {
  return await db.transaction(async (tx) => {
    await tx.delete(productRegionalConfigs).where(eq(productRegionalConfigs.productId, id))
    if (data.configs.length > 0) {
      await tx.insert(productRegionalConfigs).values(
        data.configs.map((c) => ({
          regionCode: c.regionCode,
          retailPrice: BigInt(c.retailPrice),
          wholesalePrice: BigInt(c.wholesalePrice),
          minWholesaleQty: c.minWholesaleQty,
          minOrderQty: c.minOrderQty,
          isAvailable: c.isAvailable,
          productId: id,
        }))
      )
    }
    return { success: true }
  })
}
