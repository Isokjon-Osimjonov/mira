import {
  pgTable, uuid, integer, bigint, boolean, text, varchar, timestamp, uniqueIndex, index, char,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { exchangeRateSourceEnum } from './enums';
import { adminUsers } from './admin-users';

export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  lockColumn: char('lock_column', { length: 1 }).default('X').notNull(),
  
  paymentTimeoutMinutes: integer('payment_timeout_minutes').default(30).notNull(),
  lowStockThreshold: integer('low_stock_threshold').default(10).notNull(),
  
  uzbCargoUsdPerKg: integer('uzb_cargo_usd_per_kg').default(10).notNull(),
  
  standardShippingFeeKrw: bigint('standard_shipping_fee_krw', { mode: 'bigint' }).default(sql`3000`).notNull(),
  freeShippingThresholdKrw: bigint('free_shipping_threshold_krw', { mode: 'bigint' }).default(sql`50000`).notNull(),
  
  minOrderUzbKrw: bigint('min_order_uzb_krw', { mode: 'bigint' }).default(sql`0`).notNull(),
  minOrderKorKrw: bigint('min_order_kor_krw', { mode: 'bigint' }).default(sql`0`).notNull(),
  
  korBankEnabled: boolean('kor_bank_enabled').default(false).notNull(),
  korBankName: text('kor_bank_name'),
  korBankHolder: text('kor_bank_holder'),
  korBankNumber: text('kor_bank_number'),
  
  korE9payEnabled: boolean('kor_e9pay_enabled').default(false).notNull(),
  korE9payName: text('kor_e9pay_name'),
  korE9payAccount: text('kor_e9pay_account'),
  
  uzbBankEnabled: boolean('uzb_bank_enabled').default(false).notNull(),
  uzbBankName: text('uzb_bank_name'),
  uzbBankHolder: text('uzb_bank_holder'),
  uzbBankNumber: text('uzb_bank_number'),
  
  telegramUrl: varchar('telegram_url', { length: 200 }),
  instagramUrl: varchar('instagram_url', { length: 200 }),
  websiteUrl: varchar('website_url', { length: 200 }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  lockIdx: uniqueIndex('settings_lock_idx').on(t.lockColumn),
}));

export const exchangeRateSnapshots = pgTable('exchange_rate_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  krwToUzs: integer('krw_to_uzs').notNull(),
  usdToKrw: integer('usd_to_krw').notNull(),
  cargoRateKrwPerKg: integer('cargo_rate_krw_per_kg').notNull(),
  source: exchangeRateSourceEnum('source').default('API').notNull(),
  note: text('note'),
  createdBy: uuid('created_by').references(() => adminUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  createdAtIdx: index('exchange_rate_snapshots_created_at_idx').on(t.createdAt),
  sourceIdx: index('exchange_rate_snapshots_source_idx').on(t.source),
}));

export const exchangeRateSnapshotsRelations = relations(exchangeRateSnapshots, ({ one }) => ({
  creator: one(adminUsers, {
    fields: [exchangeRateSnapshots.createdBy],
    references: [adminUsers.id],
  }),
}));

export const shippingTiers = pgTable('shipping_tiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  region: varchar('region', { length: 10 }).notNull(), // 'KOR' or 'UZB'
  minQty: integer('min_qty').notNull(),
  shippingCost: bigint('shipping_cost', { mode: 'bigint' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  regionIdx: index('shipping_tiers_region_idx').on(t.region),
  qtyIdx: index('shipping_tiers_min_qty_idx').on(t.minQty),
}));

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

export type ExchangeRateSnapshot = typeof exchangeRateSnapshots.$inferSelect;
export type NewExchangeRateSnapshot = typeof exchangeRateSnapshots.$inferInsert;

export type ShippingTier = typeof shippingTiers.$inferSelect;
export type NewShippingTier = typeof shippingTiers.$inferInsert;
