import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  bigint,
  integer,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { adminUsers } from './admin-users'
import { products } from './products'
import { inventoryBatches } from './inventory'

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  contactName: varchar('contact_name', { length: 100 }),
  phone: varchar('phone', { length: 30 }),
  email: varchar('email', { length: 200 }),
  country: varchar('country', { length: 5 }).default('KR').notNull(),
  address: text('address'),
  paymentTerms: text('payment_terms'),
  website: varchar('website', { length: 300 }),
  notes: text('notes'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderNumber: varchar('order_number', { length: 20 }).unique().notNull(),
    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => suppliers.id, { onDelete: 'restrict' }),
    createdAt: date('order_date').notNull(),
    expectedAt: date('expected_delivery_date'),
    receivedAt: date('actual_delivery_date'),
    status: varchar('status', { length: 20 }).default('DRAFT').notNull(),
    paymentStatus: varchar('payment_status', { length: 20 }).default('UNPAID').notNull(),
    totalCostKrw: bigint('total_cost_krw', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    paidAmountKrw: bigint('paid_amount_krw', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => adminUsers.id, { onDelete: 'set null' }),
    sysCreatedAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orderNumberIdx: uniqueIndex('purchase_orders_order_number_idx').on(t.orderNumber),
    supplierIdIdx: index('purchase_orders_supplier_id_idx').on(t.supplierId),
    statusIdx: index('purchase_orders_status_idx').on(t.status),
    orderDateIdx: index('purchase_orders_order_date_idx').on(t.createdAt),
    statusCheck: check(
      'purchase_orders_status_check',
      sql`${t.status} IN ('DRAFT','ORDERED','PARTIAL','RECEIVED','CANCELLED')`
    ),
    paymentStatusCheck: check(
      'purchase_orders_payment_status_check',
      sql`${t.paymentStatus} IN ('UNPAID','PARTIAL','PAID')`
    ),
  })
)

export const purchaseOrderItems = pgTable(
  'purchase_order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    purchaseOrderId: uuid('purchase_order_id')
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantityOrdered: integer('quantity_ordered').notNull(),
    quantityReceived: integer('quantity_received').default(0).notNull(),
    unitCostKrw: bigint('unit_cost_krw', { mode: 'bigint' }).notNull(),
    totalCostKrw: bigint('total_cost_krw', { mode: 'bigint' }).notNull(),
    batchId: uuid('batch_id').references((): AnyPgColumn => inventoryBatches.id, {
      onDelete: 'set null',
    }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    purchaseOrderIdIdx: index('purchase_order_items_purchase_order_id_idx').on(t.purchaseOrderId),
    productIdIdx: index('purchase_order_items_product_id_idx').on(t.productId),
    batchIdIdx: index('purchase_order_items_batch_id_idx').on(t.batchId),
    qtyOrderedCheck: check('purchase_order_items_qty_ordered_check', sql`${t.quantityOrdered} > 0`),
    qtyReceivedCheck: check(
      'purchase_order_items_qty_received_check',
      sql`${t.quantityReceived} >= 0`
    ),
    qtyReceivedLimitCheck: check(
      'purchase_order_items_qty_received_limit_check',
      sql`${t.quantityReceived} <= ${t.quantityOrdered}`
    ),
  })
)

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
}))

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchaseOrders.supplierId],
    references: [suppliers.id],
  }),
  items: many(purchaseOrderItems),
  creator: one(adminUsers, {
    fields: [purchaseOrders.createdBy],
    references: [adminUsers.id],
  }),
}))

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  product: one(products, {
    fields: [purchaseOrderItems.productId],
    references: [products.id],
  }),
  batch: one(inventoryBatches, {
    fields: [purchaseOrderItems.batchId],
    references: [inventoryBatches.id],
  }),
}))

export type Supplier = typeof suppliers.$inferSelect
export type NewSupplier = typeof suppliers.$inferInsert

export type PurchaseOrder = typeof purchaseOrders.$inferSelect
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect
export type NewPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert
