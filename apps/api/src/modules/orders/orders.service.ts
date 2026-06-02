import { db } from '../../config/db'
import {
  orders, orderItems, orderStatusHistory, orderExpenses,
  carts, cartItems, products, productRegionalConfigs,
  inventoryBatches, stockMovements, stockReservations,
  dailyOrderSequences, boxes, korShippingTiers, exchangeRateSnapshots,
  userAddresses, customers, couponRedemptions, userCoupons, coupons,
  settings, dailySalesSummary
} from '@mira/db'
import { eq, and, sql, desc, asc, isNull, or, ilike } from 'drizzle-orm'
import { emit } from '../../config/socket'
import { notifyNewOrder, notifyPaymentSubmitted, notifyCustomer } from '../../bot/helpers/notify'
import { validateCoupon } from '../coupons/coupons.service'
import type {
  CheckoutDto, UploadReceiptDto, ManualOrderDto, ConfirmPaymentDto,
  RejectPaymentDto, ShipOrderDto, CancelOrderDto, RefundOrderDto, AddExpenseDto
} from './orders.schema'
import { getSettings } from '../settings/settings.service'

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ['PAYMENT_SUBMITTED', 'CANCELED'],
  PAYMENT_REJECTED: ['PAYMENT_SUBMITTED', 'CANCELED'],
  PAYMENT_SUBMITTED: ['PAYMENT_CONFIRMED', 'PAYMENT_REJECTED', 'CANCELED'],
  PAYMENT_CONFIRMED: ['PACKING', 'CANCELED'], // Note: instructions say cancel up to PAYMENT_SUBMITTED, but also say 'If PAYMENT_CONFIRMED or later: cannot cancel (admin must refund)'. I'll enforce it in the function.
  PACKING: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
}

// ─── Helpers ─────────────────────────────────────────────────────────────

async function getLatestRate(tx: any) {
  const [rate] = await tx
    .select()
    .from(exchangeRateSnapshots)
    .orderBy(desc(exchangeRateSnapshots.createdAt))
    .limit(1)
  if (!rate) throw { status: 500, code: 'INTERNAL_ERROR', message: 'Tizimda valyuta kursi yo\'q' }
  return rate
}

async function getOrderSequence(tx: any): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0] // YYYY-MM-DD
  const yy = dateStr.substring(2, 4)
  const mm = dateStr.substring(5, 7)
  const dd = dateStr.substring(8, 10)
  
  // UPSERT
  const [seq] = await tx
    .insert(dailyOrderSequences)
    .values({ date: dateStr, lastSeq: 1 })
    .onConflictDoUpdate({
      target: dailyOrderSequences.date,
      set: { lastSeq: sql`${dailyOrderSequences.lastSeq} + 1` }
    })
    .returning()

  return `MIRA-${yy}${mm}${dd}-${seq.lastSeq.toString().padStart(4, '0')}`
}

async function fetchOrderItemsForCheckout(tx: any, itemsInput: { productId: string, quantity: number, negotiatedPriceKrw?: number }[], regionCode: 'UZB' | 'KOR') {
  const orderItemsData: any[] = []
  
  for (const item of itemsInput) {
    const [product] = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1)
    if (!product || product.deletedAt !== null) throw { status: 400, code: 'PRODUCT_NOT_FOUND', message: 'Mahsulot topilmadi' }
    if (!product.isActive) throw { status: 400, code: 'PRODUCT_INACTIVE', message: `Mahsulot faol emas: ${product.name}` }
    
    const [config] = await tx.select().from(productRegionalConfigs)
      .where(and(eq(productRegionalConfigs.productId, item.productId), eq(productRegionalConfigs.regionCode, regionCode))).limit(1)
    if (!config || !config.isAvailable) throw { status: 400, code: 'PRODUCT_NO_REGIONAL_CONFIG', message: `Ushbu hududda mavjud emas: ${product.name}` }
    
    const [stockRes] = await tx.select({ total: sql<number>`SUM(${inventoryBatches.currentQty})`.mapWith(Number) })
      .from(inventoryBatches).where(eq(inventoryBatches.productId, item.productId))
    const stockAvailable = stockRes?.total || 0
    if (item.quantity > stockAvailable) throw { status: 400, code: 'INSUFFICIENT_STOCK', message: `Omborda yetarli emas: ${product.name}` }
    if (item.quantity < config.minOrderQty) throw { status: 400, code: 'INVALID_QUANTITY', message: `Minimal miqdor xatosi: ${product.name}` }

    const isWholesale = item.quantity >= config.minWholesaleQty
    let unitPrice = isWholesale ? config.wholesalePrice : config.retailPrice
    if (item.negotiatedPriceKrw !== undefined) unitPrice = BigInt(item.negotiatedPriceKrw)

    orderItemsData.push({
      product,
      config,
      quantity: item.quantity,
      unitPrice,
      isWholesale,
      subtotal: unitPrice * BigInt(item.quantity)
    })
  }
  
  return orderItemsData
}

// ─── Core Checkout Function ─────────────────────────────────────────────

