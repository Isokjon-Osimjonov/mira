import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  bigint,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { customers } from './customers'
import { products } from './products'

export const carts = pgTable(
  'carts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .unique()
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    regionCode: text('region_code').default('UZB').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    customerIdIdx: uniqueIndex('carts_customer_id_idx').on(t.customerId),
  })
)

export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull(),
    priceSnapshot: bigint('price_snapshot', { mode: 'bigint' })
      .default(sql`0`)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    cartProductIdx: uniqueIndex('cart_items_cart_product_idx').on(t.cartId, t.productId),
    cartIdIdx: index('cart_items_cart_id_idx').on(t.cartId),
    productIdIdx: index('cart_items_product_id_idx').on(t.productId),
    quantityCheck: check('cart_items_quantity_check', sql`${t.quantity} > 0`),
  })
)

export const cartsRelations = relations(carts, ({ one, many }) => ({
  customer: one(customers, {
    fields: [carts.customerId],
    references: [customers.id],
  }),
  items: many(cartItems),
}))

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}))

export type Cart = typeof carts.$inferSelect
export type NewCart = typeof carts.$inferInsert

export type CartItem = typeof cartItems.$inferSelect
export type NewCartItem = typeof cartItems.$inferInsert
