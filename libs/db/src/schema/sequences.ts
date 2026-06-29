import { pgTable, date, integer, uniqueIndex } from 'drizzle-orm/pg-core'

export const dailyOrderSequences = pgTable(
  'daily_order_sequences',
  {
    date: date('date').unique().notNull(),
    lastSeq: integer('last_seq').default(1).notNull(),
  },
  (t) => ({
    dateIdx: uniqueIndex('daily_order_sequences_date_idx').on(t.date),
  })
)

export type DailyOrderSequence = typeof dailyOrderSequences.$inferSelect
export type NewDailyOrderSequence = typeof dailyOrderSequences.$inferInsert
