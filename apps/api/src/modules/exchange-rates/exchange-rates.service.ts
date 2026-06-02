import { db } from '../../config/db'
import { exchangeRateSnapshots, settings, exchangeRateSourceEnum } from '@mira/db'
import { desc, eq } from 'drizzle-orm'
import axios from 'axios'
import { env } from '../../config/env'
import type { CreateExchangeRateDto } from './exchange-rates.schema'
import { getSettings } from '../settings/settings.service'

export async function getLatestExchangeRate() {
  const [latest] = await db
    .select()
    .from(exchangeRateSnapshots)
    .orderBy(desc(exchangeRateSnapshots.createdAt))
    .limit(1)

  if (!latest) {
    throw { status: 404, code: 'EXCHANGE_RATE_NOT_FOUND', message: 'Valyuta kursi topilmadi' }
  }

  return {
    krwToUzs: latest.krwToUzs,
    usdToKrw: latest.usdToKrw,
    cargoRateKrwPerKg: latest.cargoRateKrwPerKg,
    createdAt: latest.createdAt,
    source: latest.source,
  }
}

export async function getExchangeRateHistory() {
  return await db
    .select()
    .from(exchangeRateSnapshots)
    .orderBy(desc(exchangeRateSnapshots.createdAt))
    .limit(30)
}

export async function createManualExchangeRate(dto: CreateExchangeRateDto, adminId: string) {
  const { uzbCargoUsdPerKg } = await getSettings()

  const cargoRateKrwPerKg = Math.round(uzbCargoUsdPerKg * dto.usdToKrw)

  const [created] = await db
    .insert(exchangeRateSnapshots)
    .values({
      krwToUzs: dto.krwToUzs,
      usdToKrw: dto.usdToKrw,
      cargoRateKrwPerKg,
      note: dto.note,
      source: 'MANUAL',
      createdBy: adminId,
    })
    .returning()

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
        krwToUzs: Math.round(krwToUzs), // stored as integer as per requirement (e.g. 12)
        usdToKrw,
        cargoRateKrwPerKg,
        source: 'API',
        createdBy: null,
      })
      .returning()

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