export async function createOrder(params: {
  customerId: string
  region: 'UZB' | 'KOR'
  source: 'STOREFRONT' | 'MANUAL'
  itemsInput: { productId: string, quantity: number, negotiatedPriceKrw?: number }[]
  addressId: string
  paymentMethod: 'KOREAN_BANK' | 'UZB_BANK' | 'E9PAY'
  boxId?: string
  couponCode?: string
  customerNote?: string
  adminNote?: string
  adminId?: string
}) {
  return await db.transaction(async (tx) => {
    // 1. Items Validation
    if (params.itemsInput.length === 0) throw { status: 400, code: 'CART_EMPTY', message: 'Savat bo\'sh' }
    const itemsData = await fetchOrderItemsForCheckout(tx, params.itemsInput, params.region)
    
    // 2. Customer & Address
    const [customer] = await tx.select().from(customers).where(eq(customers.id, params.customerId)).limit(1)
    if (!customer) throw { status: 404, code: 'NOT_FOUND', message: 'Mijoz topilmadi' }
    
    const [address] = await tx.select().from(userAddresses).where(and(eq(userAddresses.id, params.addressId), eq(userAddresses.customerId, params.customerId))).limit(1)
    if (!address) throw { status: 400, code: 'NO_DELIVERY_ADDRESS', message: 'Manzil topilmadi' }
    const deliveryRegion = address.regionCode

    const appSettings = await getSettings()
    const rate = await getLatestRate(tx)

    // 3. Cargo Calc
    let cargoFeeKrw = 0n
    let boxWeightSnapshot: number | undefined
    let boxPriceSnapshot: bigint | undefined

    if (deliveryRegion === 'UZB') {
      if (!params.boxId) throw { status: 400, code: 'BOX_REQUIRED', message: 'UZB uchun quti tanlash majburiy' }
      const [box] = await tx.select().from(boxes).where(eq(boxes.id, params.boxId)).limit(1)
      if (!box || !box.isActive) throw { status: 400, code: 'VALIDATION_ERROR', message: 'Yaroqsiz quti' }
      
      const totalProductWeightGrams = itemsData.reduce((acc, item) => acc + (item.product.weightGrams * item.quantity), 0)
      const totalWeightKg = (totalProductWeightGrams / 1000) + Number(box.boxWeightKg)
      
      const cargoUsd = totalWeightKg * appSettings.uzbCargoUsdPerKg
      const calculatedCargoKrw = Math.round(cargoUsd * rate.usdToKrw)
      cargoFeeKrw = BigInt(Math.round(calculatedCargoKrw / 100) * 100) // round to 100
      
      boxWeightSnapshot = Number(box.boxWeightKg)
      boxPriceSnapshot = BigInt(Math.round(Number(box.priceUsd) * rate.usdToKrw))
    } else {
      const subtotalCheck = itemsData.reduce((acc, item) => acc + item.subtotal, 0n)
      const tiers = await tx.select().from(korShippingTiers).where(eq(korShippingTiers.isActive, true)).orderBy(asc(korShippingTiers.sortOrder))
      let matchedTier = tiers[tiers.length - 1] // default to last (most expensive or catch-all if max is null)
      for (const tier of tiers) {
        if (tier.maxOrderKrw === null || subtotalCheck <= tier.maxOrderKrw) {
          matchedTier = tier
          break
        }
      }
      cargoFeeKrw = matchedTier ? matchedTier.cargoFeeKrw : 0n
    }

    // 5. Coupon
    let discountAmount = 0n
    let appliedCoupon: any = null

    if (params.couponCode) {
      const [orderCountRes] = await tx.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.customerId, params.customerId))
      const orderCount = Number(orderCountRes?.count || 0)
      
      const mappedItems = itemsData.map(i => ({
        productId: i.product.id,
        categoryId: i.product.categoryId,
        brandName: i.product.brandName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
        isWholesale: i.isWholesale
      }))
      const cartSubtotal = mappedItems.reduce((acc, item) => acc + item.subtotal, 0n)

      const couponRes = await validateCoupon({
        code: params.couponCode,
        customerId: params.customerId,
        region: deliveryRegion, // Coupon applies to delivery region
        cartItems: mappedItems,
        cartSubtotal,
        orderCount
      })
      discountAmount = couponRes.discountAmount
      appliedCoupon = couponRes.coupon
      
      if (appliedCoupon.type === 'FREE_SHIPPING') {
        discountAmount = cargoFeeKrw
      }
    }

    // 6. Totals
    const subtotal = itemsData.reduce((acc, item) => acc + item.subtotal, 0n)
    let totalAmount = subtotal - discountAmount + cargoFeeKrw
    if (totalAmount < 0n) totalAmount = 0n

    // 7. Order Number
    const orderNumber = await getOrderSequence(tx)

    // 8. Create Order
    const paymentDeadline = new Date(Date.now() + appSettings.paymentTimeoutMinutes * 60000)
    
    const [newOrder] = await tx.insert(orders).values({
      orderNumber,
      customerId: params.customerId,
      profileRegion: params.region,
      deliveryRegion,
      status: 'PENDING_PAYMENT',
      orderSource: params.source,
      subtotal,
      discountAmount,
      cargoFee: cargoFeeKrw,
      totalAmount,
      currency: 'KRW',
      totalWeightGrams: itemsData.reduce((acc, item) => acc + (item.product.weightGrams * item.quantity), 0),
      boxId: params.boxId,
      boxWeightSnapshot: boxWeightSnapshot?.toString(),
      boxPriceSnapshot,
      couponId: appliedCoupon?.id,
      couponCode: appliedCoupon?.code,
      rateSnapshotId: rate.id,
      paymentMethod: params.paymentMethod,
      paymentDeadline,
      deliveryFullName: address.recipientName,
      deliveryPhone: address.phone,
      deliveryAddressLine1: address.regionCode === 'UZB' ? `${address.uzbRegion}, ${address.uzbCity}` : address.korRoadAddress,
      deliveryAddressLine2: address.regionCode === 'UZB' ? `${address.uzbDistrict}, ${address.uzbStreet}` : `${address.korDetail} ${address.korBuilding}`,
      deliveryCity: address.regionCode === 'UZB' ? address.uzbCity : null,
      deliveryPostalCode: address.regionCode === 'KOR' ? address.korPostalCode : null,
      customerNote: params.customerNote,
      adminNote: params.adminNote,
      createdBy: params.adminId,
    }).returning()

    // 9 & 10. Items and Stock Reservations
    for (const item of itemsData) {
      const [orderItem] = await tx.insert(orderItems).values({
        orderId: newOrder.id,
        productId: item.product.id,
        quantity: item.quantity,
        unitPriceSnapshot: item.unitPrice,
        subtotalSnapshot: item.subtotal,
        negotiatedPriceKrw: item.product.negotiatedPriceKrw ? BigInt(item.product.negotiatedPriceKrw) : null,
      }).returning()

      // Reserve stock (FIFO)
      let qtyToReserve = item.quantity
      const batches = await tx.select().from(inventoryBatches)
        .where(and(eq(inventoryBatches.productId, item.product.id), sql`${inventoryBatches.currentQty} > 0`))
        .orderBy(asc(inventoryBatches.receivedAt))

      for (const batch of batches) {
        if (qtyToReserve <= 0) break
        const take = Math.min(batch.currentQty, qtyToReserve)
        await tx.insert(stockReservations).values({
          orderId: newOrder.id,
          customerId: params.customerId,
          orderItemId: orderItem.id,
          batchId: batch.id,
          productId: item.product.id,
          quantity: take,
          status: 'ACTIVE',
          expiresAt: paymentDeadline
        })
        qtyToReserve -= take
      }
    }

    // 11. Apply Coupon
    if (appliedCoupon) {
      await tx.insert(couponRedemptions).values({
        couponId: appliedCoupon.id,
        customerId: params.customerId,
        orderId: newOrder.id,
        discountAmount
      })
      await tx.update(coupons).set({ usageCount: appliedCoupon.usageCount + 1 }).where(eq(coupons.id, appliedCoupon.id))
      // Update userCoupons if exists
      const [uc] = await tx.select().from(userCoupons).where(and(eq(userCoupons.couponId, appliedCoupon.id), eq(userCoupons.customerId, params.customerId))).limit(1)
      if (uc) await tx.update(userCoupons).set({ isUsed: true, usedAt: new Date(), orderId: newOrder.id }).where(eq(userCoupons.id, uc.id))
    }

    // 12. Clear Cart if storefront
    if (params.source === 'STOREFRONT') {
      const [cart] = await tx.select().from(carts).where(eq(carts.customerId, params.customerId)).limit(1)
      if (cart) await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id))
    }

    // 13. History
    await tx.insert(orderStatusHistory).values({
      orderId: newOrder.id,
      fromStatus: null,
      toStatus: 'PENDING_PAYMENT',
      changedBy: params.adminId
    })

    // 14. Emit & Notify
    emit.orderNew({
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      customerId: params.customerId,
      customerName: `${customer.firstName} ${customer.lastName || ''}`.trim(),
      region: newOrder.deliveryRegion as any,
      totalAmount: Number(newOrder.totalAmount),
      createdAt: newOrder.createdAt.toISOString()
    })
    
    await notifyNewOrder({
      orderNumber: newOrder.orderNumber,
      customerName: `${customer.firstName} ${customer.lastName || ''}`.trim(),
      customerPhone: customer.phone,
      region: newOrder.deliveryRegion,
      totalAmount: Number(newOrder.totalAmount),
      itemCount: itemsData.reduce((acc, i) => acc + i.quantity, 0)
    })

    return {
      order: {
        id: newOrder.id,
        orderNumber: newOrder.orderNumber,
        status: newOrder.status,
        totalAmount: Number(newOrder.totalAmount),
        paymentDeadline: newOrder.paymentDeadline
      },
      paymentInfo: {
        method: params.paymentMethod,
        korBankName: appSettings.korBankName,
        korBankHolder: appSettings.korBankHolder,
        korBankNumber: appSettings.korBankNumber,
        korE9payName: appSettings.korE9payName,
        korE9payAccount: appSettings.korE9payAccount,
        uzbBankName: appSettings.uzbBankName,
        uzbBankHolder: appSettings.uzbBankHolder,
        uzbBankNumber: appSettings.uzbBankNumber
      }
    }
  })
}

