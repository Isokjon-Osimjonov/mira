import { db } from '../../config/db'
import { coupons, couponRedemptions, userCoupons, customers, orders } from '@mira/db'
import { eq, and, isNull, sql, ilike, or, desc } from 'drizzle-orm'
import { escapeLikeQuery } from '../../lib/sanitize'
import type { CreateCouponDto, UpdateCouponDto, UpdateCouponStatusDto } from './coupons.schema'

type CouponRow = typeof coupons.$inferSelect

export async function validateCoupon(params: {
  code: string
  customerId: string
  region: 'UZB' | 'KOR'
  cartItems: Array<{
    productId: string
    categoryId: string
    brandName: string
    quantity: number
    unitPrice: bigint
    subtotal: bigint
    isWholesale: boolean
  }>
  cartSubtotal: bigint
  orderCount?: number
}): Promise<{
  coupon: CouponRow
  discountAmount: bigint
  eligibleSubtotal: bigint
}> {
  // 1. Find coupon
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.code, params.code), isNull(coupons.deletedAt)))
    .limit(1)

  if (!coupon) throw { status: 404, code: 'COUPON_NOT_FOUND', message: 'Kupon topilmadi' }

  // 2. Status
  if (coupon.status !== 'ACTIVE') {
    throw { status: 400, code: 'COUPON_INACTIVE', message: 'Kupon faol emas' }
  }

  const now = new Date()

  // 3. Starts At
  if (coupon.startsAt && now < coupon.startsAt) {
    throw { status: 400, code: 'COUPON_NOT_STARTED', message: 'Kupon muddati hali boshlanmagan' }
  }

  // 4. Expires At
  if (coupon.expiresAt && now > coupon.expiresAt) {
    throw { status: 400, code: 'COUPON_EXPIRED', message: 'Kupon muddati tugagan' }
  }

  // 5. Region Mismatch
  if (coupon.regionCode && coupon.regionCode !== params.region) {
    throw {
      status: 400,
      code: 'COUPON_REGION_MISMATCH',
      message: 'Kupon ushbu hududda amal qilmaydi',
    }
  }

  // 6. Max Uses Reached
  if (coupon.maxUsesTotal !== null && coupon.usageCount >= coupon.maxUsesTotal) {
    throw {
      status: 400,
      code: 'COUPON_MAX_USES_REACHED',
      message: 'Kupondan foydalanish limiti tugagan',
    }
  }

  // 7. Target Customer
  if (coupon.scope === 'CUSTOMER' && coupon.customerId) {
    if (coupon.customerId !== params.customerId) {
      throw {
        status: 400,
        code: 'COUPON_WRONG_CUSTOMER',
        message: 'Bu kupon siz uchun emas',
      }
    }
  } else if (coupon.targetCustomerIds && coupon.targetCustomerIds.length > 0) {
    if (!coupon.targetCustomerIds.includes(params.customerId)) {
      throw {
        status: 400,
        code: 'COUPON_WRONG_CUSTOMER',
        message: 'Siz ushbu kupondan foydalana olmaysiz',
      }
    }
  }

  // 8. One Per Customer
  if (coupon.onePerCustomer) {
    const [redemptionCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(couponRedemptions)
      .where(
        and(
          eq(couponRedemptions.couponId, coupon.id),
          eq(couponRedemptions.customerId, params.customerId)
        )
      )

    const [userCouponCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userCoupons)
      .where(
        and(
          eq(userCoupons.couponId, coupon.id),
          eq(userCoupons.customerId, params.customerId),
          eq(userCoupons.isUsed, true)
        )
      )

    if (Number(redemptionCount?.count || 0) > 0 || Number(userCouponCount?.count || 0) > 0) {
      throw {
        status: 400,
        code: 'COUPON_ONE_PER_CUSTOMER',
        message: 'Siz allaqachon ushbu kupondan foydalangansiz',
      }
    }
  }

  // 9. First Order Only
  const orderCount = params.orderCount ?? 0
  if (coupon.firstOrderOnly && orderCount > 0) {
    throw {
      status: 400,
      code: 'COUPON_FIRST_ORDER_ONLY',
      message: 'Ushbu kupon faqat birinchi buyurtma uchun',
    }
  }

  // 10. Calculate Eligible Subtotal & totalQty
  let eligibleSubtotal = 0n
  let totalQty = 0

  for (const item of params.cartItems) {
    if (coupon.excludeWholesale && item.isWholesale) continue

    let isEligible = false
    switch (coupon.scope) {
      case 'ALL':
      case 'CUSTOMER':
        isEligible = true
        break
      case 'PRODUCT':
        isEligible = item.productId === coupon.productId
        break
      case 'CATEGORY':
        isEligible = item.categoryId === coupon.categoryId
        break
      default:
        isEligible = true
        break
    }

    if (isEligible) {
      eligibleSubtotal += item.subtotal
      totalQty += item.quantity
    }
  }

  if (eligibleSubtotal === 0n) {
    // If the cart has no eligible items based on scope
    let errorCode = 'COUPON_MIN_ORDER_NOT_MET'
    let message = "Savatda ushbu kupon uchun mos mahsulotlar yo'q"

    if (coupon.scope === 'PRODUCT') {
      errorCode = 'COUPON_WRONG_PRODUCT'
      message = 'Bu kupon tanlangan mahsulotga emas'
    } else if (coupon.scope === 'CATEGORY') {
      errorCode = 'COUPON_WRONG_CATEGORY'
      message = 'Bu kupon bu kategoriya uchun emas'
    }

    throw {
      status: 400,
      code: errorCode,
      message,
    }
  }

  // 11. Min Order Amount / KRW
  const minRequiredKrw = coupon.minOrderKrw ?? coupon.minOrderAmount
  if (minRequiredKrw && eligibleSubtotal < minRequiredKrw) {
    throw {
      status: 400,
      code: 'COUPON_MIN_ORDER_NOT_MET',
      message: 'Buyurtma summasi kupon uchun yetarli emas',
    }
  }

  // 12. Min Order Qty
  if (coupon.minOrderQty && totalQty < coupon.minOrderQty) {
    throw {
      status: 400,
      code: 'COUPON_MIN_QTY_NOT_MET',
      message: 'Mahsulotlar soni kupon uchun yetarli emas',
    }
  }

  // 13. Calculate Discount Amount
  let discountAmount = 0n
  const couponValue = coupon.valueKrw ?? coupon.value

  if (coupon.type === 'PERCENTAGE') {
    let calculated = (eligibleSubtotal * BigInt(couponValue)) / 100n
    const maxCap = coupon.maxDiscountKrw ?? coupon.maxDiscountCap
    if (maxCap !== null && maxCap !== undefined && calculated > BigInt(maxCap)) {
      calculated = BigInt(maxCap)
    }
    discountAmount = calculated
  } else if (coupon.type === 'FIXED') {
    discountAmount = BigInt(couponValue)
    if (discountAmount > eligibleSubtotal) {
      discountAmount = eligibleSubtotal
    }
  } else if (coupon.type === 'FREE_SHIPPING') {
    discountAmount = 0n
  }

  return {
    coupon,
    discountAmount,
    eligibleSubtotal,
  }
}

