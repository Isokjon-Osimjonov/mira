import type { Request, Response } from 'express'
import * as service from './coupons.service'
import { createCouponSchema, updateCouponSchema, updateCouponStatusSchema } from './coupons.schema'

export async function getCoupons(req: Request, res: Response) {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined
    const limit = req.query.limit ? Number(req.query.limit) : undefined
    const search = req.query.search as string | undefined
    const status = req.query.status as string | undefined

    const result = await service.getCoupons({ page, limit, search, status })

    const safeData = result.items.map((item) => ({
      ...item,
      value: Number(item.value),
    }))

    return res.json({ data: safeData, meta: result.meta, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getCouponById(req: Request, res: Response) {
  try {
    const data = await service.getCouponById(req.params.id)

    const safeData = {
      ...data,
      value: Number(data.value),
      valueKrw: data.valueKrw ? Number(data.valueKrw) : null,
      maxDiscountCap: data.maxDiscountCap ? Number(data.maxDiscountCap) : null,
      maxDiscountKrw: data.maxDiscountKrw ? Number(data.maxDiscountKrw) : null,
      minOrderAmount: Number(data.minOrderAmount),
      minOrderKrw: data.minOrderKrw ? Number(data.minOrderKrw) : null,
      redemptions: data.redemptions.map((r) => ({
        ...r,
        discountAmount: Number(r.discountAmount),
      })),
    }

    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function createCoupon(req: Request, res: Response) {
  try {
    const validated = createCouponSchema.parse(req.body)
    const adminId = (req.user as any).sub

    const data = await service.createCoupon(validated, adminId)

    const safeData = {
      ...data,
      value: Number(data.value),
      valueKrw: data.valueKrw ? Number(data.valueKrw) : null,
      maxDiscountCap: data.maxDiscountCap ? Number(data.maxDiscountCap) : null,
      maxDiscountKrw: data.maxDiscountKrw ? Number(data.maxDiscountKrw) : null,
      minOrderAmount: Number(data.minOrderAmount),
      minOrderKrw: data.minOrderKrw ? Number(data.minOrderKrw) : null,
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

export async function updateCoupon(req: Request, res: Response) {
  try {
    const validated = updateCouponSchema.parse(req.body)

    const data = await service.updateCoupon(req.params.id, validated)

    const safeData = {
      ...data,
      value: Number(data.value),
      valueKrw: data.valueKrw ? Number(data.valueKrw) : null,
      maxDiscountCap: data.maxDiscountCap ? Number(data.maxDiscountCap) : null,
      maxDiscountKrw: data.maxDiscountKrw ? Number(data.maxDiscountKrw) : null,
      minOrderAmount: Number(data.minOrderAmount),
      minOrderKrw: data.minOrderKrw ? Number(data.minOrderKrw) : null,
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

export async function updateCouponStatus(req: Request, res: Response) {
  try {
    const validated = updateCouponStatusSchema.parse(req.body)

    const data = await service.updateCouponStatus(req.params.id, validated.status)

    const safeData = {
      ...data,
      value: Number(data.value),
      valueKrw: data.valueKrw ? Number(data.valueKrw) : null,
      maxDiscountCap: data.maxDiscountCap ? Number(data.maxDiscountCap) : null,
      maxDiscountKrw: data.maxDiscountKrw ? Number(data.maxDiscountKrw) : null,
      minOrderAmount: Number(data.minOrderAmount),
      minOrderKrw: data.minOrderKrw ? Number(data.minOrderKrw) : null,
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

export async function deleteCoupon(req: Request, res: Response) {
  try {
    const data = await service.deleteCoupon(req.params.id)
    return res.json({ data: { id: data.id, status: data.status }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getCouponRedemptions(req: Request, res: Response) {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined
    const limit = req.query.limit ? Number(req.query.limit) : undefined

    const result = await service.getCouponRedemptions(req.params.id, { page, limit })

    const safeData = result.items.map((item) => ({
      ...item,
      discountAmount: Number(item.discountAmount),
    }))

    return res.json({ data: safeData, meta: result.meta, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function generateCode(_req: Request, res: Response) {
  try {
    const data = await service.generateCouponCode()
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getAvailableCoupons(req: Request, res: Response) {
  try {
    const customerId = (req.user as any).sub
    const regionCode = (req.user as any).region || null
    const data = await service.getAvailableCoupons(customerId, regionCode)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getMyRedemptions(req: Request, res: Response) {
  try {
    const customerId = (req.user as any).sub
    const data = await service.getMyRedemptions(customerId)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}
