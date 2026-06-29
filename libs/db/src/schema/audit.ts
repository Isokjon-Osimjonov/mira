import { pgTable, uuid, varchar, timestamp, text, index, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { pickPackActionEnum, pickPackResultEnum } from './enums'
import { orders, orderItems } from './orders'
import { adminUsers } from './admin-users'

export const adminAuditLogs = pgTable(
  'admin_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id').references(() => adminUsers.id, { onDelete: 'set null' }),
    adminName: text('admin_name'),
    action: text('action').notNull(),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    adminIdIdx: index('admin_audit_logs_admin_id_idx').on(t.adminId),
    createdAtIdx: index('admin_audit_logs_created_at_idx').on(t.createdAt),
  })
)

export const adminAuditLogsRelations = relations(adminAuditLogs, ({ one }) => ({
  admin: one(adminUsers, {
    fields: [adminAuditLogs.adminId],
    references: [adminUsers.id],
  }),
}))

// APPEND-ONLY — no UPDATE or DELETE ever
export const pickPackAudit = pgTable(
  'pick_pack_audit',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    performedBy: uuid('performed_by')
      .notNull()
      .references(() => adminUsers.id),
    action: pickPackActionEnum('action').notNull(),
    scanInput: varchar('scan_input', { length: 100 }),
    expectedBarcode: varchar('expected_barcode', { length: 50 }),
    result: pickPackResultEnum('result').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orderIdIdx: index('pick_pack_audit_order_id_idx').on(t.orderId),
    orderItemIdIdx: index('pick_pack_audit_order_item_id_idx').on(t.orderItemId),
    performedByIdx: index('pick_pack_audit_performed_by_idx').on(t.performedBy),
    createdAtIdx: index('pick_pack_audit_created_at_idx').on(t.createdAt),
  })
)

export const pickPackAuditRelations = relations(pickPackAudit, ({ one }) => ({
  order: one(orders, {
    fields: [pickPackAudit.orderId],
    references: [orders.id],
  }),
  orderItem: one(orderItems, {
    fields: [pickPackAudit.orderItemId],
    references: [orderItems.id],
  }),
  admin: one(adminUsers, {
    fields: [pickPackAudit.performedBy],
    references: [adminUsers.id],
  }),
}))

export type PickPackAudit = typeof pickPackAudit.$inferSelect
export type NewPickPackAudit = typeof pickPackAudit.$inferInsert
