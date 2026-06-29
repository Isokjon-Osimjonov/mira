import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
  date,
  bigint,
  uniqueIndex,
  index,
  text,
  check,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { adminUsers } from './admin-users'

export const expenseCategories = pgTable(
  'expense_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).unique().notNull(),
    slug: varchar('slug', { length: 100 }).unique().notNull(),
    description: text('description'),
    color: varchar('color', { length: 20 }).default('#6366f1'),
    icon: varchar('icon', { length: 50 }),
    isSystem: boolean('is_system').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    nameIdx: uniqueIndex('expense_categories_name_idx').on(t.name),
    slugIdx: uniqueIndex('expense_categories_slug_idx').on(t.slug),
  })
)

export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => expenseCategories.id, { onDelete: 'restrict' }),
    amountKrw: bigint('amount_krw', { mode: 'bigint' }).notNull(),
    description: text('description').notNull(),
    expenseDate: date('expense_date').notNull(),
    note: text('note'),
    receiptUrl: text('receipt_url'),
    referenceId: uuid('reference_id'),
    referenceType: varchar('reference_type', { length: 50 }),
    createdBy: uuid('created_by').references(() => adminUsers.id, { onDelete: 'set null' }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    expenseDateIdx: index('expenses_expense_date_idx').on(t.expenseDate),
    categoryIdIdx: index('expenses_category_id_idx').on(t.categoryId),
    createdByIdx: index('expenses_created_by_idx').on(t.createdBy),
    amountCheck: check('expenses_amount_check', sql`${t.amountKrw} > 0`),
  })
)

export const expenseCategoriesRelations = relations(expenseCategories, ({ many }) => ({
  expenses: many(expenses),
}))

export const expensesRelations = relations(expenses, ({ one }) => ({
  category: one(expenseCategories, {
    fields: [expenses.categoryId],
    references: [expenseCategories.id],
  }),
  creator: one(adminUsers, {
    fields: [expenses.createdBy],
    references: [adminUsers.id],
  }),
}))

export type ExpenseCategory = typeof expenseCategories.$inferSelect
export type NewExpenseCategory = typeof expenseCategories.$inferInsert

export type Expense = typeof expenses.$inferSelect
export type NewExpense = typeof expenses.$inferInsert
