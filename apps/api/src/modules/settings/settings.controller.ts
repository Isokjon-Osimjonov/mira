import type { Request, Response } from 'express'
import * as service from './settings.service'
import { updateSettingsSchema } from './settings.schema'
import { emit } from '../../config/socket'
import { db } from '../../config/db'
import { exchangeRateSnapshots, paymentMethods } from '@mira/db'
import { desc } from 'drizzle-orm'

export async function getPaymentMethods(_req: Request, res: Response) {
  try {
    const data = await service.getPublicSettings()
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getPaymentInfo(req: Request, res: Response) {
  try {
    const methods = await db.select().from(paymentMethods)

    const findMethod = (key: string) => methods.find((m) => m.method === key)

    const korBank = findMethod('BANK_CARD_KOR')
    const uzbBank = findMethod('BANK_CARD_UZB')
    const e9pay = findMethod('E9PAY')

    const settings = await service.getSettings()

    // Fetch latest exchange rate
    const [rate] = await db
      .select()
      .from(exchangeRateSnapshots)
      .orderBy(desc(exchangeRateSnapshots.createdAt))
      .limit(1)

    return res.json({
      data: {
        kor: {
          isEnabled: korBank?.isEnabled ?? false,
          bankName: korBank?.bankName ?? '',
          bankNumber: korBank?.accountNumber ?? '',
          bankHolder: korBank?.holderName ?? '',
        },
        uzb: {
          isEnabled: uzbBank?.isEnabled ?? false,
          bankName: uzbBank?.bankName ?? '',
          bankNumber: uzbBank?.accountNumber ?? '',
          bankHolder: uzbBank?.holderName ?? '',
        },
        e9pay: {
          isEnabled: e9pay?.isEnabled ?? false,
          name: e9pay?.holderName ?? '',
          account: e9pay?.accountNumber ?? '',
        },
        cargo: {
          uzbCargoUsdPerKg: settings.uzbCargoUsdPerKg ?? 3,
        },
        rates: {
          krwToUzs: rate ? Number(rate.krwToUzs) : 7.62,
        },
      },
      error: null,
    })
  } catch (e: any) {
    return res.status(500).json({
      data: null,
      error: { message: e.message },
    })
  }
}

export async function getAdminSettings(_req: Request, res: Response) {
  try {
    const data = await service.getSettings()
    // Exclude lockColumn
    const { lockColumn, ...rest } = data as any
    return res.json({ data: rest, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function updateAdminSettings(req: Request, res: Response) {
  try {
    const validated = updateSettingsSchema.parse(req.body)
    const data = await service.updateSettings(validated)

    // Emit socket event
    emit.settingsUpdated()

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

export async function getAdminPaymentMethods(_req: Request, res: Response, next: any) {
  try {
    const data = await service.getAdminPaymentMethods()
    res.json({ data, error: null })
  } catch (err) {
    next(err)
  }
}

export async function updatePaymentMethod(req: Request, res: Response, next: any) {
  try {
    const { method } = req.params
    const data = await service.updatePaymentMethod(method, req.body)
    res.json({ data, error: null })
  } catch (err) {
    next(err)
  }
}

export async function getLiveExchangeRate(_req: Request, res: Response, next: any) {
  try {
    const data = await service.fetchLiveExchangeRate()
    res.json({ data, error: null })
  } catch (err) {
    next(err)
  }
}

export async function getOrderSettings(_req: Request, res: Response, next: any) {
  try {
    const data = await service.getOrderSettings()
    res.json({ data, error: null })
  } catch (err) {
    next(err)
  }
}

export async function updateOrderSettings(req: Request, res: Response, next: any) {
  try {
    const data = await service.updateOrderSettings(req.body)
    res.json({ data, error: null })
  } catch (err) {
    next(err)
  }
}
