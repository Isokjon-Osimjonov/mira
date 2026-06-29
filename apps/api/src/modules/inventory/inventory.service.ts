import { db } from '../../config/db'
import {
  inventoryBatches,
  stockMovements,
  batchAdjustments,
  products,
  settings,
  adminUsers,
  expenses,
  expenseCategories,
  stockReservations,
  waitlists,
  customers,
} from '@mira/db'
import {
  eq,
  and,
  sql,
  desc,
  asc,
  min,
  inArray,
  gte,
  lte,
  isNotNull,
  gt,
  or,
  ilike,
  isNull,
} from 'drizzle-orm'
import { emit } from '../../config/socket'
import { notifyLowStock, sendAdminAlert, notifyCustomerFull } from '../../bot/helpers/notify'
import { CreateBatchDto, UpdateBatchDto } from './inventory.schema'
import { createNotification } from '../admin-notifications/admin-notifications.service'
import { notifyWaitlist } from '../waitlists/waitlists.service'

export async function getStockSummary(
  query: {
    filter?: 'low' | 'out' | 'expiring'
    search?: string
    categoryId?: string
    page?: number
    limit?: number
  } = {}
) {
  const page = query.page || 1
  const limit = query.limit || 20
  const offset = (page - 1) * limit

  const [appSettings] = await db.select().from(settings).limit(1)
  const threshold = appSettings?.lowStockThreshold || 10

  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0]

  // Subquery for total stock and nearest expiry per product
  const statsSq = db
    .select({
      productId: inventoryBatches.productId,
      totalQty: sql<number>`SUM(${inventoryBatches.currentQty})`.as('total_qty'),
      nearestExpiry: min(inventoryBatches.expiryDate).as('nearest_expiry'),
    })
    .from(inventoryBatches)
    .groupBy(inventoryBatches.productId)
    .as('stats_sq')

  // Subquery for reserved quantity
  const reserveSq = db
    .select({
      productId: stockReservations.productId,
      reservedQty: sql<number>`SUM(${stockReservations.quantity})`.as('reserved_qty'),
    })
    .from(stockReservations)
    .where(eq(stockReservations.status, 'ACTIVE'))
    .groupBy(stockReservations.productId)
    .as('reserve_sq')

  let where = isNotNull(products.id)

  if (query.search) {
    const s = `%${query.search.toLowerCase()}%`
    where = and(where, or(ilike(products.name, s), ilike(products.barcode, s))) as any
  }

  if (query.categoryId) {
    where = and(where, eq(products.categoryId, query.categoryId)) as any
  }

  if (query.filter === 'out') {
    where = and(where, or(isNull(statsSq.totalQty), eq(statsSq.totalQty, 0))) as any
  } else if (query.filter === 'low') {
    where = and(where, gt(statsSq.totalQty, 0), lte(statsSq.totalQty, threshold)) as any
  } else if (query.filter === 'expiring') {
    where = and(
      where,
      gt(statsSq.totalQty, 0),
      isNotNull(statsSq.nearestExpiry),
      lte(statsSq.nearestExpiry, thirtyDaysStr)
    ) as any
  }

  const items = await db
    .select({
      productId: products.id,
      productName: products.name,
      barcode: products.barcode,
      brandName: products.brandName,
      imageUrl: sql<string>`(${products.imageUrls})[1]`,
      availableStock: sql<number>`COALESCE(${statsSq.totalQty}, 0)`,
      reservedStock: sql<number>`COALESCE(${reserveSq.reservedQty}, 0)`,
      nearestExpiry: statsSq.nearestExpiry,
    })
    .from(products)
    .leftJoin(statsSq, eq(products.id, statsSq.productId))
    .leftJoin(reserveSq, eq(products.id, reserveSq.productId))
    .where(where)
    .orderBy(asc(products.name))
    .limit(limit)
    .offset(offset)

  const [countRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .leftJoin(statsSq, eq(products.id, statsSq.productId))
    .where(where)

  const total = Number(countRes.count)

  return {
    items,
    meta: {
      total,
      page,
      limit,
      hasNext: offset + limit < total,
      hasPrev: page > 1,
    },
  }
}

export async function getWriteOffReasons() {
  // These are the types we support in writeOffStock
  return ['GIFT', 'SAMPLE', 'DAMAGED', 'EXPIRED', 'LOST', 'ADJUSTMENT']
}

