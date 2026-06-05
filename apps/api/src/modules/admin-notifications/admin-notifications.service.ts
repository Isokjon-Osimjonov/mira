import { db } from '../../config/db'
import { adminNotifications } from '@mira/db'
import { desc, eq, sql } from 'drizzle-orm'
import { emit } from '../../config/socket'

export async function createNotification(params: {
  type: string
  title: string
  message: string
  link?: string
  data?: any
}) {
  const [created] = await db
    .insert(adminNotifications)
    .values(params as any)
    .returning()

  // Emit via socket to all admins
  try {
    emit.notificationNew(created)
  } catch {}

  return created
}

export async function getNotifications(limit = 20) {
  return await db
    .select()
    .from(adminNotifications)
    .orderBy(desc(adminNotifications.createdAt))
    .limit(limit)
}

export async function markAllRead() {
  await db
    .update(adminNotifications)
    .set({ isRead: true })
    .where(eq(adminNotifications.isRead, false))
}

export async function clearAll() {
  await db.delete(adminNotifications)
}

export async function getUnreadCount() {
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(adminNotifications)
    .where(eq(adminNotifications.isRead, false))
  return Number(result.count)
}