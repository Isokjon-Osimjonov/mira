import type { Request, Response } from 'express'
import * as service from './customers.service'
import {
  updateCustomerNotesSchema,
  blockCustomerSchema,
  assignCouponSchema,
  createWalkInCustomerSchema,
} from './customers.schema'
import * as OrderService from '../orders/orders.service'
import type { AdminJwtPayload } from '../../middleware/auth'

export async function getCustomers(req: Request, res: Response) {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined
    const limit = req.query.limit ? Number(req.query.limit) : undefined
    const search = req.query.search as string | undefined
    const region = req.query.region as 'UZB' | 'KOR' | undefined
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined
    const isVerified =
      req.query.isVerified !== undefined ? req.query.isVerified === 'true' : undefined
    const dateFrom = req.query.dateFrom as string | undefined
    const dateTo = req.query.dateTo as string | undefined
    const sort = req.query.sort as string | undefined
    const includeDeleted = req.query.includeDeleted === 'true'

    const data = await service.getCustomers({
      page,
      limit,
      search,
      region,
      isActive,
      isVerified,
      dateFrom,
      dateTo,
      sort,
      includeDeleted,
    })
    return res.json({ data: data.items, meta: data.meta, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getCustomerById(req: Request, res: Response) {
  try {
    const data = await service.getCustomerById(req.params.id)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getCustomerOrders(req: Request, res: Response) {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined
    const limit = req.query.limit ? Number(req.query.limit) : undefined
    const status = req.query.status as string | undefined

    const data = await OrderService.getCustomerOrders(req.params.id, { page, limit, status })
    return res.json({ data: data.items, meta: data.meta, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getCustomerActivity(req: Request, res: Response) {
  try {
    const data = await service.getCustomerActivity(req.params.id)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function updateNotes(req: Request, res: Response) {
  try {
    const validated = updateCustomerNotesSchema.parse(req.body)
    const data = await service.updateCustomerNotes(req.params.id, validated.notes)
    return res.json({ data: { notes: data.notes }, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res
        .status(400)
        .json({ data: null, error: { message: 'Xato', code: 'VALIDATION_ERROR' } })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function blockCustomer(req: Request, res: Response) {
  try {
    const validated = blockCustomerSchema.parse(req.body)
    const data = await service.blockCustomer(req.params.id, validated.reason)
    return res.json({ data: { isActive: data.isActive, notes: data.notes }, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res
        .status(400)
        .json({ data: null, error: { message: 'Xato', code: 'VALIDATION_ERROR' } })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function unblockCustomer(req: Request, res: Response) {
  try {
    const data = await service.unblockCustomer(req.params.id)
    return res.json({ data: { isActive: data.isActive }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function deleteCustomer(req: Request, res: Response) {
  try {
    const data = await service.deleteCustomer(req.params.id)
    return res.json({ data: { id: data.id, deletedAt: data.deletedAt }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function assignCoupon(req: Request, res: Response) {
  try {
    const validated = assignCouponSchema.parse(req.body)
    await service.assignCoupon(req.params.id, validated.couponId)
    return res.json({ data: { success: true }, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res
        .status(400)
        .json({ data: null, error: { message: 'Xato', code: 'VALIDATION_ERROR' } })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function createWalkInCustomer(req: Request, res: Response) {
  try {
    const admin = req.user as AdminJwtPayload
    const validated = createWalkInCustomerSchema.parse(req.body)
    const data = await service.createWalkInCustomer({ ...validated, createdBy: admin.sub })
    return res.status(201).json({ data, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res
        .status(400)
        .json({ data: null, error: { message: e.errors[0].message, code: 'VALIDATION_ERROR' } })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}
