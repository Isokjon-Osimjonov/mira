import {
  pgTable,
  uuid,
  varchar,
  bigint,
  smallint,
  boolean,
  timestamp,
  text,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { revokeReasonEnum } from './enums'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { adminUsers } from './admin-users'

// We import customers lazily to avoid circular dependencies if needed,
// but the spec says "use lazy refs" so we can define it that way.
// To use lazy reference for customers.id: (): AnyPgColumn => customers.id (but we need to import customers)
// For simplicity and to follow the spec:
import { customers } from './customers'

// APPEND-ONLY — no UPDATE or DELETE ever
export const authTokens = pgTable(
  'auth_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    token: varchar('token', { length: 64 }).unique().notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    telegramId: bigint('telegram_id', { mode: 'number' }),
    otp: varchar('otp', { length: 6 }),
    attempts: smallint('attempts').default(0).notNull(),
    used: boolean('used').default(false).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tokenIdx: uniqueIndex('auth_tokens_token_idx').on(t.token),
    phoneIdx: index('auth_tokens_phone_idx').on(t.phone),
    expiresAtIdx: index('auth_tokens_expires_at_idx').on(t.expiresAt),
  })
)

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    token: varchar('token', { length: 128 }).unique().notNull(),
    customerId: uuid('customer_id').references((): AnyPgColumn => customers.id, {
      onDelete: 'cascade',
    }),
    adminUserId: uuid('admin_user_id').references(() => adminUsers.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').notNull(),
    deviceInfo: text('device_info'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    isRevoked: boolean('is_revoked').default(false).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedReason: revokeReasonEnum('revoked_reason'),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tokenIdx: uniqueIndex('refresh_tokens_token_idx').on(t.token),
    customerIdIdx: index('refresh_tokens_customer_id_idx').on(t.customerId),
    adminUserIdIdx: index('refresh_tokens_admin_user_id_idx').on(t.adminUserId),
    familyIdIdx: index('refresh_tokens_family_id_idx').on(t.familyId),
    expiresAtIdx: index('refresh_tokens_expires_at_idx').on(t.expiresAt),
    isRevokedIdx: index('refresh_tokens_is_revoked_idx').on(t.isRevoked),
    userCheck: check(
      'refresh_tokens_user_check',
      sql`(${t.customerId} IS NOT NULL)::int + (${t.adminUserId} IS NOT NULL)::int = 1`
    ),
  })
)

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  customer: one(customers, {
    fields: [refreshTokens.customerId],
    references: [customers.id],
  }),
  adminUser: one(adminUsers, {
    fields: [refreshTokens.adminUserId],
    references: [adminUsers.id],
  }),
}))

export type AuthToken = typeof authTokens.$inferSelect
export type NewAuthToken = typeof authTokens.$inferInsert

export type RefreshToken = typeof refreshTokens.$inferSelect
export type NewRefreshToken = typeof refreshTokens.$inferInsert
