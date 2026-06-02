import { db } from '../../config/db'
import { orders, orderItems, products, pickPackAudit, adminUsers } from '@mira/db'
import { eq, and, sql, isNull, asc } from 'drizzle-orm'
import { emit } from '../../config/socket'
import type { ScanBarcodeDto, ManualConfirmDto } from './pick-pack.schema'

export async function getPackStatus(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
  if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }

  const items = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      productName: products.name,
      barcode: products.barcode,
      sku: products.sku,
      quantity: orderItems.quantity,
      isScanned: orderItems.isScanned,
      scannedAt: orderItems.scannedAt,
      scannedBy: adminUsers.fullName
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(adminUsers, eq(orderItems.scannedBy, adminUsers.id))
    .where(eq(orderItems.orderId, orderId))

  const totalItems = items.length
  const scannedItems = items.filter((i: any) => i.isScanned).length
  const allScanned = totalItems > 0 && scannedItems === totalItems

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalItems,
    scannedItems,
    allScanned,
    items
  }
}

export async function scanBarcode(orderId: string, adminId: string, dto: ScanBarcodeDto) {
  return await db.transaction(async (tx) => {
    // 1. Get order
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }
    if (order.status !== 'PACKING') throw { status: 400, code: 'ORDER_NOT_IN_PACKING', message: 'Faqat PACKING holatidagi buyurtmalarni skanerlash mumkin' }

    // 2. Get items
    const items = await tx
      .select({ item: orderItems, product: products })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, orderId))

    const barcodeInput = dto.barcodeInput.trim().toLowerCase()
    let matchedRow: any = null

    if (dto.orderItemId) {
      matchedRow = items.find(i => i.item.id === dto.orderItemId)
      if (!matchedRow) throw { status: 404, code: 'ORDER_ITEM_NOT_FOUND', message: 'Mahsulot topilmadi' }
      if (matchedRow.product.barcode.trim().toLowerCase() !== barcodeInput) {
         // Audit mismatch even if specific ID was targeted
         await tx.insert(pickPackAudit).values({
           orderId, orderItemId: matchedRow.item.id, performedBy: adminId,
           action: 'SCAN_MISMATCH', result: 'ERROR',
           scanInput: dto.barcodeInput, expectedBarcode: matchedRow.product.barcode
         })
         throw { status: 400, code: 'SCAN_MISMATCH', message: `Barcode mos kelmadi: ${dto.barcodeInput}` }
      }
    } else {
      matchedRow = items.find(i => !i.item.isScanned && i.product.barcode.trim().toLowerCase() === barcodeInput)
    }

    // 4. Mismatch
    if (!matchedRow) {
       // Check if barcode exists in any item but already scanned
       const alreadyScanned = items.find(i => i.item.isScanned && i.product.barcode.trim().toLowerCase() === barcodeInput)
       if (alreadyScanned) throw { status: 400, code: 'ITEM_ALREADY_SCANNED', message: 'Ushbu mahsulot allaqachon skanerdan o\'tgan' }

       // Real mismatch
       await tx.insert(pickPackAudit).values({
         orderId, 
         orderItemId: items[0]?.item.id, // Link to first item just for FK if needed, or maybe audit table allows null orderItemId? 
         // Looking at schema: orderItemId is NOT NULL. This is a problem for unknown barcodes.
         // Let's use first item id as placeholder or throw error.
         // Actually, I'll update audit logic to handle this if possible or just use a dummy id if needed.
         // Given schema constraints, I'll use items[0].id.
         performedBy: adminId,
         action: 'SCAN_MISMATCH', result: 'ERROR',
         scanInput: dto.barcodeInput
       })
       throw { status: 400, code: 'SCAN_MISMATCH', message: `Barcode topilmadi: ${dto.barcodeInput}` }
    }

    if (matchedRow.item.isScanned) throw { status: 400, code: 'ITEM_ALREADY_SCANNED', message: 'Ushbu mahsulot allaqachon skanerdan o\'tgan' }

    // 6. Success
    await tx.insert(pickPackAudit).values({
      orderId, orderItemId: matchedRow.item.id, performedBy: adminId,
      action: 'SCAN_SUCCESS', result: 'OK',
      scanInput: dto.barcodeInput, expectedBarcode: matchedRow.product.barcode
    })

    await tx.update(orderItems).set({
      isScanned: true, scannedAt: new Date(), scannedBy: adminId
    }).where(eq(orderItems.id, matchedRow.item.id))

    // 7. Check all scanned
    const updatedStatus = await getPackStatusInTx(tx, orderId)
    if (updatedStatus.allScanned) {
      await tx.insert(pickPackAudit).values({
        orderId, orderItemId: matchedRow.item.id, performedBy: adminId,
        action: 'ORDER_PACKED', result: 'OK'
      })

      const [admin] = await tx.select().from(adminUsers).where(eq(adminUsers.id, adminId)).limit(1)
      emit.orderStatusChanged({
        orderId, orderNumber: order.orderNumber,
        fromStatus: 'PACKING', toStatus: 'PACKING',
        changedBy: admin?.fullName || 'Admin',
        note: 'Barcha mahsulotlar skanerdan o\'tdi',
        changedAt: new Date().toISOString()
      })
    }

    return {
      ...updatedStatus,
      justScannedItemId: matchedRow.item.id,
      message: `${updatedStatus.scannedItems} dan ${updatedStatus.totalItems} ta skanerdan o'tdi`
    }
  })
}

