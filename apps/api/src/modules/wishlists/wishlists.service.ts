import { db } from '../../config/db'
import { wishlists, products, productRegionalConfigs, inventoryBatches } from '@mira/db'
import { eq, and, sql, isNull } from 'drizzle-orm'

export async function getWishlist(customerId: string, regionCode: 'UZB' | 'KOR') {
  const stockSq = db
    .select({
      productId: inventoryBatches.productId,
      totalStock: sql<number>`SUM(${inventoryBatches.currentQty})`.as('total_stock'),
    })
    .from(inventoryBatches)
    .groupBy(inventoryBatches.productId)
    .as('stock_sq')

  const items = await db
    .select({
      id: products.id,
      name: products.name,
      brandName: products.brandName,
      imageUrls: products.imageUrls,
      retailPrice: productRegionalConfigs.retailPrice,
      currency: productRegionalConfigs.currency,
      inStock: sql<boolean>`COALESCE(${stockSq.totalStock}, 0) > 0`,
    })
    .from(wishlists)
    .innerJoin(products, eq(wishlists.productId, products.id))
    .innerJoin(
      productRegionalConfigs,
      and(
        eq(productRegionalConfigs.productId, products.id),
        eq(productRegionalConfigs.regionCode, regionCode)
      )
    )
    .leftJoin(stockSq, eq(products.id, stockSq.productId))
    .where(and(eq(wishlists.customerId, customerId), isNull(products.deletedAt)))

  return items
}

export async function addToWishlist(customerId: string, productId: string) {
  // Check product exists and is active
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.isActive, true), isNull(products.deletedAt)))
    .limit(1)

  if (!product) throw { status: 404, code: 'PRODUCT_NOT_FOUND', message: 'Mahsulot topilmadi' }

  // Check if already in wishlist
  const [existing] = await db
    .select()
    .from(wishlists)
    .where(and(eq(wishlists.customerId, customerId), eq(wishlists.productId, productId)))
    .limit(1)

  if (existing)
    throw {
      status: 409,
      code: 'WISHLIST_ALREADY_EXISTS',
      message: 'Mahsulot allaqachon wishlistda',
    }

  const [created] = await db.insert(wishlists).values({ customerId, productId }).returning()
  return created
}

export async function removeFromWishlist(customerId: string, productId: string) {
  const [deleted] = await db
    .delete(wishlists)
    .where(and(eq(wishlists.customerId, customerId), eq(wishlists.productId, productId)))
    .returning()

  if (!deleted)
    throw { status: 404, code: 'WISHLIST_NOT_FOUND', message: 'Mahsulot wishlistda topilmadi' }
  return deleted
}
