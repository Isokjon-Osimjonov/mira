import { db } from '../../config/db'
import {
  customers,
  orders,
  cartItems,
  carts,
  userAddresses,
  userCoupons,
  coupons,
  wishlists,
  waitlists,
  notificationsLog,
  refreshTokens,
  products,
} from '@mira/db'
import { eq, and, sql, desc, count, sum, max, min, isNull, or, ilike, avg } from 'drizzle-orm'
import type { UpdateCustomerNotesDto, BlockCustomerDto, AssignCouponDto } from './customers.schema'

export async function getCustomers(query: {
  page?: number
  limit?: number
  search?: string
  region?: 'UZB' | 'KOR'
  isActive?: boolean
  isVerified?: boolean
  dateFrom?: string
  dateTo?: string
  sort?: string
  includeDeleted?: boolean
}) {
  const page = query.page || 1
  const limit = query.limit || 20
  const offset = (page - 1) * limit

  let where: any = sql`1=1`
  if (!query.includeDeleted) where = and(where, isNull(customers.deletedAt))
  if (query.region) where = and(where, eq(customers.phoneRegion, query.region))
  if (query.isActive !== undefined) where = and(where, eq(customers.isActive, query.isActive))
  if (query.isVerified !== undefined) where = and(where, eq(customers.isVerified, query.isVerified))
  if (query.dateFrom) where = and(where, sql`${customers.createdAt} >= ${new Date(query.dateFrom)}`)
  if (query.dateTo) where = and(where, sql`${customers.createdAt} <= ${new Date(query.dateTo)}`)

  if (query.search) {
    const s = `%${query.search}%`
    where = and(
      where,
      or(
        ilike(customers.phone, s),
        ilike(customers.firstName, s),
        ilike(customers.lastName, s),
        sql`CAST(${customers.telegramId} AS TEXT) LIKE ${s}`
      )
    )
  }

  // Sorting
  let orderBy: any = desc(customers.createdAt)
  if (query.sort === 'oldest') orderBy = customers.createdAt
  // most_orders and most_spent would require joins and are harder to do with simple orderBy in Drizzle without subqueries/groups.
  // We'll skip complex sort in main query for now or do it with subquery.

  const itemsQuery = await db
    .select({
      customer: customers,
      totalOrders:
        sql<number>`(SELECT COUNT(*) FROM orders WHERE customer_id = customers.id)`.mapWith(Number),
      totalSpent:
        sql<number>`(SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE customer_id = customers.id AND status = 'DELIVERED')`.mapWith(
          Number
        ),
      lastOrderAt: sql<Date>`(SELECT MAX(created_at) FROM orders WHERE customer_id = customers.id)`,
      cartItemCount:
        sql<number>`(SELECT COALESCE(SUM(quantity), 0) FROM cart_items JOIN carts ON cart_items.cart_id = carts.id WHERE carts.customer_id = customers.id)`.mapWith(
          Number
        ),
    })
    .from(customers)
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset)

  const [countRes] = await db.select({ count: count() }).from(customers).where(where)
  const total = Number(countRes?.count || 0)

  const items = itemsQuery.map((row) => ({
    ...row.customer,
    stats: {
      totalOrders: row.totalOrders,
      totalSpent: row.totalSpent,
      lastOrderAt: row.lastOrderAt,
      cartItemCount: row.cartItemCount,
    },
  }))

  return { items, meta: { page, limit, total, hasNext: offset + limit < total, hasPrev: page > 1 } }
}

