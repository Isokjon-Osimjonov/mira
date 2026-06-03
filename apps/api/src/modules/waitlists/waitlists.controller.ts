import type { Request, Response } from 'express'
import * as service from './waitlists.service'
import { z } from 'zod'

export async function getWaitlist(req: Request, res: Response) {
  try {
    const customerId = (req.user as any).sub
    const region = (req.user as any).region
    const items = await service.getWaitlist(customerId, region)

    const safeData = items.map((item) => ({
      ...item,
      retailPrice: Number(item.retailPrice),
    }))

    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function addToWaitlist(req: Request, res: Response) {
  try {
    const schema = z.object({ productId: z.string().uuid() })
    const { productId } = schema.parse(req.body)
    const customerId = (req.user as any).sub

    const result = await service.addToWaitlist(customerId, productId)
    if (result.inStock) {
      return res.json({ data: { message: result.message }, error: null })
    }
    return res.json({ data: { success: true }, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res
        .status(400)
        .json({ data: null, error: { message: "Ma'lumotlar noto'g'ri", code: 'VALIDATION_ERROR' } })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function removeFromWaitlist(req: Request, res: Response) {
  try {
    const productId = req.params.productId
    const customerId = (req.user as any).sub

    await service.removeFromWaitlist(customerId, productId)
    return res.json({ data: { success: true }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function adminGetWaitlist(req: Request, res: Response) {
  try {
    const productId = req.params.productId
    const data = await service.adminGetWaitlist(productId)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}
