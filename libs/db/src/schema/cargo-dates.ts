import { pgTable, uuid, date, text, boolean, timestamp } from 'drizzle-orm/pg-core'

export const cargoDates = pgTable('cargo_dates', {
  id: uuid('id').primaryKey().defaultRandom(),
  cargoDate: date('cargo_date', { mode: 'string' }).notNull(),
  note: text('note'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type CargoDate = typeof cargoDates.$inferSelect
export type NewCargoDate = typeof cargoDates.$inferInsert