export async function getCustomerById(id: string) {
  // Query 1: customer + addresses
  const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1)
  if (!customer) throw { status: 404, code: 'CUSTOMER_NOT_FOUND', message: 'Mijoz topilmadi' }
  const addresses = await db.select().from(userAddresses).where(eq(userAddresses.customerId, id))

  // Query 2: stats aggregates
  const [stats] = await db
    .select({
      totalOrders: count(orders.id),
      totalSpent: sql<bigint>`COALESCE(SUM(CASE WHEN ${orders.status} = 'DELIVERED' THEN ${orders.totalAmount} ELSE 0 END), 0)`,
      avgOrderValue: sql<bigint>`COALESCE(AVG(CASE WHEN ${orders.status} = 'DELIVERED' THEN ${orders.totalAmount} ELSE NULL END), 0)`,
      lastOrderAt: max(orders.createdAt),
      firstOrderAt: min(orders.createdAt),
    })
    .from(orders)
    .where(eq(orders.customerId, id))

  const [referralsCount] = await db
    .select({ count: count() })
    .from(customers)
    .where(eq(customers.referredById, id))
  const [wishlistCount] = await db
    .select({ count: count() })
    .from(wishlists)
    .where(eq(wishlists.customerId, id))
  const [waitlistCount] = await db
    .select({ count: count() })
    .from(waitlists)
    .where(and(eq(waitlists.customerId, id), eq(waitlists.notified, false)))
  const [cartItemsCount] = await db
    .select({ count: sql<number>`SUM(${cartItems.quantity})` })
    .from(cartItems)
    .innerJoin(carts, eq(cartItems.cartId, carts.id))
    .where(eq(carts.customerId, id))

  // Query 3: recent orders
  const recentOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.customerId, id))
    .orderBy(desc(orders.createdAt))
    .limit(5)

  // Query 4: cart items + products
  const activeCartItems = await db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      price: cartItems.priceSnapshot,
      product: { id: products.id, name: products.name, imageUrls: products.imageUrls },
    })
    .from(cartItems)
    .innerJoin(carts, eq(cartItems.cartId, carts.id))
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(carts.customerId, id))

  // Query 5: user_coupons + coupon names
  const assignedCoupons = await db
    .select({
      id: userCoupons.id,
      isUsed: userCoupons.isUsed,
      assignedAt: userCoupons.assignedAt,
      couponCode: coupons.code,
      couponName: coupons.name,
    })
    .from(userCoupons)
    .innerJoin(coupons, eq(userCoupons.couponId, coupons.id))
    .where(eq(userCoupons.customerId, id))

  // Referred by
  let referredBy = null
  if (customer.referredById) {
    const [ref] = await db
      .select({ id: customers.id, phone: customers.phone, firstName: customers.firstName })
      .from(customers)
      .where(eq(customers.id, customer.referredById))
      .limit(1)
    referredBy = ref
  }

  // Referrals
  const referrals = await db
    .select({ phone: customers.phone, createdAt: customers.createdAt })
    .from(customers)
    .where(eq(customers.referredById, id))
    .limit(20)

  return {
    profile: customer,
    stats: {
      totalOrders: Number(stats?.totalOrders || 0),
      totalSpent: Number(stats?.totalSpent || 0n),
      avgOrderValue: Number(stats?.avgOrderValue || 0),
      lastOrderAt: stats?.lastOrderAt,
      firstOrderAt: stats?.firstOrderAt,
      cartItemCount: Number(cartItemsCount?.count || 0),
      wishlistCount: Number(wishlistCount?.count || 0),
      waitlistCount: Number(waitlistCount?.count || 0),
      totalReferrals: Number(referralsCount?.count || 0),
    },
    addresses,
    activeCart: {
      items: activeCartItems,
      subtotal: Number(activeCartItems.reduce((acc, i) => acc + i.price * BigInt(i.quantity), 0n)),
    },
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      totalAmount: Number(o.totalAmount),
      createdAt: o.createdAt,
    })),
    assignedCoupons,
    referredBy,
    referrals,
  }
}

export async function getCustomerActivity(id: string) {
  const wishlist = await db
    .select({
      productId: wishlists.productId,
      productName: products.name,
      addedAt: wishlists.createdAt,
    })
    .from(wishlists)
    .innerJoin(products, eq(wishlists.productId, products.id))
    .where(eq(wishlists.customerId, id))
  const waitlist = await db
    .select({
      productId: waitlists.productId,
      productName: products.name,
      joinedAt: waitlists.createdAt,
      notified: waitlists.notified,
    })
    .from(waitlists)
    .innerJoin(products, eq(waitlists.productId, products.id))
    .where(eq(waitlists.customerId, id))
  const notifications = await db
    .select()
    .from(notificationsLog)
    .where(eq(notificationsLog.customerId, id))
    .orderBy(desc(notificationsLog.createdAt))
    .limit(20)
  const addresses = await db.select().from(userAddresses).where(eq(userAddresses.customerId, id))

  return { wishlist, waitlist, notifications, addresses }
}