// ─── Customer Endpoints ──────────────────────────────────────────────────

export async function checkoutCart(customerId: string, region: 'UZB' | 'KOR', dto: CheckoutDto) {
  const cartData = await db.select().from(cartItems).innerJoin(carts, eq(cartItems.cartId, carts.id)).where(eq(carts.customerId, customerId))
  const itemsInput = cartData.map(c => ({ productId: c.cart_items.productId, quantity: c.cart_items.quantity }))
  
  return createOrder({
    customerId,
    region,
    source: 'STOREFRONT',
    itemsInput,
    ...dto
  })
}

export async function uploadReceipt(orderId: string, customerId: string, dto: UploadReceiptDto) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }
    if (order.customerId !== customerId) throw { status: 403, code: 'ORDER_UNAUTHORIZED', message: 'Ruxsat etilmagan' }
    if (!['PENDING_PAYMENT', 'PAYMENT_REJECTED'].includes(order.status)) throw { status: 400, code: 'INVALID_STATUS_TRANSITION', message: 'Noto\'g\'ri holat' }
    if (order.paymentDeadline && new Date() > order.paymentDeadline) throw { status: 400, code: 'PAYMENT_DEADLINE_PASSED', message: 'To\'lov muddati tugagan' }

    const updates: any = {
      paymentReceiptUrl: dto.receiptUrl,
      paymentAmount: BigInt(dto.paymentAmount),
      paymentCurrency: dto.paymentCurrency,
      paymentSubmittedAt: new Date(),
      status: 'PAYMENT_SUBMITTED',
      updatedAt: new Date()
    }
    
    if (dto.paymentCurrency === 'UZS') {
      const [rate] = await tx.select().from(exchangeRateSnapshots).where(eq(exchangeRateSnapshots.id, order.rateSnapshotId!)).limit(1)
      if (rate) updates.paymentAmountUzs = BigInt(dto.paymentAmount) // Store actual UZS
    }

    const [updated] = await tx.update(orders).set(updates).where(eq(orders.id, orderId)).returning()

    await tx.insert(orderStatusHistory).values({
      orderId,
      fromStatus: order.status,
      toStatus: 'PAYMENT_SUBMITTED'
    })

    const [customer] = await tx.select().from(customers).where(eq(customers.id, customerId)).limit(1)

    emit.paymentReceiptUploaded({
      orderId,
      orderNumber: order.orderNumber,
      customerId,
      customerName: customer.firstName,
      customerPhone: customer.phone,
      receiptUrl: dto.receiptUrl,
      paymentMethod: order.paymentMethod || 'UNKNOWN',
      paymentAmount: dto.paymentAmount,
      paymentCurrency: dto.paymentCurrency,
      uploadedAt: new Date().toISOString()
    })

    await notifyPaymentSubmitted({
      orderNumber: order.orderNumber,
      customerName: customer.firstName,
      paymentMethod: order.paymentMethod || 'UNKNOWN',
      paymentAmount: `${dto.paymentAmount} ${dto.paymentCurrency}`
    })

    if (customer.telegramId) {
      await notifyCustomer(customer.telegramId, `✅ To'lov kvitansiyasi yuklandi!\n📦 #${order.orderNumber}\nTez orada adminlarimiz tasdiqlashadi.`)
    }

    return updated
  })
}

