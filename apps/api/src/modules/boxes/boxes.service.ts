import { db } from '../../config/db'
import { boxes, orders } from '@mira/db'
import { eq, asc, sql } from 'drizzle-orm'
import type { CreateBoxDto, UpdateBoxDto } from './boxes.schema'
import { cacheDelete } from '../../lib/cache'

const CACHE_KEY = 'boxes:active'

export async function getActiveBoxes() {
  // We'll skip cache for now to ensure consistency during migration
  return await db
    .select()
    .from(boxes)
    .where(eq(boxes.isActive, true))
    .orderBy(asc(boxes.sortOrder), asc(boxes.name))
}

export async function getAllBoxes() {
  return await db.select().from(boxes).orderBy(asc(boxes.sortOrder), asc(boxes.name))
}

export async function createBox(data: CreateBoxDto) {
  const [newBox] = await db
    .insert(boxes)
    .values(data as any)
    .returning()
  await cacheDelete(CACHE_KEY)
  return newBox
}

export async function updateBox(id: string, data: UpdateBoxDto) {
  const [updated] = await db
    .update(boxes)
    .set({ ...data, updatedAt: new Date() } as any)
    .where(eq(boxes.id, id))
    .returning()

  if (!updated) throw { status: 404, code: 'BOX_NOT_FOUND', message: 'Quti topilmadi' }
  await cacheDelete(CACHE_KEY)
  return updated
}

export async function deleteBox(id: string) {
  // Check if used in orders
  const [usage] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(eq(orders.boxId, id))
    .limit(1)

  if (Number(usage?.count || 0) > 0) {
    // Instead of hard delete, we'll just deactivate
    return await updateBox(id, { isActive: false })
  }

  const [deleted] = await db.delete(boxes).where(eq(boxes.id, id)).returning()
  if (!deleted) throw { status: 404, code: 'BOX_NOT_FOUND', message: 'Quti topilmadi' }
  await cacheDelete(CACHE_KEY)
  return deleted
}

export async function adjustStock(id: string, qty: number, type: 'add' | 'use') {
  const [box] = await db.select().from(boxes).where(eq(boxes.id, id)).limit(1)
  if (!box) throw { status: 404, code: 'BOX_NOT_FOUND', message: 'Quti topilmadi' }

  let newCount = box.stockCount
  if (type === 'add') {
    newCount += qty
  } else {
    newCount = Math.max(0, newCount - qty)
  }

  const [updated] = await db
    .update(boxes)
    .set({ stockCount: newCount, updatedAt: new Date() })
    .where(eq(boxes.id, id))
    .returning()

  return updated
}
