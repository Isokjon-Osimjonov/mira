import type { Request, Response } from 'express'
import * as service from './kor-shipping.service'
import { createTierSchema, updateTierSchema } from './kor-shipping.schema'

export async function getActiveTiers(_req: Request, res: Response) {
  try {
    const items = await service.getActiveTiers()
    const safeData = items.map((t: any) => ({
      ...t,
      maxOrderKrw: t.maxOrderKrw ? Number(t.maxOrderKrw) : null,
      cargoFeeKrw: Number(t.cargoFeeKrw),
    }))
    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getAllTiers(_req: Request, res: Response) {
  try {
    const items = await service.getAllTiers()
    const safeData = items.map((t: any) => ({
      ...t,
      maxOrderKrw: t.maxOrderKrw ? Number(t.maxOrderKrw) : null,
      cargoFeeKrw: Number(t.cargoFeeKrw),
    }))
    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function createTier(req: Request, res: Response) {
  try {
    const validated = createTierSchema.parse(req.body)
    const data = await service.createTier(validated)
    const safeData = {
      ...data,
      maxOrderKrw: data.maxOrderKrw ? Number(data.maxOrderKrw) : null,
      cargoFeeKrw: Number(data.cargoFeeKrw),
    }
    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res.status(400).json({
        data: null,
        error: { message: "Ma'lumotlar noto'g'ri", code: 'VALIDATION_ERROR', details: e.errors },
      })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function updateTier(req: Request, res: Response) {
  try {
    const validated = updateTierSchema.parse(req.body)
    const data = await service.updateTier(req.params.id, validated)
    const safeData = {
      ...data,
      maxOrderKrw: data.maxOrderKrw ? Number(data.maxOrderKrw) : null,
      cargoFeeKrw: Number(data.cargoFeeKrw),
    }
    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res.status(400).json({
        data: null,
        error: { message: "Ma'lumotlar noto'g'ri", code: 'VALIDATION_ERROR', details: e.errors },
      })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function deleteTier(req: Request, res: Response) {
  try {
    const data = await service.deleteTier(req.params.id)
    return res.json({ data: { id: data.id }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}
