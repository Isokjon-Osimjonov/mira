import { db } from '../../config/db'
import { boxes, orders } from '@mira/db'
import { eq, asc, sql } from 'drizzle-orm'
import type { CreateBoxDto, UpdateBoxDto } from './boxes.schema'
import { cacheGet, cacheSet, cacheDelete, CACHE_TTL } from '../../lib/cache'

const CACHE_KEY = 'boxes:active'

export async function getActiveBoxes() {
  const cached = await cacheGet<any>(CACHE_KEY)
  if (cached) return cached

  const result = await db
    .select({
      id: boxes.id,
      name: boxes.name,
      maxWeightKg: boxes.maxWeightKg,
      boxWeightKg: boxes.boxWeightKg,
      priceUsd: boxes.priceUsd,
    })
    .from(boxes)
    .where(eq(boxes.isActive, true))
    .orderBy(asc(boxes.sortOrder))

  await cacheSet(CACHE_KEY, result, CACHE_TTL.BOXES)
  return result
}

export async function getAllBoxes() {
  return await db.select().from(boxes).orderBy(asc(boxes.sortOrder))
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
    throw {
      status: 400,
      code: 'BOX_IN_USE',
      message: "Bu quti buyurtmalarda ishlatilgan. O'chirib bo'lmaydi.",
    }
  }

  const [deleted] = await db.delete(boxes).where(eq(boxes.id, id)).returning()
  if (!deleted) throw { status: 404, code: 'BOX_NOT_FOUND', message: 'Quti topilmadi' }
  await cacheDelete(CACHE_KEY)
  return deleted
}
