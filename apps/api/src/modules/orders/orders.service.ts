import { db } from '../../config/db'
import {
  orders,
  orderItems,
  orderStatusHistory,
  orderExpenses,
  carts,
  cartItems,
  products,
  productRegionalConfigs,
  inventoryBatches,
  stockMovements,
  stockReservations,
  dailyOrderSequences,
  boxes,
  korShippingTiers,
  exchangeRateSnapshots,
  userAddresses,
  customers,
  couponRedemptions,
  userCoupons,
  coupons,
  settings,
  dailySalesSummary,
} from '@mira/db'
import { eq, and, sql, desc, asc, isNull, or, ilike, gte, lte } from 'drizzle-orm'
import { escapeLikeQuery } from '../../lib/sanitize'
import { emit } from '../../config/socket'
import {
  notifyNewOrder,
  notifyPaymentSubmitted,
  notifyCustomer,
  notifyCustomerFull,
  sendAdminAlert,
} from '../../bot/helpers/notify'
import { validateCoupon } from '../coupons/coupons.service'
import type {
  CheckoutDto,
  UploadReceiptDto,
  ManualOrderDto,
  ConfirmPaymentDto,
  RejectPaymentDto,
  ShipOrderDto,
  CancelOrderDto,
  RefundOrderDto,
  AddExpenseDto,
} from './orders.schema'
import { getSettings } from '../settings/settings.service'
import { isValidCloudinaryUrl } from '../../lib/validate-url'

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ['PAYMENT_SUBMITTED', 'CANCELED'],
  PAYMENT_REJECTED: ['PAYMENT_SUBMITTED', 'CANCELED'],
  PAYMENT_SUBMITTED: ['PAYMENT_CONFIRMED', 'PAYMENT_REJECTED', 'CANCELED'],
  PAYMENT_CONFIRMED: ['PACKING', 'CANCELED'],
  PACKING: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
}

// ─── Helpers ─────────────────────────────────────────────────────────────

async function getCustomerTokens(customerId: string) {
  const [c] = await db
    .select({
      telegramId: customers.telegramId,
      expoPushToken: customers.expoPushToken,
    })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1)
  return c ?? { telegramId: null, expoPushToken: null }
}

async function getLatestRate(tx: any) {
  const [rate] = await tx
    .select()
    .from(exchangeRateSnapshots)
    .orderBy(desc(exchangeRateSnapshots.createdAt))
    .limit(1)
  if (!rate) throw { status: 500, code: 'INTERNAL_ERROR', message: "Tizimda valyuta kursi yo'q" }
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
      set: { lastSeq: sql`${dailyOrderSequences.lastSeq} + 1` },
    })
    .returning()

  return `MIRA-${yy}${mm}${dd}-${seq.lastSeq.toString().padStart(4, '0')}`
}

async function fetchOrderItemsForCheckout(
  tx: any,
  itemsInput: { productId: string; quantity: number; negotiatedPriceKrw?: number }[],
  regionCode: 'UZB' | 'KOR'
) {
  const orderItemsData: any[] = []

  for (const item of itemsInput) {
    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.id, item.productId))
      .limit(1)
    if (!product || product.deletedAt !== null)
      throw { status: 400, code: 'PRODUCT_NOT_FOUND', message: 'Mahsulot topilmadi' }
    if (!product.isActive)
      throw {
        status: 400,
        code: 'PRODUCT_INACTIVE',
        message: `Mahsulot faol emas: ${product.name}`,
      }

    const [config] = await tx
      .select()
      .from(productRegionalConfigs)
      .where(
        and(
          eq(productRegionalConfigs.productId, item.productId),
          eq(productRegionalConfigs.regionCode, regionCode)
        )
      )
      .limit(1)
    if (!config || !config.isAvailable)
      throw {
        status: 400,
        code: 'PRODUCT_NO_REGIONAL_CONFIG',
        message: `Ushbu hududda mavjud emas: ${product.name}`,
      }

    const [stockRes] = await tx
      .select({ total: sql<number>`SUM(${inventoryBatches.currentQty})`.mapWith(Number) })
      .from(inventoryBatches)
      .where(eq(inventoryBatches.productId, item.productId))
    const stockAvailable = stockRes?.total || 0
    if (item.quantity > stockAvailable)
      throw {
        status: 400,
        code: 'INSUFFICIENT_STOCK',
        message: `Omborda yetarli emas: ${product.name}`,
      }
    if (item.quantity < config.minOrderQty)
      throw {
        status: 400,
        code: 'INVALID_QUANTITY',
        message: `Minimal miqdor xatosi: ${product.name}`,
      }

    const isWholesale = item.quantity >= config.minWholesaleQty
    let unitPrice = isWholesale ? config.wholesalePrice : config.retailPrice
    if (item.negotiatedPriceKrw !== undefined) unitPrice = BigInt(item.negotiatedPriceKrw)

    orderItemsData.push({
      product,
      config,
      quantity: item.quantity,
      unitPrice,
      isWholesale,
      subtotal: unitPrice * BigInt(item.quantity),
    })
  }

  return orderItemsData
}

// ─── Core Checkout Function ─────────────────────────────────────────────