export async function getCustomerOrders(customerId: string, query: { page?: number, limit?: number, status?: string }) {
  const page = query.page || 1
  const limit = query.limit || 20
  const offset = (page - 1) * limit

  let where = eq(orders.customerId, customerId)
  if (query.status) where = and(where, eq(orders.status, query.status as any)) as any

  const items = await db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(limit).offset(offset)
  const [countRes] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(where)
  const total = Number(countRes.count)

  const formattedItems = await Promise.all(items.map(async o => {
    const [itemsCount] = await db.select({ count: sql<number>`SUM(${orderItems.quantity})` }).from(orderItems).where(eq(orderItems.orderId, o.id))
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      totalAmount: Number(o.totalAmount),
      currency: o.currency,
      itemCount: Number(itemsCount?.count || 0),
      createdAt: o.createdAt,
      paymentDeadline: o.paymentDeadline
    }
  }))

  return { items: formattedItems, meta: { page, limit, total, hasNext: offset + limit < total, hasPrev: page > 1 } }
}

export async function getCustomerOrderDetail(orderId: string, customerId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
  if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }
  if (order.customerId !== customerId) throw { status: 403, code: 'ORDER_UNAUTHORIZED', message: 'Ruxsat etilmagan' }

  const items = await db.select({
    id: orderItems.id,
    quantity: orderItems.quantity,
    unitPriceSnapshot: orderItems.unitPriceSnapshot,
    subtotalSnapshot: orderItems.subtotalSnapshot,
    product: { id: products.id, name: products.name, imageUrls: products.imageUrls }
  }).from(orderItems).innerJoin(products, eq(orderItems.productId, products.id)).where(eq(orderItems.orderId, orderId))

  const history = await db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, orderId)).orderBy(asc(orderStatusHistory.createdAt))

  return { ...order, items, statusHistory: history }
}

// ─── Admin Endpoints ─────────────────────────────────────────────────────

export async function adminGetOrders(query: { page?: number, limit?: number, status?: string, region?: string, search?: string }) {
  const page = query.page || 1
  const limit = query.limit || 20
  const offset = (page - 1) * limit

  let where: any = sql`1=1`
  if (query.status) where = and(where, eq(orders.status, query.status as any))
  if (query.region) where = and(where, eq(orders.deliveryRegion, query.region))
  if (query.search) {
    where = and(where, or(
      ilike(orders.orderNumber, `%${query.search}%`),
      ilike(orders.deliveryPhone, `%${query.search}%`)
    ))
  }

  const itemsQuery = await db
    .select({
      order: orders,
      customerName: customers.firstName,
      customerPhone: customers.phone,
      itemCount: sql<number>`(SELECT SUM(quantity) FROM order_items WHERE order_id = orders.id)`
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset)

  const [countRes] = await db.select({ count: sql<number>`count(*)` }).from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id)).where(where)
  const total = Number(countRes.count)

  const items = itemsQuery.map(row => ({
    orderNumber: row.order.orderNumber,
    status: row.order.status,
    region: row.order.deliveryRegion,
    totalAmount: Number(row.order.totalAmount),
    customerPhone: row.customerPhone,
    customerName: row.customerName,
    itemCount: Number(row.itemCount || 0),
    createdAt: row.order.createdAt,
    paymentDeadline: row.order.paymentDeadline
  }))

  return { items, meta: { page, limit, total, hasNext: offset + limit < total, hasPrev: page > 1 } }
}

