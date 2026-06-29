import type { Request, Response } from 'express'
import * as service from './exchange-rates.service'
import { createExchangeRateSchema } from './exchange-rates.schema'
import { emit } from '../../config/socket'

export async function getCurrentRate(_req: Request, res: Response) {
  try {
    const data = await service.getLatestExchangeRate()
    return res.json({
      data: {
        rate: data.krwToUzs,
        updatedAt: data.createdAt instanceof Date ? data.createdAt.toISOString() : data.createdAt,
      },
      error: null,
    })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getLatest(_req: Request, res: Response) {
  try {
    const data = await service.getLatestExchangeRate()
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getHistory(_req: Request, res: Response) {
  try {
    const data = await service.getExchangeRateHistory()
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function createManual(req: Request, res: Response) {
  try {
    const validated = createExchangeRateSchema.parse(req.body)
    const adminId = (req.user as any).sub
    const data = await service.createManualExchangeRate(validated, adminId)

    emit.exchangeRateUpdated({
      krwToUzs: Number(data.krwToUzs),
      usdToKrw: Number(data.usdToKrw),
      cargoRateKrw: Number(data.cargoRateKrwPerKg),
      source: data.source as 'API' | 'MANUAL',
      updatedAt: data.createdAt.toISOString(),
    })

    return res.json({ data, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return res.status(400).json({
        data: null,
        error: { message: "Ma'lumotlar noto'g'ri", code: 'VALIDATION_ERROR', details: e.errors },
      })
    }
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function fetchAuto(_req: Request, res: Response) {
  try {
    const data = await service.fetchAndSaveExchangeRate()

    emit.exchangeRateUpdated({
      krwToUzs: Number(data.krwToUzs),
      usdToKrw: Number(data.usdToKrw),
      cargoRateKrw: Number(data.cargoRateKrwPerKg),
      source: data.source as 'API' | 'MANUAL',
      updatedAt: data.createdAt.toISOString(),
    })

    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}
