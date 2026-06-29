import { db } from '../../config/db'
import { exchangeRateSnapshots, settings, exchangeRateSourceEnum } from '@mira/db'
import { desc, eq } from 'drizzle-orm'
import axios from 'axios'
import { env } from '../../config/env'
import type { CreateExchangeRateDto } from './exchange-rates.schema'
import { getSettings } from '../settings/settings.service'
import { cacheGet, cacheSet, cacheDelete, CACHE_TTL } from '../../lib/cache'

const CACHE_KEY = 'exchange_rate:latest'

export async function getLatestExchangeRate() {
  const cached = await cacheGet<any>(CACHE_KEY)
  if (cached) return { ...cached, createdAt: new Date(cached.createdAt) }

  const [latest] = await db
    .select()
    .from(exchangeRateSnapshots)
    .orderBy(desc(exchangeRateSnapshots.createdAt))
    .limit(1)

  if (!latest) {
    throw { status: 404, code: 'EXCHANGE_RATE_NOT_FOUND', message: 'Valyuta kursi topilmadi' }
  }

  const result = {
    krwToUzs: Number(latest.krwToUzs),
    usdToKrw: Number(latest.usdToKrw),
    cargoRateKrwPerKg: Number(latest.cargoRateKrwPerKg),
    createdAt: latest.createdAt,
    source: latest.source,
  }

  await cacheSet(CACHE_KEY, result, CACHE_TTL.EXCHANGE_RATE)
  return result
}

export async function getExchangeRateHistory() {
  const rows = await db
    .select()
    .from(exchangeRateSnapshots)
    .orderBy(desc(exchangeRateSnapshots.createdAt))
    .limit(30)

  return rows.map((r) => ({
    ...r,
    krwToUzs: Number(r.krwToUzs),
    usdToKrw: Number(r.usdToKrw),
    cargoRateKrwPerKg: Number(r.cargoRateKrwPerKg),
  }))
}

export async function createManualExchangeRate(dto: CreateExchangeRateDto, adminId: string) {
  const { uzbCargoUsdPerKg } = await getSettings()

  let usdToKrw = dto.usdToKrw
  if (!usdToKrw) {
    const [latest] = await db
      .select()
      .from(exchangeRateSnapshots)
      .orderBy(desc(exchangeRateSnapshots.createdAt))
      .limit(1)

    usdToKrw = latest ? Number(latest.usdToKrw) : 1350
  }

  const cargoRateKrwPerKg = Math.round(uzbCargoUsdPerKg * (usdToKrw as number))

  const [created] = await db
    .insert(exchangeRateSnapshots)
    .values({
      krwToUzs: dto.krwToUzs.toString(),
      usdToKrw: (usdToKrw as number).toString(),
      cargoRateKrwPerKg: cargoRateKrwPerKg.toString(),
      note: dto.note,
      source: 'MANUAL',
      createdBy: adminId,
    })
    .returning()

  await cacheDelete(CACHE_KEY)
  return created
}

export async function fetchAndSaveExchangeRate() {
  if (!env.EXCHANGE_RATE_API_KEY) {
    throw {
      status: 400,
      code: 'API_KEY_MISSING',
      message: 'Exchange rate API key sozlanmagan',
    }
  }

  const [lastFetch] = await db
    .select({ createdAt: exchangeRateSnapshots.createdAt })
    .from(exchangeRateSnapshots)
    .where(eq(exchangeRateSnapshots.source, 'API'))
    .orderBy(desc(exchangeRateSnapshots.createdAt))
    .limit(1)

  if (lastFetch) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    if (lastFetch.createdAt > oneHourAgo) {
      throw {
        status: 429,
        code: 'RATE_LIMITED',
        message: 'Valyuta kursi 1 soatda faqat 1 marta yangilanadi',
      }
    }
  }

  const url = `${env.EXCHANGE_RATE_API_URL}/${env.EXCHANGE_RATE_API_KEY}/latest/KRW`

  try {
    const { data } = await axios.get(url)

    const krwToUzs = Number(data.conversion_rates.UZS.toFixed(2))
    const usdToKrw = Math.round(1 / data.conversion_rates.USD)

    const { uzbCargoUsdPerKg } = await getSettings()
    const cargoRateKrwPerKg = Math.round(uzbCargoUsdPerKg * usdToKrw)

    const [created] = await db
      .insert(exchangeRateSnapshots)
      .values({
        krwToUzs: krwToUzs.toString(),
        usdToKrw: usdToKrw.toString(),
        cargoRateKrwPerKg: cargoRateKrwPerKg.toString(),
        source: 'API',
        createdBy: null,
      })
      .returning()

    await cacheDelete(CACHE_KEY)
    return created
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw {
        status: 502,
        code: 'API_GATEWAY_ERROR',
        message: 'Valyuta kursi provayderidan xatolik qaytdi',
      }
    }
    throw error
  }
}