export async function createOrder(params: {
  customerId: string
  region: 'UZB' | 'KOR'
  source: 'STOREFRONT' | 'MANUAL'
  itemsInput: { productId: string; quantity: number; negotiatedPriceKrw?: number }[]
  addressId?: string
  paymentMethod: 'KOREAN_BANK' | 'UZB_BANK' | 'E9PAY'
  paymentMode?: 'RECEIPT' | 'IMMEDIATE'
  orderDiscountPct?: number
  orderDiscountFlat?: number
  boxId?: string
  couponCode?: string
  customerNote?: string
  adminNote?: string
  adminId?: string
}) {
  return await db.transaction(async (tx) => {
    // 1. Items Validation
    if (params.itemsInput.length === 0)
      throw { status: 400, code: 'CART_EMPTY', message: "Savat bo'sh" }
    const itemsData = await fetchOrderItemsForCheckout(tx, params.itemsInput, params.region)

    // 2. Customer & Address
    const [customer] = await tx
      .select()
      .from(customers)
      .where(eq(customers.id, params.customerId))
      .limit(1)
    if (!customer) throw { status: 404, code: 'NOT_FOUND', message: 'Mijoz topilmadi' }

    let deliveryRegion = params.region
    let address: any = null

    if (params.addressId) {
      const [addr] = await tx
        .select()
        .from(userAddresses)
        .where(
          and(eq(userAddresses.id, params.addressId), eq(userAddresses.customerId, params.customerId))
        )
        .limit(1)
      if (!addr) throw { status: 400, code: 'NO_DELIVERY_ADDRESS', message: 'Manzil topilmadi' }
      address = addr
      deliveryRegion = addr.regionCode
    } else if (params.paymentMode !== 'IMMEDIATE') {
      throw { status: 400, code: 'NO_DELIVERY_ADDRESS', message: 'Manzil tanlash majburiy' }
    }

    const appSettings = await getSettings()
    const rate = await getLatestRate(tx)

    // 3. Cargo Calc
    let cargoFeeKrw = 0n
    let boxWeightSnapshot: number | undefined
    let boxPriceSnapshot: bigint | undefined

    if (deliveryRegion === 'UZB') {
      if (!params.boxId)
        throw { status: 400, code: 'BOX_REQUIRED', message: 'UZB uchun quti tanlash majburiy' }
      const [box] = await tx.select().from(boxes).where(eq(boxes.id, params.boxId)).limit(1)
      if (!box || !box.isActive)
        throw { status: 400, code: 'VALIDATION_ERROR', message: 'Yaroqsiz quti' }

      const totalProductWeightGrams = itemsData.reduce(
        (acc, item) => acc + item.product.weightGrams * item.quantity,
        0
      )
      const totalWeightKg = totalProductWeightGrams / 1000 + Number(box.boxWeightKg)

      const cargoUsd = totalWeightKg * appSettings.uzbCargoUsdPerKg
      const calculatedCargoKrw = Math.round(cargoUsd * rate.usdToKrw)
      cargoFeeKrw = BigInt(Math.round(calculatedCargoKrw / 100) * 100) // round to 100

      boxWeightSnapshot = Number(box.boxWeightKg)
      boxPriceSnapshot = BigInt(Math.round(Number(box.priceUsd) * rate.usdToKrw))
    } else {
      const subtotalCheck = itemsData.reduce((acc, item) => acc + item.subtotal, 0n)
      const tiers = await tx
        .select()
        .from(korShippingTiers)
        .where(eq(korShippingTiers.isActive, true))
        .orderBy(asc(korShippingTiers.sortOrder))
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
      const [orderCountRes] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(eq(orders.customerId, params.customerId))
      const orderCount = Number(orderCountRes?.count || 0)

      const mappedItems = itemsData.map((i) => ({
        productId: i.product.id,
        categoryId: i.product.categoryId,
        brandName: i.product.brandName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
        isWholesale: i.isWholesale,
      }))
      const cartSubtotal = mappedItems.reduce((acc, item) => acc + item.subtotal, 0n)

      const couponRes = await validateCoupon({
        code: params.couponCode,
        customerId: params.customerId,
        region: deliveryRegion, // Coupon applies to delivery region
        cartItems: mappedItems,
        cartSubtotal,
        orderCount,
      })
      discountAmount = couponRes.discountAmount
      appliedCoupon = couponRes.coupon

      if (appliedCoupon.type === 'FREE_SHIPPING') {
        discountAmount = cargoFeeKrw
      }
    }

    // 6. Totals
    const subtotal = itemsData.reduce((acc, item) => acc + item.subtotal, 0n)

    let orderLevelDiscount = 0n
    if (params.orderDiscountPct && params.orderDiscountPct > 0) {
      orderLevelDiscount = (subtotal * BigInt(params.orderDiscountPct)) / 100n
    } else if (params.orderDiscountFlat && params.orderDiscountFlat > 0) {
      orderLevelDiscount = BigInt(params.orderDiscountFlat)
      if (orderLevelDiscount > subtotal) {
        throw {
          status: 400,
          code: 'INVALID_DISCOUNT',
          message: "Chegirma summadan ko'p bo'lishi mumkin emas",
        }
      }
    }

    const totalDiscount = discountAmount + orderLevelDiscount
    let totalAmount = subtotal - totalDiscount + cargoFeeKrw
    if (totalAmount < 0n) totalAmount = 0n

    // 7. Order Number
    const orderNumber = await getOrderSequence(tx)

    // 8. Create Order
    const isImmediate = params.paymentMode === 'IMMEDIATE'
    const paymentDeadline = isImmediate
      ? null
      : new Date(Date.now() + appSettings.paymentTimeoutMinutes * 60000)

    const [newOrder] = await tx
      .insert(orders)
      .values({
        orderNumber,
        customerId: params.customerId,
        profileRegion: params.region,
        deliveryRegion,
        status: isImmediate ? 'PAYMENT_CONFIRMED' : 'PENDING_PAYMENT',
        paymentMode: params.paymentMode ?? 'RECEIPT',
        orderSource: params.source,
        subtotal,
        discountAmount: totalDiscount,
        orderDiscountPct: params.orderDiscountPct ?? null,
        orderDiscountFlat: orderLevelDiscount > 0n ? orderLevelDiscount : null,
        cargoFee: cargoFeeKrw,
        totalAmount,
        currency: 'KRW',
        totalWeightGrams: itemsData.reduce(
          (acc, item) => acc + item.product.weightGrams * item.quantity,
          0
        ),
        boxId: params.boxId,
        boxWeightSnapshot: boxWeightSnapshot?.toString(),
        boxPriceSnapshot,
        couponId: appliedCoupon?.id,
        couponCode: appliedCoupon?.code,
        rateSnapshotId: rate.id,
        paymentMethod: params.paymentMethod,
        paymentDeadline,
        paymentConfirmedAt: isImmediate ? new Date() : null,
        paymentConfirmedBy: isImmediate ? params.adminId : null,
        deliveryFullName: address?.recipientName ?? `${customer.firstName} ${customer.lastName || ''}`.trim(),
        deliveryPhone: address?.phone ?? customer.phone,
        deliveryAddressLine1: address
          ? address.regionCode === 'UZB'
            ? `${address.uzbRegion}, ${address.uzbCity}`
            : address.korRoadAddress
          : "Do'kondan olib ketish",
        deliveryAddressLine2: address
          ? address.regionCode === 'UZB'
            ? `${address.uzbDistrict}, ${address.uzbStreet}`
            : `${address.korDetail} ${address.korBuilding}`
          : null,
        deliveryCity: address ? (address.regionCode === 'UZB' ? address.uzbCity : null) : null,
        deliveryPostalCode: address ? (address.regionCode === 'KOR' ? address.korPostalCode : null) : null,
        customerNote: params.customerNote,
        adminNote: params.adminNote,
        createdBy: params.adminId,
      })
      .returning()

    // 9 & 10. Items and Stock Reservations/Deductions
    for (const item of itemsData) {
      const [orderItem] = await tx
        .insert(orderItems)
        .values({
          orderId: newOrder.id,
          productId: item.product.id,
          quantity: item.quantity,
          unitPriceSnapshot: item.unitPrice,
          subtotalSnapshot: item.subtotal,
          negotiatedPriceKrw: item.product.negotiatedPriceKrw
            ? BigInt(item.product.negotiatedPriceKrw)
            : null,
          isScanned: isImmediate,
          scannedAt: isImmediate ? new Date() : null,
          scannedBy: isImmediate ? params.adminId : null,
        })
        .returning()

      if (isImmediate) {
        // Direct stock deduction (FIFO)
        let qtyToDeduct = item.quantity
        const batches = await tx
          .select()
          .from(inventoryBatches)
          .where(
            and(
              eq(inventoryBatches.productId, item.product.id),
              sql`${inventoryBatches.currentQty} > 0`
            )
          )
          .orderBy(asc(inventoryBatches.receivedAt))

        for (const batch of batches) {
          if (qtyToDeduct <= 0) break
          const take = Math.min(batch.currentQty, qtyToDeduct)

          await tx
            .update(inventoryBatches)
            .set({ currentQty: batch.currentQty - take, updatedAt: new Date() })
            .where(eq(inventoryBatches.id, batch.id))

          await tx.insert(stockMovements).values({
            batchId: batch.id,
            productId: item.product.id,
            orderId: newOrder.id,
            movementType: 'DEDUCTED',
            quantityDelta: -take,
            qtyBefore: batch.currentQty,
            qtyAfter: batch.currentQty - take,
            performedBy: params.adminId,
            note: `Manual Order ${orderNumber} (Immediate)`,
          })

          // Update order item with batch info and cost (for first batch encountered)
          await tx
            .update(orderItems)
            .set({
              batchId: batch.id,
              costAtSaleKrw: batch.costPrice,
            })
            .where(eq(orderItems.id, orderItem.id))

          qtyToDeduct -= take
        }
      } else {
        // Reserve stock (FIFO)
        let qtyToReserve = item.quantity
        const batches = await tx
          .select()
          .from(inventoryBatches)
          .where(
            and(
              eq(inventoryBatches.productId, item.product.id),
              sql`${inventoryBatches.currentQty} > 0`
            )
          )
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
            expiresAt: paymentDeadline!,
          })
          qtyToReserve -= take
        }
      }
    }

    // 11. Apply Coupon
    if (appliedCoupon) {
      await tx.insert(couponRedemptions).values({
        couponId: appliedCoupon.id,
        customerId: params.customerId,
        orderId: newOrder.id,
        discountAmount,
      })
      await tx
        .update(coupons)
        .set({ usageCount: appliedCoupon.usageCount + 1 })
        .where(eq(coupons.id, appliedCoupon.id))
      // Update userCoupons if exists
      const [uc] = await tx
        .select()
        .from(userCoupons)
        .where(
          and(
            eq(userCoupons.couponId, appliedCoupon.id),
            eq(userCoupons.customerId, params.customerId)
          )
        )
        .limit(1)
      if (uc)
        await tx
          .update(userCoupons)
          .set({ isUsed: true, usedAt: new Date(), orderId: newOrder.id })
          .where(eq(userCoupons.id, uc.id))
    }

    // 12. Clear Cart if storefront
    if (params.source === 'STOREFRONT') {
      const [cart] = await tx
        .select()
        .from(carts)
        .where(eq(carts.customerId, params.customerId))
        .limit(1)
      if (cart) await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id))
    }

    // 13. History
    await tx.insert(orderStatusHistory).values({
      orderId: newOrder.id,
      fromStatus: null,
      toStatus: isImmediate ? 'PAYMENT_CONFIRMED' : 'PENDING_PAYMENT',
      changedBy: params.adminId,
    })

    // 14. Analytics for Immediate Payment
    if (isImmediate) {
      const today = new Date().toISOString().split('T')[0]
      const cargoShare = cargoFeeKrw / BigInt(itemsData.length || 1)
      const discountShare = totalDiscount / BigInt(itemsData.length || 1)

      for (const item of itemsData) {
        // We'll use 0 for COGS since it's updated at PACKING, 
        // but for IMMEDIATE we already updated batchId/costAtSaleKrw in step 10
        const [oi] = await tx.select().from(orderItems).where(and(eq(orderItems.orderId, newOrder.id), eq(orderItems.productId, item.product.id))).limit(1)
        const cogs = (oi?.costAtSaleKrw || 0n) * BigInt(item.quantity)

        await tx
          .insert(dailySalesSummary)
          .values({
            date: today,
            regionCode: newOrder.deliveryRegion,
            productId: item.product.id,
            unitsSold: item.quantity,
            revenueKrw: item.subtotal,
            cogsKrw: cogs,
            cargoKrw: cargoShare,
            couponDiscountKrw: discountShare,
            orderCount: 1,
          })
          .onConflictDoUpdate({
            target: [
              dailySalesSummary.date,
              dailySalesSummary.regionCode,
              dailySalesSummary.productId,
            ],
            set: {
              unitsSold: sql`${dailySalesSummary.unitsSold} + ${item.quantity}`,
              revenueKrw: sql`${dailySalesSummary.revenueKrw} + ${item.subtotal}`,
              cogsKrw: sql`${dailySalesSummary.cogsKrw} + ${cogs}`,
              cargoKrw: sql`${dailySalesSummary.cargoKrw} + ${cargoShare}`,
              couponDiscountKrw: sql`${dailySalesSummary.couponDiscountKrw} + ${discountShare}`,
              orderCount: sql`${dailySalesSummary.orderCount} + 1` as any,
            },
          })
      }
    }

    // 15. Emit & Notify
    emit.orderNew({
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      customerId: params.customerId,
      customerName: `${customer.firstName} ${customer.lastName || ''}`.trim(),
      region: newOrder.deliveryRegion as any,
      totalAmount: Number(newOrder.totalAmount),
      createdAt: newOrder.createdAt.toISOString(),
    })

    if (!isImmediate) {
      await notifyNewOrder({
        orderNumber: newOrder.orderNumber,
        customerName: `${customer.firstName} ${customer.lastName || ''}`.trim(),
        customerPhone: customer.phone,
        region: newOrder.deliveryRegion,
        totalAmount: Number(newOrder.totalAmount),
        itemCount: itemsData.reduce((acc, i) => acc + i.quantity, 0),
      })
    }

    const tokens = await getCustomerTokens(params.customerId)
    if (isImmediate) {
      await notifyCustomerFull({
        customerId: params.customerId,
        telegramId: tokens.telegramId,
        expoPushToken: tokens.expoPushToken,
        type: 'PAYMENT_CONFIRMED',
        channel: 'BOTH',
        title: 'Buyurtma tasdiqlandi! ✅',
        body: `#${orderNumber} buyurtmangiz tayyorlanmoqda`,
        telegramMessage:
          `✅ <b>Buyurtmangiz qabul qilindi va to'landi!</b>\n\n` +
          `📦 <b>#${orderNumber}</b>\n` +
          `💰 ₩${Number(totalAmount).toLocaleString()}\n` +
          `Buyurtmangiz tayyorlanmoqda...`,
        data: { orderId: newOrder.id, type: 'PAYMENT_CONFIRMED' },
      })
    } else {
      await notifyCustomerFull({
        customerId: params.customerId,
        telegramId: tokens.telegramId,
        expoPushToken: tokens.expoPushToken,
        type: 'ORDER_STATUS',
        channel: 'BOTH',
        title: 'Buyurtma qabul qilindi! 🛍',
        body: `#${orderNumber} — To'lovni ${appSettings.paymentTimeoutMinutes} daqiqa ichida yuklang`,
        telegramMessage:
          `✅ <b>Buyurtmangiz qabul qilindi!</b>\n\n` +
          `📦 <b>#${orderNumber}</b>\n` +
          `💰 ₩${Number(totalAmount).toLocaleString()}\n` +
          `⏰ To'lovni <b>${appSettings.paymentTimeoutMinutes} daqiqa</b> ichida yuklang`,
        data: { orderId: newOrder.id, type: 'ORDER_CREATED' },
      })
    }

    return {
      order: {
        id: newOrder.id,
        orderNumber: newOrder.orderNumber,
        status: newOrder.status,
        totalAmount: Number(newOrder.totalAmount),
        paymentDeadline: newOrder.paymentDeadline,
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
        uzbBankNumber: appSettings.uzbBankNumber,
      },
    }
  })
}