// Admin Methods

export async function getCoupons(query: {
  page?: number
  limit?: number
  search?: string
  status?: string
}) {
  const page = query.page || 1
  const limit = query.limit || 20
  const offset = (page - 1) * limit

  let where = isNull(coupons.deletedAt)
  if (query.status) {
    where = and(where, eq(coupons.status, query.status as any)) as any
  }
  if (query.search) {
    where = and(
      where,
      or(ilike(coupons.code, `%${escapeLikeQuery(query.search)}%`), ilike(coupons.name, `%${escapeLikeQuery(query.search)}%`))
    ) as any
  }

  const items = await db
    .select({
      id: coupons.id,
      code: coupons.code,
      name: coupons.name,
      type: coupons.type,
      value: coupons.value,
      status: coupons.status,
      usageCount: coupons.usageCount,
      maxUsesTotal: coupons.maxUsesTotal,
      expiresAt: coupons.expiresAt,
      createdAt: coupons.createdAt,
    })
    .from(coupons)
    .where(where)
    .orderBy(desc(coupons.createdAt))
    .limit(limit)
    .offset(offset)

  const [countRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(coupons)
    .where(where)

  const total = Number(countRes.count)

  return {
    items,
    meta: { page, limit, total, hasNext: offset + limit < total, hasPrev: page > 1 },
  }
}

export async function getCouponById(id: string) {
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.id, id), isNull(coupons.deletedAt)))
    .limit(1)
  if (!coupon) throw { status: 404, code: 'COUPON_NOT_FOUND', message: 'Kupon topilmadi' }

  const redemptions = await db
    .select({
      id: couponRedemptions.id,
      discountAmount: couponRedemptions.discountAmount,
      createdAt: couponRedemptions.createdAt,
      orderNumber: sql<string>`${orders.orderNumber}`,
      customerPhone: customers.phone,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
    })
    .from(couponRedemptions)
    .innerJoin(customers, eq(couponRedemptions.customerId, customers.id))
    .leftJoin(orders, eq(couponRedemptions.orderId, orders.id))
    .where(eq(couponRedemptions.couponId, id))
    .orderBy(desc(couponRedemptions.createdAt))
    .limit(10)

  return {
    ...coupon,
    redemptions,
  }
}

