import bcrypt from 'bcryptjs'
import { db } from '../../../config/db'
import { adminUsers, refreshTokens, rolePermissions } from '@mira/db'
import { eq, and, gt } from 'drizzle-orm'
import { signAccess, signRefresh, verifyRefresh } from '../../../lib/jwt'
import { generateToken, hashToken } from '../../../lib/otp'
import type { AdminLoginDto } from './admin-auth.schema'

export async function adminLogin(dto: AdminLoginDto, deviceInfo?: string, ipAddress?: string) {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(and(eq(adminUsers.email, dto.email), eq(adminUsers.isActive, true)))
    .limit(1)

  if (!admin) {
    throw { status: 401, code: 'INVALID_CREDENTIALS', message: "Email yoki parol noto'g'ri" }
  }

  const valid = await bcrypt.compare(dto.password, admin.passwordHash)
  if (!valid) {
    throw { status: 401, code: 'INVALID_CREDENTIALS', message: "Email yoki parol noto'g'ri" }
  }

  // Get role permissions
  let permissions: string[] = []
  if (admin.roleId && !admin.isSuperAdmin) {
    const perms = await db
      .select({ resource: rolePermissions.resource, action: rolePermissions.action })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, admin.roleId))

    permissions = perms.map((p) => `${p.resource}:${p.action}`)
  }

  // Update last login
  await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, admin.id))

  const accessToken = signAccess({
    sub: admin.id,
    type: 'admin',
    email: admin.email,
    roleId: admin.roleId ?? null,
    isSuperAdmin: admin.isSuperAdmin ?? false,
  })
  const refreshToken = signRefresh({ sub: admin.id, type: 'admin' })
  const tokenHash = hashToken(refreshToken)
  const familyId = generateToken().slice(0, 32)

  await db.insert(refreshTokens).values({
    token: tokenHash,
    adminUserId: admin.id,
    familyId,
    deviceInfo: deviceInfo ?? null,
    ipAddress: ipAddress ?? null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  return {
    accessToken,
    refreshToken,
    user: {
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      isSuperAdmin: admin.isSuperAdmin ?? false,
      role: admin.roleId ? { id: admin.roleId, permissions } : null,
    },
  }
}

export async function refreshAdminToken(rawRefreshToken: string) {
  let payload: any
  try {
    payload = verifyRefresh(rawRefreshToken)
  } catch {
    throw { status: 401, code: 'REFRESH_INVALID', message: 'Token yaroqsiz' }
  }

  if (payload.type !== 'admin') {
    throw { status: 401, code: 'REFRESH_INVALID', message: 'Token turi mos emas' }
  }

  const tokenHash = hashToken(rawRefreshToken)
  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.token, tokenHash),
        eq(refreshTokens.isRevoked, false),
        gt(refreshTokens.expiresAt, new Date())
      )
    )
    .limit(1)

  if (!stored) {
    throw { status: 401, code: 'TOKEN_REUSE', message: 'Xavfsizlik xatosi' }
  }

  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(and(eq(adminUsers.id, payload.sub), eq(adminUsers.isActive, true)))
    .limit(1)

  if (!admin) throw { status: 401, code: 'ADMIN_INACTIVE', message: 'Admin topilmadi' }

  // Rotate
  await db
    .update(refreshTokens)
    .set({ isRevoked: true, revokedAt: new Date(), revokedReason: 'ROTATION' })
    .where(eq(refreshTokens.id, stored.id))

  const newAccess = signAccess({
    sub: admin.id,
    type: 'admin',
    email: admin.email,
    roleId: admin.roleId ?? null,
    isSuperAdmin: admin.isSuperAdmin ?? false,
  })
  const newRefresh = signRefresh({ sub: admin.id, type: 'admin' })

  await db.insert(refreshTokens).values({
    token: hashToken(newRefresh),
    adminUserId: admin.id,
    familyId: stored.familyId,
    deviceInfo: stored.deviceInfo,
    ipAddress: stored.ipAddress,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  // Get permissions
  let permissions: string[] = []
  if (admin.roleId && !admin.isSuperAdmin) {
    const perms = await db
      .select({ resource: rolePermissions.resource, action: rolePermissions.action })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, admin.roleId))
    permissions = perms.map((p) => `${p.resource}:${p.action}`)
  }

  return {
    accessToken: newAccess,
    refreshToken: newRefresh,
    user: {
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      isSuperAdmin: admin.isSuperAdmin ?? false,
      role: admin.roleId ? { id: admin.roleId, permissions } : null,
    },
  }
}

export async function adminLogout(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken)
  await db
    .update(refreshTokens)
    .set({ isRevoked: true, revokedAt: new Date(), revokedReason: 'LOGOUT' })
    .where(eq(refreshTokens.token, tokenHash))
}