// ─── Customer Endpoints ──────────────────────────────────────────────────

export async function checkoutCart(customerId: string, region: 'UZB' | 'KOR', dto: CheckoutDto) {
  const cartData = await db
    .select()
    .from(cartItems)
    .innerJoin(carts, eq(cartItems.cartId, carts.id))
    .where(eq(carts.customerId, customerId))
  const itemsInput = cartData.map((c) => ({
    productId: c.cart_items.productId,
    quantity: c.cart_items.quantity,
  }))

  return createOrder({
    customerId,
    region,
    source: 'STOREFRONT',
    itemsInput,
    ...dto,
  })
}

export async function uploadReceipt(orderId: string, customerId: string, dto: UploadReceiptDto) {
  if (!isValidCloudinaryUrl(dto.receiptUrl)) {
    throw { status: 400, code: 'INVALID_URL', message: 'Faqat Cloudinary URL qabul qilinadi' }
  }

  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }
    if (order.customerId !== customerId)
      throw { status: 403, code: 'ORDER_UNAUTHORIZED', message: 'Ruxsat etilmagan' }
    if (!['PENDING_PAYMENT', 'PAYMENT_REJECTED'].includes(order.status))
      throw { status: 400, code: 'INVALID_STATUS_TRANSITION', message: "Noto'g'ri holat" }
    if (order.paymentDeadline && new Date() > order.paymentDeadline)
      throw { status: 400, code: 'PAYMENT_DEADLINE_PASSED', message: "To'lov muddati tugagan" }

    const updates: any = {
      paymentReceiptUrl: dto.receiptUrl,
      paymentAmount: BigInt(dto.paymentAmount),
      paymentCurrency: dto.paymentCurrency,
      paymentSubmittedAt: new Date(),
      status: 'PAYMENT_SUBMITTED',
      updatedAt: new Date(),
    }

    if (dto.paymentCurrency === 'UZS') {
      const [rate] = await tx
        .select()
        .from(exchangeRateSnapshots)
        .where(eq(exchangeRateSnapshots.id, order.rateSnapshotId!))
        .limit(1)
      if (rate) updates.paymentAmountUzs = BigInt(dto.paymentAmount) // Store actual UZS
    }

    const [updated] = await tx.update(orders).set(updates).where(eq(orders.id, orderId)).returning()

    await tx.insert(orderStatusHistory).values({
      orderId,
      fromStatus: order.status,
      toStatus: 'PAYMENT_SUBMITTED',
    })

    const [customer] = await tx
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1)

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
      uploadedAt: new Date().toISOString(),
    })

    await notifyPaymentSubmitted({
      orderNumber: order.orderNumber,
      customerName: customer.firstName,
      paymentMethod: order.paymentMethod || 'UNKNOWN',
      paymentAmount: `${dto.paymentAmount} ${dto.paymentCurrency}`,
    })

    const tokens = await getCustomerTokens(customerId)
    await notifyCustomerFull({
      customerId: customerId,
      telegramId: tokens.telegramId,
      expoPushToken: tokens.expoPushToken,
      type: 'ORDER_STATUS',
      channel: 'BOTH',
      title: "To'lov yuborildi! 💳",
      body: `#${order.orderNumber} to'lovi qabul qilindi, tez orada tasdiqlanadi.`,
      telegramMessage: `✅ <b>To'lov kvitansiyasi yuklandi!</b>\n📦 #${order.orderNumber}\nTez orada adminlarimiz tasdiqlashadi.`,
      data: { orderId, type: 'PAYMENT_SUBMITTED' },
    })

    return updated
  })
}

