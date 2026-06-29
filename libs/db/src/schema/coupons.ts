import {
  pgTable,
  uuid,
  varchar,
  text,
  bigint,
  boolean,
  timestamp,
  integer,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { couponTypeEnum, couponScopeEnum, couponStatusEnum } from './enums'
import { customers } from './customers'
import { adminUsers } from './admin-users'
import { products } from './products'
import { categories } from './categories'

export const coupons = pgTable(
  'coupons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 50 }).unique().notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    type: couponTypeEnum('type').default('PERCENTAGE').notNull(),
    value: bigint('value', { mode: 'bigint' }).notNull(),
    valueKrw: bigint('value_krw', { mode: 'bigint' }),
    maxDiscountCap: bigint('max_discount_cap', { mode: 'bigint' }),
    maxDiscountKrw: bigint('max_discount_krw', { mode: 'bigint' }),
    scope: text('scope').default('ALL').notNull(),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    applicableResourceIds: uuid('applicable_resource_ids').array(),
    applicableBrands: varchar('applicable_brands', { length: 100 }).array(),
    minOrderAmount: bigint('min_order_amount', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    minOrderKrw: bigint('min_order_krw', { mode: 'bigint' }),
    minOrderQty: integer('min_order_qty').default(1).notNull(),
    regionCode: varchar('region_code', { length: 3 }),
    firstOrderOnly: boolean('first_order_only').default(false).notNull(),
    onePerCustomer: boolean('one_per_customer').default(false).notNull(),
    excludeWholesale: boolean('exclude_wholesale').default(false).notNull(),
    targetCustomerIds: uuid('target_customer_ids').array(),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    maxUsesTotal: integer('max_uses_total'),
    maxUsesPerCustomer: integer('max_uses_per_customer').default(1).notNull(),
    usageCount: integer('usage_count').default(0).notNull(),
    autoApply: boolean('auto_apply').default(false).notNull(),
    isStackable: boolean('is_stackable').default(false).notNull(),
    isPromotional: boolean('is_promotional').default(false).notNull(),
    promoDisplayText: text('promo_display_text'),
    status: couponStatusEnum('status').default('DRAFT').notNull(),
    createdBy: uuid('created_by').references(() => adminUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    codeIdx: uniqueIndex('coupons_code_idx').on(t.code),
    statusIdx: index('coupons_status_idx').on(t.status),
    autoApplyIdx: index('coupons_auto_apply_idx').on(t.autoApply),
    expiresAtIdx: index('coupons_expires_at_idx').on(t.expiresAt),
    valueCheck: check('coupons_value_check', sql`${t.value} > 0`),
  })
)

// APPEND-ONLY — no UPDATE or DELETE ever
export const couponRedemptions = pgTable(
  'coupon_redemptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    couponId: uuid('coupon_id')
      .notNull()
      .references(() => coupons.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id),
    orderId: uuid('order_id').notNull(), // NO FK — circular dep
    discountAmount: bigint('discount_amount', { mode: 'bigint' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    couponIdIdx: index('coupon_redemptions_coupon_id_idx').on(t.couponId),
    customerIdIdx: index('coupon_redemptions_customer_id_idx').on(t.customerId),
    orderIdIdx: index('coupon_redemptions_order_id_idx').on(t.orderId),
  })
)

export const userCoupons = pgTable(
  'user_coupons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    couponId: uuid('coupon_id')
      .notNull()
      .references(() => coupons.id, { onDelete: 'cascade' }),
    isUsed: boolean('is_used').default(false).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    orderId: uuid('order_id'),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    customerCouponUnique: uniqueIndex('user_coupons_unique_idx').on(t.customerId, t.couponId),
    customerIdIdx: index('user_coupons_customer_id_idx').on(t.customerId),
    couponIdIdx: index('user_coupons_coupon_id_idx').on(t.couponId),
    isUsedIdx: index('user_coupons_is_used_idx').on(t.isUsed),
  })
)

export const couponsRelations = relations(coupons, ({ one, many }) => ({
  creator: one(adminUsers, {
    fields: [coupons.createdBy],
    references: [adminUsers.id],
  }),
  redemptions: many(couponRedemptions),
  userCoupons: many(userCoupons),
}))

export const couponRedemptionsRelations = relations(couponRedemptions, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponRedemptions.couponId],
    references: [coupons.id],
  }),
  customer: one(customers, {
    fields: [couponRedemptions.customerId],
    references: [customers.id],
  }),
}))

export const userCouponsRelations = relations(userCoupons, ({ one }) => ({
  customer: one(customers, {
    fields: [userCoupons.customerId],
    references: [customers.id],
  }),
  coupon: one(coupons, {
    fields: [userCoupons.couponId],
    references: [coupons.id],
  }),
}))

export type Coupon = typeof coupons.$inferSelect
export type NewCoupon = typeof coupons.$inferInsert

export type CouponRedemption = typeof couponRedemptions.$inferSelect
export type NewCouponRedemption = typeof couponRedemptions.$inferInsert

export type UserCoupon = typeof userCoupons.$inferSelect
export type NewUserCoupon = typeof userCoupons.$inferInsert
