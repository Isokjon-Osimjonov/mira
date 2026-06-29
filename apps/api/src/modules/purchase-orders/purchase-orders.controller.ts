import type { Request, Response } from 'express'
import * as service from './purchase-orders.service'
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  updatePOStatusSchema,
  receivePOSchema,
  recordPaymentSchema,
} from './purchase-orders.schema'

export async function getPurchaseOrders(req: Request, res: Response) {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined
    const limit = req.query.limit ? Number(req.query.limit) : undefined
    const status = req.query.status as string | undefined
    const supplierId = req.query.supplierId as string | undefined
    const dateFrom = req.query.dateFrom as string | undefined
    const dateTo = req.query.dateTo as string | undefined

    const data = await service.getPurchaseOrders({
      page,
      limit,
      status,
      supplierId,
      dateFrom,
      dateTo,
    })
    return res.json({ data: data.items, meta: data.meta, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getPurchaseOrderById(req: Request, res: Response) {
  try {
    const data = await service.getPurchaseOrderById(req.params.id)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function createPurchaseOrder(req: Request, res: Response) {
  try {
    const validated = createPurchaseOrderSchema.parse(req.body)
    const adminId = (req.user as any).sub
    const data = await service.createPurchaseOrder(validated, adminId)
    const safeData = { ...data, totalCostKrw: Number(data.totalCostKrw) }
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

export async function updatePurchaseOrder(req: Request, res: Response) {
  try {
    const validated = updatePurchaseOrderSchema.parse(req.body)
    const data = await service.updatePurchaseOrder(req.params.id, validated)
    const safeData = { ...data, totalCostKrw: Number(data.totalCostKrw) }
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

export async function updateStatus(req: Request, res: Response) {
  try {
    const validated = updatePOStatusSchema.parse(req.body)
    const data = await service.updatePurchaseOrderStatus(req.params.id, validated.status)
    const safeData = { ...data, totalCostKrw: Number(data.totalCostKrw) }
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

export async function receiveOrder(req: Request, res: Response) {
  try {
    const validated = receivePOSchema.parse(req.body)
    const adminId = (req.user as any).sub
    const data = await service.receivePurchaseOrder(req.params.id, validated, adminId)
    const safeData = { ...data, totalCostKrw: Number(data.totalCostKrw) }
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

export async function deletePurchaseOrder(req: Request, res: Response) {
  try {
    const data = await service.deletePurchaseOrder(req.params.id)
    return res.json({ data: { id: data.id }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function recordPayment(req: Request, res: Response) {
  try {
    const validated = recordPaymentSchema.parse(req.body)
    const adminId = (req.user as any).sub
    const data = await service.recordPayment(req.params.id, validated, adminId)
    const safeData = {
      ...data,
      totalCostKrw: Number(data.totalCostKrw),
      paidAmountKrw: Number(data.paidAmountKrw),
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
