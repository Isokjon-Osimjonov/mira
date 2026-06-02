import type { Request, Response, NextFunction } from 'express'
import * as service from './inventory.service'
import { CreateBatchSchema, UpdateBatchSchema } from './inventory.schema'
import type { AdminJwtPayload } from '../../middleware/auth'

export async function getStockSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getStockSummary()
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