export async function manualConfirm(orderId: string, itemId: string, adminId: string, dto: ManualConfirmDto) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) throw { status: 404, code: 'ORDER_NOT_FOUND', message: 'Buyurtma topilmadi' }
    if (order.status !== 'PACKING') throw { status: 400, code: 'ORDER_NOT_IN_PACKING', message: 'Faqat PACKING holatidagi buyurtmalarni tasdiqlash mumkin' }

    const [item] = await tx.select().from(orderItems).where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId))).limit(1)
    if (!item) throw { status: 404, code: 'ORDER_ITEM_NOT_FOUND', message: 'Mahsulot topilmadi' }
    if (item.isScanned) throw { status: 400, code: 'ITEM_ALREADY_SCANNED', message: 'Ushbu mahsulot allaqachon tasdiqlangan' }

    await tx.insert(pickPackAudit).values({
      orderId, orderItemId: itemId, performedBy: adminId,
      action: 'MANUAL_FALLBACK', result: 'OK',
      note: dto.note || 'Qo\'lda tasdiqlandi'
    })

    await tx.update(orderItems).set({
      isScanned: true, scannedAt: new Date(), scannedBy: adminId
    }).where(eq(orderItems.id, itemId))

    const updatedStatus = await getPackStatusInTx(tx, orderId)
    if (updatedStatus.allScanned) {
       await tx.insert(pickPackAudit).values({
        orderId, orderItemId: itemId, performedBy: adminId,
        action: 'ORDER_PACKED', result: 'OK'
      })

      const [admin] = await tx.select().from(adminUsers).where(eq(adminUsers.id, adminId)).limit(1)
      emit.orderStatusChanged({
        orderId, orderNumber: order.orderNumber,
        fromStatus: 'PACKING', toStatus: 'PACKING',
        changedBy: admin?.fullName || 'Admin',
        note: 'Barcha mahsulotlar skanerdan o\'tdi',
        changedAt: new Date().toISOString()
      })
    }

    return updatedStatus
  })
}

export async function getScanHistory(orderId: string) {
  const history = await db
    .select({
      id: pickPackAudit.id,
      action: pickPackAudit.action,
      result: pickPackAudit.result,
      scanInput: pickPackAudit.scanInput,
      expectedBarcode: pickPackAudit.expectedBarcode,
      performedByName: adminUsers.fullName,
      note: pickPackAudit.note,
      createdAt: pickPackAudit.createdAt
    })
    .from(pickPackAudit)
    .innerJoin(adminUsers, eq(pickPackAudit.performedBy, adminUsers.id))
    .where(eq(pickPackAudit.orderId, orderId))
    .orderBy(asc(pickPackAudit.createdAt))

  return history
}

// Internal helper
async function getPackStatusInTx(tx: any, orderId: string) {
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1)
  const items = await tx
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      productName: products.name,
      barcode: products.barcode,
      sku: products.sku,
      quantity: orderItems.quantity,
      isScanned: orderItems.isScanned,
      scannedAt: orderItems.scannedAt,
      scannedBy: adminUsers.fullName
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(adminUsers, eq(orderItems.scannedBy, adminUsers.id))
    .where(eq(orderItems.orderId, orderId))

  const totalItems = items.length
  const scannedItems = items.filter((i: any) => i.isScanned).length
  const allScanned = totalItems > 0 && scannedItems === totalItems

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalItems,
    scannedItems,
    allScanned,
    items
  }
}
