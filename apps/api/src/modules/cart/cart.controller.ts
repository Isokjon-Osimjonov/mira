import type { Request, Response } from 'express'
import * as service from './cart.service'
import { addCartItemSchema, updateCartItemSchema, validateCouponSchema } from './cart.schema'

export async function getCart(req: Request, res: Response) {
  try {
    const customerId = (req.user as any).sub
    const regionCode = (req.user as any).region
    const data = await service.getCart(customerId, regionCode)

    // Convert BigInts to Number before JSON
    const safeData = {
      ...data,
      items: data.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      })),
      summary: {
        ...data.summary,
        subtotal: Number(data.summary.subtotal),
      },
    }

    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getCartWeight(req: Request, res: Response) {
  try {
    const customerId = (req.user as any).sub
    const regionCode = (req.user as any).region
    const cart = await service.getCart(customerId, regionCode)

    const totalWeightGrams = cart.items.reduce((acc, item) => {
      // weightGrams not in cart item response yet
      // Return 0 for now — Sprint 9 adds weight to cart items
      return acc
    }, 0)

    return res.json({
      data: {
        totalWeightGrams,
        totalWeightKg: totalWeightGrams / 1000,
      },
      error: null,
    })
  } catch (e: any) {
    return res.status(e.status ?? 500).json({
      data: null,
      error: { message: e.message, code: e.code },
    })
  }
}

export async function addItem(req: Request, res: Response) {
  try {
    const validated = addCartItemSchema.parse(req.body)
    const customerId = (req.user as any).sub
    const regionCode = (req.user as any).region

    await service.addItem(customerId, regionCode, validated)
    const data = await service.getCart(customerId, regionCode)

    const safeData = {
      ...data,
      items: data.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      })),
      summary: {
        ...data.summary,
        subtotal: Number(data.summary.subtotal),
      },
    }

    return res.json({ data: safeData, error: null })
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

export async function updateItem(req: Request, res: Response) {
  try {
    const validated = updateCartItemSchema.parse(req.body)
    const itemId = req.params.itemId
    const customerId = (req.user as any).sub
    const regionCode = (req.user as any).region

    await service.updateItemQuantity(customerId, regionCode, itemId, validated.quantity)
    const data = await service.getCart(customerId, regionCode)

    const safeData = {
      ...data,
      items: data.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      })),
      summary: {
        ...data.summary,
        subtotal: Number(data.summary.subtotal),
      },
    }

    return res.json({ data: safeData, error: null })
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

export async function deleteItem(req: Request, res: Response) {
  try {
    const itemId = req.params.itemId
    const customerId = (req.user as any).sub
    const regionCode = (req.user as any).region

    await service.deleteItem(customerId, itemId)
    const data = await service.getCart(customerId, regionCode)

    const safeData = {
      ...data,
      items: data.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      })),
      summary: {
        ...data.summary,
        subtotal: Number(data.summary.subtotal),
      },
    }

    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function clearCart(req: Request, res: Response) {
  try {
    const customerId = (req.user as any).sub
    const regionCode = (req.user as any).region

    await service.clearCart(customerId)
    const data = await service.getCart(customerId, regionCode)

    const safeData = {
      ...data,
      items: [],
      summary: {
        ...data.summary,
        subtotal: Number(data.summary.subtotal),
      },
    }

    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function validateCoupon(req: Request, res: Response) {
  try {
    const validated = validateCouponSchema.parse(req.body)
    const customerId = (req.user as any).sub
    const regionCode = (req.user as any).region

    const data = await service.validateCartCoupon(customerId, regionCode, validated.code)

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
