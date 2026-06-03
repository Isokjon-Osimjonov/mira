import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { db } from '../../config/db'
import { adminUsers, roles, rolePermissions, refreshTokens } from '@mira/db'
import { eq, and, sql, desc, count, isNull, or, ilike } from 'drizzle-orm'
import type { CreateAdminUserDto, UpdateAdminUserDto } from './admin-users.schema'

export async function getAdminUsers(query: { page?: number; limit?: number }) {
  const page = query.page || 1
  const limit = query.limit || 20
  const offset = (page - 1) * limit

  const itemsQuery = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      fullName: adminUsers.fullName,
      isSuperAdmin: adminUsers.isSuperAdmin,
      isActive: adminUsers.isActive,
      mustChangePassword: adminUsers.mustChangePassword,
      lastLoginAt: adminUsers.lastLoginAt,
      createdAt: adminUsers.createdAt,
      roleId: adminUsers.roleId,
      roleName: roles.name,
    })
    .from(adminUsers)
    .leftJoin(roles, eq(adminUsers.roleId, roles.id))
    .where(isNull(adminUsers.deletedAt))
    .orderBy(desc(adminUsers.createdAt))
    .limit(limit)
    .offset(offset)

  const [countRes] = await db
    .select({ count: count() })
    .from(adminUsers)
    .where(isNull(adminUsers.deletedAt))

  const total = Number(countRes?.count || 0)

  return {
    items: itemsQuery.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      isSuperAdmin: u.isSuperAdmin,
      isActive: u.isActive,
      mustChangePassword: u.mustChangePassword,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      role: u.roleId ? { id: u.roleId, name: u.roleName } : null,
    })),
    meta: { page, limit, total, hasNext: offset + limit < total, hasPrev: page > 1 },
  }
}

export async function getAdminUserById(id: string) {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(and(eq(adminUsers.id, id), isNull(adminUsers.deletedAt)))
    .limit(1)

  if (!admin) throw { status: 404, code: 'ADMIN_USER_NOT_FOUND', message: 'Admin topilmadi' }

  let roleData = null
  if (admin.roleId) {
    const [role] = await db.select().from(roles).where(eq(roles.id, admin.roleId)).limit(1)
    if (role) {
      const perms = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, role.id))
      roleData = {
        id: role.id,
        name: role.name,
        permissions: perms.map((p) => `${p.resource}:${p.action}`),
      }
    }
  }

  return {
    ...admin,
    passwordHash: undefined, // Security
    role: roleData,
  }
}

export async function createAdminUser(data: CreateAdminUserDto) {
  const [existing] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, data.email))
    .limit(1)
  if (existing)
    throw {
      status: 409,
      code: 'ADMIN_USER_DUPLICATE_EMAIL',
      message: 'Bunday email bilan admin mavjud',
    }

  const passwordHash = await bcrypt.hash(data.password, 12)

  const [created] = await db
    .insert(adminUsers)
    .values({
      email: data.email,
      fullName: data.fullName,
      passwordHash,
      roleId: data.isSuperAdmin ? null : data.roleId,
      isSuperAdmin: data.isSuperAdmin,
      mustChangePassword: true,
    })
    .returning()

  return created
}

export async function updateAdminUser(id: string, targetId: string, data: UpdateAdminUserDto) {
  if (id === targetId) {
    if (data.isActive === false)
      throw {
        status: 400,
        code: 'ADMIN_CANNOT_SELF_DEACTIVATE',
        message: "O'zingizni faolsizlantira olmaysiz",
      }
    if (data.roleId !== undefined || data.isSuperAdmin !== undefined) {
      throw {
        status: 400,
        code: 'ADMIN_CANNOT_CHANGE_OWN_ROLE',
        message: "O'z rolingizni o'zgartira olmaysiz",
      }
    }
  }

  const [target] = await db.select().from(adminUsers).where(eq(adminUsers.id, targetId)).limit(1)
  if (!target) throw { status: 404, code: 'ADMIN_USER_NOT_FOUND', message: 'Admin topilmadi' }

  const updates: any = { ...data, updatedAt: new Date() }
  if (data.isSuperAdmin === true) updates.roleId = null
  if (data.roleId) updates.isSuperAdmin = false

  const [updated] = await db
    .update(adminUsers)
    .set(updates)
    .where(eq(adminUsers.id, targetId))
    .returning()

  return updated
}

export async function resetAdminPassword(targetId: string) {
  const tempPassword = crypto.randomBytes(4).toString('hex').toUpperCase()
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  const [updated] = await db
    .update(adminUsers)
    .set({
      passwordHash,
      mustChangePassword: true,
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.id, targetId))
    .returning()

  if (!updated) throw { status: 404, code: 'ADMIN_USER_NOT_FOUND', message: 'Admin topilmadi' }

  return { tempPassword }
}

export async function deleteAdminUser(id: string, targetId: string) {
  if (id === targetId)
    throw { status: 400, code: 'FORBIDDEN', message: "O'zingizni o'chira olmaysiz" }

  const [deleted] = await db
    .update(adminUsers)
    .set({
      isActive: false,
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.id, targetId))
    .returning()

  if (!deleted) throw { status: 404, code: 'ADMIN_USER_NOT_FOUND', message: 'Admin topilmadi' }

  // Revoke all refresh tokens
  await db
    .update(refreshTokens)
    .set({ isRevoked: true, revokedAt: new Date(), revokedReason: 'ADMIN' })
    .where(eq(refreshTokens.adminUserId, targetId))

  return deleted
}
