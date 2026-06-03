import type { Request, Response } from 'express'
import * as service from './wishlists.service'
import { z } from 'zod'

export async function getWishlist(req: Request, res: Response) {
  try {
    const customerId = (req.user as any).sub
    const region = (req.user as any).region
    const items = await service.getWishlist(customerId, region)

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

export async function addToWishlist(req: Request, res: Response) {
  try {
    const schema = z.object({ productId: z.string().uuid() })
    const { productId } = schema.parse(req.body)
    const customerId = (req.user as any).sub

    await service.addToWishlist(customerId, productId)
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

export async function removeFromWishlist(req: Request, res: Response) {
  try {
    const productId = req.params.productId
    const customerId = (req.user as any).sub

    await service.removeFromWishlist(customerId, productId)
    return res.json({ data: { success: true }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}