export async function getCustomerOrders(
  customerId: string,
  query: { page?: number; limit?: number; status?: string; search?: string }
) {
  const page = query.page || 1
  const limit = query.limit || 20
  const offset = (page - 1) * limit

  let where = eq(orders.customerId, customerId)
  if (query.status) where = and(where, eq(orders.status, query.status as any)) as any
  if (query.search) {
    where = and(where, ilike(orders.orderNumber, `%${escapeLikeQuery(query.search)}%`)) as any
  }

  const items = await db
    .select()
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset)
  const [countRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(where)
  const total = Number(countRes.count)

  const formattedItems = await Promise.all(
    items.map(async (o) => {
      const [itemsCount] = await db
        .select({ count: sql<number>`SUM(${orderItems.quantity})` })
        .from(orderItems)
        .where(eq(orderItems.orderId, o.id))
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        currency: o.currency,
        itemCount: Number(itemsCount?.count || 0),
        createdAt: o.createdAt,
        paymentDeadline: o.paymentDeadline,
      }
    })
  )

  return {
    items: formattedItems,
    meta: { page, limit, total, hasNext: offset + limit < total, hasPrev: page > 1 },
  }
}

export async function getCustomerOrderDetail(orderId: string, customerId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
  if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }
  if (order.customerId !== customerId)
    throw { status: 403, code: 'ORDER_UNAUTHORIZED', message: 'Ruxsat etilmagan' }

  const items = await db
    .select({
      id: orderItems.id,
      quantity: orderItems.quantity,
      unitPriceSnapshot: orderItems.unitPriceSnapshot,
      subtotalSnapshot: orderItems.subtotalSnapshot,
      product: { id: products.id, name: products.name, imageUrls: products.imageUrls },
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId))

  const history = await db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, orderId))
    .orderBy(asc(orderStatusHistory.createdAt))

  return { ...order, items, statusHistory: history }
}

export async function cancelOrderByCustomer(
  orderId: string,
  customerId: string,
  reason?: string
): Promise<void> {
  await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.customerId, customerId)))
      .limit(1)

    if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }

    if (!['PENDING_PAYMENT', 'PAYMENT_REJECTED'].includes(order.status)) {
      throw {
        status: 400,
        code: 'ORDER_CANCEL_NOT_ALLOWED',
        message: "Ushbu buyurtmani bekor qilib bo'lmaydi",
      }
    }

    // Release stock reservations
    await tx
      .update(stockReservations)
      .set({ status: 'RELEASED' })
      .where(and(eq(stockReservations.orderId, orderId), eq(stockReservations.status, 'ACTIVE')))

    await tx
      .update(orders)
      .set({
        status: 'CANCELED',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))

    await tx.insert(orderStatusHistory).values({
      orderId,
      fromStatus: order.status,
      toStatus: 'CANCELED',
      note: reason ?? 'Mijoz tomonidan bekor qilindi',
    })

    // Notify admin
    await sendAdminAlert(
      `❌ <b>Mijoz buyurtmani bekor qildi</b>\n\n` +
        `📦 <b>#${order.orderNumber}</b>\n` +
        `💬 Sabab: ${reason ?? 'Sabab ko\'rsatilmagan'}`
    )

    const tokens = await getCustomerTokens(customerId)
    await notifyCustomerFull({
      customerId: customerId,
      telegramId: tokens.telegramId,
      expoPushToken: tokens.expoPushToken,
      type: 'ORDER_STATUS',
      channel: 'BOTH',
      title: 'Buyurtma bekor qilindi ❌',
      body: `#${order.orderNumber} bekor qilindi`,
      telegramMessage: `❌ <b>Buyurtmangiz bekor qilindi</b>\n📦 #${order.orderNumber}`,
      data: { orderId: order.id, type: 'CANCELED' },
    })
  })
}

export async function requestRefundByCustomer(
  orderId: string,
  customerId: string,
  reason: string
): Promise<void> {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.customerId, customerId)))
    .limit(1)

  if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }

  if (order.status !== 'DELIVERED') {
    throw {
      status: 400,
      code: 'ORDER_REFUND_NOT_ALLOWED',
      message: 'Faqat yetkazilgan buyurtmani qaytarish mumkin',
    }
  }

  if (order.refundRequestedAt) {
    throw {
      status: 400,
      code: 'REFUND_ALREADY_REQUESTED',
      message: "Qaytarish so'rovi allaqachon yuborilgan",
    }
  }

  await db
    .update(orders)
    .set({
      refundRequestedAt: new Date(),
      refundNote: reason,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId))

  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1)

  await sendAdminAlert(
    `🔄 <b>Qaytarish so'rovi!</b>\n\n` +
      `📦 <b>#${order.orderNumber}</b>\n` +
      `💬 Sabab: ${reason}\n` +
      `📞 Mijoz: ${customer?.phone || 'Noma\'lum'}`
  )
}

