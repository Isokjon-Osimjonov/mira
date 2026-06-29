import {
  pgTable,
  uuid,
  varchar,
  integer,
  bigint,
  decimal,
  timestamp,
  text,
  boolean,
  uniqueIndex,
  index,
  check,
  date,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import {
  orderStatusEnum,
  orderSourceEnum,
  paymentMethodEnum,
  deliveryCoveredByEnum,
  orderExpenseTypeEnum,
} from './enums'
import { customers } from './customers'
import { boxes } from './boxes'
import { exchangeRateSnapshots } from './settings'
import { adminUsers } from './admin-users'
import { products } from './products'
import { inventoryBatches } from './inventory'
import { cargoDates } from './cargo-dates'

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderNumber: varchar('order_number', { length: 20 }).unique().notNull(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),

    profileRegion: varchar('profile_region', { length: 5 }).notNull(),
    deliveryRegion: varchar('delivery_region', { length: 5 }).notNull(),

    status: orderStatusEnum('status').default('PENDING_PAYMENT').notNull(),
    orderSource: orderSourceEnum('order_source').default('STOREFRONT').notNull(),

    subtotal: bigint('subtotal', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    discountAmount: bigint('discount_amount', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    cargoFee: bigint('cargo_fee', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    totalAmount: bigint('total_amount', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    currency: varchar('currency', { length: 3 }).default('KRW').notNull(),
    totalWeightGrams: integer('total_weight_grams').default(0).notNull(),

    boxId: uuid('box_id').references(() => boxes.id, { onDelete: 'set null' }),
    boxWeightSnapshot: decimal('box_weight_snapshot', { precision: 8, scale: 3 }),
    boxPriceSnapshot: bigint('box_price_snapshot', { mode: 'bigint' }),
    boxCostKrw: bigint('box_cost_krw', { mode: 'number' }).default(0),

    couponId: uuid('coupon_id'), // NO FK — circular dep
    couponCode: varchar('coupon_code', { length: 50 }),

    rateSnapshotId: uuid('rate_snapshot_id').references(() => exchangeRateSnapshots.id, {
      onDelete: 'set null',
    }),

    paymentMethod: paymentMethodEnum('payment_method'),
    paymentMode: varchar('payment_mode', { length: 10 }).default('RECEIPT').notNull(),
    orderDiscountPct: integer('order_discount_pct'),
    orderDiscountFlat: bigint('order_discount_flat', { mode: 'bigint' }),
    paymentAmount: bigint('payment_amount', { mode: 'bigint' }),
    paymentReference: text('payment_reference'),
    paymentReceiptUrl: text('payment_receipt_url'),
    paymentSubmittedAt: timestamp('payment_submitted_at', { withTimezone: true }),
    paymentDeadline: timestamp('payment_deadline', { withTimezone: true }),
    paymentVerifiedBy: uuid('payment_verified_by').references(() => adminUsers.id, {
      onDelete: 'set null',
    }),
    paymentVerifiedAt: timestamp('payment_verified_at', { withTimezone: true }),
    paymentRejectedAt: timestamp('payment_rejected_at', { withTimezone: true }),
    paymentRejectedReason: text('payment_rejected_reason'),
    paymentConfirmedBy: uuid('payment_confirmed_by').references(() => adminUsers.id, {
      onDelete: 'set null',
    }),
    paymentConfirmedAt: timestamp('payment_confirmed_at', { withTimezone: true }),

    packedBy: uuid('packed_by').references(() => adminUsers.id, { onDelete: 'set null' }),
    packedAt: timestamp('packed_at', { withTimezone: true }),
    trackingNumber: varchar('tracking_number', { length: 100 }),
    shippedAt: timestamp('shipped_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),

    estimatedDeliveryStart: date('estimated_delivery_start', { mode: 'string' }),
    estimatedDeliveryEnd: date('estimated_delivery_end', { mode: 'string' }),
    cargoDateId: uuid('cargo_date_id').references(() => cargoDates.id, { onDelete: 'set null' }),

    deliveryFullName: text('delivery_full_name'),
    deliveryPhone: text('delivery_phone'),
    deliveryAddressLine1: text('delivery_address_line1'),
    deliveryAddressLine2: text('delivery_address_line2'),
    deliveryCity: text('delivery_city'),
    deliveryPostalCode: text('delivery_postal_code'),

    deliveryFeeCharged: bigint('delivery_fee_charged', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    deliveryFeeActual: bigint('delivery_fee_actual', { mode: 'bigint' }),
    deliveryCoveredBy: deliveryCoveredByEnum('delivery_covered_by'),

    customerNote: text('customer_note'),

    refundAmount: bigint('refund_amount', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    refundedAt: timestamp('refunded_at', { withTimezone: true }),
    refundedBy: uuid('refunded_by').references(() => adminUsers.id, { onDelete: 'set null' }),
    refundRequestedAt: timestamp('refund_requested_at', { withTimezone: true }),
    refundNote: text('refund_note'),

    paymentCurrency: varchar('payment_currency', { length: 3 }),
    paymentAmountUzs: bigint('payment_amount_uzs', { mode: 'bigint' }),

    adminNote: text('admin_note'),
    createdBy: uuid('created_by').references(() => adminUsers.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orderNumberIdx: uniqueIndex('orders_order_number_idx').on(t.orderNumber),
    customerIdIdx: index('orders_customer_id_idx').on(t.customerId),
    statusIdx: index('orders_status_idx').on(t.status),
    paymentDeadlineIdx: index('orders_payment_deadline_idx').on(t.paymentDeadline),
    createdAtIdx: index('orders_created_at_idx').on(t.createdAt),
    profileRegionCheck: check(
      'orders_profile_region_check',
      sql`${t.profileRegion} IN ('UZB', 'KOR')`
    ),
    deliveryRegionCheck: check(
      'orders_delivery_region_check',
      sql`${t.deliveryRegion} IN ('UZB', 'KOR')`
    ),
    paymentModeCheck: check(
      'orders_payment_mode_check',
      sql`${t.paymentMode} IN ('RECEIPT', 'IMMEDIATE')`
    ),
    totalAmountCheck: check('orders_total_amount_check', sql`${t.totalAmount} >= 0`),
    subtotalCheck: check('orders_subtotal_check', sql`${t.subtotal} >= 0`),
    discountAmountCheck: check('orders_discount_amount_check', sql`${t.discountAmount} >= 0`),
  })
)

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    batchId: uuid('batch_id').references(() => inventoryBatches.id, { onDelete: 'set null' }),
    quantity: integer('quantity').notNull(),

    unitPriceSnapshot: bigint('unit_price_snapshot', { mode: 'bigint' }).notNull(),
    negotiatedPriceKrw: bigint('negotiated_price_krw', { mode: 'bigint' }),
    subtotalSnapshot: bigint('subtotal_snapshot', { mode: 'bigint' }).notNull(),
    cargoFeeSnapshot: bigint('cargo_fee_snapshot', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    currencySnapshot: varchar('currency_snapshot', { length: 3 }).default('KRW').notNull(),

    costAtSaleKrw: bigint('cost_at_sale_krw', { mode: 'bigint' }),

    isScanned: boolean('is_scanned').default(false).notNull(),
    scannedAt: timestamp('scanned_at', { withTimezone: true }),
    scannedBy: uuid('scanned_by').references(() => adminUsers.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orderIdIdx: index('order_items_order_id_idx').on(t.orderId),
    productIdIdx: index('order_items_product_id_idx').on(t.productId),
    batchIdIdx: index('order_items_batch_id_idx').on(t.batchId),
    quantityCheck: check('order_items_quantity_check', sql`${t.quantity} > 0`),
    unitPriceSnapshotCheck: check(
      'order_items_unit_price_snapshot_check',
      sql`${t.unitPriceSnapshot} > 0`
    ),
    subtotalSnapshotCheck: check(
      'order_items_subtotal_snapshot_check',
      sql`${t.subtotalSnapshot} >= 0`
    ),
  })
)

// APPEND-ONLY — no UPDATE or DELETE ever
export const orderStatusHistory = pgTable(
  'order_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    fromStatus: varchar('from_status', { length: 25 }),
    toStatus: varchar('to_status', { length: 25 }).notNull(),
    changedBy: uuid('changed_by').references(() => adminUsers.id, { onDelete: 'set null' }),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orderIdIdx: index('order_status_history_order_id_idx').on(t.orderId),
    createdAtIdx: index('order_status_history_created_at_idx').on(t.createdAt),
  })
)

export const orderExpenses = pgTable(
  'order_expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    type: orderExpenseTypeEnum('type').notNull(),
    amountKrw: bigint('amount_krw', { mode: 'bigint' }).notNull(),
    note: text('note'),
    createdBy: uuid('created_by').references(() => adminUsers.id, { onDelete: 'set null' }),
    isAuto: boolean('is_auto').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orderIdIdx: index('order_expenses_order_id_idx').on(t.orderId),
    typeIdx: index('order_expenses_type_idx').on(t.type),
    createdAtIdx: index('order_expenses_created_at_idx').on(t.createdAt),
    amountKrwCheck: check('order_expenses_amount_krw_check', sql`${t.amountKrw} >= 0`),
  })
)

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  box: one(boxes, {
    fields: [orders.boxId],
    references: [boxes.id],
  }),
  rateSnapshot: one(exchangeRateSnapshots, {
    fields: [orders.rateSnapshotId],
    references: [exchangeRateSnapshots.id],
  }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
  expenses: many(orderExpenses),
  cargoDate: one(cargoDates, {
    fields: [orders.cargoDateId],
    references: [cargoDates.id],
  }),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  batch: one(inventoryBatches, {
    fields: [orderItems.batchId],
    references: [inventoryBatches.id],
  }),
}))

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id],
  }),
  changer: one(adminUsers, {
    fields: [orderStatusHistory.changedBy],
    references: [adminUsers.id],
  }),
}))

export const orderExpensesRelations = relations(orderExpenses, ({ one }) => ({
  order: one(orders, {
    fields: [orderExpenses.orderId],
    references: [orders.id],
  }),
  creator: one(adminUsers, {
    fields: [orderExpenses.createdBy],
    references: [adminUsers.id],
  }),
}))

export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
export type OrderItem = typeof orderItems.$inferSelect
export type NewOrderItem = typeof orderItems.$inferInsert
export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect
export type NewOrderStatusHistory = typeof orderStatusHistory.$inferInsert
export type OrderExpense = typeof orderExpenses.$inferSelect
export type NewOrderExpense = typeof orderExpenses.$inferInsert
