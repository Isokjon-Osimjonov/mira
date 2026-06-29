import {
  pgTable,
  uuid,
  varchar,
  bigint,
  boolean,
  timestamp,
  text,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { regionEnum } from './enums'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phone: varchar('phone', { length: 20 }).unique().notNull(),
    phoneRegion: regionEnum('phone_region').notNull(),
    telegramId: bigint('telegram_id', { mode: 'number' }).unique(),
    tgUsername: varchar('tg_username', { length: 100 }),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }),
    profileImageUrl: varchar('profile_image_url', { length: 500 }),
    source: varchar('source', { length: 20 }).default('APP').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    isVerified: boolean('is_verified').default(false).notNull(),
    expoPushToken: varchar('expo_push_token', { length: 500 }),
    referralCode: varchar('referral_code', { length: 12 }).unique(),
    referredById: uuid('referred_by_id').references((): AnyPgColumn => customers.id, {
      onDelete: 'set null',
    }),
    notes: text('notes'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    phoneIdx: uniqueIndex('customers_phone_idx').on(t.phone),
    telegramIdIdx: uniqueIndex('customers_telegram_id_idx').on(t.telegramId),
    referralCodeIdx: uniqueIndex('customers_referral_code_idx').on(t.referralCode),
    phoneRegionIdx: index('customers_phone_region_idx').on(t.phoneRegion),
    isActiveIdx: index('customers_is_active_idx').on(t.isActive),
    sourceCheck: check('customers_source_check', sql`${t.source} IN ('APP', 'WALK_IN', 'MANUAL')`),
  })
)

export const userAddresses = pgTable(
  'user_addresses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    label: text('label').default('Manzil').notNull(),
    regionCode: regionEnum('region_code').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    fullName: text('full_name').notNull(),
    phone: text('phone').notNull(),
    province: text('province'),
    city: text('city'),
    addressLine1: text('address_line1').notNull(),
    addressLine2: text('address_line2'),
    postalCode: text('postal_code'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    customerIdIdx: index('user_addresses_customer_id_idx').on(t.customerId),
    regionCodeIdx: index('user_addresses_region_code_idx').on(t.regionCode),
  })
)

export const userNotificationSettings = pgTable(
  'user_notification_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .unique()
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    orderStatus: boolean('order_status').default(true).notNull(),
    paymentConfirmed: boolean('payment_confirmed').default(true).notNull(),
    paymentRejected: boolean('payment_rejected').default(true).notNull(),
    shipped: boolean('shipped').default(true).notNull(),
    delivered: boolean('delivered').default(true).notNull(),
    stockBack: boolean('stock_back').default(true).notNull(),
    priceDrop: boolean('price_drop').default(true).notNull(),
    promotions: boolean('promotions').default(false).notNull(),
    pushEnabled: boolean('push_enabled').default(true).notNull(),
    telegramEnabled: boolean('telegram_enabled').default(true).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    customerIdIdx: uniqueIndex('user_notification_settings_customer_id_idx').on(t.customerId),
  })
)

export const customersRelations = relations(customers, ({ one, many }) => ({
  addresses: many(userAddresses),
  notificationSettings: one(userNotificationSettings, {
    fields: [customers.id],
    references: [userNotificationSettings.customerId],
  }),
  referredBy: one(customers, {
    fields: [customers.referredById],
    references: [customers.id],
    relationName: 'customerReferrals',
  }),
  referrals: many(customers, {
    relationName: 'customerReferrals',
  }),
  // wishlists, waitlists, carts, orders relations will be defined in respective files via extending
}))

export const userAddressesRelations = relations(userAddresses, ({ one }) => ({
  customer: one(customers, {
    fields: [userAddresses.customerId],
    references: [customers.id],
  }),
}))

export const userNotificationSettingsRelations = relations(userNotificationSettings, ({ one }) => ({
  customer: one(customers, {
    fields: [userNotificationSettings.customerId],
    references: [customers.id],
  }),
}))

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert

export type UserAddress = typeof userAddresses.$inferSelect
export type NewUserAddress = typeof userAddresses.$inferInsert

export type UserNotificationSettings = typeof userNotificationSettings.$inferSelect
export type NewUserNotificationSettings = typeof userNotificationSettings.$inferInsert
