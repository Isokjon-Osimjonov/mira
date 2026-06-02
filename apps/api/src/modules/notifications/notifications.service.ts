import { db } from '../../config/db'
import { notificationsLog, customers } from '@mira/db'
import { eq, and, sql, desc, isNull, inArray } from 'drizzle-orm'
import { notifyCustomer } from '../../bot/helpers/notify'

export async function getNotifications(
  customerId: string,
  query: { page?: number; limit?: number; unreadOnly?: boolean }
) {
  const page = query.page || 1
  const limit = query.limit || 20
  const offset = (page - 1) * limit

  let where = eq(notificationsLog.customerId, customerId)
  if (query.unreadOnly) {
    where = and(where, isNull(notificationsLog.readAt)) as any
  }

  const items = await db
    .select()
    .from(notificationsLog)
    .where(where)
    .orderBy(desc(notificationsLog.createdAt))
    .limit(limit)
    .offset(offset)

  const [countRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notificationsLog)
    .where(where)

  const [unreadRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notificationsLog)
    .where(and(eq(notificationsLog.customerId, customerId), isNull(notificationsLog.readAt)))

  const total = Number(countRes.count)

  return {
    items: items.map((item) => ({
      ...item,
      orderId: item.data && (item.data as any).orderId ? (item.data as any).orderId : item.orderId,
    })),
    unreadCount: Number(unreadRes.count),
    meta: { page, limit, total, hasNext: offset + limit < total, hasPrev: page > 1 },
  }
}

export async function getUnreadCount(customerId: string) {
  const [res] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notificationsLog)
    .where(and(eq(notificationsLog.customerId, customerId), isNull(notificationsLog.readAt)))

  return Number(res?.count || 0)
}

export async function markAsRead(customerId: string, notificationId: string) {
  const [updated] = await db
    .update(notificationsLog)
    .set({ readAt: new Date() })
    .where(
      and(eq(notificationsLog.id, notificationId), eq(notificationsLog.customerId, customerId))
    )
    .returning()

  if (!updated)
    throw { status: 404, code: 'NOTIFICATION_NOT_FOUND', message: 'Bildirishnoma topilmadi' }
  return updated
}

export async function markAllAsRead(customerId: string) {
  await db
    .update(notificationsLog)
    .set({ readAt: new Date() })
    .where(and(eq(notificationsLog.customerId, customerId), isNull(notificationsLog.readAt)))
}

export async function sendManualNotification(data: {
  customerIds?: string[]
  type: 'PROMO' | 'SYSTEM'
  title: string
  body: string
  channel: 'PUSH' | 'TELEGRAM' | 'BOTH'
}) {
  let targetCustomerIds: string[] = []

  if (data.customerIds && data.customerIds.length > 0) {
    targetCustomerIds = data.customerIds
  } else {
    const all = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.isActive, true))
    targetCustomerIds = all.map((c) => c.id)
  }

  let sentCount = 0

  for (const cid of targetCustomerIds) {
    // Insert into log
    await db.insert(notificationsLog).values({
      customerId: cid,
      type: data.type,
      channel: data.channel,
      title: data.title,
      body: data.body,
      status: 'SENT',
      sentAt: new Date(),
    })

    // If Telegram
    if (data.channel === 'TELEGRAM' || data.channel === 'BOTH') {
      const [customer] = await db
        .select({ telegramId: customers.telegramId })
        .from(customers)
        .where(eq(customers.id, cid))
        .limit(1)
      if (customer?.telegramId) {
        await notifyCustomer(customer.telegramId, `<b>${data.title}</b>\n\n${data.body}`)
      }
    }

    // Push notification logic would go here (Firebase/Expo)

    sentCount++
  }

  return { sent: sentCount }
}
