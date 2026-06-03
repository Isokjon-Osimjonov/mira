import { db } from '../../config/db'
import { categories, products } from '@mira/db'
import { eq, and, isNull, count, sql } from 'drizzle-orm'
import type { CreateCategoryDto, UpdateCategoryDto } from './categories.schema'
import { cacheGet, cacheSet, cacheDelete, CACHE_TTL } from '../../lib/cache'

const CACHE_KEY = 'categories:tree'

export async function getCategoriesTree() {
  const cached = await cacheGet<any>(CACHE_KEY)
  if (cached) return cached

  const allCategories = await db
    .select()
    .from(categories)
    .where(and(eq(categories.isActive, true), isNull(categories.deletedAt)))
    .orderBy(categories.sortOrder)

  const buildTree = (parentId: string | null = null): any[] => {
    return allCategories
      .filter((c) => c.parentId === parentId)
      .map((c) => ({
        ...c,
        children: buildTree(c.id),
      }))
  }

  const result = buildTree(null)
  await cacheSet(CACHE_KEY, result, CACHE_TTL.CATEGORIES)
  return result
}

export async function createCategory(data: CreateCategoryDto) {
  const [newCategory] = await db.insert(categories).values(data).returning()
  await cacheDelete(CACHE_KEY)
  return newCategory
}

export async function updateCategory(id: string, data: UpdateCategoryDto) {
  const [updatedCategory] = await db
    .update(categories)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning()

  if (!updatedCategory) {
    throw { status: 404, message: 'Kategoriya topilmadi' }
  }

  await cacheDelete(CACHE_KEY)
  return updatedCategory
}

export async function deleteCategory(id: string) {
  // Check if products exist
  const [productCount] = await db
    .select({ val: count() })
    .from(products)
    .where(and(eq(products.categoryId, id), isNull(products.deletedAt)))

  if (Number(productCount.val) > 0) {
    throw { status: 400, message: "Kategoriyada mahsulotlar bor, o'chirish mumkin emas" }
  }

  // Check if has children
  const [childCount] = await db
    .select({ val: count() })
    .from(categories)
    .where(and(eq(categories.parentId, id), isNull(categories.deletedAt)))

  if (Number(childCount.val) > 0) {
    throw { status: 400, message: "Kategoriyada ost-kategoriyalar bor, o'chirish mumkin emas" }
  }

  const [deletedCategory] = await db
    .update(categories)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning()

  if (!deletedCategory) {
    throw { status: 404, message: 'Kategoriya topilmadi' }
  }

  await cacheDelete(CACHE_KEY)
  return deletedCategory
}

export async function getAllCategoriesAdmin() {
  return db
    .select()
    .from(categories)
    .where(isNull(categories.deletedAt))
    .orderBy(categories.sortOrder)
}
