import { pgTable, uuid, varchar, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core'

export const banners = pgTable('banners', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 200 }),
  subtitle: varchar('subtitle', { length: 300 }),
  buttonText: varchar('button_text', { length: 50 }),
  imageUrl: text('image_url'),
  bgColor: varchar('bg_color', { length: 7 }).default('#E11D74'),
  linkType: varchar('link_type', { length: 20 }).default('none'),
  // values: none | product | category | external | wholesale
  linkValue: text('link_value'),
  // productId, categoryId, URL, or telegram link
  regionCode: varchar('region_code', { length: 5 }),
  // null = all regions, 'KOR', 'UZB' = specific
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Banner = typeof banners.$inferSelect
export type NewBanner = typeof banners.$inferInsert
