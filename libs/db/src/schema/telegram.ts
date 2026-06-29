import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  check,
  integer,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { telegramPostStatusEnum } from './enums'
import { adminUsers } from './admin-users'
import { products } from './products'

export const telegramChannels = pgTable(
  'telegram_channels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chatId: varchar('chat_id', { length: 50 }).unique().notNull(),
    channelName: varchar('channel_name', { length: 200 }).notNull(),
    channelUsername: varchar('channel_username', { length: 100 }),
    type: text('type').default('channel'),
    memberCount: integer('member_count'),
    regionCode: varchar('region_code', { length: 5 }),
    isActive: boolean('is_active').default(true).notNull(),
    addedBy: uuid('added_by').references(() => adminUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    chatIdIdx: uniqueIndex('telegram_channels_chat_id_idx').on(t.chatId),
  })
)

export const telegramPosts = pgTable(
  'telegram_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 300 }).notNull(),
    content: text('content').notNull(),
    imageUrl: text('image_url'),
    status: telegramPostStatusEnum('status').default('DRAFT').notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => adminUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index('telegram_posts_status_idx').on(t.status),
    scheduledAtIdx: index('telegram_posts_scheduled_at_idx').on(t.scheduledAt),
    productIdIdx: index('telegram_posts_product_id_idx').on(t.productId),
  })
)

export const telegramPostChannels = pgTable(
  'telegram_post_channels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => telegramPosts.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => telegramChannels.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).default('PENDING').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    telegramMessageId: varchar('telegram_message_id', { length: 50 }),
    errorMsg: text('error_msg'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    postChannelUnique: uniqueIndex('telegram_post_channels_unique_idx').on(t.postId, t.channelId),
    postIdIdx: index('telegram_post_channels_post_id_idx').on(t.postId),
    channelIdIdx: index('telegram_post_channels_channel_id_idx').on(t.channelId),
    statusCheck: check(
      'telegram_post_channels_status_check',
      sql`${t.status} IN ('PENDING', 'SENT', 'FAILED')`
    ),
  })
)

export const telegramChannelsRelations = relations(telegramChannels, ({ one, many }) => ({
  addedByAdmin: one(adminUsers, {
    fields: [telegramChannels.addedBy],
    references: [adminUsers.id],
  }),
  posts: many(telegramPostChannels),
}))

export const telegramPostsRelations = relations(telegramPosts, ({ one, many }) => ({
  product: one(products, {
    fields: [telegramPosts.productId],
    references: [products.id],
  }),
  creator: one(adminUsers, {
    fields: [telegramPosts.createdBy],
    references: [adminUsers.id],
  }),
  channels: many(telegramPostChannels),
}))

export const telegramPostChannelsRelations = relations(telegramPostChannels, ({ one }) => ({
  post: one(telegramPosts, {
    fields: [telegramPostChannels.postId],
    references: [telegramPosts.id],
  }),
  channel: one(telegramChannels, {
    fields: [telegramPostChannels.channelId],
    references: [telegramChannels.id],
  }),
}))

export const telegramPostSettings = pgTable('telegram_post_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').default(''),
  link1Label: text('link1_label').default('Telegram'),
  link1Url: text('link1_url').default(''),
  link2Label: text('link2_label').default('Instagram'),
  link2Url: text('link2_url').default(''),
  link3Label: text('link3_label').default('Website'),
  link3Url: text('link3_url').default(''),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type TelegramChannel = typeof telegramChannels.$inferSelect
export type NewTelegramChannel = typeof telegramChannels.$inferInsert

export type TelegramPost = typeof telegramPosts.$inferSelect
export type NewTelegramPost = typeof telegramPosts.$inferInsert

export type TelegramPostChannel = typeof telegramPostChannels.$inferSelect
export type NewTelegramPostChannel = typeof telegramPostChannels.$inferInsert
