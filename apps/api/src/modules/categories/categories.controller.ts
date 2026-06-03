import type { Request, Response } from 'express'
import * as CategoryService from './categories.service'
import { CreateCategorySchema, UpdateCategorySchema } from './categories.schema'

const ok = <T>(res: Response, data: T, status = 200) =>
  res.status(status).json({ data, error: null })

const err = (res: Response, status: number, message: string, code?: string) =>
  res.status(status).json({ data: null, error: { message, code } })

export async function getCategoriesTree(req: Request, res: Response) {
  try {
    const tree = await CategoryService.getCategoriesTree()
    return ok(res, tree)
  } catch (e: any) {
    return err(res, e.status ?? 500, e.message ?? 'Xatolik')
  }
}

export async function getAllCategoriesAdmin(req: Request, res: Response) {
  try {
    const list = await CategoryService.getAllCategoriesAdmin()
    return ok(res, list)
  } catch (e: any) {
    return err(res, e.status ?? 500, e.message ?? 'Xatolik')
  }
}

export async function createCategory(req: Request, res: Response) {
  const parsed = CreateCategorySchema.safeParse(req.body)
  if (!parsed.success) {
    return err(res, 400, parsed.error.issues[0].message, 'VALIDATION_ERROR')
  }

  try {
    const result = await CategoryService.createCategory(parsed.data)
    return ok(res, result, 201)
  } catch (e: any) {
    return err(res, e.status ?? 500, e.message ?? 'Xatolik')
  }
}

export async function updateCategory(req: Request, res: Response) {
  const { id } = req.params
  const parsed = UpdateCategorySchema.safeParse(req.body)
  if (!parsed.success) {
    return err(res, 400, parsed.error.issues[0].message, 'VALIDATION_ERROR')
  }

  try {
    const result = await CategoryService.updateCategory(id, parsed.data)
    return ok(res, result)
  } catch (e: any) {
    return err(res, e.status ?? 500, e.message ?? 'Xatolik')
  }
}

export async function deleteCategory(req: Request, res: Response) {
  const { id } = req.params
  try {
    await CategoryService.deleteCategory(id)
    return ok(res, { success: true })
  } catch (e: any) {
    return err(res, e.status ?? 500, e.message ?? 'Xatolik')
  }
}
