import type { Request, Response } from 'express'
import * as service from './boxes.service'
import { createBoxSchema, updateBoxSchema } from './boxes.schema'

export async function getActiveBoxes(_req: Request, res: Response) {
  try {
    const items = await service.getActiveBoxes()
    const safeData = items.map((box) => ({
      ...box,
      maxWeightKg: parseFloat(Number(box.maxWeightKg).toFixed(3)),
      boxWeightKg: parseFloat(Number(box.boxWeightKg).toFixed(3)),
      priceUsd: Number(box.priceUsd),
    }))
    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getAllBoxes(_req: Request, res: Response) {
  try {
    const items = await service.getAllBoxes()
    const safeData = items.map((box) => ({
      ...box,
      maxWeightKg: parseFloat(Number(box.maxWeightKg).toFixed(3)),
      boxWeightKg: parseFloat(Number(box.boxWeightKg).toFixed(3)),
      priceUsd: Number(box.priceUsd),
    }))
    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function createBox(req: Request, res: Response) {
  try {
    const validated = createBoxSchema.parse(req.body)
    const data = await service.createBox(validated)
    const safeData = {
      ...data,
      maxWeightKg: parseFloat(Number(data.maxWeightKg).toFixed(3)),
      boxWeightKg: parseFloat(Number(data.boxWeightKg).toFixed(3)),
      priceUsd: Number(data.priceUsd),
    }
    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res
        .status(400)
        .json({
          data: null,
          error: { message: "Ma'lumotlar noto'g'ri", code: 'VALIDATION_ERROR', details: e.errors },
        })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function updateBox(req: Request, res: Response) {
  try {
    const validated = updateBoxSchema.parse(req.body)
    const data = await service.updateBox(req.params.id, validated)
    const safeData = {
      ...data,
      maxWeightKg: parseFloat(Number(data.maxWeightKg).toFixed(3)),
      boxWeightKg: parseFloat(Number(data.boxWeightKg).toFixed(3)),
      priceUsd: Number(data.priceUsd),
    }
    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res
        .status(400)
        .json({
          data: null,
          error: { message: "Ma'lumotlar noto'g'ri", code: 'VALIDATION_ERROR', details: e.errors },
        })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function deleteBox(req: Request, res: Response) {
  try {
    const data = await service.deleteBox(req.params.id)
    return res.json({ data: { id: data.id }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}
