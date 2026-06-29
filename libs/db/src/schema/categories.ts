import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').unique().notNull(),
    imageUrl: text('image_url'),
    parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, {
      onDelete: 'set null',
    }),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex('categories_slug_idx').on(t.slug),
    parentIdIdx: index('categories_parent_id_idx').on(t.parentId),
    isActiveIdx: index('categories_is_active_idx').on(t.isActive),
    deletedAtIdx: index('categories_deleted_at_idx').on(t.deletedAt),
  })
)

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'categoryHierarchy',
  }),
  children: many(categories, {
    relationName: 'categoryHierarchy',
  }),
  // products relation will be defined in products.ts
}))

export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