// ─── Admin Endpoints ─────────────────────────────────────────────────────

export async function adminGetOrders(query: {
  page?: number
  limit?: number
  status?: string
  region?: string
  search?: string
}) {
  const page = query.page || 1
  const limit = query.limit || 20
  const offset = (page - 1) * limit

  let where: any = sql`1=1`
  if (query.status) where = and(where, eq(orders.status, query.status as any))
  if (query.region) where = and(where, eq(orders.deliveryRegion, query.region))
  if (query.search) {
    where = and(
      where,
      or(
        ilike(orders.orderNumber, `%${escapeLikeQuery(query.search)}%`),
        ilike(orders.deliveryPhone, `%${escapeLikeQuery(query.search)}%`)
      )
    )
  }

  const itemsQuery = await db
    .select({
      order: orders,
      customerName: customers.firstName,
      customerPhone: customers.phone,
      itemCount: sql<number>`(SELECT SUM(quantity) FROM order_items WHERE order_id = orders.id)`,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset)

  const [countRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(where)
  const total = Number(countRes.count)

  const items = itemsQuery.map((row) => ({
    orderNumber: row.order.orderNumber,
    status: row.order.status,
    region: row.order.deliveryRegion,
    totalAmount: Number(row.order.totalAmount),
    customerPhone: row.customerPhone,
    customerName: row.customerName,
    itemCount: Number(row.itemCount || 0),
    createdAt: row.order.createdAt,
    paymentDeadline: row.order.paymentDeadline,
  }))

  return { items, meta: { page, limit, total, hasNext: offset + limit < total, hasPrev: page > 1 } }
}

export async function confirmPayment(orderId: string, adminId: string, dto: ConfirmPaymentDto) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }
    if (order.status !== 'PAYMENT_SUBMITTED')
      throw {
        status: 400,
        code: 'INVALID_STATUS_TRANSITION',
        message: 'Faqat PAYMENT_SUBMITTED holatida tasdiqlash mumkin',
      }

    const [updated] = await tx
      .update(orders)
      .set({
        status: 'PAYMENT_CONFIRMED',
        paymentConfirmedBy: adminId,
        paymentConfirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning()

    await tx.insert(orderStatusHistory).values({
      orderId,
      fromStatus: 'PAYMENT_SUBMITTED',
      toStatus: 'PAYMENT_CONFIRMED',
      changedBy: adminId,
      note: dto.note,
    })

    if (order.discountAmount > 0n) {
      await tx.insert(orderExpenses).values({
        orderId,
        type: 'COUPON_DISCOUNT',
        amountKrw: order.discountAmount,
        note: order.couponCode,
        createdBy: adminId,
        isAuto: true,
      })
    }

    // Analytics — Revenue recognition on cash basis (PAYMENT_CONFIRMED)
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId))
    const today = new Date().toISOString().split('T')[0]
    const cargoShare = order.cargoFee / BigInt(items.length || 1)
    const discountShare = order.discountAmount / BigInt(items.length || 1)

    for (const item of items) {
      const cogs = (item.costAtSaleKrw || 0n) * BigInt(item.quantity)

      await tx
        .insert(dailySalesSummary)
        .values({
          date: today,
          regionCode: order.deliveryRegion,
          productId: item.productId,
          unitsSold: item.quantity,
          revenueKrw: item.subtotalSnapshot,
          cogsKrw: cogs,
          cargoKrw: cargoShare,
          couponDiscountKrw: discountShare,
          orderCount: 1,
        })
        .onConflictDoUpdate({
          target: [
            dailySalesSummary.date,
            dailySalesSummary.regionCode,
            dailySalesSummary.productId,
          ],
          set: {
            unitsSold: sql`${dailySalesSummary.unitsSold} + ${item.quantity}`,
            revenueKrw: sql`${dailySalesSummary.revenueKrw} + ${item.subtotalSnapshot}`,
            cogsKrw: sql`${dailySalesSummary.cogsKrw} + ${cogs}`,
            cargoKrw: sql`${dailySalesSummary.cargoKrw} + ${cargoShare}`,
            couponDiscountKrw: sql`${dailySalesSummary.couponDiscountKrw} + ${discountShare}`,
            orderCount: sql`${dailySalesSummary.orderCount} + 1` as any,
          },
        })
    }

    const tokens = await getCustomerTokens(order.customerId)
    await notifyCustomerFull({
      customerId: order.customerId,
      telegramId: tokens.telegramId,
      expoPushToken: tokens.expoPushToken,
      type: 'PAYMENT_CONFIRMED',
      channel: 'BOTH',
      title: "To'lov tasdiqlandi! ✅",
      body: `#${order.orderNumber} buyurtmangiz tayyorlanmoqda`,
      telegramMessage:
        `💚 <b>To'lovingiz tasdiqlandi!</b>\n\n` +
        `📦 <b>#${order.orderNumber}</b>\n` +
        `Buyurtmangiz tayyorlanmoqda...`,
      data: { orderId: order.id, type: 'PAYMENT_CONFIRMED' },
    })

    emit.paymentConfirmed({
      orderId,
      orderNumber: order.orderNumber,
      confirmedBy: adminId,
      confirmedAt: new Date().toISOString(),
    })

    return updated
  })
}

export async function rejectPayment(orderId: string, adminId: string, dto: RejectPaymentDto) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }
    if (order.status !== 'PAYMENT_SUBMITTED')
      throw {
        status: 400,
        code: 'INVALID_STATUS_TRANSITION',
        message: 'Faqat PAYMENT_SUBMITTED holatida rad etish mumkin',
      }

    const appSettings = await getSettings()
    const newDeadline = new Date(Date.now() + appSettings.paymentTimeoutMinutes * 60000)

    const [updated] = await tx
      .update(orders)
      .set({
        status: 'PAYMENT_REJECTED',
        paymentRejectedReason: dto.reason,
        paymentRejectedAt: new Date(),
        paymentDeadline: newDeadline,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning()

    await tx
      .update(stockReservations)
      .set({ expiresAt: newDeadline })
      .where(eq(stockReservations.orderId, orderId))

    await tx.insert(orderStatusHistory).values({
      orderId,
      fromStatus: 'PAYMENT_SUBMITTED',
      toStatus: 'PAYMENT_REJECTED',
      changedBy: adminId,
      note: dto.reason,
    })

    const tokens = await getCustomerTokens(order.customerId)
    await notifyCustomerFull({
      customerId: order.customerId,
      telegramId: tokens.telegramId,
      expoPushToken: tokens.expoPushToken,
      type: 'PAYMENT_REJECTED',
      channel: 'BOTH',
      title: "To'lov rad etildi ❌",
      body: `Sabab: ${dto.reason}. Qayta yuklang.`,
      telegramMessage:
        `❌ <b>To'lov kvitansiyasi rad etildi</b>\n\n` +
        `📦 <b>#${order.orderNumber}</b>\n` +
        `💬 Sabab: ${dto.reason}\n` +
        `🔄 Iltimos, qayta yuklang`,
      data: { orderId: order.id, type: 'PAYMENT_REJECTED' },
    })

    emit.paymentRejected({
      orderId,
      orderNumber: order.orderNumber,
      rejectedBy: adminId,
      reason: dto.reason,
      rejectedAt: new Date().toISOString(),
    })

    return updated
  })
}

