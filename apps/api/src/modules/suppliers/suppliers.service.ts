import { db } from '../../config/db'
import { suppliers, purchaseOrders, inventoryBatches, products } from '@mira/db'
import { eq, and, sql, desc, count, ilike, or } from 'drizzle-orm'
import type { CreateSupplierDto, UpdateSupplierDto } from './suppliers.schema'

export async function getSuppliers(query: {
  page?: number
  limit?: number
  isActive?: boolean
  search?: string
}) {
  const page = query.page || 1
  const limit = query.limit || 20
  const offset = (page - 1) * limit

  let where: any = sql`1=1`
  if (query.isActive !== undefined) {
    where = and(where, eq(suppliers.isActive, query.isActive))
  }
  if (query.search) {
    const s = `%${query.search}%`
    where = and(
      where,
      or(
        ilike(suppliers.name, s),
        ilike(suppliers.contactName, s),
        ilike(suppliers.email, s)
      )
    )
  }

  const itemsQuery = await db
    .select({
      supplier: suppliers,
      orderCount:
        sql<number>`(SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = ${suppliers.id})`.mapWith(
          Number
        ),
    })
    .from(suppliers)
    .where(where)
    .orderBy(desc(suppliers.createdAt))
    .limit(limit)
    .offset(offset)

  const [countRes] = await db.select({ count: count() }).from(suppliers).where(where)
  const total = Number(countRes?.count || 0)

  const items = itemsQuery.map((row) => ({
    ...row.supplier,
    orderCount: row.orderCount,
  }))

  return { items, meta: { page, limit, total, hasNext: offset + limit < total, hasPrev: page > 1 } }
}

export async function getSupplierById(id: string) {
  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1)
  if (!supplier)
    throw { status: 404, code: 'SUPPLIER_NOT_FOUND', message: 'Yetkazib beruvchi topilmadi' }

  const recentOrders = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.supplierId, id))
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(5)

  return {
    ...supplier,
    recentOrders: recentOrders.map((o) => ({ ...o, totalCostKrw: Number(o.totalCostKrw) })),
  }
}

export async function createSupplier(data: CreateSupplierDto) {
  const [created] = await db
    .insert(suppliers)
    .values(data as any)
    .returning()
  return created
}

export async function updateSupplier(id: string, data: UpdateSupplierDto) {
  const [updated] = await db
    .update(suppliers)
    .set({ ...data, updatedAt: new Date() } as any)
    .where(eq(suppliers.id, id))
    .returning()

  if (!updated)
    throw { status: 404, code: 'SUPPLIER_NOT_FOUND', message: 'Yetkazib beruvchi topilmadi' }
  return updated
}

export async function deleteSupplier(id: string) {
  const [orderCountRes] = await db
    .select({ count: count() })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.supplierId, id))

  if (Number(orderCountRes?.count || 0) > 0) {
    // Soft delete
    return await updateSupplier(id, { isActive: false })
  }

  const [deleted] = await db.delete(suppliers).where(eq(suppliers.id, id)).returning()
  if (!deleted)
    throw { status: 404, code: 'SUPPLIER_NOT_FOUND', message: 'Yetkazib beruvchi topilmadi' }
  return deleted
}

export async function getSupplierBatches(id: string) {
  return await db
    .select({
      id: inventoryBatches.id,
      productName: products.name,
      quantity: inventoryBatches.initialQty,
      createdAt: inventoryBatches.createdAt,
    })
    .from(inventoryBatches)
    .innerJoin(products, eq(inventoryBatches.productId, products.id))
    .where(eq(inventoryBatches.supplierId, id))
    .orderBy(desc(inventoryBatches.createdAt))
    .limit(50)
}
