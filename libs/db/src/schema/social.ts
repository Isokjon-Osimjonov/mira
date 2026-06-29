import { pgTable, uuid, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { customers } from './customers'
import { products } from './products'

export const wishlists = pgTable(
  'wishlists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    customerProductIdx: uniqueIndex('wishlists_customer_product_idx').on(t.customerId, t.productId),
    productIdIdx: index('wishlists_product_id_idx').on(t.productId),
  })
)

export const waitlists = pgTable(
  'waitlists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    notified: boolean('notified').default(false).notNull(),
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    customerProductIdx: uniqueIndex('waitlists_customer_product_idx').on(t.customerId, t.productId),
    productIdNotifiedIdx: index('waitlists_product_id_notified_idx').on(t.productId, t.notified),
  })
)

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  customer: one(customers, {
    fields: [wishlists.customerId],
    references: [customers.id],
  }),
  product: one(products, {
    fields: [wishlists.productId],
    references: [products.id],
  }),
}))

export const waitlistsRelations = relations(waitlists, ({ one }) => ({
  customer: one(customers, {
    fields: [waitlists.customerId],
    references: [customers.id],
  }),
  product: one(products, {
    fields: [waitlists.productId],
    references: [products.id],
  }),
}))

export type Wishlist = typeof wishlists.$inferSelect
export type NewWishlist = typeof wishlists.$inferInsert

export type Waitlist = typeof waitlists.$inferSelect
export type NewWaitlist = typeof waitlists.$inferInsert