export async function startPacking(orderId: string, adminId: string) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }
    if (order.status !== 'PAYMENT_CONFIRMED')
      throw {
        status: 400,
        code: 'INVALID_STATUS_TRANSITION',
        message: 'Faqat PAYMENT_CONFIRMED holatida qadoqlashni boshlash mumkin',
      }

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId))

    for (const item of items) {
      const reservations = await tx
        .select()
        .from(stockReservations)
        .where(
          and(eq(stockReservations.orderItemId, item.id), eq(stockReservations.status, 'ACTIVE'))
        )

      let totalCostKrw = 0n
      let totalQty = 0

      for (const res of reservations) {
        const [batch] = await tx
          .select()
          .from(inventoryBatches)
          .where(eq(inventoryBatches.id, res.batchId))
          .limit(1)
        if (!batch) continue

        // Deduct stock
        await tx
          .update(inventoryBatches)
          .set({ currentQty: batch.currentQty - res.quantity })
          .where(eq(inventoryBatches.id, batch.id))

        await tx.insert(stockMovements).values({
          batchId: batch.id,
          productId: item.productId,
          orderId: order.id,
          movementType: 'DEDUCTED',
          quantityDelta: -res.quantity,
          qtyBefore: batch.currentQty,
          qtyAfter: batch.currentQty - res.quantity,
          performedBy: adminId,
          note: `Order ${order.orderNumber}`,
        })

        await tx
          .update(stockReservations)
          .set({ status: 'CONVERTED' })
          .where(eq(stockReservations.id, res.id))

        totalCostKrw += batch.costPrice * BigInt(res.quantity)
        totalQty += res.quantity

        // Update item with first batch found (simplified)
        await tx.update(orderItems).set({ batchId: batch.id }).where(eq(orderItems.id, item.id))
      }

      if (totalQty > 0) {
        const avgCost = totalCostKrw / BigInt(totalQty)
        await tx
          .update(orderItems)
          .set({ costAtSaleKrw: avgCost })
          .where(eq(orderItems.id, item.id))

        // Update COGS in analytics (since revenue was recognized at PAYMENT_CONFIRMED)
        const confirmedDate = order.paymentConfirmedAt!.toISOString().split('T')[0]
        await tx
          .update(dailySalesSummary)
          .set({
            cogsKrw: sql`${dailySalesSummary.cogsKrw} + ${avgCost * BigInt(item.quantity)}`,
          })
          .where(
            and(
              eq(dailySalesSummary.date, confirmedDate),
              eq(dailySalesSummary.regionCode, order.deliveryRegion),
              eq(dailySalesSummary.productId, item.productId)
            )
          )
      }
    }

    const [updated] = await tx
      .update(orders)
      .set({ status: 'PACKING', packedBy: adminId, packedAt: new Date(), updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning()
    await tx
      .insert(orderStatusHistory)
      .values({ orderId, fromStatus: 'PAYMENT_CONFIRMED', toStatus: 'PACKING', changedBy: adminId })
    emit.orderStatusChanged({
      orderId,
      orderNumber: order.orderNumber,
      fromStatus: 'PAYMENT_CONFIRMED',
      toStatus: 'PACKING',
      changedBy: adminId,
      note: null,
      changedAt: new Date().toISOString(),
    })

    const tokens = await getCustomerTokens(order.customerId)
    await notifyCustomerFull({
      customerId: order.customerId,
      telegramId: tokens.telegramId,
      expoPushToken: tokens.expoPushToken,
      type: 'ORDER_STATUS',
      channel: 'BOTH',
      title: 'Buyurtma tayyorlanmoqda 📦',
      body: `#${order.orderNumber} jo'natishga tayyorlanmoqda`,
      telegramMessage:
        `📦 <b>Buyurtmangiz tayyorlanmoqda!</b>\n\n` +
        `#${order.orderNumber}\n` +
        `Tez orada jo'natiladi...`,
      data: { orderId: order.id, type: 'PACKING' },
    })

    return updated
  })
}

export async function shipOrder(orderId: string, adminId: string, dto: ShipOrderDto) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }
    if (order.status !== 'PACKING')
      throw {
        status: 400,
        code: 'INVALID_STATUS_TRANSITION',
        message: "Faqat PACKING holatida jo'natish mumkin",
      }

    const [updated] = await tx
      .update(orders)
      .set({
        status: 'SHIPPED',
        trackingNumber: dto.trackingNumber,
        shippedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning()

    if (order.cargoFee > 0n) {
      await tx
        .insert(orderExpenses)
        .values({
          orderId,
          type: 'CARGO_COST',
          amountKrw: order.cargoFee,
          createdBy: adminId,
          isAuto: true,
        })
    }
    if (order.deliveryCoveredBy === 'BUSINESS') {
      const amt = order.deliveryFeeActual ?? order.deliveryFeeCharged
      if (amt > 0n)
        await tx
          .insert(orderExpenses)
          .values({
            orderId,
            type: 'DELIVERY_ABSORBED',
            amountKrw: amt,
            createdBy: adminId,
            isAuto: true,
          })
    }

    await tx
      .insert(orderStatusHistory)
      .values({ orderId, fromStatus: 'PACKING', toStatus: 'SHIPPED', changedBy: adminId })
    emit.orderStatusChanged({
      orderId,
      orderNumber: order.orderNumber,
      fromStatus: 'PACKING',
      toStatus: 'SHIPPED',
      changedBy: adminId,
      note: null,
      changedAt: new Date().toISOString(),
    })

    const tokens = await getCustomerTokens(order.customerId)
    await notifyCustomerFull({
      customerId: order.customerId,
      telegramId: tokens.telegramId,
      expoPushToken: tokens.expoPushToken,
      type: 'SHIPPED',
      channel: 'BOTH',
      title: "Buyurtma jo'natildi! 🚀",
      body: dto.trackingNumber
        ? `#${order.orderNumber} — Kuzatuv: ${dto.trackingNumber}`
        : `#${order.orderNumber} yo'lda`,
      telegramMessage:
        `🚀 <b>Buyurtmangiz jo'natildi!</b>\n\n` +
        `📦 <b>#${order.orderNumber}</b>\n` +
        (dto.trackingNumber ? `🔍 Kuzatuv raqami: <code>${dto.trackingNumber}</code>` : ''),
      data: { orderId: order.id, type: 'SHIPPED' },
    })

    return updated
  })
}

export async function deliverOrder(orderId: string, adminId: string) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }
    if (order.status !== 'SHIPPED')
      throw {
        status: 400,
        code: 'INVALID_STATUS_TRANSITION',
        message: 'Faqat SHIPPED holatida yetkazib berish mumkin',
      }

    const [updated] = await tx
      .update(orders)
      .set({ status: 'DELIVERED', deliveredAt: new Date(), updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning()
    await tx
      .insert(orderStatusHistory)
      .values({ orderId, fromStatus: 'SHIPPED', toStatus: 'DELIVERED', changedBy: adminId })

    emit.orderStatusChanged({
      orderId,
      orderNumber: order.orderNumber,
      fromStatus: 'SHIPPED',
      toStatus: 'DELIVERED',
      changedBy: adminId,
      note: null,
      changedAt: new Date().toISOString(),
    })

    const tokens = await getCustomerTokens(order.customerId)
    await notifyCustomerFull({
      customerId: order.customerId,
      telegramId: tokens.telegramId,
      expoPushToken: tokens.expoPushToken,
      type: 'DELIVERED',
      channel: 'BOTH',
      title: 'Buyurtma yetib keldi! 🎉',
      body: `#${order.orderNumber} muvaffaqiyatli yetkazildi`,
      telegramMessage:
        `🎉 <b>Buyurtmangiz yetib keldi!</b>\n\n` +
        `📦 <b>#${order.orderNumber}</b>\n` +
        `Xaridingizdan mamnun bo'lishingizni umid qilamiz 🌸`,
      data: { orderId: order.id, type: 'DELIVERED' },
    })

    return updated
  })
}

