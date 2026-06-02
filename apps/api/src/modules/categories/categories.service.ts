import { db } from '../../config/db'
import { categories, products } from '@mira/db'
import { eq, and, isNull, count, sql } from 'drizzle-orm'
import type { CreateCategoryDto, UpdateCategoryDto } from './categories.schema'

export async function getCategoriesTree() {
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

  return buildTree(null)
}

export async function createCategory(data: CreateCategoryDto) {
  const [newCategory] = await db.insert(categories).values(data).returning()
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
  
  return updatedCategory
}

export async function deleteCategory(id: string) {
  // Check if products exist
  const [productCount] = await db
    .select({ val: count() })
    .from(products)
    .where(and(eq(products.categoryId, id), isNull(products.deletedAt)))

  if (Number(productCount.val) > 0) {
    throw { status: 400, message: 'Kategoriyada mahsulotlar bor, o\'chirish mumkin emas' }
  }

  // Check if has children
  const [childCount] = await db
    .select({ val: count() })
    .from(categories)
    .where(and(eq(categories.parentId, id), isNull(categories.deletedAt)))

  if (Number(childCount.val) > 0) {
    throw { status: 400, message: 'Kategoriyada ost-kategoriyalar bor, o\'chirish mumkin emas' }
  }

  const [deletedCategory] = await db
    .update(categories)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning()

  if (!deletedCategory) {
    throw { status: 404, message: 'Kategoriya topilmadi' }
  }

  return deletedCategory
}

export async function getAllCategoriesAdmin() {
  return db
    .select()
    .from(categories)
    .where(isNull(categories.deletedAt))
    .orderBy(categories.sortOrder)
}
