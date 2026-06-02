import type { Request, Response, NextFunction } from 'express'
import * as service from './products.service'
import { CreateProductSchema, UpdateProductSchema, UpdatePricingSchema } from './products.schema'

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, category, brand, region, sort, q } = req.query
    const result = await service.getProducts({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      category: category as string,
      brand: brand as string,
      region: (region as 'UZB' | 'KOR') || 'UZB',
      sort: sort as string,
      q: q as string,
      isAdmin: false
    })
    res.json({ data: result.items, meta: result.meta, error: null })
  } catch (err) {
    next(err)
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { region } = req.query
    const result = await service.getProductById(id, (region as 'UZB' | 'KOR') || 'UZB')
    res.json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}

export async function getBrands(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getBrands()
    res.json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}

export async function getProductsByCategorySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params
    const { page, limit, brand, region, sort, q } = req.query
    const result = await service.getProductsByCategorySlug(slug, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      brand: brand as string,
      region: (region as 'UZB' | 'KOR') || 'UZB',
      sort: sort as string,
      q: q as string
    })
    res.json({ data: result.items, meta: result.meta, error: null })
  } catch (err) {
    next(err)
  }
}

// Admin
export async function getProductsAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, category, brand, region, sort, q } = req.query
    const result = await service.getProducts({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      category: category as string,
      brand: brand as string,
      region: (region as 'UZB' | 'KOR') || 'UZB',
      sort: sort as string,
      q: q as string,
      isAdmin: true
    })
    res.json({ data: result.items, meta: result.meta, error: null })
  } catch (err) {
    next(err)
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = CreateProductSchema.parse(req.body)
    const result = await service.createProduct(validated)
    res.status(201).json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const validated = UpdateProductSchema.parse(req.body)
    const result = await service.updateProduct(id, validated)
    res.json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const result = await service.deleteProduct(id)
    res.json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}

export async function updatePricing(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const validated = UpdatePricingSchema.parse(req.body)
    const result = await service.updatePricing(id, validated)
    res.json({ data: result, error: null })
  } catch (err) {
    next(err)
  }
}
