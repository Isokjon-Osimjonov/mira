import { db } from '../../config/db'
import { categories, products } from '@mira/db'
import { eq, and, isNull, count, sql, asc } from 'drizzle-orm'
import type { CreateCategoryDto, UpdateCategoryDto } from './categories.schema'
import { cacheGet, cacheSet, cacheDelete, CACHE_TTL } from '../../lib/cache'
import slugify from 'slug'

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
  const slug = data.slug || slugify(data.nameKo).toLowerCase()
  const [newCategory] = await db.insert(categories).values({ ...data, slug }).returning()
  await cacheDelete(CACHE_KEY)
  return newCategory
}

export async function updateCategory(id: string, data: UpdateCategoryDto) {
  const updates: any = { ...data, updatedAt: new Date() }
  if (data.nameKo && !data.slug) {
    updates.slug = slugify(data.nameKo).toLowerCase()
  }

  const [updatedCategory] = await db
    .update(categories)
    .set(updates)
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
    throw {
      status: 400,
      code: 'CATEGORY_HAS_PRODUCTS',
      message: `Bu kategoriyada ${productCount.val} ta mahsulot bor. Avval mahsulotlarni ko'chiring.`,
    }
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
  const cats = await db
    .select({
      id: categories.id,
      nameKo: categories.nameKo,
      nameUz: categories.nameUz,
      parentId: categories.parentId,
      sortOrder: categories.sortOrder,
      isActive: categories.isActive,
      productCount: sql<number>`
          COUNT(DISTINCT ${products.id})
          FILTER (WHERE ${products.deletedAt} IS NULL)
        `.as('product_count'),
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .where(isNull(categories.deletedAt))
    .groupBy(categories.id)
    .orderBy(asc(categories.parentId), asc(categories.sortOrder), asc(categories.nameKo))

  return cats
}
