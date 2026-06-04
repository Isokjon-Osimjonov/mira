import { db } from '../../config/db'
import { settings, shippingTiers } from '@mira/db'
import { eq, asc } from 'drizzle-orm'
import type { UpdateSettingsDto } from './settings.schema'
import { cacheGet, cacheSet, cacheDelete, CACHE_TTL } from '../../lib/cache'

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
  const s = await getSettings()

  return [
    {
      id: 'bank-card',
      method: 'BANK_CARD',
      isEnabled: s.korBankEnabled || s.uzbBankEnabled,
      enabledRegions: [
        ...(s.korBankEnabled ? ['KOR'] : []),
        ...(s.uzbBankEnabled ? ['UZB'] : []),
      ],
      accountInfo: s.korBankNumber || s.uzbBankNumber || '',
      instructions: s.telegramUrl || '', // Placeholder or add new fields if needed
    },
    {
      id: 'e9pay',
      method: 'E9PAY',
      isEnabled: s.korE9payEnabled,
      enabledRegions: s.korE9payEnabled ? ['KOR'] : [],
      accountInfo: s.korE9payAccount || '',
      instructions: '',
    },
    {
      id: 'cash',
      method: 'CASH',
      isEnabled: true, // Always enabled or add field to DB
      enabledRegions: ['UZB'],
      accountInfo: '',
      instructions: 'Yetkazib berish vaqtida kuryerga to\'lanadi',
    }
  ]
}

export async function updatePaymentMethod(method: string, data: any) {
  const current = await getSettings()
  const update: any = { updatedAt: new Date() }

  if (method === 'BANK_CARD') {
    if (data.isEnabled !== undefined) {
      update.korBankEnabled = data.isEnabled
      update.uzbBankEnabled = data.isEnabled
    }
    if (data.enabledRegions) {
      update.korBankEnabled = data.enabledRegions.includes('KOR')
      update.uzbBankEnabled = data.enabledRegions.includes('UZB')
    }
    if (data.accountInfo !== undefined) {
      update.korBankNumber = data.accountInfo
      update.uzbBankNumber = data.accountInfo
    }
  } else if (method === 'E9PAY') {
    if (data.isEnabled !== undefined) update.korE9payEnabled = data.isEnabled
    if (data.accountInfo !== undefined) update.korE9payAccount = data.accountInfo
  }

  await db.update(settings).set(update).where(eq(settings.id, current.id))
  await cacheDelete(CACHE_KEY)
  return { success: true }
}

export async function getShippingTiers() {
  return await db.select().from(shippingTiers).orderBy(asc(shippingTiers.minQty))
}

export async function createShippingTier(data: any) {
  const [tier] = await db.insert(shippingTiers).values({
    region: data.region,
    minQty: data.minQty,
    shippingCost: BigInt(data.shippingCost),
  }).returning()
  return tier
}

export async function updateShippingTier(id: string, data: any) {
  const update: any = { updatedAt: new Date() }
  if (data.minQty !== undefined) update.minQty = data.minQty
  if (data.shippingCost !== undefined) update.shippingCost = BigInt(data.shippingCost)

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
    maxOrderQty: 100, // Placeholder or add to DB
    minOrderAmountKrw: Number(s.minOrderKorKrw),
  }
}

export async function updateOrderSettings(data: any) {
  const current = await getSettings()
  const update: any = { updatedAt: new Date() }

  if (data.paymentTimeoutMinutes !== undefined) update.paymentTimeoutMinutes = data.paymentTimeoutMinutes
  if (data.minOrderAmountKrw !== undefined) update.minOrderKorKrw = BigInt(data.minOrderAmountKrw)

  await db.update(settings).set(update).where(eq(settings.id, current.id))
  await cacheDelete(CACHE_KEY)
  return { success: true }
}

export async function getPublicSettings() {
  const row = await getSettings()
  return {
    korBankEnabled: row.korBankEnabled,
    korBankName: row.korBankName,
    korBankHolder: row.korBankHolder,
    korBankNumber: row.korBankNumber,
    korE9payEnabled: row.korE9payEnabled,
    korE9payName: row.korE9payName,
    korE9payAccount: row.korE9payAccount,
    uzbBankEnabled: row.uzbBankEnabled,
    uzbBankName: row.uzbBankName,
    uzbBankHolder: row.uzbBankHolder,
    uzbBankNumber: row.uzbBankNumber,
  }
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
  if (data.minOrderUzbKrw !== undefined) cleanData.minOrderUzbKrw = BigInt(data.minOrderUzbKrw)
  if (data.minOrderKorKrw !== undefined) cleanData.minOrderKorKrw = BigInt(data.minOrderKorKrw)

  const [updated] = await db
    .update(settings)
    .set({ ...cleanData, updatedAt: new Date() })
    .where(eq(settings.id, current.id))
    .returning()

  await cacheDelete(CACHE_KEY)
  return updated
}