export async function updateCustomerNotes(id: string, notes: string) {
  const [updated] = await db
    .update(customers)
    .set({ notes, updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning()
  if (!updated) throw { status: 404, code: 'CUSTOMER_NOT_FOUND', message: 'Mijoz topilmadi' }
  return updated
}

export async function blockCustomer(id: string, reason?: string) {
  const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1)
  if (!customer) throw { status: 404, code: 'CUSTOMER_NOT_FOUND', message: 'Mijoz topilmadi' }
  if (!customer.isActive)
    throw { status: 400, code: 'CUSTOMER_ALREADY_BLOCKED', message: 'Mijoz allaqachon bloklangan' }

  const dateStr = new Date().toISOString().split('T')[0]
  const newNote = `${customer.notes ? customer.notes + '\\n' : ''}Bloklandi: [${dateStr}] ${reason || ''}`

  const [updated] = await db
    .update(customers)
    .set({ isActive: false, notes: newNote, updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning()
  return updated
}

export async function unblockCustomer(id: string) {
  const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1)
  if (!customer) throw { status: 404, code: 'CUSTOMER_NOT_FOUND', message: 'Mijoz topilmadi' }
  if (customer.isActive)
    throw { status: 400, code: 'CUSTOMER_NOT_BLOCKED', message: 'Mijoz bloklanmagan' }

  const [updated] = await db
    .update(customers)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning()
  return updated
}

export async function deleteCustomer(id: string) {
  // Check active orders
  const activeOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.customerId, id),
        sql`${orders.status} IN ('PENDING_PAYMENT', 'PAYMENT_SUBMITTED', 'PAYMENT_CONFIRMED', 'PACKING', 'SHIPPED')`
      )
    )
    .limit(1)

  if (activeOrders.length > 0) {
    throw {
      status: 400,
      code: 'CUSTOMER_HAS_ACTIVE_ORDERS',
      message: 'Mijozning faol buyurtmalari bor. Avval ularni yakunlang.',
    }
  }

  return await db.transaction(async (tx) => {
    const [deleted] = await tx
      .update(customers)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning()
    if (!deleted) throw { status: 404, code: 'CUSTOMER_NOT_FOUND', message: 'Mijoz topilmadi' }

    // Clear cart
    const [cart] = await tx.select().from(carts).where(eq(carts.customerId, id)).limit(1)
    if (cart) await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id))

    // Revoke tokens
    await tx
      .update(refreshTokens)
      .set({ isRevoked: true, revokedAt: new Date(), revokedReason: 'ADMIN' })
      .where(eq(refreshTokens.customerId, id))

    return deleted
  })
}

export async function assignCoupon(customerId: string, couponId: string) {
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1)
  if (!customer) throw { status: 404, code: 'CUSTOMER_NOT_FOUND', message: 'Mijoz topilmadi' }

  const [coupon] = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.id, couponId), isNull(coupons.deletedAt), eq(coupons.status, 'ACTIVE')))
    .limit(1)
  if (!coupon)
    throw { status: 404, code: 'COUPON_NOT_FOUND', message: 'Kupon topilmadi yoki faol emas' }

  const [existing] = await db
    .select()
    .from(userCoupons)
    .where(and(eq(userCoupons.customerId, customerId), eq(userCoupons.couponId, couponId)))
    .limit(1)
  if (existing)
    throw { status: 409, code: 'VALIDATION_ERROR', message: 'Kupon allaqachon biriktirilgan' }

  await db.insert(userCoupons).values({ customerId, couponId })
}
