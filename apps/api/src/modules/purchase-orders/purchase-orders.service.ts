import { db } from '../../config/db'
import {
  purchaseOrders,
  purchaseOrderItems,
  suppliers,
  products,
  inventoryBatches,
  stockMovements,
  expenses,
  expenseCategories,
  settings,
} from '@mira/db'
import { eq, and, sql, desc, count, ilike, or } from 'drizzle-orm'
import { logger } from '../../config/logger'
import { emit } from '../../config/socket'
import { notifyLowStock } from '../../bot/helpers/notify'
import { checkLowStock } from '../inventory/inventory.service'
import type {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  UpdatePOStatusDto,
  ReceivePODto,
  RecordPaymentDto,
} from './purchase-orders.schema'

export async function getPurchaseOrders(query: {
  page?: number
  limit?: number
  status?: string
  supplierId?: string
  dateFrom?: string
  dateTo?: string
}) {
  const page = query.page || 1
  const limit = query.limit || 20
  const offset = (page - 1) * limit

  let where: any = sql`1=1`
  if (query.status) where = and(where, eq(purchaseOrders.status, query.status))
  if (query.supplierId) where = and(where, eq(purchaseOrders.supplierId, query.supplierId))
  if (query.dateFrom) where = and(where, sql`${purchaseOrders.createdAt} >= ${query.dateFrom}`)
  if (query.dateTo) where = and(where, sql`${purchaseOrders.createdAt} <= ${query.dateTo}`)

  const itemsQuery = await db
    .select({
      id: purchaseOrders.id,
      orderNumber: purchaseOrders.orderNumber,
      supplierId: purchaseOrders.supplierId,
      status: purchaseOrders.status,
      paymentStatus: purchaseOrders.paymentStatus,
      totalCostKrw: purchaseOrders.totalCostKrw,
      paidAmountKrw: purchaseOrders.paidAmountKrw,
      notes: purchaseOrders.notes,
      createdAt: purchaseOrders.createdAt,
      updatedAt: purchaseOrders.updatedAt,
      supplierName: suppliers.name,
    })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(where)
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(limit)
    .offset(offset)

  const [countRes] = await db.select({ count: count() }).from(purchaseOrders).where(where)
  const total = Number(countRes?.count || 0)

  const items = itemsQuery.map((row) => ({
    ...row,
    totalCostKrw: Number(row.totalCostKrw),
    paidAmountKrw: Number(row.paidAmountKrw),
    supplierName: row.supplierName,
  }))

  return { items, meta: { page, limit, total, hasNext: offset + limit < total, hasPrev: page > 1 } }
}

export async function getPurchaseOrderById(id: string) {
  const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1)
  if (!order) throw { status: 404, code: 'PO_NOT_FOUND', message: 'Xarid buyurtmasi topilmadi' }

  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, order.supplierId))
    .limit(1)

  const items = await db
    .select({
      item: purchaseOrderItems,
      productName: products.name,
      barcode: products.barcode,
    })
    .from(purchaseOrderItems)
    .innerJoin(products, eq(purchaseOrderItems.productId, products.id))
    .where(eq(purchaseOrderItems.purchaseOrderId, id))

  return {
    ...order,
    totalCostKrw: Number(order.totalCostKrw),
    supplier,
    items: items.map((i) => ({
      ...i.item,
      unitCostKrw: Number(i.item.unitCostKrw),
      totalCostKrw: Number(i.item.totalCostKrw),
      productName: i.productName,
      barcode: i.barcode,
    })),
  }
}

export async function createPurchaseOrder(data: CreatePurchaseOrderDto, adminId: string) {
  return await db.transaction(async (tx) => {
    // 1. Generate PO Number
    const seqRes = await tx.execute(sql`
      SELECT COALESCE(MAX(CAST(SPLIT_PART(order_number, '-', 3) AS INTEGER)), 0) + 1 AS next_seq
      FROM purchase_orders
      WHERE EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM NOW())
    `)
    const nextSeq = (seqRes as any).rows?.[0]?.next_seq || (seqRes as any)[0]?.next_seq || 1
    const year = new Date().getFullYear().toString()
    const orderNumber = `PO-${year}-${nextSeq.toString().padStart(4, '0')}`

    // 2. Calculate Total
    let totalCostKrw = 0n
    for (const item of data.items) {
      totalCostKrw += BigInt(item.quantityOrdered) * BigInt(item.unitCostKrw)
    }

    // 3. Create Order
    const [newOrder] = await tx
      .insert(purchaseOrders)
      .values({
        orderNumber,
        supplierId: data.supplierId,
        createdAt: data.orderDate,
        expectedAt: data.expectedDeliveryDate,
        notes: data.notes,
        totalCostKrw,
        status: 'DRAFT',
        createdBy: adminId,
      })
      .returning()

    // 4. Create Items
    const itemsToInsert = data.items.map((item) => ({
      purchaseOrderId: newOrder.id,
      productId: item.productId,
      quantityOrdered: item.quantityOrdered,
      unitCostKrw: BigInt(item.unitCostKrw),
      totalCostKrw: BigInt(item.quantityOrdered) * BigInt(item.unitCostKrw),
    }))

    await tx.insert(purchaseOrderItems).values(itemsToInsert)

    return newOrder
  })
}

