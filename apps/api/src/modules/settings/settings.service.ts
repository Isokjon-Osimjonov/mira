import { db } from '../../config/db'
import { settings } from '@mira/db'
import { eq } from 'drizzle-orm'
import type { UpdateSettingsDto } from './settings.schema'

export async function getSettings() {
  const [row] = await db.select().from(settings).limit(1)
  if (!row) {
    // This should ideally be seeded, but if not found, we might need a default row
    // for now we assume it exists as per singleton requirement
    throw { status: 500, code: 'SETTINGS_NOT_FOUND', message: 'Tizim sozlamalari topilmadi' }
  }
  return row
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

  return updated
}