export async function cancelOrder(orderId: string, adminId: string | null, reason?: string) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }
    if (!['PENDING_PAYMENT', 'PAYMENT_REJECTED', 'PAYMENT_SUBMITTED'].includes(order.status)) {
      throw {
        status: 400,
        code: 'ORDER_ALREADY_CANCELED',
        message: "Ushbu bosqichda bekor qilib bo'lmaydi. Refund qiling.",
      }
    }

    const [updated] = await tx
      .update(orders)
      .set({ status: 'CANCELED', updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning()
    await tx
      .insert(orderStatusHistory)
      .values({
        orderId,
        fromStatus: order.status,
        toStatus: 'CANCELED',
        changedBy: adminId,
        note: reason,
      })

    // Release stock
    const reservations = await tx
      .select()
      .from(stockReservations)
      .where(and(eq(stockReservations.orderId, orderId), eq(stockReservations.status, 'ACTIVE')))
    for (const res of reservations) {
      await tx
        .update(stockReservations)
        .set({ status: 'RELEASED' })
        .where(eq(stockReservations.id, res.id))
      await tx.insert(stockMovements).values({
        batchId: res.batchId,
        productId: res.productId,
        orderId: order.id,
        movementType: 'RESERVATION_RELEASED',
        quantityDelta: 0,
        qtyBefore: 0,
        qtyAfter: 0,
        performedBy: adminId,
        note: 'Bekor qilingan buyurtma',
      })
    }

    emit.orderStatusChanged({
      orderId,
      orderNumber: order.orderNumber,
      fromStatus: order.status,
      toStatus: 'CANCELED',
      changedBy: adminId,
      note: reason ?? null,
      changedAt: new Date().toISOString(),
    })

    const tokens = await getCustomerTokens(order.customerId)
    await notifyCustomerFull({
      customerId: order.customerId,
      telegramId: tokens.telegramId,
      expoPushToken: tokens.expoPushToken,
      type: 'ORDER_STATUS',
      channel: 'BOTH',
      title: 'Buyurtma bekor qilindi ❌',
      body: `#${order.orderNumber} bekor qilindi`,
      telegramMessage:
        `❌ <b>Buyurtma bekor qilindi</b>\n\n` +
        `📦 <b>#${order.orderNumber}</b>` +
        (reason ? `\n💬 ${reason}` : ''),
      data: { orderId: order.id, type: 'CANCELED' },
    })

    return updated
  })
}

export async function refundOrder(orderId: string, adminId: string, dto: RefundOrderDto) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }
    if (order.status !== 'DELIVERED')
      throw {
        status: 400,
        code: 'INVALID_STATUS_TRANSITION',
        message: 'Faqat DELIVERED holatida refund qilish mumkin',
      }

    const [updated] = await tx
      .update(orders)
      .set({
        status: 'REFUNDED',
        refundAmount: BigInt(dto.refundAmount),
        refundNote: dto.refundNote,
        refundedAt: new Date(),
        refundedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning()

    await tx
      .insert(orderStatusHistory)
      .values({
        orderId,
        fromStatus: 'DELIVERED',
        toStatus: 'REFUNDED',
        changedBy: adminId,
        note: dto.refundNote,
      })

    // Stock Return & Analytics Reverse
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId))
    const confirmedDate = order.paymentConfirmedAt!.toISOString().split('T')[0]

    for (const item of items) {
      // 1. Stock Return
      if (item.batchId) {
        const [batch] = await tx
          .select()
          .from(inventoryBatches)
          .where(eq(inventoryBatches.id, item.batchId))
          .limit(1)
        if (batch) {
          const newQty = batch.currentQty + item.quantity
          await tx
            .update(inventoryBatches)
            .set({ currentQty: newQty })
            .where(eq(inventoryBatches.id, item.batchId))

          await tx.insert(stockMovements).values({
            batchId: item.batchId,
            productId: item.productId,
            orderId: order.id,
            movementType: 'RETURNED',
            quantityDelta: item.quantity,
            qtyBefore: batch.currentQty,
            qtyAfter: newQty,
            performedBy: adminId,
            note: `Refund: ${order.orderNumber}`,
          })
        }
      }

      // 2. Analytics Reverse
      const cogs = (item.costAtSaleKrw || 0n) * BigInt(item.quantity)

      await tx
        .update(dailySalesSummary)
        .set({
          unitsSold: sql`${dailySalesSummary.unitsSold} - ${item.quantity}`,
          revenueKrw: sql`${dailySalesSummary.revenueKrw} - ${item.subtotalSnapshot}`,
          cogsKrw: sql`${dailySalesSummary.cogsKrw} - ${cogs}`,
          refundCount: sql`${dailySalesSummary.refundCount} + 1`,
          refundedRevenueKrw: sql`${dailySalesSummary.refundedRevenueKrw} + ${item.subtotalSnapshot}`, // Reversing the revenue of this item
        })
        .where(
          and(
            eq(dailySalesSummary.date, confirmedDate),
            eq(dailySalesSummary.regionCode, order.deliveryRegion),
            eq(dailySalesSummary.productId, item.productId)
          )
        )
    }

    emit.orderStatusChanged({
      orderId,
      orderNumber: order.orderNumber,
      fromStatus: 'DELIVERED',
      toStatus: 'REFUNDED',
      changedBy: adminId,
      note: dto.refundNote ?? null,
      changedAt: new Date().toISOString(),
    })
    const [customer] = await tx
      .select()
      .from(customers)
      .where(eq(customers.id, order.customerId))
      .limit(1)
    if (customer?.telegramId)
      await notifyCustomer(
        customer.telegramId,
        `💰 Buyurtma summasi qaytarildi (Refund)\n📦 #${order.orderNumber}`
      )

    return updated
  })
}

export async function adminCreateOrder(adminId: string, dto: ManualOrderDto) {
  return createOrder({
    customerId: dto.customerId,
    region: dto.paymentMethod === 'UZB_BANK' ? 'UZB' : 'KOR', // Simplified region detection
    source: 'MANUAL',
    itemsInput: dto.items,
    addressId: dto.addressId,
    paymentMethod: dto.paymentMethod,
    paymentMode: dto.paymentMode,
    orderDiscountPct: dto.orderDiscountPct,
    orderDiscountFlat: dto.orderDiscountFlat,
    boxId: dto.boxId,
    couponCode: dto.couponCode,
    adminNote: dto.adminNote,
    adminId,
  })
}

export async function getOrderExpenses(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
  if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId))
  const expensesList = await db
    .select()
    .from(orderExpenses)
    .where(eq(orderExpenses.orderId, orderId))
    .orderBy(asc(orderExpenses.createdAt))

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
      netProfit: Number(netProfit),
    },
  }
}