export async function updatePurchaseOrder(id: string, data: UpdatePurchaseOrderDto) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1)
    if (!order) throw { status: 404, code: 'PO_NOT_FOUND', message: 'Xarid buyurtmasi topilmadi' }
    if (order.status !== 'DRAFT')
      throw {
        status: 400,
        code: 'PO_CANNOT_MODIFY',
        message: "Faqat DRAFT holatidagi buyurtmalarni o'zgartirish mumkin",
      }

    let totalCostKrw = order.totalCostKrw

    if (data.items && data.items.length > 0) {
      // Replace items
      await tx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id))

      totalCostKrw = 0n
      const itemsToInsert = data.items.map((item) => {
        const itemTotal = BigInt(item.quantityOrdered) * BigInt(item.unitCostKrw)
        totalCostKrw += itemTotal
        return {
          purchaseOrderId: id,
          productId: item.productId,
          quantityOrdered: item.quantityOrdered,
          unitCostKrw: BigInt(item.unitCostKrw),
          totalCostKrw: itemTotal,
        }
      })
      await tx.insert(purchaseOrderItems).values(itemsToInsert)
    }

    const updates: any = { updatedAt: new Date() }
    if (data.supplierId) updates.supplierId = data.supplierId
    if (data.orderDate) updates.createdAt = data.orderDate
    if (data.expectedDeliveryDate !== undefined) updates.expectedAt = data.expectedDeliveryDate
    if (data.notes !== undefined) updates.notes = data.notes
    updates.totalCostKrw = totalCostKrw

    const [updated] = await tx
      .update(purchaseOrders)
      .set(updates)
      .where(eq(purchaseOrders.id, id))
      .returning()
    return updated
  })
}

export async function updatePurchaseOrderStatus(id: string, status: 'ORDERED' | 'CANCELLED') {
  const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1)
  if (!order) throw { status: 404, code: 'PO_NOT_FOUND', message: 'Xarid buyurtmasi topilmadi' }

  const validTransitions: Record<string, string[]> = {
    DRAFT: ['ORDERED', 'CANCELLED'],
    ORDERED: ['CANCELLED'],
    PARTIAL: ['CANCELLED'],
  }

  if (!validTransitions[order.status]?.includes(status)) {
    throw {
      status: 400,
      code: 'PO_INVALID_STATUS_TRANSITION',
      message: "Noto'g'ri holat o'zgarishi",
    }
  }

  const [updated] = await db
    .update(purchaseOrders)
    .set({ status, updatedAt: new Date() })
    .where(eq(purchaseOrders.id, id))
    .returning()
  return updated
}

export async function recordPayment(id: string, data: RecordPaymentDto, adminId: string) {
  return await db.transaction(async (tx) => {
    const [po] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1)
    if (!po) throw { status: 404, code: 'PO_NOT_FOUND', message: 'Xarid buyurtmasi topilmadi' }

    const amountKrw = BigInt(data.amountKrw)
    const newPaidAmount = po.paidAmountKrw + amountKrw

    let paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' = 'PARTIAL'
    if (newPaidAmount >= po.totalCostKrw) {
      paymentStatus = 'PAID'
    } else if (newPaidAmount === 0n) {
      paymentStatus = 'UNPAID'
    }

    // 1. Update PO
    const [updated] = await tx
      .update(purchaseOrders)
      .set({
        paidAmountKrw: newPaidAmount,
        paymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, id))
      .returning()

    // 2. Find or create 'Inventory Purchase' category
    let [category] = await tx
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.slug, 'inventory-purchase'))
      .limit(1)

    if (!category) {
      const [newCat] = await tx
        .insert(expenseCategories)
        .values({
          name: 'Inventar xaridi',
          slug: 'inventory-purchase',
          icon: 'Package',
          isSystem: true,
        })
        .returning()
      category = newCat
    }

    // 3. Create expense entry
    await tx.insert(expenses).values({
      categoryId: category.id,
      amountKrw,
      description: `To'lov: ${po.orderNumber}`,
      expenseDate: new Date().toISOString().split('T')[0],
      referenceId: po.id,
      referenceType: 'PURCHASE_ORDER',
      createdBy: adminId,
    })

    return updated
  })
}

