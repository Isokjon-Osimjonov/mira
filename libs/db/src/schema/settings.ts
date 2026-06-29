import {
  pgTable,
  uuid,
  integer,
  bigint,
  boolean,
  text,
  varchar,
  timestamp,
  uniqueIndex,
  index,
  char,
  numeric,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { exchangeRateSourceEnum } from './enums'
import { adminUsers } from './admin-users'

export const settings = pgTable(
  'settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lockColumn: char('lock_column', { length: 1 }).default('X').notNull(),

    paymentTimeoutMinutes: integer('payment_timeout_minutes').default(30).notNull(),
    lowStockThreshold: integer('low_stock_threshold').default(10).notNull(),

    cargoTransitDaysMin: integer('cargo_transit_days_min').default(7).notNull(),
    cargoTransitDaysMax: integer('cargo_transit_days_max').default(10).notNull(),

    uzbCargoUsdPerKg: integer('uzb_cargo_usd_per_kg').default(10).notNull(),
    usdToKrw: integer('usd_to_krw').default(1350).notNull(),

    minOrderKorKrw: integer('min_order_kor_krw').default(0).notNull(),
    minOrderUzbUzs: integer('min_order_uzb_uzs').default(0).notNull(),

    telegramUrl: varchar('telegram_url', { length: 200 }),
    instagramUrl: varchar('instagram_url', { length: 200 }),
    websiteUrl: varchar('website_url', { length: 200 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    lockIdx: uniqueIndex('settings_lock_idx').on(t.lockColumn),
  })
)

export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  method: varchar('method', { length: 50 }).unique().notNull(),
  region: varchar('region', { length: 10 }).notNull(),
  isEnabled: boolean('is_enabled').default(false).notNull(),
  bankName: text('bank_name'),
  accountNumber: text('account_number'),
  holderName: text('holder_name'),
  instructions: text('instructions'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const exchangeRateSnapshots = pgTable(
  'exchange_rate_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    krwToUzs: numeric('krw_to_uzs', { precision: 10, scale: 4 }).notNull(),
    usdToKrw: numeric('usd_to_krw', { precision: 10, scale: 2 }).notNull(),
    cargoRateKrwPerKg: numeric('cargo_rate_krw_per_kg', { precision: 12, scale: 2 }).notNull(),
    source: exchangeRateSourceEnum('source').default('API').notNull(),
    note: text('note'),
    createdBy: uuid('created_by').references(() => adminUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    createdAtIdx: index('exchange_rate_snapshots_created_at_idx').on(t.createdAt),
    sourceIdx: index('exchange_rate_snapshots_source_idx').on(t.source),
  })
)

export const exchangeRateSnapshotsRelations = relations(exchangeRateSnapshots, ({ one }) => ({
  creator: one(adminUsers, {
    fields: [exchangeRateSnapshots.createdBy],
    references: [adminUsers.id],
  }),
}))

export type Setting = typeof settings.$inferSelect
export type NewSetting = typeof settings.$inferInsert

export type PaymentMethod = typeof paymentMethods.$inferSelect
export type NewPaymentMethod = typeof paymentMethods.$inferInsert

export type ExchangeRateSnapshot = typeof exchangeRateSnapshots.$inferSelect
export type NewExchangeRateSnapshot = typeof exchangeRateSnapshots.$inferInsert
