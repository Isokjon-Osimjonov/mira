import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { categories } from './categories'

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    barcode: varchar('barcode', { length: 50 }).unique().notNull(),
    sku: varchar('sku', { length: 50 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    brandName: varchar('brand_name', { length: 100 }).notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    descriptionUz: text('description_uz'),
    howToUseUz: text('how_to_use_uz'),
    ingredients: jsonb('ingredients').$type<string[]>().default([]).notNull(),
    skinTypes: jsonb('skin_types').$type<string[]>().default([]).notNull(),
    benefits: jsonb('benefits').$type<string[]>().default([]).notNull(),
    weightGrams: integer('weight_grams').default(0).notNull(),
    volumeMl: integer('volume_ml'),
    volumeUnit: varchar('volume_unit', { length: 10 }),
    imageUrls: jsonb('image_urls').$type<string[]>().default([]).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    isNew: boolean('is_new').default(false).notNull(),
    isFeatured: boolean('is_featured').default(false).notNull(),
    showStockCount: boolean('show_stock_count').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    barcodeIdx: uniqueIndex('products_barcode_idx').on(t.barcode),
    skuIdx: uniqueIndex('products_sku_idx').on(t.sku),
    brandNameIdx: index('products_brand_name_idx').on(t.brandName),
    categoryIdIdx: index('products_category_id_idx').on(t.categoryId),
    deletedAtIdx: index('products_deleted_at_idx').on(t.deletedAt),
  })
)

export const productRegionalConfigs = pgTable(
  'product_regional_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    regionCode: varchar('region_code', { length: 5 }).notNull(),
    retailPrice: bigint('retail_price', { mode: 'bigint' }).notNull(),
    wholesalePrice: bigint('wholesale_price', { mode: 'bigint' }).notNull(),
    currency: varchar('currency', { length: 3 }).default('KRW').notNull(),
    minWholesaleQty: integer('min_wholesale_qty').default(5).notNull(),
    minOrderQty: integer('min_order_qty').default(1).notNull(),
    isAvailable: boolean('is_available').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    productRegionIdx: uniqueIndex('product_regional_configs_product_region_idx').on(
      t.productId,
      t.regionCode
    ),
    productIdIdx: index('product_regional_configs_product_id_idx').on(t.productId),
    regionCodeCheck: check(
      'product_regional_configs_region_code_check',
      sql`${t.regionCode} IN ('UZB', 'KOR')`
    ),
    currencyCheck: check('product_regional_configs_currency_check', sql`${t.currency} IN ('KRW')`),
    retailPriceCheck: check(
      'product_regional_configs_retail_price_check',
      sql`${t.retailPrice} > 0`
    ),
    wholesalePriceCheck: check(
      'product_regional_configs_wholesale_price_check',
      sql`${t.wholesalePrice} > 0`
    ),
    priceCompareCheck: check(
      'product_regional_configs_price_compare_check',
      sql`${t.wholesalePrice} <= ${t.retailPrice}`
    ),
    minWholesaleQtyCheck: check(
      'product_regional_configs_min_wholesale_qty_check',
      sql`${t.minWholesaleQty} >= 1`
    ),
    minOrderQtyCheck: check(
      'product_regional_configs_min_order_qty_check',
      sql`${t.minOrderQty} >= 1`
    ),
  })
)

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  regionalConfigs: many(productRegionalConfigs),
  // inventoryBatches, wishlists, waitlists relations will be defined later
}))

export const productRegionalConfigsRelations = relations(productRegionalConfigs, ({ one }) => ({
  product: one(products, {
    fields: [productRegionalConfigs.productId],
    references: [products.id],
  }),
}))

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert

export type ProductRegionalConfig = typeof productRegionalConfigs.$inferSelect
export type NewProductRegionalConfig = typeof productRegionalConfigs.$inferInsert
