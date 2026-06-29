import { db } from '../../config/db'
import { userAddresses } from '@mira/db'
import { eq, and, desc } from 'drizzle-orm'
import axios from 'axios'
import { env } from '../../config/env'
import type { CreateAddressDto, UpdateAddressDto } from './addresses.schema'

export async function getCustomerAddresses(customerId: string) {
  return await db
    .select()
    .from(userAddresses)
    .where(eq(userAddresses.customerId, customerId))
    .orderBy(desc(userAddresses.isDefault), desc(userAddresses.createdAt))
}

export async function createAddress(customerId: string, data: CreateAddressDto) {
  const existing = await db
    .select()
    .from(userAddresses)
    .where(eq(userAddresses.customerId, customerId))

  if (existing.length >= 10) {
    throw {
      status: 400,
      code: 'ADDRESS_LIMIT_EXCEEDED',
      message: 'Maksimal 10 ta manzil ruxsat etilgan',
    }
  }

  const isFirst = existing.length === 0
  const shouldBeDefault = data.isDefault || isFirst

  return await db.transaction(async (tx) => {
    if (shouldBeDefault) {
      await tx
        .update(userAddresses)
        .set({ isDefault: false })
        .where(eq(userAddresses.customerId, customerId))
    }

    const [created] = await tx
      .insert(userAddresses)
      .values({
        ...data,
        customerId,
        isDefault: shouldBeDefault,
      } as any)
      .returning()

    return created
  })
}

export async function updateAddress(id: string, customerId: string, data: UpdateAddressDto) {
  const [address] = await db.select().from(userAddresses).where(eq(userAddresses.id, id)).limit(1)

  if (!address) throw { status: 404, code: 'ADDRESS_NOT_FOUND', message: 'Manzil topilmadi' }
  if (address.customerId !== customerId)
    throw { status: 403, code: 'ADDRESS_UNAUTHORIZED', message: 'Ruxsat etilmagan' }

  return await db.transaction(async (tx) => {
    if (data.isDefault) {
      await tx
        .update(userAddresses)
        .set({ isDefault: false })
        .where(eq(userAddresses.customerId, customerId))
    }

    const [updated] = await tx
      .update(userAddresses)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(userAddresses.id, id))
      .returning()

    return updated
  })
}

export async function setDefault(id: string, customerId: string) {
  const [address] = await db.select().from(userAddresses).where(eq(userAddresses.id, id)).limit(1)

  if (!address) throw { status: 404, code: 'ADDRESS_NOT_FOUND', message: 'Manzil topilmadi' }
  if (address.customerId !== customerId)
    throw { status: 403, code: 'ADDRESS_UNAUTHORIZED', message: 'Ruxsat etilmagan' }

  return await db.transaction(async (tx) => {
    await tx
      .update(userAddresses)
      .set({ isDefault: false })
      .where(eq(userAddresses.customerId, customerId))

    await tx
      .update(userAddresses)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(userAddresses.id, id))

    return { success: true }
  })
}

export async function deleteAddress(id: string, customerId: string) {
  const [address] = await db.select().from(userAddresses).where(eq(userAddresses.id, id)).limit(1)

  if (!address) throw { status: 404, code: 'ADDRESS_NOT_FOUND', message: 'Manzil topilmadi' }
  if (address.customerId !== customerId)
    throw { status: 403, code: 'ADDRESS_UNAUTHORIZED', message: 'Ruxsat etilmagan' }

  // Snapshot already copied to order, safe to delete.
  await db.delete(userAddresses).where(eq(userAddresses.id, id))
  return { success: true }
}

export async function searchJusoAddress(query: string) {
  if (query.length < 2) return []

  try {
    const response = await axios.get('https://business.juso.go.kr/addrlink/addrLinkApi.do', {
      params: {
        confmKey: env.JUSO_API_KEY,
        currentPage: 1,
        countPerPage: 10,
        keyword: query,
        resultType: 'json',
      },
    })

    const results = response.data?.results?.juso || []
    return results.map((item: any) => ({
      zipNo: item.zipNo,
      roadAddr: item.roadAddr,
      jibunAddr: item.jibunAddr,
      detBdNmList: item.detBdNmList,
    }))
  } catch (error) {
    console.error('Juso API Error:', error)
    throw { status: 502, code: 'JUSO_API_ERROR', message: 'Koreya manzil xizmati ishlamayapti' }
  }
}
