import type { AnyPgColumn } from 'drizzle-orm/pg-core'
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
import { stockMovements } from './inventory'

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 50 }).unique().notNull(),
    description: text('description'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    nameIdx: uniqueIndex('roles_name_idx').on(t.name),
  })
)

export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    resource: varchar('resource', { length: 50 }).notNull(),
    action: varchar('action', { length: 20 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    roleIdIdx: index('role_permissions_role_id_idx').on(t.roleId),
    uniqueRoleResourceAction: uniqueIndex('role_permissions_unique_idx').on(
      t.roleId,
      t.resource,
      t.action
    ),
    actionCheck: check(
      'role_permissions_action_check',
      sql`${t.action} IN ('read', 'write', 'delete')`
    ),
  })
)

export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    passwordHash: text('password_hash').notNull(),
    fullName: text('full_name').default('').notNull(),
    roleId: uuid('role_id').references(() => roles.id, { onDelete: 'set null' }),
    isSuperAdmin: boolean('is_super_admin').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    mustChangePassword: boolean('must_change_password').default(false).notNull(),
    loginAttempts: integer('login_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdBy: uuid('created_by').references((): AnyPgColumn => adminUsers.id, {
      onDelete: 'set null',
    }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: uniqueIndex('admin_users_email_idx').on(t.email),
    roleIdIdx: index('admin_users_role_id_idx').on(t.roleId),
    deletedAtIdx: index('admin_users_deleted_at_idx').on(t.deletedAt),
    superAdminRoleCheck: check(
      'admin_users_super_admin_role_check',
      sql`NOT (${t.isSuperAdmin} = true AND ${t.roleId} IS NOT NULL)`
    ),
    regularAdminRoleCheck: check(
      'admin_users_regular_admin_role_check',
      sql`${t.isSuperAdmin} = true OR ${t.roleId} IS NOT NULL`
    ),
  })
)

export const rolesRelations = relations(roles, ({ many }) => ({
  permissions: many(rolePermissions),
  users: many(adminUsers),
}))

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
}))

export const adminUsersRelations = relations(adminUsers, ({ one, many }) => ({
  role: one(roles, {
    fields: [adminUsers.roleId],
    references: [roles.id],
  }),
  creator: one(adminUsers, {
    fields: [adminUsers.createdBy],
    references: [adminUsers.id],
    relationName: 'adminCreator',
  }),
  performedStockMovements: many(stockMovements, { relationName: 'stockPerformedBy' }),
  writtenOffStockMovements: many(stockMovements, { relationName: 'stockWrittenOffBy' }),
}))

export type Role = typeof roles.$inferSelect
export type NewRole = typeof roles.$inferInsert

export type RolePermission = typeof rolePermissions.$inferSelect
export type NewRolePermission = typeof rolePermissions.$inferInsert

export type AdminUser = typeof adminUsers.$inferSelect
export type NewAdminUser = typeof adminUsers.$inferInsert
