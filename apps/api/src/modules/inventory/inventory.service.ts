import { db } from '../../config/db'
import { 
  inventoryBatches, stockMovements, batchAdjustments, 
  products, settings, adminUsers 
} from '@mira/db'
import { eq, and, sql, desc, asc, min } from 'drizzle-orm'
import { emit } from '../../config/socket'
import { notifyLowStock } from '../../bot/helpers/notify'
import type { CreateBatchDto, UpdateBatchDto } from './inventory.schema'

export async function getStockSummary() {
  const [appSettings] = await db.select().from(settings).limit(1)
  const threshold = appSettings?.lowStockThreshold || 10

  const summary = await db
    .select({
      productId: products.id,
      productName: products.name,
      barcode: products.barcode,
      brandName: products.brandName,
      totalQty: sql<number>`SUM(${inventoryBatches.currentQty})`,
      batchCount: sql<number>`COUNT(${inventoryBatches.id})`,
      nearestExpiryDate: min(inventoryBatches.expiryDate)
    })
    .from(products)
    .leftJoin(inventoryBatches, eq(products.id, inventoryBatches.productId))
    .groupBy(products.id)
    .orderBy(products.name)

  return summary.map(item => ({
    ...item,
    totalQty: Number(item.totalQty || 0),
    batchCount: Number(item.batchCount || 0),
    isLowStock: Number(item.totalQty || 0) <= threshold
  }))
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
      note: 'Yangi partiya qabul qilindi'
    })

    // 3. Check low stock threshold
    const [appSettings] = await tx.select().from(settings).limit(1)
    const threshold = appSettings?.lowStockThreshold || 10

    const [stock] = await tx
      .select({ 
        total: sql<number>`SUM(${inventoryBatches.currentQty})`,
        count: sql<number>`COUNT(${inventoryBatches.id})`
      })
      .from(inventoryBatches)
      .where(eq(inventoryBatches.productId, data.productId))

    const totalQty = Number(stock.total || 0)
    const batchCount = Number(stock.count || 0)
    const [product] = await tx.select().from(products).where(eq(products.id, data.productId)).limit(1)

    if (totalQty <= threshold) {
      emit.stockLow({
        productId: data.productId,
        productName: product.name,
        barcode: product.barcode,
        currentQty: totalQty,
        threshold,
        batchCount
      })
      await notifyLowStock({
        productName: product.name,
        barcode: product.barcode,
        currentQty: totalQty,
        threshold
      })
    }

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
        reason: data.reason
      })

      await tx.insert(stockMovements).values({
        batchId: id,
        productId: batch.productId,
        movementType: 'ADJUSTED',
        quantityDelta: delta,
        qtyBefore: batch.currentQty,
        qtyAfter: data.currentQty,
        performedBy: adminId,
        note: data.reason
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
        reason: data.reason
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
          reason: data.reason
        })
        updates.costPrice = newCost
      }
    }

    const [updated] = await tx
      .update(inventoryBatches)
      .set(updates)
      .where(eq(inventoryBatches.id, id))
      .returning()

    return updated
  })
}
