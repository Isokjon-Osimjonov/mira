import { pgTable, date, text, uuid, integer, bigint, primaryKey, index } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { products } from './products'

export const dailySalesSummary = pgTable(
  'daily_sales_summary',
  {
    date: date('date').notNull(),
    regionCode: text('region_code').notNull(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    unitsSold: integer('units_sold').default(0).notNull(),
    revenueKrw: bigint('revenue_krw', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    cogsKrw: bigint('cogs_krw', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    cargoKrw: bigint('cargo_krw', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    couponDiscountKrw: bigint('coupon_discount_krw', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    orderCount: integer('order_count').default(0).notNull(),
    refundCount: integer('refund_count').default(0).notNull(),
    refundedRevenueKrw: bigint('refunded_revenue_krw', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.date, t.regionCode, t.productId] }),
    dateIdx: index('daily_sales_summary_date_idx').on(t.date),
    regionIdx: index('daily_sales_summary_region_idx').on(t.regionCode),
    dateRegionIdx: index('daily_sales_summary_date_region_idx').on(t.date, t.regionCode),
  })
)

export const dailySalesSummaryRelations = relations(dailySalesSummary, ({ one }) => ({
  product: one(products, {
    fields: [dailySalesSummary.productId],
    references: [products.id],
  }),
}))

export type DailySalesSummary = typeof dailySalesSummary.$inferSelect
export type NewDailySalesSummary = typeof dailySalesSummary.$inferInsert