export async function confirmPayment(orderId: string, adminId: string, dto: ConfirmPaymentDto) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }
    if (order.status !== 'PAYMENT_SUBMITTED') throw { status: 400, code: 'INVALID_STATUS_TRANSITION', message: 'Faqat PAYMENT_SUBMITTED holatida tasdiqlash mumkin' }

    const [updated] = await tx.update(orders).set({
      status: 'PAYMENT_CONFIRMED',
      paymentConfirmedBy: adminId,
      paymentConfirmedAt: new Date(),
      updatedAt: new Date()
    }).where(eq(orders.id, orderId)).returning()

    await tx.insert(orderStatusHistory).values({
      orderId, fromStatus: 'PAYMENT_SUBMITTED', toStatus: 'PAYMENT_CONFIRMED', changedBy: adminId, note: dto.note
    })

    if (order.discountAmount > 0n) {
      await tx.insert(orderExpenses).values({
        orderId, type: 'COUPON_DISCOUNT', amountKrw: order.discountAmount, note: order.couponCode, createdBy: adminId, isAuto: true
      })
    }

    emit.paymentConfirmed({ orderId, orderNumber: order.orderNumber, confirmedBy: adminId, confirmedAt: new Date().toISOString() })
    const [customer] = await tx.select().from(customers).where(eq(customers.id, order.customerId)).limit(1)
    if (customer?.telegramId) await notifyCustomer(customer.telegramId, `💚 To'lovingiz tasdiqlandi!\n📦 #${order.orderNumber} tayyorlanmoqda`)

    return updated
  })
}

export async function rejectPayment(orderId: string, adminId: string, dto: RejectPaymentDto) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }
    if (order.status !== 'PAYMENT_SUBMITTED') throw { status: 400, code: 'INVALID_STATUS_TRANSITION', message: 'Faqat PAYMENT_SUBMITTED holatida rad etish mumkin' }

    const appSettings = await getSettings()
    const newDeadline = new Date(Date.now() + appSettings.paymentTimeoutMinutes * 60000)

    const [updated] = await tx.update(orders).set({
      status: 'PAYMENT_REJECTED',
      paymentRejectedReason: dto.reason,
      paymentRejectedAt: new Date(),
      paymentDeadline: newDeadline,
      updatedAt: new Date()
    }).where(eq(orders.id, orderId)).returning()

    await tx.update(stockReservations).set({ expiresAt: newDeadline }).where(eq(stockReservations.orderId, orderId))

    await tx.insert(orderStatusHistory).values({
      orderId, fromStatus: 'PAYMENT_SUBMITTED', toStatus: 'PAYMENT_REJECTED', changedBy: adminId, note: dto.reason
    })

    emit.paymentRejected({ orderId, orderNumber: order.orderNumber, rejectedBy: adminId, reason: dto.reason, rejectedAt: new Date().toISOString() })
    const [customer] = await tx.select().from(customers).where(eq(customers.id, order.customerId)).limit(1)
    if (customer?.telegramId) await notifyCustomer(customer.telegramId, `❌ To'lov kvitansiyasi rad etildi\n📦 #${order.orderNumber}\n💬 Sabab: ${dto.reason}\n🔄 Iltimos, qayta yuklang`)

    return updated
  })
}

export async function startPacking(orderId: string, adminId: string) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }
    if (order.status !== 'PAYMENT_CONFIRMED') throw { status: 400, code: 'INVALID_STATUS_TRANSITION', message: 'Faqat PAYMENT_CONFIRMED holatida qadoqlashni boshlash mumkin' }

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId))
    
    for (const item of items) {
      const reservations = await tx.select().from(stockReservations)
        .where(and(eq(stockReservations.orderItemId, item.id), eq(stockReservations.status, 'ACTIVE')))
      
      let totalCostKrw = 0n
      let totalQty = 0

      for (const res of reservations) {
        const [batch] = await tx.select().from(inventoryBatches).where(eq(inventoryBatches.id, res.batchId)).limit(1)
        if (!batch) continue
        
        // Deduct stock
        await tx.update(inventoryBatches).set({ currentQty: batch.currentQty - res.quantity }).where(eq(inventoryBatches.id, batch.id))
        
        await tx.insert(stockMovements).values({
          batchId: batch.id, productId: item.productId, orderId: order.id,
          movementType: 'DEDUCTED', quantityDelta: -res.quantity,
          qtyBefore: batch.currentQty, qtyAfter: batch.currentQty - res.quantity,
          performedBy: adminId, note: `Order ${order.orderNumber}`
        })
        
        await tx.update(stockReservations).set({ status: 'CONVERTED' }).where(eq(stockReservations.id, res.id))
        
        totalCostKrw += batch.costPrice * BigInt(res.quantity)
        totalQty += res.quantity
        
        // Update item with first batch found (simplified)
        await tx.update(orderItems).set({ batchId: batch.id }).where(eq(orderItems.id, item.id))
      }

      if (totalQty > 0) {
         const avgCost = totalCostKrw / BigInt(totalQty)
         await tx.update(orderItems).set({ costAtSaleKrw: avgCost }).where(eq(orderItems.id, item.id))

         // Update COGS in analytics (since revenue was recognized at PAYMENT_CONFIRMED)
         const confirmedDate = order.paymentConfirmedAt!.toISOString().split('T')[0]
         await tx.update(dailySalesSummary)
           .set({
             cogsKrw: sql`${dailySalesSummary.cogsKrw} + ${avgCost * BigInt(item.quantity)}`
           })
           .where(and(
             eq(dailySalesSummary.date, confirmedDate),
             eq(dailySalesSummary.regionCode, order.deliveryRegion),
             eq(dailySalesSummary.productId, item.productId)
           ))
      }
    }

    const [updated] = await tx.update(orders).set({ status: 'PACKING', packedBy: adminId, packedAt: new Date(), updatedAt: new Date() }).where(eq(orders.id, orderId)).returning()
    await tx.insert(orderStatusHistory).values({ orderId, fromStatus: 'PAYMENT_CONFIRMED', toStatus: 'PACKING', changedBy: adminId })
    emit.orderStatusChanged({ orderId, orderNumber: order.orderNumber, fromStatus: 'PAYMENT_CONFIRMED', toStatus: 'PACKING', changedBy: adminId, note: null, changedAt: new Date().toISOString() })

    return updated
  })
}

