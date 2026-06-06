import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export interface CustomerTokenPayload {
  sub: string // customer UUID
  type: 'customer'
  phone: string
  region: 'UZB' | 'KOR'
}

export interface AdminTokenPayload {
  sub: string // admin_user UUID
  type: 'admin'
  email: string
  fullName: string
  roleId: string | null
  isSuperAdmin: boolean
}

export type TokenPayload = CustomerTokenPayload | AdminTokenPayload

export function signAccess(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as any,
  })
}

export function signRefresh(payload: Pick<TokenPayload, 'sub' | 'type'>): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES as any,
  })
}

export function verifyRefresh(token: string): Pick<TokenPayload, 'sub' | 'type'> {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as any
}