export async function checkLowStock(tx: any, productId: string) {
  const [appSettings] = await tx.select().from(settings).limit(1)
  const threshold = appSettings?.lowStockThreshold || 10

  const [stock] = await tx
    .select({
      total: sql<number>`SUM(${inventoryBatches.currentQty})`,
      count: sql<number>`COUNT(${inventoryBatches.id})`,
    })
    .from(inventoryBatches)
    .where(eq(inventoryBatches.productId, productId))

  const totalQty = Number(stock.total || 0)
  const batchCount = Number(stock.count || 0)

  if (totalQty <= threshold) {
    const [product] = await tx.select().from(products).where(eq(products.id, productId)).limit(1)

    if (product) {
      emit.stockLow({
        productId,
        productName: product.name,
        barcode: product.barcode,
        currentQty: totalQty,
        threshold,
        batchCount,
      })
      await notifyLowStock({
        productName: product.name,
        barcode: product.barcode,
        brandName: product.brandName,
        currentQty: totalQty,
        threshold,
      }).catch(console.error)
    }
  }
}

export async function createBatch(data: CreateBatchDto, adminId: string) {
  return await db.transaction(async (tx) => {
    // 1. Create batch
    const batchResult = await tx
      .insert(inventoryBatches)
      .values({
        productId: data.productId,
        batchRef: data.batchRef,
        initialQty: data.initialQty,
        currentQty: data.initialQty,
        costPrice: BigInt(data.costPrice),
        costCurrency: data.costCurrency,
        expiryDate: data.expiryDate,
        notes: data.notes,
      })
      .returning()

    const newBatch = batchResult[0]

    // 2. Insert stock movement
    await tx.insert(stockMovements).values({
      batchId: newBatch.id,
      productId: data.productId,
      movementType: 'STOCK_IN',
      quantityDelta: data.initialQty,
      qtyBefore: 0,
      qtyAfter: data.initialQty,
      performedBy: adminId,
      note: 'Yangi partiya qabul qilindi',
    })

    // 3. Check low stock threshold
    await checkLowStock(tx, data.productId)

    // 4. Notify waitlist
    notifyWaitlist(data.productId).catch((err) => console.error('Failed to notify waitlist', err))

    return newBatch
  })
}

export async function getBatchesByProduct(productId: string) {
  return await db
    .select()
    .from(inventoryBatches)
    .where(eq(inventoryBatches.productId, productId))
    .orderBy(asc(inventoryBatches.receivedAt))
}

export async function updateBatch(id: string, data: UpdateBatchDto, adminId: string) {
  return await db.transaction(async (tx) => {
    const [batch] = await tx
      .select()
      .from(inventoryBatches)
      .where(eq(inventoryBatches.id, id))
      .limit(1)

    if (!batch) throw { status: 404, message: 'Partiya topilmadi' }

    const updates: any = { updatedAt: new Date() }

    // Log adjustments and movements
    if (data.currentQty !== undefined && data.currentQty !== batch.currentQty) {
      const delta = data.currentQty - batch.currentQty

      await tx.insert(batchAdjustments).values({
        batchId: id,
        adminId,
        fieldChanged: 'current_qty',
        oldValue: batch.currentQty.toString(),
        newValue: data.currentQty.toString(),
        reason: data.reason,
      })

      await tx.insert(stockMovements).values({
        batchId: id,
        productId: batch.productId,
        movementType: 'ADJUSTED',
        quantityDelta: delta,
        qtyBefore: batch.currentQty,
        qtyAfter: data.currentQty,
        performedBy: adminId,
        note: data.reason,
      })

      updates.currentQty = data.currentQty
    }

    if (data.expiryDate !== undefined && data.expiryDate !== batch.expiryDate) {
      await tx.insert(batchAdjustments).values({
        batchId: id,
        adminId,
        fieldChanged: 'expiry_date',
        oldValue: batch.expiryDate || 'null',
        newValue: data.expiryDate || 'null',
        reason: data.reason,
      })
      updates.expiryDate = data.expiryDate
    }

    if (data.costPrice !== undefined) {
      const newCost = BigInt(data.costPrice)
      if (newCost !== batch.costPrice) {
        await tx.insert(batchAdjustments).values({
          batchId: id,
          adminId,
          fieldChanged: 'cost_price',
          oldValue: batch.costPrice.toString(),
          newValue: data.costPrice,
          reason: data.reason,
        })
        updates.costPrice = newCost
      }
    }

    const [updated] = await tx
      .update(inventoryBatches)
      .set(updates)
      .where(eq(inventoryBatches.id, id))
      .returning()

    await checkLowStock(tx, batch.productId)

    return updated
  })
}

