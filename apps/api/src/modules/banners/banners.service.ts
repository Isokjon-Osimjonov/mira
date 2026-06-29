import { db } from '../../config/db'
import { banners } from '@mira/db'
import { eq, and, asc, isNull, or } from 'drizzle-orm'

export async function getActiveBanners(
  regionCode?: 'UZB' | 'KOR'
) {
  return await db.select().from(banners)
    .where(
      and(
        eq(banners.isActive, true),
        or(
          isNull(banners.regionCode),
          regionCode
            ? eq(banners.regionCode, regionCode)
            : isNull(banners.regionCode)
        )
      )
    )
    .orderBy(asc(banners.sortOrder))
}

export async function getAllBanners() {
  return await db.select().from(banners)
    .orderBy(asc(banners.sortOrder))
}

export async function createBanner(data: {
  imageUrl: string
  linkType?: string
  linkValue?: string
  regionCode?: string | null
  isActive?: boolean
  sortOrder?: number
}) {
  const [created] = await db.insert(banners)
    .values({
      imageUrl: data.imageUrl,
      linkType: data.linkType ?? 'none',
      linkValue: data.linkValue || null,
      regionCode: data.regionCode || null,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    } as any)
    .returning()
  return created
}

export async function updateBanner(
  id: string, data: Partial<typeof banners.$inferInsert>
) {
  const [updated] = await db.update(banners)
    .set({ ...data, updatedAt: new Date() } as any)
    .where(eq(banners.id, id)).returning()
  if (!updated) throw {
    status: 404, code: 'NOT_FOUND',
    message: 'Banner topilmadi'
  }
  return updated
}

export async function deleteBanner(id: string) {
  const [deleted] = await db.delete(banners)
    .where(eq(banners.id, id)).returning()
  if (!deleted) throw {
    status: 404, code: 'NOT_FOUND',
    message: 'Banner topilmadi'
  }
  return deleted
}