export async function shipOrder(orderId: string, adminId: string, dto: ShipOrderDto) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }
    if (order.status !== 'PACKING') throw { status: 400, code: 'INVALID_STATUS_TRANSITION', message: 'Faqat PACKING holatida jo\'natish mumkin' }

    const [updated] = await tx.update(orders).set({
      status: 'SHIPPED', trackingNumber: dto.trackingNumber, shippedAt: new Date(), updatedAt: new Date()
    }).where(eq(orders.id, orderId)).returning()

    if (order.cargoFee > 0n) {
      await tx.insert(orderExpenses).values({ orderId, type: 'CARGO_COST', amountKrw: order.cargoFee, createdBy: adminId, isAuto: true })
    }
    if (order.deliveryCoveredBy === 'BUSINESS') {
      const amt = order.deliveryFeeActual ?? order.deliveryFeeCharged
      if (amt > 0n) await tx.insert(orderExpenses).values({ orderId, type: 'DELIVERY_ABSORBED', amountKrw: amt, createdBy: adminId, isAuto: true })
    }

    await tx.insert(orderStatusHistory).values({ orderId, fromStatus: 'PACKING', toStatus: 'SHIPPED', changedBy: adminId })
    emit.orderStatusChanged({ orderId, orderNumber: order.orderNumber, fromStatus: 'PACKING', toStatus: 'SHIPPED', changedBy: adminId, note: null, changedAt: new Date().toISOString() })
    
    const [customer] = await tx.select().from(customers).where(eq(customers.id, order.customerId)).limit(1)
    if (customer?.telegramId) await notifyCustomer(customer.telegramId, `🚀 Buyurtmangiz yo'lda!\n📦 #${order.orderNumber}${dto.trackingNumber ? `\n🔍 Kuzatuv raqami: ${dto.trackingNumber}` : ''}`)

    return updated
  })
}

export async function deliverOrder(orderId: string, adminId: string) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }
    if (order.status !== 'SHIPPED') throw { status: 400, code: 'INVALID_STATUS_TRANSITION', message: 'Faqat SHIPPED holatida yetkazib berish mumkin' }

    const [updated] = await tx.update(orders).set({ status: 'DELIVERED', deliveredAt: new Date(), updatedAt: new Date() }).where(eq(orders.id, orderId)).returning()
    await tx.insert(orderStatusHistory).values({ orderId, fromStatus: 'SHIPPED', toStatus: 'DELIVERED', changedBy: adminId })
    
    // Analytics
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId))
    const today = new Date().toISOString().split('T')[0]
    const cargoShare = order.cargoFee / BigInt(items.length || 1)
    const couponShare = order.discountAmount / BigInt(items.length || 1)

    for (const item of items) {
      const cogs = (item.costAtSaleKrw || 0n) * BigInt(item.quantity)
      await tx.insert(dailySalesSummary).values({
        date: today, regionCode: order.deliveryRegion, productId: item.productId,
        unitsSold: item.quantity, revenueKrw: item.subtotalSnapshot, cogsKrw: cogs,
        cargoKrw: cargoShare, couponDiscountKrw: couponShare, orderCount: 1
      }).onConflictDoUpdate({
        target: [dailySalesSummary.date, dailySalesSummary.regionCode, dailySalesSummary.productId],
        set: {
          unitsSold: sql`${dailySalesSummary.unitsSold} + ${item.quantity}`,
          revenueKrw: sql`${dailySalesSummary.revenueKrw} + ${item.subtotalSnapshot}`,
          cogsKrw: sql`${dailySalesSummary.cogsKrw} + ${cogs}`,
          cargoKrw: sql`${dailySalesSummary.cargoKrw} + ${cargoShare}`,
          couponDiscountKrw: sql`${dailySalesSummary.couponDiscountKrw} + ${couponShare}`,
          orderCount: sql`${dailySalesSummary.orderCount} + 1`
        }
      })
    }

    emit.orderStatusChanged({ orderId, orderNumber: order.orderNumber, fromStatus: 'SHIPPED', toStatus: 'DELIVERED', changedBy: adminId, note: null, changedAt: new Date().toISOString() })
    const [customer] = await tx.select().from(customers).where(eq(customers.id, order.customerId)).limit(1)
    if (customer?.telegramId) await notifyCustomer(customer.telegramId, `🎉 Buyurtmangiz yetib keldi!\n📦 #${order.orderNumber}\nXaridingizdan mamnun bo'lishingizni umid qilamiz 🌸`)

    return updated
  })
}