export async function writeOffStock(params: {
  batchId: string
  quantity: number
  type: 'GIFT' | 'SAMPLE' | 'DAMAGED' | 'EXPIRED' | 'LOST' | 'ADJUSTMENT'
  reason?: string
  recipientName?: string
  recipientPhone?: string
  createExpense: boolean
  performedBy: string
}) {
  const [batch] = await db
    .select({
      id: inventoryBatches.id,
      productId: inventoryBatches.productId,
      currentQty: inventoryBatches.currentQty,
      costPrice: inventoryBatches.costPrice,
      productName: products.name,
    })
    .from(inventoryBatches)
    .innerJoin(products, eq(inventoryBatches.productId, products.id))
    .where(eq(inventoryBatches.id, params.batchId))
    .limit(1)

  if (!batch) throw { status: 404, code: 'BATCH_NOT_FOUND', message: 'Partiya topilmadi' }

  // Qty validation
  if (params.type !== 'ADJUSTMENT') {
    if (params.quantity <= 0) throw { status: 400, message: "Miqdor musbat bo'lishi kerak" }
    if (params.quantity > batch.currentQty) {
      throw {
        status: 400,
        code: 'WRITE_OFF_QTY_EXCEEDED',
        message: `Stokda faqat ${batch.currentQty} ta bor`,
      }
    }
  }

  const qtyDelta = params.type === 'ADJUSTMENT' ? params.quantity : -params.quantity
  const newQty = batch.currentQty + qtyDelta

  return await db.transaction(async (tx) => {
    // 1. Update batch
    await tx
      .update(inventoryBatches)
      .set({ currentQty: newQty, updatedAt: new Date() })
      .where(eq(inventoryBatches.id, params.batchId))

    // 2. Log movement
    const [movement] = await tx
      .insert(stockMovements)
      .values({
        batchId: params.batchId,
        productId: batch.productId,
        movementType: params.type as any,
        quantityDelta: qtyDelta,
        qtyBefore: batch.currentQty,
        qtyAfter: newQty,
        reason: params.reason ?? null,
        recipientName: params.recipientName ?? null,
        recipientPhone: params.recipientPhone ?? null,
        writtenOffBy: params.performedBy,
        performedBy: params.performedBy,
      })
      .returning()

    // 3. Auto-create expense entry if requested
    let expense = null
    if (params.createExpense && params.type !== 'GIFT' && params.type !== 'ADJUSTMENT') {
      const expenseAmount = BigInt(batch.costPrice) * BigInt(Math.abs(params.quantity))

      if (expenseAmount > 0n) {
        // Look for 'inventory-loss' category
        let [lossCategory] = await tx
          .select()
          .from(expenseCategories)
          .where(eq(expenseCategories.slug, 'inventory-loss'))
          .limit(1)

        // Create if missing
        if (!lossCategory) {
          const [newCat] = await tx
            .insert(expenseCategories)
            .values({
              name: "Inventar yo'qotishlari",
              slug: 'inventory-loss',
              isSystem: true,
            })
            .returning()
          lossCategory = newCat
        }

        const WRITEOFF_EXPENSE_NAMES: Record<string, string> = {
          DAMAGED: 'Zarar (shikastlangan mahsulot)',
          EXPIRED: "Zarar (muddati o'tgan mahsulot)",
          SAMPLE: 'Namuna xarajati',
          LOST: "Yo'qotish",
          ADJUSTMENT: 'Inventar tuzatish',
        }

        const [exp] = await tx
          .insert(expenses)
          .values({
            categoryId: lossCategory.id,
            amountKrw: expenseAmount,
            description: `${WRITEOFF_EXPENSE_NAMES[params.type] || params.type}: ${Math.abs(
              params.quantity
            )} ta (${batch.productName})`,
            expenseDate: new Date().toISOString().split('T')[0],
            createdBy: params.performedBy,
          })
          .returning()
        expense = exp
      }
    }

    await checkLowStock(tx, batch.productId)

    if (qtyDelta < 0) {
      await createNotification({
        type: 'WRITE_OFF',
        title: 'Hisobdan chiqarildi',
        message: `${Math.abs(qtyDelta)} ta mahsulot hisobdan chiqarildi (${batch.productName})`,
        link: '/inventory',
      }).catch((err) => console.error('Failed to create notification', err))
    }

    return { batch: { ...batch, currentQty: newQty }, movement, expense }
  })
}

