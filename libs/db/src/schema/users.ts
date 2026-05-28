import { pgTable, uuid, varchar, bigint, boolean, timestamp } from 'drizzle-orm/pg-core'
import { regionEnum, userRoleEnum } from './enums'

export const users = pgTable('users', {
  id:               uuid('id').primaryKey().defaultRandom(),
  phone:            varchar('phone', { length: 20 }).unique().notNull(),
  phone_region:     regionEnum('phone_region').notNull(),
  telegram_id:      bigint('telegram_id', { mode: 'number' }).unique(),
  tg_username:      varchar('tg_username', { length: 100 }),
  first_name:       varchar('first_name',  { length: 100 }).notNull(),
  last_name:        varchar('last_name',   { length: 100 }),
  profile_image_url: varchar('profile_image_url', { length: 500 }),
  role:             userRoleEnum('role').default('customer').notNull(),
  is_active:        boolean('is_active').default(true).notNull(),
  is_verified:      boolean('is_verified').default(false).notNull(),
  expo_push_token:  varchar('expo_push_token', { length: 500 }),
  referral_code:    varchar('referral_code', { length: 12 }).unique(),
  referred_by_id:   uuid('referred_by_id'),
  deleted_at:       timestamp('deleted_at', { withTimezone: true }),
  created_at:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