export async function createCoupon(data: CreateCouponDto, adminId: string) {
  const [existing] = await db.select().from(coupons).where(eq(coupons.code, data.code)).limit(1)
  if (existing) {
    throw { status: 409, code: 'COUPON_DUPLICATE_CODE', message: 'Bunday kodli kupon mavjud' }
  }

  const cleanData: any = { ...data }
  if (data.value !== undefined) cleanData.value = BigInt(data.value)
  if (data.valueKrw !== undefined && data.valueKrw !== null)
    cleanData.valueKrw = BigInt(data.valueKrw)
  if (data.maxDiscountCap !== undefined && data.maxDiscountCap !== null)
    cleanData.maxDiscountCap = BigInt(data.maxDiscountCap)
  if (data.maxDiscountKrw !== undefined && data.maxDiscountKrw !== null)
    cleanData.maxDiscountKrw = BigInt(data.maxDiscountKrw)
  if (data.minOrderAmount !== undefined) cleanData.minOrderAmount = BigInt(data.minOrderAmount)
  if (data.minOrderKrw !== undefined && data.minOrderKrw !== null)
    cleanData.minOrderKrw = BigInt(data.minOrderKrw)
  if (data.startsAt) cleanData.startsAt = new Date(data.startsAt)
  if (data.expiresAt) cleanData.expiresAt = new Date(data.expiresAt)

  cleanData.createdBy = adminId
  cleanData.status = 'DRAFT'

  const [created] = await db.insert(coupons).values(cleanData).returning()
  return created
}

export async function updateCoupon(id: string, data: UpdateCouponDto) {
  const [coupon] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1)
  if (!coupon || coupon.deletedAt !== null) {
    throw { status: 404, code: 'COUPON_NOT_FOUND', message: 'Kupon topilmadi' }
  }
  if (coupon.status === 'ARCHIVED') {
    throw {
      status: 400,
      code: 'COUPON_ARCHIVED',
      message: "Arxivlangan kuponni tahrirlab bo'lmaydi",
    }
  }

  const cleanData: any = { ...data }
  if (data.value !== undefined) cleanData.value = BigInt(data.value)
  if (data.valueKrw !== undefined && data.valueKrw !== null)
    cleanData.valueKrw = BigInt(data.valueKrw)
  if (data.maxDiscountCap !== undefined && data.maxDiscountCap !== null)
    cleanData.maxDiscountCap = BigInt(data.maxDiscountCap)
  if (data.maxDiscountKrw !== undefined && data.maxDiscountKrw !== null)
    cleanData.maxDiscountKrw = BigInt(data.maxDiscountKrw)
  if (data.minOrderAmount !== undefined) cleanData.minOrderAmount = BigInt(data.minOrderAmount)
  if (data.minOrderKrw !== undefined && data.minOrderKrw !== null)
    cleanData.minOrderKrw = BigInt(data.minOrderKrw)
  if (data.startsAt) cleanData.startsAt = new Date(data.startsAt)
  if (data.expiresAt) cleanData.expiresAt = new Date(data.expiresAt)

  const [updated] = await db
    .update(coupons)
    .set({ ...cleanData, updatedAt: new Date() })
    .where(eq(coupons.id, id))
    .returning()
  return updated
}

export async function updateCouponStatus(id: string, status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED') {
  const [coupon] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1)
  if (!coupon || coupon.deletedAt !== null) {
    throw { status: 404, code: 'COUPON_NOT_FOUND', message: 'Kupon topilmadi' }
  }
  if (coupon.status === 'ARCHIVED') {
    throw {
      status: 400,
      code: 'COUPON_ARCHIVED',
      message: "Arxivlangan kuponni qayta faollashtirib bo'lmaydi",
    }
  }

  const [updated] = await db
    .update(coupons)
    .set({ status, updatedAt: new Date() })
    .where(eq(coupons.id, id))
    .returning()
  return updated
}

export async function deleteCoupon(id: string) {
  const [deleted] = await db
    .update(coupons)
    .set({ deletedAt: new Date(), status: 'ARCHIVED', updatedAt: new Date() })
    .where(eq(coupons.id, id))
    .returning()
  if (!deleted) throw { status: 404, code: 'COUPON_NOT_FOUND', message: 'Kupon topilmadi' }
  return deleted
}

export async function generateCouponCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code: string
  let exists = true
  while (exists) {
    code =
      'MIRA' +
      Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    const [row] = await db
      .select({ id: coupons.id })
      .from(coupons)
      .where(eq(coupons.code, code))
      .limit(1)
    exists = !!row
  }
  return { code: code! }
}

export async function getCouponRedemptions(id: string, query: { page?: number; limit?: number }) {
  const page = query.page || 1
  const limit = query.limit || 20
  const offset = (page - 1) * limit

  const items = await db
    .select({
      id: couponRedemptions.id,
      discountAmount: couponRedemptions.discountAmount,
      createdAt: couponRedemptions.createdAt,
      orderNumber: sql<string>`${orders.orderNumber}`,
      customerPhone: customers.phone,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
    })
    .from(couponRedemptions)
    .innerJoin(customers, eq(couponRedemptions.customerId, customers.id))
    .leftJoin(orders, eq(couponRedemptions.orderId, orders.id))
    .where(eq(couponRedemptions.couponId, id))
    .orderBy(desc(couponRedemptions.createdAt))
    .limit(limit)
    .offset(offset)

  const [countRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(couponRedemptions)
    .where(eq(couponRedemptions.couponId, id))

  const total = Number(countRes.count)

  return {
    items,
    meta: { page, limit, total, hasNext: offset + limit < total, hasPrev: page > 1 },
  }
}