export async function getWriteOffHistory(params: {
  productId?: string
  type?: string
  dateFrom?: string
  dateTo?: string
  page: number
  limit: number
}) {
  const offset = (params.page - 1) * params.limit

  let where = inArray(stockMovements.movementType, [
    'GIFT',
    'SAMPLE',
    'DAMAGED',
    'EXPIRED',
    'LOST',
    'ADJUSTMENT',
  ] as any)

  if (params.productId) where = and(where, eq(stockMovements.productId, params.productId)) as any
  if (params.type) where = and(where, eq(stockMovements.movementType, params.type as any)) as any
  if (params.dateFrom)
    where = and(where, gte(stockMovements.createdAt, new Date(params.dateFrom))) as any
  if (params.dateTo)
    where = and(where, lte(stockMovements.createdAt, new Date(params.dateTo))) as any

  const items = await db
    .select({
      id: stockMovements.id,
      type: stockMovements.movementType,
      quantityDelta: stockMovements.quantityDelta,
      reason: stockMovements.reason,
      recipientName: stockMovements.recipientName,
      createdAt: stockMovements.createdAt,
      product: { name: products.name, brandName: products.brandName },
      batch: { batchRef: inventoryBatches.batchRef, costPrice: inventoryBatches.costPrice },
      admin: { fullName: adminUsers.fullName },
    })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))
    .innerJoin(inventoryBatches, eq(stockMovements.batchId, inventoryBatches.id))
    .leftJoin(adminUsers, eq(stockMovements.writtenOffBy, adminUsers.id))
    .where(where)
    .orderBy(desc(stockMovements.createdAt))
    .limit(params.limit)
    .offset(offset)

  const [countRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(stockMovements)
    .where(where)
  const total = Number(countRes.count)

  return {
    items,
    meta: {
      page: params.page,
      limit: params.limit,
      total,
      hasNext: offset + params.limit < total,
      hasPrev: params.page > 1,
    },
  }
}

