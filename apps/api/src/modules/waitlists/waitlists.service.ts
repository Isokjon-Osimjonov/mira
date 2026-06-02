import { db } from '../../config/db'
import { waitlists, products, productRegionalConfigs, inventoryBatches, customers } from '@mira/db'
import { eq, and, sql, isNull } from 'drizzle-orm'

export async function getWaitlist(customerId: string, regionCode: 'UZB' | 'KOR') {
  const items = await db
    .select({
      id: products.id,
      name: products.name,
      brandName: products.brandName,
      imageUrls: products.imageUrls,
      retailPrice: productRegionalConfigs.retailPrice,
      currency: productRegionalConfigs.currency,
      createdAt: waitlists.createdAt,
    })
    .from(waitlists)
    .innerJoin(products, eq(waitlists.productId, products.id))
    .innerJoin(productRegionalConfigs, and(
      eq(productRegionalConfigs.productId, products.id),
      eq(productRegionalConfigs.regionCode, regionCode)
    ))
    .where(and(eq(waitlists.customerId, customerId), eq(waitlists.notified, false), isNull(products.deletedAt)))

  return items
}

export async function addToWaitlist(customerId: string, productId: string) {
  // Check product exists
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), isNull(products.deletedAt)))
    .limit(1)
  
  if (!product) throw { status: 404, code: 'PRODUCT_NOT_FOUND', message: 'Mahsulot topilmadi' }

  // Check if already in waitlist
  const [existing] = await db
    .select()
    .from(waitlists)
    .where(and(eq(waitlists.customerId, customerId), eq(waitlists.productId, productId), eq(waitlists.notified, false)))
    .limit(1)
  
  if (existing) throw { status: 409, code: 'WAITLIST_ALREADY_EXISTS', message: 'Mahsulot allaqachon waitlistda' }

  // Check if out of stock
  const [stockRes] = await db
    .select({ total: sql<number>`SUM(${inventoryBatches.currentQty})`.mapWith(Number) })
    .from(inventoryBatches)
    .where(eq(inventoryBatches.productId, productId))
  
  const stockAvailable = stockRes?.total || 0
  if (stockAvailable > 0) {
    return { inStock: true, message: 'Mahsulot mavjud, savatga qo\'shing' }
  }

  const [created] = await db.insert(waitlists).values({ customerId, productId }).returning()
  return { ...created, inStock: false }
}

export async function removeFromWaitlist(customerId: string, productId: string) {
  const [deleted] = await db
    .delete(waitlists)
    .where(and(eq(waitlists.customerId, customerId), eq(waitlists.productId, productId)))
    .returning()
  
  if (!deleted) throw { status: 404, code: 'WAITLIST_NOT_FOUND', message: 'Mahsulot waitlistda topilmadi' }
  return deleted
}

export async function adminGetWaitlist(productId: string) {
  const items = await db
    .select({
      phone: customers.phone,
      joinedAt: waitlists.createdAt,
    })
    .from(waitlists)
    .innerJoin(customers, eq(waitlists.customerId, customers.id))
    .where(and(eq(waitlists.productId, productId), eq(waitlists.notified, false)))

  return {
    count: items.length,
    customers: items
  }
}
