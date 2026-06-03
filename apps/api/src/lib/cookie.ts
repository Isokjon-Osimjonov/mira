import type { Response } from 'express'
import { env } from '../config/env'

const REFRESH_COOKIE = 'mira_refresh'

const isProd = env.NODE_ENV === 'production'

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    domain: isProd ? '.miracosmetics.uz' : undefined,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    domain: isProd ? '.miracosmetics.uz' : undefined,
    path: '/',
  })
}

export function getRefreshCookie(req: any): string | undefined {
  return req.cookies?.[REFRESH_COOKIE]
}
