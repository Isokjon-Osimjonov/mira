import { db } from '../../config/db'
import { logger } from '../../config/logger'
import { expenseCategories, expenses } from '@mira/db'
import { eq, and, sql, desc, asc, count } from 'drizzle-orm'
import type {
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
  CreateExpenseDto,
  UpdateExpenseDto,
} from './expenses.schema'
import { invalidateAnalyticsCache } from '../analytics/analytics.service'

// ─── Expense Categories ──────────────────────────────────────────────────

export async function getExpenseCategories() {
  return await db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.isActive, true))
    .orderBy(asc(expenseCategories.sortOrder), asc(expenseCategories.name))
}

export async function getAllExpenseCategories() {
  return await db
    .select()
    .from(expenseCategories)
    .orderBy(asc(expenseCategories.sortOrder), asc(expenseCategories.name))
}

export async function createExpenseCategory(data: CreateExpenseCategoryDto) {
  const slug = data.slug || data.name.toLowerCase().replace(/ /g, '-')

  const [created] = await db
    .insert(expenseCategories)
    .values({
      ...data,
      slug,
      isSystem: false,
    })
    .returning()
  return created
}

export async function updateExpenseCategory(id: string, data: UpdateExpenseCategoryDto) {
  const [category] = await db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.id, id))
    .limit(1)
  if (!category)
    throw { status: 404, code: 'EXPENSE_CATEGORY_NOT_FOUND', message: 'Kategoriya topilmadi' }

  const updates: any = { ...data, updatedAt: new Date() }

  if (category.isSystem) {
    // Prevent changing name/slug of system categories if needed
    // For now we allow everything but usually we might lock them
  }

  const [updated] = await db
    .update(expenseCategories)
    .set(updates)
    .where(eq(expenseCategories.id, id))
    .returning()
  return updated
}

export async function deleteExpenseCategory(id: string) {
  const [category] = await db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.id, id))
    .limit(1)
  if (!category)
    throw { status: 404, code: 'EXPENSE_CATEGORY_NOT_FOUND', message: 'Kategoriya topilmadi' }

  if (category.isSystem)
    throw {
      status: 400,
      code: 'EXPENSE_CATEGORY_IS_SYSTEM',
      message: "Tizim kategoriyasini o'chirib bo'lmaydi",
    }

  const [expenseCountRes] = await db
    .select({ count: count() })
    .from(expenses)
    .where(eq(expenses.categoryId, id))

  if (Number(expenseCountRes?.count || 0) > 0) {
    throw {
      status: 400,
      code: 'EXPENSE_CATEGORY_IN_USE',
      message: `Bu kategoriyada ${expenseCountRes?.count} ta xarajat bor. O'chirib bo'lmaydi.`,
    }
  }

  const [deleted] = await db
    .delete(expenseCategories)
    .where(eq(expenseCategories.id, id))
    .returning()
  return deleted
}

// ─── Expenses ────────────────────────────────────────────────────────────

export async function getExpenses(query: {
  page?: number
  limit?: number
  categoryId?: string
  dateFrom?: string
  dateTo?: string
}) {
  const page = query.page || 1
  const limit = query.limit || 20
  const offset = (page - 1) * limit

  let where: any = sql`1=1`
  if (query.categoryId) where = and(where, eq(expenses.categoryId, query.categoryId))
  if (query.dateFrom) where = and(where, sql`${expenses.expenseDate} >= ${query.dateFrom}`)
  if (query.dateTo) where = and(where, sql`${expenses.expenseDate} <= ${query.dateTo}`)

  const items = await db
    .select({
      expense: expenses,
      category: {
        id: expenseCategories.id,
        name: expenseCategories.name,
        slug: expenseCategories.slug,
        icon: expenseCategories.icon,
        color: expenseCategories.color,
      },
    })
    .from(expenses)
    .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .where(where)
    .orderBy(desc(expenses.expenseDate))
    .limit(limit)
    .offset(offset)

  const [countRes] = await db
    .select({
      count: count(),
      totalAmount: sql<string>`COALESCE(SUM(${expenses.amountKrw})::text, '0')`,
    })
    .from(expenses)
    .where(where)
  const total = Number(countRes?.count || 0)
  const totalAmountKrw = Number(countRes?.totalAmount || 0)

  return {
    items: items.map((row) => ({
      ...row.expense,
      amountKrw: Number(row.expense.amountKrw),
      category: row.category,
    })),
    meta: {
      page,
      limit,
      total,
      hasNext: offset + limit < total,
      hasPrev: page > 1,
      totalAmountKrw,
    },
  }
}

