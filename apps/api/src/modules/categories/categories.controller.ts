import type { Request, Response, NextFunction } from 'express'
import * as CategoryService from './categories.service'
import { CreateCategorySchema, UpdateCategorySchema } from './categories.schema'

const ok = <T>(res: Response, data: T, status = 200) =>
  res.status(status).json({ data, error: null })

export async function getCategoriesTree(req: Request, res: Response, next: NextFunction) {
  try {
    const tree = await CategoryService.getCategoriesTree()
    return ok(res, tree)
  } catch (e: any) {
    next(e)
  }
}

export async function getAllCategoriesAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const list = await CategoryService.getAllCategoriesAdmin()
    return ok(res, list)
  } catch (e: any) {
    next(e)
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = CreateCategorySchema.safeParse(req.body)
    if (!parsed.success) {
      throw {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0].message,
      }
    }

    const result = await CategoryService.createCategory(parsed.data)
    return ok(res, result, 201)
  } catch (e: any) {
    next(e)
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const parsed = UpdateCategorySchema.safeParse(req.body)
    if (!parsed.success) {
      throw {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0].message,
      }
    }

    const result = await CategoryService.updateCategory(id, parsed.data)
    return ok(res, result)
  } catch (e: any) {
    next(e)
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    await CategoryService.deleteCategory(id)
    return ok(res, { success: true })
  } catch (e: any) {
    next(e)
  }
}