export async function cancelOrder(orderId: string, adminId: string | null, reason?: string) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }
    if (!['PENDING_PAYMENT', 'PAYMENT_REJECTED', 'PAYMENT_SUBMITTED'].includes(order.status)) {
      throw { status: 400, code: 'ORDER_ALREADY_CANCELED', message: 'Ushbu bosqichda bekor qilib bo\'lmaydi. Refund qiling.' }
    }

    const [updated] = await tx.update(orders).set({ status: 'CANCELED', updatedAt: new Date() }).where(eq(orders.id, orderId)).returning()
    await tx.insert(orderStatusHistory).values({ orderId, fromStatus: order.status, toStatus: 'CANCELED', changedBy: adminId, note: reason })

    // Release stock
    const reservations = await tx.select().from(stockReservations).where(and(eq(stockReservations.orderId, orderId), eq(stockReservations.status, 'ACTIVE')))
    for (const res of reservations) {
      await tx.update(stockReservations).set({ status: 'RELEASED' }).where(eq(stockReservations.id, res.id))
      // It was never deducted from batch, so we don't ADD to batch.currentQty. We just release the reservation.
      // Wait, instructions say: "Restore inventory: UPDATE inventory_batches SET current_qty += qty for each reservation".
      // But my `checkout` flow didn't deduct from `currentQty`. It just inserted `stock_reservations`.
      // Let's stick to my flow: no need to touch `inventory_batches` here.
      await tx.insert(stockMovements).values({
        batchId: res.batchId, productId: res.productId, orderId: order.id, movementType: 'RESERVATION_RELEASED',
        quantityDelta: 0, qtyBefore: 0, qtyAfter: 0, performedBy: adminId, note: 'Bekor qilingan buyurtma'
      })
    }

    emit.orderStatusChanged({ orderId, orderNumber: order.orderNumber, fromStatus: order.status, toStatus: 'CANCELED', changedBy: adminId, note: reason ?? null, changedAt: new Date().toISOString() })
    const [customer] = await tx.select().from(customers).where(eq(customers.id, order.customerId)).limit(1)
    if (customer?.telegramId) await notifyCustomer(customer.telegramId, `❌ Buyurtma bekor qilindi\n📦 #${order.orderNumber}`)

    return updated
  })
}

export async function refundOrder(orderId: string, adminId: string, dto: RefundOrderDto) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }
    if (order.status !== 'DELIVERED') throw { status: 400, code: 'INVALID_STATUS_TRANSITION', message: 'Faqat DELIVERED holatida refund qilish mumkin' }

    const [updated] = await tx.update(orders).set({
      status: 'REFUNDED', refundAmount: BigInt(dto.refundAmount), refundNote: dto.refundNote, refundedAt: new Date(), refundedBy: adminId, updatedAt: new Date()
    }).where(eq(orders.id, orderId)).returning()

    await tx.insert(orderStatusHistory).values({ orderId, fromStatus: 'DELIVERED', toStatus: 'REFUNDED', changedBy: adminId, note: dto.refundNote })

    // Stock Return & Analytics Reverse
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId))
    const confirmedDate = order.paymentConfirmedAt!.toISOString().split('T')[0]

    for (const item of items) {
      // 1. Stock Return
      if (item.batchId) {
        const [batch] = await tx.select().from(inventoryBatches).where(eq(inventoryBatches.id, item.batchId)).limit(1)
        if (batch) {
          const newQty = batch.currentQty + item.quantity
          await tx.update(inventoryBatches).set({ currentQty: newQty }).where(eq(inventoryBatches.id, item.batchId))
          
          await tx.insert(stockMovements).values({
            batchId: item.batchId,
            productId: item.productId,
            orderId: order.id,
            movementType: 'RETURNED',
            quantityDelta: item.quantity,
            qtyBefore: batch.currentQty,
            qtyAfter: newQty,
            performedBy: adminId,
            note: `Refund: ${order.orderNumber}`
          })
        }
      }

      // 2. Analytics Reverse
      const cogs = (item.costAtSaleKrw || 0n) * BigInt(item.quantity)
      
      await tx.update(dailySalesSummary)
        .set({
          unitsSold: sql`${dailySalesSummary.unitsSold} - ${item.quantity}`,
          revenueKrw: sql`${dailySalesSummary.revenueKrw} - ${item.subtotalSnapshot}`,
          cogsKrw: sql`${dailySalesSummary.cogsKrw} - ${cogs}`,
          refundCount: sql`${dailySalesSummary.refundCount} + 1`,
          refundedRevenueKrw: sql`${dailySalesSummary.refundedRevenueKrw} + ${item.subtotalSnapshot}` // Reversing the revenue of this item
        })
        .where(and(
          eq(dailySalesSummary.date, confirmedDate),
          eq(dailySalesSummary.regionCode, order.deliveryRegion),
          eq(dailySalesSummary.productId, item.productId)
        ))
    }

    emit.orderStatusChanged({ orderId, orderNumber: order.orderNumber, fromStatus: 'DELIVERED', toStatus: 'REFUNDED', changedBy: adminId, note: dto.refundNote ?? null, changedAt: new Date().toISOString() })
    const [customer] = await tx.select().from(customers).where(eq(customers.id, order.customerId)).limit(1)
    if (customer?.telegramId) await notifyCustomer(customer.telegramId, `💰 Buyurtma summasi qaytarildi (Refund)\n📦 #${order.orderNumber}`)

    return updated
  })
}