export async function getExpenseSummary(query: { dateFrom?: string; dateTo?: string }) {
  let where: any = sql`1=1`
  if (query.dateFrom) where = and(where, sql`${expenses.expenseDate} >= ${query.dateFrom}`)
  if (query.dateTo) where = and(where, sql`${expenses.expenseDate} <= ${query.dateTo}`)

  const summary = await db
    .select({
      categoryId: expenseCategories.id,
      categoryName: expenseCategories.name,
      categoryIcon: expenseCategories.icon,
      totalAmountKrw: sql<string>`COALESCE(SUM(${expenses.amountKrw})::text, '0')`,
      count: count(),
    })
    .from(expenses)
    .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .where(where)
    .groupBy(expenseCategories.id, expenseCategories.name, expenseCategories.icon)

  const overallTotal = summary.reduce((acc, curr) => acc + Number(curr.totalAmountKrw), 0)

  return {
    totalAmountKrw: overallTotal,
    byCategory: summary.map((row) => ({
      ...row,
      totalAmountKrw: Number(row.totalAmountKrw),
      percentage: overallTotal > 0 ? (Number(row.totalAmountKrw) / overallTotal) * 100 : 0,
    })),
  }
}

export async function getExpenseById(id: string) {
  const [expense] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1)
  if (!expense) throw { status: 404, code: 'EXPENSE_NOT_FOUND', message: 'Xarajat topilmadi' }

  const [category] = await db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.id, expense.categoryId))
    .limit(1)

  return { ...expense, amountKrw: Number(expense.amountKrw), category }
}

export async function createExpense(data: CreateExpenseDto, adminId: string) {
  const [category] = await db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.id, data.categoryId))
    .limit(1)
  if (!category)
    throw { status: 404, code: 'EXPENSE_CATEGORY_NOT_FOUND', message: 'Kategoriya topilmadi' }

  const [created] = await db
    .insert(expenses)
    .values({
      categoryId: data.categoryId,
      amountKrw: BigInt(data.amountKrw),
      description: data.description,
      expenseDate: data.date,
      note: data.note,
      receiptUrl: data.receiptUrl,
      createdBy: adminId,
    })
    .returning()

  await invalidateAnalyticsCache()

  return created
}

export async function updateExpense(id: string, data: UpdateExpenseDto) {
  const [expense] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1)
  if (!expense) throw { status: 404, code: 'EXPENSE_NOT_FOUND', message: 'Xarajat topilmadi' }

  if (data.categoryId) {
    const [category] = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.id, data.categoryId))
      .limit(1)
    if (!category)
      throw { status: 404, code: 'EXPENSE_CATEGORY_NOT_FOUND', message: 'Kategoriya topilmadi' }
  }

  const updates: any = { ...data, updatedAt: new Date() }
  if (data.amountKrw !== undefined) updates.amountKrw = BigInt(data.amountKrw)
  if (data.date !== undefined) {
    updates.expenseDate = data.date
    delete updates.date
  }

  const [updated] = await db.update(expenses).set(updates).where(eq(expenses.id, id)).returning()
  await invalidateAnalyticsCache()
  return updated
}

export async function deleteExpense(id: string) {
  const [deleted] = await db.delete(expenses).where(eq(expenses.id, id)).returning()
  if (!deleted) throw { status: 404, code: 'EXPENSE_NOT_FOUND', message: 'Xarajat topilmadi' }
  await invalidateAnalyticsCache()
  return deleted
}
