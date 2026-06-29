import type { Request, Response } from 'express'
import * as service from './pick-pack.service'
import { scanBarcodeSchema, manualConfirmSchema } from './pick-pack.schema'

export async function getPackStatus(req: Request, res: Response) {
  try {
    const data = await service.getPackStatus(req.params.orderId)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function scanBarcode(req: Request, res: Response) {
  try {
    const validated = scanBarcodeSchema.parse(req.body)
    const adminId = (req.user as any).sub
    const data = await service.scanBarcode(req.params.orderId, adminId, validated)
    return res.json({ data, error: null })
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

export async function manualConfirm(req: Request, res: Response) {
  try {
    const validated = manualConfirmSchema.parse(req.body)
    const adminId = (req.user as any).sub
    const data = await service.manualConfirm(
      req.params.orderId,
      req.params.itemId,
      adminId,
      validated
    )
    return res.json({ data, error: null })
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

export async function getScanHistory(req: Request, res: Response) {
  try {
    const data = await service.getScanHistory(req.params.orderId)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}
