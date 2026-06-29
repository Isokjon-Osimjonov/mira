import {
  pgTable,
  uuid,
  varchar,
  decimal,
  integer,
  boolean,
  timestamp,
  bigint,
  check,
  text,
  numeric,
  jsonb,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const boxes = pgTable(
  'boxes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 50 }).notNull(),
    sizeLabel: text('size_label'),
    lengthCm: numeric('length_cm'),
    widthCm: numeric('width_cm'),
    heightCm: numeric('height_cm'),
    costKrw: integer('cost_krw').notNull().default(0),
    stockCount: integer('stock_count').notNull().default(0),
    minStock: integer('min_stock').notNull().default(10),
    imageUrls: jsonb('image_urls').$type<string[]>().default([]),

    // Legacy fields kept for compatibility
    maxWeightKg: decimal('max_weight_kg', { precision: 8, scale: 3 }),
    boxWeightKg: decimal('box_weight_kg', { precision: 8, scale: 3 }),
    priceUsd: decimal('price_usd', { precision: 10, scale: 2 }),
    sortOrder: integer('sort_order').default(0).notNull(),

    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    // Optional checks can be added here
  })
)

export const korShippingTiers = pgTable(
  'kor_shipping_tiers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    label: varchar('label', { length: 100 }),
    maxOrderKrw: bigint('max_order_krw', { mode: 'bigint' }),
    cargoFeeKrw: bigint('cargo_fee_krw', { mode: 'bigint' }).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    cargoFeeCheck: check('kor_shipping_tiers_cargo_fee_check', sql`${t.cargoFeeKrw} >= 0`),
  })
)

export type Box = typeof boxes.$inferSelect
export type NewBox = typeof boxes.$inferInsert

export type KorShippingTier = typeof korShippingTiers.$inferSelect
export type NewKorShippingTier = typeof korShippingTiers.$inferInsert