export async function addOrderExpense(orderId: string, adminId: string, dto: AddExpenseDto) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
  if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }

  const [expense] = await db
    .insert(orderExpenses)
    .values({
      orderId,
      type: dto.type,
      amountKrw: BigInt(dto.amountKrw),
      note: dto.note,
      createdBy: adminId,
      isAuto: false,
    })
    .returning()

  return expense
}

export async function adminGetOrderDetail(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
  if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, order.customerId))
    .limit(1)

  const items = await db
    .select({
      id: orderItems.id,
      quantity: orderItems.quantity,
      unitPriceSnapshot: orderItems.unitPriceSnapshot,
      subtotalSnapshot: orderItems.subtotalSnapshot,
      costAtSaleKrw: orderItems.costAtSaleKrw,
      product: { id: products.id, name: products.name, imageUrls: products.imageUrls },
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId))

  const statusHistory = await db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, orderId))
    .orderBy(asc(orderStatusHistory.createdAt))
  const expenses = await db
    .select()
    .from(orderExpenses)
    .where(eq(orderExpenses.orderId, orderId))
    .orderBy(asc(orderExpenses.createdAt))

  return { ...order, customer, items, statusHistory, expenses }
}

export async function getInvoiceData(orderId: string, userId: string, isAdmin: boolean) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
  if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Topilmadi' }

  if (!isAdmin && order.customerId !== userId) {
    throw { status: 403, code: 'ORDER_UNAUTHORIZED', message: "Ruxsat yo'q" }
  }

  const items = await db
    .select({
      product: { name: products.name },
      quantity: orderItems.quantity,
      unitPriceSnapshot: orderItems.unitPriceSnapshot,
      subtotalSnapshot: orderItems.subtotalSnapshot,
      isWholesale: sql<boolean>`${orderItems.quantity} >= ${productRegionalConfigs.minWholesaleQty}`,
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .innerJoin(
      productRegionalConfigs,
      and(
        eq(productRegionalConfigs.productId, orderItems.productId),
        eq(productRegionalConfigs.regionCode, order.deliveryRegion as any)
      )
    )
    .where(eq(orderItems.orderId, orderId))

  const [customer] = await db.select().from(customers).where(eq(customers.id, order.customerId))

  const [rate] = await db
    .select()
    .from(exchangeRateSnapshots)
    .where(eq(exchangeRateSnapshots.id, order.rateSnapshotId!))
    .limit(1)

  return {
    order: {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      status: order.status,
      totalAmount: order.totalAmount,
      discountAmount: order.discountAmount ?? 0n,
      cargoFee: order.cargoFee ?? 0n,
      currency: 'KRW',
    },
    items: items.map((i) => ({
      productName: i.product.name,
      quantity: i.quantity,
      unitPrice: i.unitPriceSnapshot,
      subtotal: i.subtotalSnapshot,
      isWholesale: i.isWholesale,
    })),
    customer: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
    },
    delivery: {
      fullName: order.deliveryFullName ?? customer.firstName,
      phone: order.deliveryPhone ?? customer.phone,
      addressLine1: order.deliveryAddressLine1 ?? '',
      city: order.deliveryCity ?? undefined,
      postalCode: order.deliveryPostalCode ?? undefined,
      regionCode: order.deliveryRegion ?? 'KOR',
    },
    company: {
      name: 'Mira Cosmetics',
      website: 'miracosmetics.uz',
      telegram: '@mira_cosmetics_bot',
    },
    exchangeRate: rate
      ? {
          krwToUzs: rate.krwToUzs,
        }
      : undefined,
  }
}

// ─── Automation ──────────────────────────────────────────────────────────

export async function cancelExpiredOrders(): Promise<number> {
  let count = 0
  const expired = await db
    .select()
    .from(orders)
    .where(
      and(
        sql`${orders.status} IN ('PENDING_PAYMENT', 'PAYMENT_REJECTED')`,
        sql`${orders.paymentDeadline} < NOW()`
      )
    )

  for (const order of expired) {
    try {
      await cancelOrder(order.id, null, "To'lov muddati o'tdi")
      count++
      emit.orderAutoCanceled({
        orderId: order.id,
        orderNumber: order.orderNumber,
        reason: 'payment_deadline_expired',
        canceledAt: new Date().toISOString(),
      })
    } catch (e) {
      console.error(`Error auto-canceling order ${order.id}:`, e)
    }
  }
  return count
}

export async function sendDeadlineReminders(): Promise<void> {
  const now = new Date()
  const windowStart = new Date(now.getTime() + 9 * 60000)
  const windowEnd = new Date(now.getTime() + 11 * 60000)

  const pending = await db
    .select()
    .from(orders)
    .where(
      and(
        sql`${orders.status} IN ('PENDING_PAYMENT', 'PAYMENT_REJECTED')`,
        gte(orders.paymentDeadline, windowStart),
        lte(orders.paymentDeadline, windowEnd)
      )
    )

  for (const order of pending) {
    try {
      const tokens = await getCustomerTokens(order.customerId)
      await notifyCustomerFull({
        customerId: order.customerId,
        telegramId: tokens.telegramId,
        expoPushToken: tokens.expoPushToken,
        type: 'ORDER_STATUS',
        channel: 'BOTH',
        title: '⚠️ 10 daqiqa qoldi!',
        body: `#${order.orderNumber} — Tez to'lov yuklang!`,
        telegramMessage:
          `⚠️ <b>Diqqat!</b>\n\n` +
          `📦 <b>#${order.orderNumber}</b>\n` +
          `To'lovni yuklashga <b>10 daqiqa</b> qoldi!\n` +
          `Aks holda buyurtma bekor qilinadi.`,
        data: { orderId: order.id, type: 'DEADLINE_REMINDER' },
      })
    } catch (e) {
      console.error(`Error sending deadline reminder for order ${order.id}:`, e)
    }
  }
}

export async function reconcileDailySummary(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  const todayOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        sql`${orders.status} IN ('PAYMENT_CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED')`,
        sql`DATE(${orders.paymentConfirmedAt}) = ${today}`
      )
    )

  for (const order of todayOrders) {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id))
    const cargoShare = order.cargoFee / BigInt(items.length || 1)
    const discountShare = order.discountAmount / BigInt(items.length || 1)

    for (const item of items) {
      const cogs = (item.costAtSaleKrw || 0n) * BigInt(item.quantity)
      await db
        .insert(dailySalesSummary)
        .values({
          date: today,
          regionCode: order.deliveryRegion,
          productId: item.productId,
          unitsSold: item.quantity,
          revenueKrw: item.subtotalSnapshot,
          cogsKrw: cogs,
          cargoKrw: cargoShare,
          couponDiscountKrw: discountShare,
          orderCount: 1,
        })
        .onConflictDoUpdate({
          target: [
            dailySalesSummary.date,
            dailySalesSummary.regionCode,
            dailySalesSummary.productId,
          ],
          set: {
            unitsSold: sql`${dailySalesSummary.unitsSold} + ${item.quantity}`,
            revenueKrw: sql`${dailySalesSummary.revenueKrw} + ${item.subtotalSnapshot}`,
            cogsKrw: sql`${dailySalesSummary.cogsKrw} + ${cogs}`,
            cargoKrw: sql`${dailySalesSummary.cargoKrw} + ${cargoShare}`,
            couponDiscountKrw: sql`${dailySalesSummary.couponDiscountKrw} + ${discountShare}`,
            orderCount: sql`${dailySalesSummary.orderCount} + 1` as any,
          },
        })
    }
  }
}
