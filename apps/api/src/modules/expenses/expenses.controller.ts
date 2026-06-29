import type { Request, Response } from 'express'
import * as service from './expenses.service'
import {
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
  createExpenseSchema,
  updateExpenseSchema,
} from './expenses.schema'

// ─── Expense Categories ──────────────────────────────────────────────────

export async function getCategories(_req: Request, res: Response) {
  try {
    const data = await service.getExpenseCategories()
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function createCategory(req: Request, res: Response) {
  try {
    const validated = createExpenseCategorySchema.parse(req.body)
    const data = await service.createExpenseCategory(validated)
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

export async function updateCategory(req: Request, res: Response) {
  try {
    const validated = updateExpenseCategorySchema.parse(req.body)
    const data = await service.updateExpenseCategory(req.params.id, validated)
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

export async function deleteCategory(req: Request, res: Response) {
  try {
    const data = await service.deleteExpenseCategory(req.params.id)
    return res.json({ data: { id: data.id }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

// ─── Expenses ────────────────────────────────────────────────────────────

export async function getExpenses(req: Request, res: Response) {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined
    const limit = req.query.limit ? Number(req.query.limit) : undefined
    const categoryId = req.query.categoryId as string | undefined
    const dateFrom = req.query.dateFrom as string | undefined
    const dateTo = req.query.dateTo as string | undefined

    const data = await service.getExpenses({ page, limit, categoryId, dateFrom, dateTo })
    return res.json({ data: data.items, meta: data.meta, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getSummary(req: Request, res: Response) {
  try {
    const dateFrom = req.query.dateFrom as string | undefined
    const dateTo = req.query.dateTo as string | undefined

    const data = await service.getExpenseSummary({ dateFrom, dateTo })
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getExpenseById(req: Request, res: Response) {
  try {
    const data = await service.getExpenseById(req.params.id)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function createExpense(req: Request, res: Response) {
  try {
    const validated = createExpenseSchema.parse(req.body)
    const adminId = (req.user as any).sub
    const data = await service.createExpense(validated, adminId)
    const safeData = { ...data, amountKrw: Number(data.amountKrw) }
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

export async function updateExpense(req: Request, res: Response) {
  try {
    const validated = updateExpenseSchema.parse(req.body)
    const data = await service.updateExpense(req.params.id, validated)
    const safeData = { ...data, amountKrw: Number(data.amountKrw) }
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

export async function deleteExpense(req: Request, res: Response) {
  try {
    const data = await service.deleteExpense(req.params.id)
    return res.json({ data: { id: data.id }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}
