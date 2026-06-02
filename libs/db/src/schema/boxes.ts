import {
  pgTable, uuid, varchar, decimal, integer, boolean, timestamp, bigint, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const boxes = pgTable('boxes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull(),
  maxWeightKg: decimal('max_weight_kg', { precision: 8, scale: 3 }).notNull(),
  boxWeightKg: decimal('box_weight_kg', { precision: 8, scale: 3 }).notNull(),
  priceUsd: decimal('price_usd', { precision: 10, scale: 2 }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  maxWeightCheck: check('boxes_max_weight_check', sql`${t.maxWeightKg} > 0`),
  boxWeightCheck: check('boxes_box_weight_check', sql`${t.boxWeightKg} > 0`),
  priceUsdCheck: check('boxes_price_usd_check', sql`${t.priceUsd} >= 0`),
}));

export const korShippingTiers = pgTable('kor_shipping_tiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: varchar('label', { length: 100 }),
  maxOrderKrw: bigint('max_order_krw', { mode: 'bigint' }),
  cargoFeeKrw: bigint('cargo_fee_krw', { mode: 'bigint' }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  cargoFeeCheck: check('kor_shipping_tiers_cargo_fee_check', sql`${t.cargoFeeKrw} >= 0`),
}));

export type Box = typeof boxes.$inferSelect;
export type NewBox = typeof boxes.$inferInsert;

export type KorShippingTier = typeof korShippingTiers.$inferSelect;
export type NewKorShippingTier = typeof korShippingTiers.$inferInsert;
