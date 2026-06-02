import type { Request, Response, NextFunction } from 'express'
import * as service from './addresses.service'
import { createAddressSchema, updateAddressSchema } from './addresses.schema'
import type { CustomerJwtPayload, AdminJwtPayload } from '../../middleware/auth'

// ─── Customer Endpoints ──────────────────────────────────────────────────

export async function getAddresses(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = req.user as CustomerJwtPayload
    const result = await service.getCustomerAddresses(customer.sub)
    res.json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}

export async function createAddress(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = req.user as CustomerJwtPayload
    const validated = createAddressSchema.parse(req.body)
    const result = await service.createAddress(customer.sub, validated as any)
    res.status(201).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}

export async function updateAddress(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = req.user as CustomerJwtPayload
    const { id } = req.params
    const validated = updateAddressSchema.parse(req.body)
    const result = await service.updateAddress(id, customer.sub, validated as any)
    res.json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}

export async function setDefault(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = req.user as CustomerJwtPayload
    const { id } = req.params
    const result = await service.setDefault(id, customer.sub)
    res.json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}

export async function deleteAddress(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = req.user as CustomerJwtPayload
    const { id } = req.params
    const result = await service.deleteAddress(id, customer.sub)
    res.json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}

export async function searchJuso(req: Request, res: Response, next: NextFunction) {
  try {
    const q = req.query.q as string
    const result = await service.searchJusoAddress(q || '')
    res.json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}

// ─── Admin Endpoints ─────────────────────────────────────────────────────

export async function adminGetCustomerAddresses(req: Request, res: Response, next: NextFunction) {
  try {
    const { customerId } = req.params
    const result = await service.getCustomerAddresses(customerId)
    res.json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}

export async function adminCreateCustomerAddress(req: Request, res: Response, next: NextFunction) {
  try {
    const { customerId } = req.params
    const validated = createAddressSchema.parse(req.body)
    const result = await service.createAddress(customerId, validated as any)
    res.status(201).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}

export async function adminDeleteCustomerAddress(req: Request, res: Response, next: NextFunction) {
  try {
    const { customerId, addressId } = req.params
    const result = await service.deleteAddress(addressId, customerId)
    res.json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}
