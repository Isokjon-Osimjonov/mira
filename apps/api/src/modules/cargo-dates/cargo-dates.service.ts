import { db } from '../../config/db'
import { cargoDates } from '@mira/db'
import { eq, gte, asc } from 'drizzle-orm'

export async function getUpcomingCargoDates() {
  const today = new Date().toISOString().split('T')[0]
  return await db.select().from(cargoDates)
    .where(eq(cargoDates.isActive, true))
    .orderBy(asc(cargoDates.cargoDate))
}

export async function getAllCargoDates() {
  return await db.select().from(cargoDates)
    .orderBy(asc(cargoDates.cargoDate))
}

export async function createCargoDate(data: {
  cargoDate: string
  note?: string
}) {
  const [created] = await db.insert(cargoDates)
    .values(data).returning()
  return created
}

export async function deleteCargoDate(id: string) {
  const [deleted] = await db.delete(cargoDates)
    .where(eq(cargoDates.id, id)).returning()
  if (!deleted) throw {
    status: 404, code: 'NOT_FOUND',
    message: "Sana topilmadi"
  }
  return deleted
}

export async function updateCargoDate(id: string, data: {
  note?: string
  isActive?: boolean
}) {
  const [updated] = await db.update(cargoDates)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(cargoDates.id, id)).returning()
  if (!updated) throw {
    status: 404, code: 'NOT_FOUND',
    message: "Sana topilmadi"
  }
  return updated
}

// Find next cargo date on/after a given date
export async function getNextCargoDateFrom(fromDate: Date) {
  const fromStr = fromDate.toISOString().split('T')[0]
  const [next] = await db.select().from(cargoDates)
    .where(eq(cargoDates.isActive, true))
    .orderBy(asc(cargoDates.cargoDate))

  const all = await db.select().from(cargoDates)
    .where(eq(cargoDates.isActive, true))
    .orderBy(asc(cargoDates.cargoDate))

  const found = all.find(c => c.cargoDate >= fromStr)
  return found ?? null
}
