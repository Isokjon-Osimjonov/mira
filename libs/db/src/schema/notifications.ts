import { pgTable, uuid, varchar, text, jsonb, timestamp, index, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { notificationTypeEnum, notificationChannelEnum, notificationStatusEnum } from './enums'
import { customers } from './customers'

export const adminNotifications = pgTable(
  'admin_notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    link: text('link'),
    isRead: boolean('is_read').default(false),
    data: jsonb('data').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    readIdx: index('admin_notifications_read_idx').on(t.isRead, t.createdAt),
  })
)

export const notificationsLog = pgTable(
  'notifications_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    channel: notificationChannelEnum('channel').notNull(),
    title: varchar('title', { length: 300 }).notNull(),
    body: text('body').notNull(),
    data: jsonb('data'),
    orderId: uuid('order_id'), // NO FK — just for indexing shortcut
    status: notificationStatusEnum('status').default('PENDING').notNull(),
    errorMsg: text('error_msg'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    customerIdIdx: index('notifications_log_customer_id_idx').on(t.customerId),
    typeIdx: index('notifications_log_type_idx').on(t.type),
    statusIdx: index('notifications_log_status_idx').on(t.status),
    createdAtIdx: index('notifications_log_created_at_idx').on(t.createdAt),
    unreadIdx: index('notifications_log_unread_idx').on(t.customerId, t.readAt),
    orderIdIdx: index('notifications_log_order_id_idx').on(t.orderId),
  })
)

export const notificationsLogRelations = relations(notificationsLog, ({ one }) => ({
  customer: one(customers, {
    fields: [notificationsLog.customerId],
    references: [customers.id],
  }),
}))

export type NotificationLog = typeof notificationsLog.$inferSelect
export type NewNotificationLog = typeof notificationsLog.$inferInsert
