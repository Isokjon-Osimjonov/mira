import type { Request, Response } from 'express'
import * as service from './suppliers.service'
import { createSupplierSchema, updateSupplierSchema } from './suppliers.schema'

export async function getSuppliers(req: Request, res: Response) {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined
    const limit = req.query.limit ? Number(req.query.limit) : undefined
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined
    const search = req.query.search as string | undefined

    const data = await service.getSuppliers({ page, limit, isActive, search })
    return res.json({ data: data.items, meta: data.meta, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getSupplierById(req: Request, res: Response) {
  try {
    const data = await service.getSupplierById(req.params.id)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function createSupplier(req: Request, res: Response) {
  try {
    const validated = createSupplierSchema.parse(req.body)
    const data = await service.createSupplier(validated)
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

export async function updateSupplier(req: Request, res: Response) {
  try {
    const validated = updateSupplierSchema.parse(req.body)
    const data = await service.updateSupplier(req.params.id, validated)
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

export async function deleteSupplier(req: Request, res: Response) {
  try {
    const data = await service.deleteSupplier(req.params.id)
    return res.json({ data: { id: data.id }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getSupplierBatches(req: Request, res: Response) {
  try {
    const data = await service.getSupplierBatches(req.params.id)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}
