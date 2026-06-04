import type { Request, Response } from 'express'
import * as service from './settings.service'
import { updateSettingsSchema } from './settings.schema'
import { emit } from '../../config/socket'

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
      return res
        .status(400)
        .json({
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

export async function getShippingTiers(_req: Request, res: Response, next: any) {
  try {
    const data = await service.getShippingTiers()
    res.json({ data, error: null })
  } catch (err) {
    next(err)
  }
}

export async function createShippingTier(req: Request, res: Response, next: any) {
  try {
    const data = await service.createShippingTier(req.body)
    res.status(201).json({ data, error: null })
  } catch (err) {
    next(err)
  }
}

export async function updateShippingTier(req: Request, res: Response, next: any) {
  try {
    const { id } = req.params
    const data = await service.updateShippingTier(id, req.body)
    res.json({ data, error: null })
  } catch (err) {
    next(err)
  }
}

export async function deleteShippingTier(req: Request, res: Response, next: any) {
  try {
    const { id } = req.params
    const data = await service.deleteShippingTier(id)
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
