import { db } from '../../config/db'
import { expenseCategories, expenses } from '@mira/db'
import { eq, and, sql, desc, asc, count } from 'drizzle-orm'
import type {
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
  CreateExpenseDto,
  UpdateExpenseDto,
} from './expenses.schema'

// ─── Expense Categories ──────────────────────────────────────────────────

export async function getExpenseCategories() {
  const items = await db
    .select({
      category: expenseCategories,
      expenseCount:
        sql<number>`(SELECT COUNT(*) FROM expenses WHERE category_id = ${expenseCategories.id})`.mapWith(
          Number
        ),
    })
    .from(expenseCategories)
    .orderBy(asc(expenseCategories.sortOrder))

  return items.map((row) => ({
    ...row.category,
    expenseCount: row.expenseCount,
  }))
}

export async function createExpenseCategory(data: CreateExpenseCategoryDto) {
  const [created] = await db
    .insert(expenseCategories)
    .values({
      ...data,
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

  const updates: any = { updatedAt: new Date() }

  if (category.isSystem) {
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder
    if (data.icon !== undefined) updates.icon = data.icon
  } else {
    if (data.name !== undefined) updates.name = data.name
    if (data.slug !== undefined) updates.slug = data.slug
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder
    if (data.icon !== undefined) updates.icon = data.icon
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
      message: "Bu kategoriyada xarajatlar mavjud. O'chirib bo'lmaydi.",
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
      categoryName: expenseCategories.name,
      categoryIcon: expenseCategories.icon,
    })
    .from(expenses)
    .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .where(where)
    .orderBy(desc(expenses.expenseDate))
    .limit(limit)
    .offset(offset)

  const [countRes] = await db
    .select({ count: count(), totalAmount: sql<number>`SUM(amount_krw)`.mapWith(Number) })
    .from(expenses)
    .where(where)
  const total = Number(countRes?.count || 0)
  const totalAmountKrw = Number(countRes?.totalAmount || 0)

  return {
    items: items.map((row) => ({
      ...row.expense,
      amountKrw: Number(row.expense.amountKrw),
      categoryName: row.categoryName,
      categoryIcon: row.categoryIcon,
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
      totalAmountKrw: sql<number>`SUM(${expenses.amountKrw})`.mapWith(Number),
      count: count(),
    })
    .from(expenses)
    .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .where(where)
    .groupBy(expenseCategories.id, expenseCategories.name, expenseCategories.icon)

  const overallTotal = summary.reduce((acc, curr) => acc + curr.totalAmountKrw, 0)

  return {
    totalAmountKrw: overallTotal,
    byCategory: summary.map((row) => ({
      ...row,
      percentage: overallTotal > 0 ? (row.totalAmountKrw / overallTotal) * 100 : 0,
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
      expenseDate: data.expenseDate,
      receiptUrl: data.receiptUrl,
      createdBy: adminId,
    })
    .returning()

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

  const [updated] = await db.update(expenses).set(updates).where(eq(expenses.id, id)).returning()
  return updated
}

export async function deleteExpense(id: string) {
  const [deleted] = await db.delete(expenses).where(eq(expenses.id, id)).returning()
  if (!deleted) throw { status: 404, code: 'EXPENSE_NOT_FOUND', message: 'Xarajat topilmadi' }
  return deleted
}
