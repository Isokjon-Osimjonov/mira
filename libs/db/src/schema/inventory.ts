import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import {
  pgTable,
  uuid,
  varchar,
  integer,
  bigint,
  date,
  timestamp,
  text,
  index,
  check,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { stockMovementTypeEnum, stockReservationStatusEnum } from './enums'
import { products } from './products'
import { adminUsers } from './admin-users'
import { purchaseOrderItems, suppliers } from './suppliers'

export const inventoryBatches = pgTable(
  'inventory_batches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    supplierId: uuid('supplier_id').references((): AnyPgColumn => suppliers.id, {
      onDelete: 'set null',
    }),
    purchaseOrderItemId: uuid('purchase_order_item_id').references(
      (): AnyPgColumn => purchaseOrderItems.id,
      { onDelete: 'set null' }
    ),
    batchRef: varchar('batch_ref', { length: 100 }),
    initialQty: integer('initial_qty').notNull(),
    currentQty: integer('current_qty').notNull(),
    costPrice: bigint('cost_price', { mode: 'bigint' }).notNull(),
    costCurrency: varchar('cost_currency', { length: 3 }).default('KRW').notNull(),
    expiryDate: date('expiry_date'),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    productIdIdx: index('inventory_batches_product_id_idx').on(t.productId),
    receivedAtIdx: index('inventory_batches_received_at_idx').on(t.receivedAt),
    expiryDateIdx: index('inventory_batches_expiry_date_idx').on(t.expiryDate),
    currentQtyIdx: index('inventory_batches_current_qty_idx').on(t.currentQty),
    initialQtyCheck: check('inventory_batches_initial_qty_check', sql`${t.initialQty} > 0`),
    currentQtyCheck: check('inventory_batches_current_qty_check', sql`${t.currentQty} >= 0`),
  })
)

// APPEND-ONLY — no UPDATE or DELETE ever
export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => inventoryBatches.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    orderId: uuid('order_id'), // NO FK — circular dep with orders, enforced at app layer
    movementType: stockMovementTypeEnum('movement_type').notNull(),
    quantityDelta: integer('quantity_delta').notNull(),
    qtyBefore: integer('qty_before').notNull(),
    qtyAfter: integer('qty_after').notNull(),
    performedBy: uuid('performed_by').references(() => adminUsers.id, { onDelete: 'set null' }),
    reason: text('reason'),
    recipientName: varchar('recipient_name', { length: 200 }),
    recipientPhone: varchar('recipient_phone', { length: 30 }),
    writtenOffBy: uuid('written_off_by').references(() => adminUsers.id, { onDelete: 'set null' }),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    productIdIdx: index('stock_movements_product_id_idx').on(t.productId),
    batchIdIdx: index('stock_movements_batch_id_idx').on(t.batchId),
    orderIdIdx: index('stock_movements_order_id_idx').on(t.orderId),
    movementTypeIdx: index('stock_movements_movement_type_idx').on(t.movementType),
    createdAtIdx: index('stock_movements_created_at_idx').on(t.createdAt),
    qtyAfterCheck: check('stock_movements_qty_after_check', sql`${t.qtyAfter} >= 0`),
    qtyConsistencyCheck: check(
      'stock_movements_qty_consistency_check',
      sql`${t.qtyAfter} = ${t.qtyBefore} + ${t.quantityDelta}`
    ),
  })
)

export const stockReservations = pgTable(
  'stock_reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull(), // NO FK — circular dep
    customerId: uuid('customer_id'), // NO FK — circular dep
    orderItemId: uuid('order_item_id').notNull(), // NO FK — circular dep
    batchId: uuid('batch_id')
      .notNull()
      .references(() => inventoryBatches.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    quantity: integer('quantity').notNull(),
    status: stockReservationStatusEnum('status').default('ACTIVE').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orderIdIdx: index('stock_reservations_order_id_idx').on(t.orderId),
    orderItemIdIdx: index('stock_reservations_order_item_id_idx').on(t.orderItemId),
    batchIdIdx: index('stock_reservations_batch_id_idx').on(t.batchId),
    productIdIdx: index('stock_reservations_product_id_idx').on(t.productId),
    statusIdx: index('stock_reservations_status_idx').on(t.status),
    expiresAtIdx: index('stock_reservations_expires_at_idx').on(t.expiresAt),
    quantityCheck: check('stock_reservations_quantity_check', sql`${t.quantity} > 0`),
  })
)

// APPEND-ONLY — no UPDATE or DELETE ever
export const batchAdjustments = pgTable(
  'batch_adjustments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => inventoryBatches.id, { onDelete: 'cascade' }),
    adminId: uuid('admin_id').references(() => adminUsers.id, { onDelete: 'set null' }),
    fieldChanged: text('field_changed').notNull(),
    oldValue: text('old_value').notNull(),
    newValue: text('new_value').notNull(),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    batchIdIdx: index('batch_adjustments_batch_id_idx').on(t.batchId),
    adminIdIdx: index('batch_adjustments_admin_id_idx').on(t.adminId),
  })
)

export const inventoryBatchesRelations = relations(inventoryBatches, ({ one, many }) => ({
  product: one(products, {
    fields: [inventoryBatches.productId],
    references: [products.id],
  }),
  supplier: one(suppliers, {
    fields: [inventoryBatches.supplierId],
    references: [suppliers.id],
  }),
  purchaseOrderItem: one(purchaseOrderItems, {
    fields: [inventoryBatches.purchaseOrderItemId],
    references: [purchaseOrderItems.id],
  }),
  movements: many(stockMovements),
  reservations: many(stockReservations),
  adjustments: many(batchAdjustments),
}))

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  batch: one(inventoryBatches, {
    fields: [stockMovements.batchId],
    references: [inventoryBatches.id],
  }),
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  performedByAdmin: one(adminUsers, {
    fields: [stockMovements.performedBy],
    references: [adminUsers.id],
    relationName: 'stockPerformedBy',
  }),
  writtenOffByAdmin: one(adminUsers, {
    fields: [stockMovements.writtenOffBy],
    references: [adminUsers.id],
    relationName: 'stockWrittenOffBy',
  }),
}))

export const stockReservationsRelations = relations(stockReservations, ({ one }) => ({
  batch: one(inventoryBatches, {
    fields: [stockReservations.batchId],
    references: [inventoryBatches.id],
  }),
  product: one(products, {
    fields: [stockReservations.productId],
    references: [products.id],
  }),
}))

export const batchAdjustmentsRelations = relations(batchAdjustments, ({ one }) => ({
  batch: one(inventoryBatches, {
    fields: [batchAdjustments.batchId],
    references: [inventoryBatches.id],
  }),
  admin: one(adminUsers, {
    fields: [batchAdjustments.adminId],
    references: [adminUsers.id],
  }),
}))

export type InventoryBatch = typeof inventoryBatches.$inferSelect
export type NewInventoryBatch = typeof inventoryBatches.$inferInsert

export type StockMovement = typeof stockMovements.$inferSelect
export type NewStockMovement = typeof stockMovements.$inferInsert

export type StockReservation = typeof stockReservations.$inferSelect
export type NewStockReservation = typeof stockReservations.$inferInsert

export type BatchAdjustment = typeof batchAdjustments.$inferSelect
export type NewBatchAdjustment = typeof batchAdjustments.$inferInsert
