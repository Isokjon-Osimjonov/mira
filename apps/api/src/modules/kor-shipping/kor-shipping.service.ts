import { db } from '../../config/db'
import { korShippingTiers } from '@mira/db'
import { eq, asc, isNull, and, not } from 'drizzle-orm'
import type { CreateTierDto, UpdateTierDto } from './kor-shipping.schema'

export async function getActiveTiers() {
  return await db
    .select()
    .from(korShippingTiers)
    .where(eq(korShippingTiers.isActive, true))
    .orderBy(asc(korShippingTiers.sortOrder))
}

export async function getAllTiers() {
  return await db.select().from(korShippingTiers).orderBy(asc(korShippingTiers.sortOrder))
}

export async function createTier(data: CreateTierDto) {
  // Validate only ONE tier can have maxOrderKrw = null
  if (data.maxOrderKrw === null) {
    const [existing] = await db
      .select()
      .from(korShippingTiers)
      .where(isNull(korShippingTiers.maxOrderKrw))
      .limit(1)

    if (existing) {
      throw {
        status: 400,
        code: 'TIER_OVERLAP',
        message: 'Faqat bitta "unlimited" (maxOrderKrw=null) tier bo\'lishi mumkin.',
      }
    }
  }

  const [newTier] = await db
    .insert(korShippingTiers)
    .values({
      ...data,
      maxOrderKrw: data.maxOrderKrw !== null ? BigInt(data.maxOrderKrw) : null,
      cargoFeeKrw: BigInt(data.cargoFeeKrw),
    } as any)
    .returning()

  return newTier
}

export async function updateTier(id: string, data: UpdateTierDto) {
  if (data.maxOrderKrw === null) {
    const [existing] = await db
      .select()
      .from(korShippingTiers)
      .where(and(isNull(korShippingTiers.maxOrderKrw), not(eq(korShippingTiers.id, id))))
      .limit(1)

    if (existing) {
      throw {
        status: 400,
        code: 'TIER_OVERLAP',
        message: 'Faqat bitta "unlimited" tier bo\'lishi mumkin.',
      }
    }
  }

  const updates: any = { ...data, updatedAt: new Date() }
  if (data.maxOrderKrw !== undefined)
    updates.maxOrderKrw = data.maxOrderKrw !== null ? BigInt(data.maxOrderKrw) : null
  if (data.cargoFeeKrw !== undefined) updates.cargoFeeKrw = BigInt(data.cargoFeeKrw)

  const [updated] = await db
    .update(korShippingTiers)
    .set(updates)
    .where(eq(korShippingTiers.id, id))
    .returning()

  if (!updated) throw { status: 404, code: 'TIER_NOT_FOUND', message: 'Tier topilmadi' }
  return updated
}

export async function deleteTier(id: string) {
  const [deleted] = await db.delete(korShippingTiers).where(eq(korShippingTiers.id, id)).returning()
  if (!deleted) throw { status: 404, code: 'TIER_NOT_FOUND', message: 'Tier topilmadi' }
  return deleted
}
