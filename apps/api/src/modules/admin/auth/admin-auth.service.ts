import bcrypt from 'bcryptjs'
import { db } from '../../../config/db'
import { adminUsers, refreshTokens, rolePermissions } from '@mira/db'
import { eq, and, gt } from 'drizzle-orm'
import { signAccess, signRefresh, verifyRefresh } from '../../../lib/jwt'
import { generateToken, hashToken } from '../../../lib/otp'
import type { AdminLoginDto } from './admin-auth.schema'
import { logSecurityEvent } from '../../../lib/audit-log'

export async function adminLogin(dto: AdminLoginDto, deviceInfo?: string, ipAddress?: string) {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(and(eq(adminUsers.email, dto.email), eq(adminUsers.isActive, true)))
    .limit(1)

  if (!admin) {
    logSecurityEvent({
      type: 'LOGIN_FAILED',
      ip: ipAddress || 'unknown',
      userAgent: deviceInfo,
      details: { email: dto.email, reason: 'user_not_found' }
    })
    throw { status: 401, code: 'INVALID_CREDENTIALS', message: "Email yoki parol noto'g'ri" }
  }

  // Check if account is locked
  // @ts-ignore
  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    // @ts-ignore
    const remainingMs = admin.lockedUntil.getTime() - Date.now()
    const remainingMins = Math.ceil(remainingMs / 60000)
    logSecurityEvent({
      type: 'ACCOUNT_LOCKED',
      userId: admin.id,
      ip: ipAddress || 'unknown',
      userAgent: deviceInfo,
      details: { email: dto.email, remainingMins }
    })
    throw {
      status: 429,
      code: 'ACCOUNT_LOCKED',
      message: `Akkaunt ${remainingMins} daqiqa bloklangan`
    }
  }

  const valid = await bcrypt.compare(dto.password, admin.passwordHash)
  if (!valid) {
    // @ts-ignore
    const attempts = (admin.loginAttempts ?? 0) + 1
    const LOCK_THRESHOLD = process.env.NODE_ENV === 'development' ? 100 : 5
    const shouldLock = attempts >= LOCK_THRESHOLD
    const LOCK_MINUTES = 30
    const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000)

    await db.update(adminUsers).set({
      // @ts-ignore
      loginAttempts: attempts,
      // @ts-ignore
      lockedUntil: shouldLock ? lockedUntil : null
    }).where(eq(adminUsers.id, admin.id))

    logSecurityEvent({
      type: shouldLock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
      userId: admin.id,
      ip: ipAddress || 'unknown',
      userAgent: deviceInfo,
      details: { email: dto.email, attempts }
    })

    throw {
      status: 401,
      code: shouldLock ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS',
      message: shouldLock
        ? `Akkaunt ${LOCK_MINUTES} daqiqa bloklandi`
        : `Noto'g'ri parol. ${LOCK_THRESHOLD - attempts} urinish qoldi`
    }
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

  // Update last login & reset attempts
  await db.update(adminUsers).set({ 
    // @ts-ignore
    loginAttempts: 0,
    // @ts-ignore
    lockedUntil: null,
    lastLoginAt: new Date() 
  }).where(eq(adminUsers.id, admin.id))

  logSecurityEvent({
    type: 'LOGIN_SUCCESS',
    userId: admin.id,
    ip: ipAddress || 'unknown',
    userAgent: deviceInfo,
    details: { email: admin.email }
  })

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
    mustChangePassword: admin.mustChangePassword,
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
    mustChangePassword: admin.mustChangePassword,
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

export async function changePassword(
  adminId: string,
  dto: { currentPassword: string; newPassword: string }
) {
  const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, adminId)).limit(1)
  if (!admin) throw { status: 404, message: 'Admin topilmadi' }

  const valid = await bcrypt.compare(dto.currentPassword, admin.passwordHash)
  if (!valid) throw { status: 401, code: 'INVALID_CREDENTIALS', message: "Joriy parol noto'g'ri" }

  const hash = await bcrypt.hash(dto.newPassword, 12)

  return await db.transaction(async (tx) => {
    await tx
      .update(adminUsers)
      .set({
        passwordHash: hash,
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, adminId))

    // Revoke all refresh tokens
    await tx
      .update(refreshTokens)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'SECURITY',
      })
      .where(eq(refreshTokens.adminUserId, adminId))

    return { success: true }
  })
}
