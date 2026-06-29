import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { db } from '../config/db'
import { rolePermissions, adminUsers } from '@mira/db'
import { eq, and, isNull } from 'drizzle-orm'

// ─── JWT Payload types ────────────────────────────────────────
export interface CustomerJwtPayload {
  sub: string // customer UUID
  type: 'customer'
  phone: string
  region: 'UZB' | 'KOR'
  iat: number
  exp: number
}

export interface AdminJwtPayload {
  sub: string // admin_user UUID
  type: 'admin'
  email: string
  fullName: string
  roleId: string | null
  isSuperAdmin: boolean
  iat: number
  exp: number
}

export type JwtPayload = CustomerJwtPayload | AdminJwtPayload

// ─── Extend Express Request ───────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────
const unauthorized = (res: Response, message = 'Unauthorized') =>
  res.status(401).json({ data: null, error: { message, code: 'UNAUTHORIZED' } })

const forbidden = (res: Response, message = 'Forbidden') =>
  res.status(403).json({ data: null, error: { message, code: 'FORBIDDEN' } })

// ─── Middleware: require any valid JWT ────────────────────────
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return unauthorized(res)

  const token = header.slice(7)
  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    next()
  } catch (err: any) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
    res.status(401).json({ data: null, error: { message: 'Invalid token', code } })
  }
}

// ─── Middleware: require customer auth ────────────────────────
export function requireCustomer(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.type !== 'customer') return forbidden(res, 'Customer access only')
    next()
  })
}

// ─── Middleware: require any admin ────────────────────────────
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, async () => {
    if (req.user?.type !== 'admin') return forbidden(res, 'Admin access only')

    try {
      const [admin] = await db
        .select({
          id: adminUsers.id,
          isActive: adminUsers.isActive,
          roleId: adminUsers.roleId,
          isSuperAdmin: adminUsers.isSuperAdmin,
        })
        .from(adminUsers)
        .where(and(eq(adminUsers.id, req.user.sub), isNull(adminUsers.deletedAt)))
        .limit(1)

      if (!admin || !admin.isActive) {
        return unauthorized(res, 'Admin account is disabled or deleted')
      }

      // Update req.user with live DB state
      const userPayload = req.user as AdminJwtPayload
      userPayload.roleId = admin.roleId
      userPayload.isSuperAdmin = admin.isSuperAdmin

      next()
    } catch {
      res.status(500).json({
        data: null,
        error: { message: 'Auth check failed', code: 'INTERNAL_ERROR' },
      })
    }
  })
}

// ─── Middleware: require super admin ─────────────────────────
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const user = req.user as AdminJwtPayload | undefined
    if (user?.type !== 'admin' || !user.isSuperAdmin) {
      return forbidden(res, 'Super admin access only')
    }
    next()
  })
}

const resourceLabels: Record<string, string> = {
  orders: 'Buyurtmalar',
  products: 'Mahsulotlar',
  customers: 'Mijozlar',
  inventory: 'Inventar',
  coupons: 'Kuponlar',
  expenses: 'Xarajatlar',
  analytics: 'Analitika',
  telegram: 'Telegram',
  settings: 'Sozlamalar',
  users: 'Adminlar',
  roles: 'Rollar'
}

const actionLabels: Record<string, string> = {
  read: "ko'rish",
  write: "o'zgartirish"
}

// ─── Middleware: require specific permission ──────────────────
// Usage: requirePermission('products', 'write')
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authCheck = (cb: () => void) => requireAdmin(req, res, cb)

    authCheck(async () => {
      const user = req.user as AdminJwtPayload

      const rLabel = resourceLabels[resource] || resource
      const aLabel = actionLabels[action] || action
      const msg = `Sizda bu amalni bajarish uchun ruxsat yo'q. (${rLabel} - ${aLabel})`

      // Super admin bypasses all permission checks
      if (user.isSuperAdmin) return next()

      if (!user.roleId) return forbidden(res, msg)

      // Check DB for this role's permission
      try {
        const [perm] = await db
          .select({ id: rolePermissions.id })
          .from(rolePermissions)
          .where(
            and(
              eq(rolePermissions.roleId, user.roleId),
              eq(rolePermissions.resource, resource),
              eq(rolePermissions.action, action)
            )
          )
          .limit(1)

        if (!perm) return forbidden(res, msg)
        next()
      } catch {
        res
          .status(500)
          .json({
            data: null,
            error: { message: 'Permission check failed', code: 'INTERNAL_ERROR' },
          })
      }
    })
  }
}

// ─── JWT generators ───────────────────────────────────────────
export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as any,
  })
}

export function signRefreshToken(payload: Pick<JwtPayload, 'sub' | 'type'>) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES as any,
  })
}

export function verifyRefreshToken(token: string): Pick<JwtPayload, 'sub' | 'type'> {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as any
}
