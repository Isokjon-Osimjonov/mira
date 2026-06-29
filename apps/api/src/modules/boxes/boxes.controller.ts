import type { Request, Response } from 'express'
import * as service from './boxes.service'
import { createBoxSchema, updateBoxSchema, adjustStockSchema } from './boxes.schema'

function formatBox(box: any) {
  return {
    ...box,
    maxWeightKg: box.maxWeightKg ? parseFloat(Number(box.maxWeightKg).toFixed(3)) : null,
    boxWeightKg: box.boxWeightKg ? parseFloat(Number(box.boxWeightKg).toFixed(3)) : null,
    priceUsd: box.priceUsd ? Number(box.priceUsd) : null,
    lengthCm: box.lengthCm ? Number(box.lengthCm) : null,
    widthCm: box.widthCm ? Number(box.widthCm) : null,
    heightCm: box.heightCm ? Number(box.heightCm) : null,
  }
}

export async function getActiveBoxes(_req: Request, res: Response) {
  try {
    const items = await service.getActiveBoxes()
    return res.json({ data: items.map(formatBox), error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getAllBoxes(_req: Request, res: Response) {
  try {
    const items = await service.getAllBoxes()
    return res.json({ data: items.map(formatBox), error: null })
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
    return res.json({ data: formatBox(data), error: null })
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

export async function updateBox(req: Request, res: Response) {
  try {
    const validated = updateBoxSchema.parse(req.body)
    const data = await service.updateBox(req.params.id, validated)
    return res.json({ data: formatBox(data), error: null })
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

export async function adjustStock(req: Request, res: Response) {
  try {
    const { qty, type } = adjustStockSchema.parse(req.body)
    const data = await service.adjustStock(req.params.id, qty, type)
    return res.json({ data: formatBox(data), error: null })
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