export async function getProductMovements(params: {
  productId: string
  type?: string
  dateFrom?: string
  dateTo?: string
  page: number
  limit: number
}) {
  const offset = (params.page - 1) * params.limit

  let where = eq(stockMovements.productId, params.productId)
  if (params.type) where = and(where, eq(stockMovements.movementType, params.type as any)) as any
  if (params.dateFrom)
    where = and(where, gte(stockMovements.createdAt, new Date(params.dateFrom))) as any
  if (params.dateTo)
    where = and(where, lte(stockMovements.createdAt, new Date(params.dateTo))) as any

  const items = await db
    .select({
      id: stockMovements.id,
      type: stockMovements.movementType,
      quantityDelta: stockMovements.quantityDelta,
      qtyBefore: stockMovements.qtyBefore,
      qtyAfter: stockMovements.qtyAfter,
      reason: stockMovements.reason,
      createdAt: stockMovements.createdAt,
      batch: { batchRef: inventoryBatches.batchRef },
      admin: { fullName: adminUsers.fullName },
    })
    .from(stockMovements)
    .innerJoin(inventoryBatches, eq(stockMovements.batchId, inventoryBatches.id))
    .leftJoin(adminUsers, eq(stockMovements.performedBy, adminUsers.id))
    .where(where)
    .orderBy(desc(stockMovements.createdAt))
    .limit(params.limit)
    .offset(offset)

  const [countRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(stockMovements)
    .where(where)
  const total = Number(countRes.count)

  return {
    items,
    meta: {
      page: params.page,
      limit: params.limit,
      total,
      hasNext: offset + params.limit < total,
      hasPrev: params.page > 1,
    },
  }
}

export async function deleteBatch(batchId: string, adminId: string) {
  const [batch] = await db
    .select()
    .from(inventoryBatches)
    .where(eq(inventoryBatches.id, batchId))
    .limit(1)

  if (!batch) throw { status: 404, code: 'BATCH_NOT_FOUND', message: 'Partiya topilmadi' }

  // 1. Check if stock was used
  if (batch.currentQty !== batch.initialQty) {
    throw {
      status: 400,
      code: 'BATCH_HAS_MOVEMENTS',
      message: `Bu partiyadan mahsulot ishlatilgan (Jami: ${batch.initialQty}, qolgan: ${batch.currentQty}). O'chirib bo'lmaydi.`,
    }
  }

  // 2. Check for active reservations
  const [reservation] = await db
    .select({ count: sql<number>`count(*)` })
    .from(stockReservations)
    .where(and(eq(stockReservations.batchId, batchId), eq(stockReservations.status, 'ACTIVE')))

  if (Number(reservation?.count || 0) > 0) {
    throw {
      status: 400,
      code: 'BATCH_HAS_RESERVATIONS',
      message: "Bu partiyada band (rezerv) qilingan mahsulotlar bor. O'chirib bo'lmaydi.",
    }
  }

  // 3. Check for movements other than the initial STOCK_IN
  const [movementCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(stockMovements)
    .where(eq(stockMovements.batchId, batchId))

  if (Number(movementCount?.count || 0) > 1) {
    throw {
      status: 400,
      code: 'BATCH_HAS_MOVEMENTS',
      message: "Bu partiya bo'yicha harakatlar mavjud. O'chirib bo'lmaydi.",
    }
  }

  return await db.transaction(async (tx) => {
    // Delete the movements first
    await tx.delete(stockMovements).where(eq(stockMovements.batchId, batchId))
    // Delete batch
    await tx.delete(inventoryBatches).where(eq(inventoryBatches.id, batchId))

    // Re-check low stock for the product
    await checkLowStock(tx, batch.productId)

    return { success: true }
  })
}

export async function checkExpiringBatches(): Promise<void> {
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  const expiringBatches = await db
    .select({
      batchId: inventoryBatches.id,
      batchRef: inventoryBatches.batchRef,
      productId: inventoryBatches.productId,
      productName: products.name,
      brandName: products.brandName,
      barcode: products.barcode,
      currentQty: inventoryBatches.currentQty,
      expiryDate: inventoryBatches.expiryDate,
    })
    .from(inventoryBatches)
    .innerJoin(products, eq(inventoryBatches.productId, products.id))
    .where(
      and(
        gt(inventoryBatches.currentQty, 0),
        isNotNull(inventoryBatches.expiryDate),
        lte(inventoryBatches.expiryDate, thirtyDaysFromNow.toISOString().split('T')[0]),
        gte(inventoryBatches.expiryDate, new Date().toISOString().split('T')[0])
      )
    )

  if (expiringBatches.length === 0) return

  // Group by urgency
  const urgent = expiringBatches.filter((b) => {
    const days = Math.ceil((new Date(b.expiryDate!).getTime() - Date.now()) / 86400000)
    return days <= 7
  })
  const warning = expiringBatches.filter((b) => {
    const days = Math.ceil((new Date(b.expiryDate!).getTime() - Date.now()) / 86400000)
    return days > 7 && days <= 30
  })

  // Build Telegram message
  let msg = '⚠️ <b>Muddati yaqinlashayotgan mahsulotlar</b>\n\n'

  if (urgent.length > 0) {
    msg += '🔴 <b>7 kun ichida tugaydi:</b>\n'
    for (const b of urgent) {
      const days = Math.ceil((new Date(b.expiryDate!).getTime() - Date.now()) / 86400000)
      msg += `• ${b.productName} — ${b.currentQty} ta — ${days} kun\n`
    }
    msg += '\n'
  }

  if (warning.length > 0) {
    msg += '🟡 <b>30 kun ichida tugaydi:</b>\n'
    for (const b of warning) {
      const days = Math.ceil((new Date(b.expiryDate!).getTime() - Date.now()) / 86400000)
      msg += `• ${b.productName} — ${b.currentQty} ta — ${days} kun\n`
    }
  }

  // Send to admin Telegram group
  await sendAdminAlert(msg)
}