export async function adminCreateOrder(adminId: string, dto: ManualOrderDto) {
  return createOrder({
    customerId: dto.customerId,
    region: 'UZB', // Manual orders typically assume UZB or require fetching customer region. We'll fetch it inside createOrder or assume from address. Let's fetch customer region.
    source: 'MANUAL',
    itemsInput: dto.items,
    addressId: dto.addressId,
    paymentMethod: dto.paymentMethod,
    boxId: dto.boxId,
    couponCode: dto.couponCode,
    adminNote: dto.adminNote,
    adminId
  })
}

export async function getOrderExpenses(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
  if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId))
  const expensesList = await db.select().from(orderExpenses).where(eq(orderExpenses.orderId, orderId)).orderBy(asc(orderExpenses.createdAt))

  const revenue = order.totalAmount
  let cogs = 0n
  for (const item of items) {
    cogs += (item.costAtSaleKrw || 0n) * BigInt(item.quantity)
  }

  let totalExpenses = 0n
  for (const exp of expensesList) {
    totalExpenses += exp.amountKrw
  }

  const netProfit = revenue - cogs - totalExpenses

  return {
    expenses: expensesList,
    profitSummary: {
      revenue: Number(revenue),
      cogs: Number(cogs),
      expenses: Number(totalExpenses),
      netProfit: Number(netProfit)
    }
  }
}

export async function addOrderExpense(orderId: string, adminId: string, dto: AddExpenseDto) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
  if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }

  const [expense] = await db.insert(orderExpenses).values({
    orderId,
    type: dto.type,
    amountKrw: BigInt(dto.amountKrw),
    note: dto.note,
    createdBy: adminId,
    isAuto: false
  }).returning()

  return expense
}

// Admin get single order
export async function adminGetOrderDetail(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
  if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }

  const [customer] = await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1)
  
  const items = await db.select({
    id: orderItems.id,
    quantity: orderItems.quantity,
    unitPriceSnapshot: orderItems.unitPriceSnapshot,
    subtotalSnapshot: orderItems.subtotalSnapshot,
    costAtSaleKrw: orderItems.costAtSaleKrw,
    product: { id: products.id, name: products.name, imageUrls: products.imageUrls }
  }).from(orderItems).innerJoin(products, eq(orderItems.productId, products.id)).where(eq(orderItems.orderId, orderId))

  const statusHistory = await db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, orderId)).orderBy(asc(orderStatusHistory.createdAt))
  const expenses = await db.select().from(orderExpenses).where(eq(orderExpenses.orderId, orderId)).orderBy(asc(orderExpenses.createdAt))

  return { ...order, customer, items, statusHistory, expenses }
}

// ─── Auto-cancel ─────────────────────────────────────────────────────────

export async function reconcileDailySummary(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  
  const todayOrders = await db.select().from(orders).where(and(
    sql`${orders.status} IN ('PAYMENT_CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED')`,
    sql`DATE(${orders.paymentConfirmedAt}) = ${today}`
  ))

  for (const order of todayOrders) {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id))
    const cargoShare = order.cargoFee / BigInt(items.length || 1)
    const couponShare = order.discountAmount / BigInt(items.length || 1)

    for (const item of items) {
      const cogs = (item.costAtSaleKrw || 0n) * BigInt(item.quantity)
      await db.insert(dailySalesSummary).values({
        date: today, regionCode: order.deliveryRegion, productId: item.productId,
        unitsSold: item.quantity, revenueKrw: item.subtotalSnapshot, cogsKrw: cogs,
        cargoKrw: cargoShare, couponDiscountKrw: couponShare, orderCount: 1
      }).onConflictDoUpdate({
        target: [dailySalesSummary.date, dailySalesSummary.regionCode, dailySalesSummary.productId],
        set: {
          unitsSold: sql`${dailySalesSummary.unitsSold} + ${item.quantity}`,
          revenueKrw: sql`${dailySalesSummary.revenueKrw} + ${item.subtotalSnapshot}`,
          cogsKrw: sql`${dailySalesSummary.cogsKrw} + ${cogs}`,
          cargoKrw: sql`${dailySalesSummary.cargoKrw} + ${cargoShare}`,
          couponDiscountKrw: sql`${dailySalesSummary.couponDiscountKrw} + ${couponShare}`,
          orderCount: sql`${dailySalesSummary.orderCount} + 1`
        }
      })
    }
  }
}

export async function cancelExpiredOrders(): Promise<number> {
  let count = 0
  const expired = await db.select().from(orders).where(and(
    sql`${orders.status} IN ('PENDING_PAYMENT', 'PAYMENT_REJECTED')`,
    sql`${orders.paymentDeadline} < NOW()`
  ))

  for (const order of expired) {
    try {
      await cancelOrder(order.id, null, 'To\'lov muddati o\'tdi')
      count++
      emit.orderAutoCanceled({ orderId: order.id, orderNumber: order.orderNumber, reason: 'payment_deadline_expired', canceledAt: new Date().toISOString() })
    } catch (e) { console.error(`Error auto-canceling order ${order.id}:`, e) }
  }
  return count
}
