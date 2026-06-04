import { db } from '../../config/db'
import { settings, shippingTiers, paymentMethods } from '@mira/db'
import { eq, asc } from 'drizzle-orm'
import type { UpdateSettingsDto } from './settings.schema'
import { cacheGet, cacheSet, cacheDelete, CACHE_TTL } from '../../lib/cache'
import { logger } from '../../config/logger'

const CACHE_KEY = 'settings:singleton'

export async function getSettings() {
  const cached = await cacheGet<any>(CACHE_KEY)
  if (cached) return cached

  const [row] = await db.select().from(settings).limit(1)
  if (!row) {
    throw { status: 500, code: 'SETTINGS_NOT_FOUND', message: 'Tizim sozlamalari topilmadi' }
  }

  await cacheSet(CACHE_KEY, row, CACHE_TTL.SETTINGS)
  return row
}

export async function getAdminPaymentMethods() {
  return await db.select().from(paymentMethods).orderBy(asc(paymentMethods.method))
}

export async function updatePaymentMethod(method: string, data: any) {
  const [updated] = await db
    .update(paymentMethods)
    .set({
      ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
      ...(data.bankName !== undefined && { bankName: data.bankName }),
      ...(data.accountNumber !== undefined && { accountNumber: data.accountNumber }),
      ...(data.holderName !== undefined && { holderName: data.holderName }),
      ...(data.instructions !== undefined && { instructions: data.instructions }),
      updatedAt: new Date(),
    })
    .where(eq(paymentMethods.method, method))
    .returning()

  if (!updated) {
    throw { status: 404, message: 'To\'lov usuli topilmadi' }
  }

  await cacheDelete(CACHE_KEY)
  return updated
}

export async function getShippingTiers() {
  return await db.select().from(shippingTiers).orderBy(asc(shippingTiers.minOrderAmount))
}

export async function createShippingTier(data: any) {
  const [tier] = await db
    .insert(shippingTiers)
    .values({
      region: data.region,
      minOrderAmount: BigInt(data.minOrderAmount),
      shippingCost: BigInt(data.shippingCost),
      currency: data.currency || (data.region === 'KOR' ? 'KRW' : 'UZS'),
    })
    .returning()
  return tier
}

export async function updateShippingTier(id: string, data: any) {
  const update: any = { updatedAt: new Date() }
  if (data.minOrderAmount !== undefined) update.minOrderAmount = BigInt(data.minOrderAmount)
  if (data.shippingCost !== undefined) update.shippingCost = BigInt(data.shippingCost)
  if (data.currency !== undefined) update.currency = data.currency

  const [tier] = await db.update(shippingTiers).set(update).where(eq(shippingTiers.id, id)).returning()
  return tier
}

export async function deleteShippingTier(id: string) {
  await db.delete(shippingTiers).where(eq(shippingTiers.id, id))
  return { success: true }
}

export async function getOrderSettings() {
  const s = await getSettings()
  return {
    paymentTimeoutMinutes: s.paymentTimeoutMinutes,
    minOrderKorKrw: Number(s.minOrderKorKrw),
    minOrderUzbUzs: Number(s.minOrderUzbUzs),
  }
}

export async function updateOrderSettings(data: any) {
  const current = await getSettings()
  const update: any = { updatedAt: new Date() }

  if (data.paymentTimeoutMinutes !== undefined) update.paymentTimeoutMinutes = data.paymentTimeoutMinutes
  if (data.minOrderKorKrw !== undefined) update.minOrderKorKrw = data.minOrderKorKrw
  if (data.minOrderUzbUzs !== undefined) update.minOrderUzbUzs = data.minOrderUzbUzs

  await db.update(settings).set(update).where(eq(settings.id, current.id))
  await cacheDelete(CACHE_KEY)
  return { success: true }
}

export async function fetchLiveExchangeRate() {
  const res = await fetch('https://open.er-api.com/v6/latest/KRW')
  if (!res.ok) {
    throw {
      status: 502,
      code: 'EXCHANGE_RATE_FETCH_FAILED',
      message: 'Valyuta kursini olishda xatolik',
    }
  }
  const data = await res.json()
  const uzsRate = data?.rates?.UZS

  if (!uzsRate || typeof uzsRate !== 'number') {
    throw {
      status: 502,
      code: 'EXCHANGE_RATE_INVALID',
      message: "API dan noto'g'ri kurs keldi",
    }
  }

  // Round to clean number (e.g. 12.0)
  const rounded = Math.round(uzsRate * 100) / 100

  logger.info({ rate: rounded }, 'Live exchange rate fetched')

  return { rate: rounded, source: 'open.er-api.com' }
}

export async function getPublicSettings() {
  const methods = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.isEnabled, true))
    .orderBy(asc(paymentMethods.method))

  return methods.map((m) => ({
    method: m.method,
    region: m.region,
    bankName: m.bankName,
    accountNumber: m.accountNumber,
    holderName: m.holderName,
    instructions: m.instructions,
  }))
}

export async function updateSettings(data: UpdateSettingsDto) {
  const current = await getSettings()

  // Clean data to exclude protected fields
  const cleanData: any = { ...data }
  delete cleanData.id
  delete cleanData.lockColumn
  delete cleanData.createdAt

  // BigInt conversion for specific fields
  if (data.standardShippingFeeKrw !== undefined)
    cleanData.standardShippingFeeKrw = BigInt(data.standardShippingFeeKrw)
  if (data.freeShippingThresholdKrw !== undefined)
    cleanData.freeShippingThresholdKrw = BigInt(data.freeShippingThresholdKrw)
  if (data.minOrderKorKrw !== undefined) cleanData.minOrderKorKrw = data.minOrderKorKrw
  if (data.minOrderUzbUzs !== undefined) cleanData.minOrderUzbUzs = data.minOrderUzbUzs

  const [updated] = await db
    .update(settings)
    .set({ ...cleanData, updatedAt: new Date() })
    .where(eq(settings.id, current.id))
    .returning()

  await cacheDelete(CACHE_KEY)
  return updated
}
