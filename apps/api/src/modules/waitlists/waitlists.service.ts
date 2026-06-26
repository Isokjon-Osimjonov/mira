import { db } from '../../config/db'
import {
  waitlists,
  products,
  productRegionalConfigs,
  inventoryBatches,
  customers,
} from '@mira/db'
import { eq, and, sql, isNull } from 'drizzle-orm'
import { notifyCustomerFull } from '../../bot/helpers/notify'

export async function getWaitlist(
  customerId: string,
  regionCode: 'UZB' | 'KOR'
) {
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
    .innerJoin(
      productRegionalConfigs,
      and(
        eq(productRegionalConfigs.productId, products.id),
        eq(productRegionalConfigs.regionCode, regionCode)
      )
    )
    .where(
      and(
        eq(waitlists.customerId, customerId),
        eq(waitlists.notified, false),
        isNull(products.deletedAt)
      )
    )

  return items
}

export async function addToWaitlist(customerId: string, productId: string) {
  // Check product exists
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), isNull(products.deletedAt)))
    .limit(1)

  if (!product)
    throw {
      status: 404,
      code: 'PRODUCT_NOT_FOUND',
      message: 'Mahsulot topilmadi',
    }

  // Check if already in waitlist
  const [existing] = await db
    .select()
    .from(waitlists)
    .where(
      and(
        eq(waitlists.customerId, customerId),
        eq(waitlists.productId, productId),
        eq(waitlists.notified, false)
      )
    )
    .limit(1)

  if (existing)
    throw {
      status: 409,
      code: 'WAITLIST_ALREADY_EXISTS',
      message: 'Mahsulot allaqachon waitlistda',
    }

  // Check if out of stock
  const [stockRes] = await db
    .select({
      total: sql<number>`SUM(${inventoryBatches.currentQty})`.mapWith(Number),
    })
    .from(inventoryBatches)
    .where(eq(inventoryBatches.productId, productId))

  const stockAvailable = stockRes?.total || 0
  if (stockAvailable > 0) {
    return { inStock: true, message: "Mahsulot mavjud, savatga qo'shing" }
  }

  const [created] = await db
    .insert(waitlists)
    .values({ customerId, productId })
    .returning()
  return { ...created, inStock: false }
}

export async function removeFromWaitlist(
  customerId: string,
  productId: string
) {
  const [deleted] = await db
    .delete(waitlists)
    .where(
      and(eq(waitlists.customerId, customerId), eq(waitlists.productId, productId))
    )
    .returning()

  if (!deleted)
    throw {
      status: 404,
      code: 'WAITLIST_NOT_FOUND',
      message: 'Mahsulot waitlistda topilmadi',
    }
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
    customers: items,
  }
}

export async function notifyWaitlist(productId: string) {
  // Get all waiting customers for this product
  const waiting = await db
    .select({
      customerId: waitlists.customerId,
      telegramId: customers.telegramId,
      expoPushToken: customers.expoPushToken,
      firstName: customers.firstName,
    })
    .from(waitlists)
    .innerJoin(customers, eq(waitlists.customerId, customers.id))
    .where(
      and(eq(waitlists.productId, productId), eq(waitlists.notified, false))
    )

  if (waiting.length === 0) return

  // Get product name
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1)

  if (!product) return

  // Notify each customer
  for (const customer of waiting) {
    try {
      await notifyCustomerFull({
        customerId: customer.customerId,
        telegramId: customer.telegramId,
        expoPushToken: customer.expoPushToken,
        type: 'ORDER_STATUS',
        channel: 'BOTH',
        title: '🎉 Mahsulot mavjud!',
        body: `${product.name} endi mavjud. Tez buyurtma bering!`,
        telegramMessage:
          `🎉 <b>Siz kutgan mahsulot mavjud!</b>\n\n` +
          `📦 <b>${product.name}</b>\n` +
          `Endi savatga qo'shishingiz mumkin!\n` +
          `👉 Ilovani oching va buyurtma bering`,
        data: {
          productId: productId,
          type: 'WAITLIST_AVAILABLE',
        },
      })

      // Mark as notified
      await db
        .update(waitlists)
        .set({ notified: true, notifiedAt: new Date() })
        .where(
          and(
            eq(waitlists.customerId, customer.customerId),
            eq(waitlists.productId, productId)
          )
        )
    } catch (err) {
      console.error('Failed to notify customer:', customer.customerId, err)
    }
  }
}
