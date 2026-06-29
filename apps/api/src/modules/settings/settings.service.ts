import { db } from '../../config/db'
import { settings, paymentMethods } from '@mira/db'
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
    .insert(paymentMethods)
    .values({
      method: method,
      region: data.region || (method === 'BANK_CARD_KOR' ? 'KOR' : 'UZB'),
      isEnabled: data.isEnabled ?? false,
      bankName: data.bankName ?? '',
      accountNumber: data.accountNumber ?? '',
      holderName: data.holderName ?? '',
      instructions: data.instructions ?? '',
    })
    .onConflictDoUpdate({
      target: paymentMethods.method,
      set: {
        ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
        ...(data.bankName !== undefined && { bankName: data.bankName }),
        ...(data.accountNumber !== undefined && { accountNumber: data.accountNumber }),
        ...(data.holderName !== undefined && { holderName: data.holderName }),
        ...(data.instructions !== undefined && { instructions: data.instructions }),
        ...(data.region !== undefined && { region: data.region }),
        updatedAt: new Date(),
      }
    })
    .returning()

  await cacheDelete(CACHE_KEY)
  return updated
}

export async function getOrderSettings() {
  const s = await getSettings()
  return {
    paymentTimeoutMinutes: s.paymentTimeoutMinutes,
    lowStockThreshold: s.lowStockThreshold,
    cargoTransitDaysMin: s.cargoTransitDaysMin,
    cargoTransitDaysMax: s.cargoTransitDaysMax,
    uzbCargoUsdPerKg: s.uzbCargoUsdPerKg,
    usdToKrw: s.usdToKrw,
    minOrderKorKrw: Number(s.minOrderKorKrw),
    minOrderUzbUzs: Number(s.minOrderUzbUzs),
    telegramUrl: s.telegramUrl,
    instagramUrl: s.instagramUrl,
    websiteUrl: s.websiteUrl,
  }
}

export async function updateOrderSettings(data: any) {
  const current = await getSettings()
  const update: any = { updatedAt: new Date() }

  if (data.paymentTimeoutMinutes !== undefined) update.paymentTimeoutMinutes = data.paymentTimeoutMinutes
  if (data.lowStockThreshold !== undefined) update.lowStockThreshold = data.lowStockThreshold
  if (data.cargoTransitDaysMin !== undefined) update.cargoTransitDaysMin = data.cargoTransitDaysMin
  if (data.cargoTransitDaysMax !== undefined) update.cargoTransitDaysMax = data.cargoTransitDaysMax
  if (data.uzbCargoUsdPerKg !== undefined) update.uzbCargoUsdPerKg = data.uzbCargoUsdPerKg
  if (data.usdToKrw !== undefined) update.usdToKrw = data.usdToKrw
  if (data.minOrderKorKrw !== undefined) update.minOrderKorKrw = data.minOrderKorKrw
  if (data.minOrderUzbUzs !== undefined) update.minOrderUzbUzs = data.minOrderUzbUzs
  if (data.telegramUrl !== undefined) update.telegramUrl = data.telegramUrl
  if (data.instagramUrl !== undefined) update.instagramUrl = data.instagramUrl
  if (data.websiteUrl !== undefined) update.websiteUrl = data.websiteUrl

  await db.update(settings).set(update).where(eq(settings.id, current.id))
  await cacheDelete(CACHE_KEY)
  return await getOrderSettings()
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