export async function receivePurchaseOrder(id: string, data: ReceivePODto, adminId: string) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1)
    if (!order) throw { status: 404, code: 'PO_NOT_FOUND', message: 'Xarid buyurtmasi topilmadi' }
    if (!['ORDERED', 'PARTIAL'].includes(order.status)) {
      throw {
        status: 400,
        code: 'PO_INVALID_STATUS_TRANSITION',
        message: 'Faqat ORDERED yoki PARTIAL holatidagi buyurtmalarni qabul qilish mumkin',
      }
    }

    const productsReceived = new Set<string>()

    for (const inputItem of data.items) {
      if (inputItem.quantityReceived <= 0) continue

      const [item] = await tx
        .select()
        .from(purchaseOrderItems)
        .where(
          and(
            eq(purchaseOrderItems.id, inputItem.purchaseOrderItemId),
            eq(purchaseOrderItems.purchaseOrderId, id)
          )
        )
        .limit(1)
      if (!item)
        throw { status: 404, code: 'PO_ITEM_NOT_FOUND', message: 'Buyurtma qismi topilmadi' }

      // 1. Update received quantity
      const newQtyReceived = item.quantityReceived + inputItem.quantityReceived
      await tx
        .update(purchaseOrderItems)
        .set({ quantityReceived: newQtyReceived, updatedAt: new Date() })
        .where(eq(purchaseOrderItems.id, item.id))

      // 2. Create inventory batch
      const [newBatch] = await tx
        .insert(inventoryBatches)
        .values({
          productId: item.productId,
          batchRef: order.orderNumber,
          initialQty: inputItem.quantityReceived,
          currentQty: inputItem.quantityReceived,
          costPrice: item.unitCostKrw,
          costCurrency: 'KRW',
          expiryDate: inputItem.expiryDate,
          receivedAt: new Date(data.actualDeliveryDate), // Using JS Date for timestamp
          purchaseOrderItemId: item.id,
        })
        .returning()

      // 3. Update PO item with latest batchId
      await tx
        .update(purchaseOrderItems)
        .set({ batchId: newBatch.id })
        .where(eq(purchaseOrderItems.id, item.id))

      // 4. Stock Movement
      await tx.insert(stockMovements).values({
        batchId: newBatch.id,
        productId: item.productId,
        movementType: 'STOCK_IN',
        quantityDelta: inputItem.quantityReceived,
        qtyBefore: 0,
        qtyAfter: inputItem.quantityReceived,
        performedBy: adminId,
        note: `PO qabul qilindi: ${order.orderNumber}`,
      })

      productsReceived.add(item.productId)
    }

    // Determine new status
    const allItems = await tx
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id))
    let allFullyReceived = true
    let newTotalCostKrw = 0n

    for (const item of allItems) {
      if (item.quantityReceived < item.quantityOrdered) allFullyReceived = false
      newTotalCostKrw += BigInt(item.quantityReceived) * item.unitCostKrw
    }

    const newStatus = allFullyReceived ? 'RECEIVED' : 'PARTIAL'

    const [updated] = await tx
      .update(purchaseOrders)
      .set({
        status: newStatus,
        receivedAt: data.actualDeliveryDate,
        totalCostKrw: newTotalCostKrw,
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, id))
      .returning()

    logger.info({ poId: id, status: newStatus }, 'PO items received')

    // Low stock check
    for (const productId of productsReceived) {
      await checkLowStock(tx, productId)
    }

    return updated
  })
}

export async function deletePurchaseOrder(id: string) {
  const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1)
  if (!order) throw { status: 404, code: 'PO_NOT_FOUND', message: 'Xarid buyurtmasi topilmadi' }
  if (order.status !== 'DRAFT')
    throw {
      status: 400,
      code: 'PO_CANNOT_MODIFY',
      message: "Faqat DRAFT holatidagi buyurtmalarni o'chirish mumkin",
    }

  const [deleted] = await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id)).returning()
  return deleted
}
