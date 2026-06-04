import type { Request, Response, NextFunction } from 'express'
import * as service from './inventory.service'
import { CreateBatchSchema, UpdateBatchSchema, WriteOffStockSchema } from './inventory.schema'
import type { AdminJwtPayload } from '../../middleware/auth'

export async function getStockSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const { filter, search, categoryId, page, limit } = req.query as any
    const result = await service.getStockSummary({
      filter,
      search,
      categoryId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    })
    res.json({ data: result.items, meta: result.meta, error: null })
  } catch (err) {
    next(err)
  }
}

export async function getWriteOffReasons(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getWriteOffReasons()
    res.json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}

export async function createBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const admin = req.user as AdminJwtPayload
    const validated = CreateBatchSchema.parse(req.body)
    const result = await service.createBatch(validated, admin.sub)
    res.status(201).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}

export async function getBatchesByProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params
    const result = await service.getBatchesByProduct(productId)
    res.json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}

export async function updateBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const admin = req.user as AdminJwtPayload
    const { id } = req.params
    const validated = UpdateBatchSchema.parse(req.body)
    const result = await service.updateBatch(id, validated, admin.sub)
    res.json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}

export async function getProductMovements(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params
    const { type, dateFrom, dateTo } = req.query as any
    const page = Number(req.query.page || 1)
    const limit = Number(req.query.limit || 20)

    const result = await service.getProductMovements({
      productId,
      type,
      dateFrom,
      dateTo,
      page,
      limit,
    })
    res.json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}

export async function writeOffStock(req: Request, res: Response, next: NextFunction) {
  try {
    const admin = req.user as AdminJwtPayload
    const validated = WriteOffStockSchema.parse(req.body)
    const result = await service.writeOffStock({ ...validated, performedBy: admin.sub })
    res.json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}

export async function getWriteOffHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId, type, dateFrom, dateTo } = req.query as any
    const page = Number(req.query.page || 1)
    const limit = Number(req.query.limit || 20)

    const result = await service.getWriteOffHistory({
      productId,
      type,
      dateFrom,
      dateTo,
      page,
      limit,
    })
    res.json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}

export async function deleteBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const admin = req.user as AdminJwtPayload
    const { id } = req.params
    const result = await service.deleteBatch(id, admin.sub)
    res.json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}
