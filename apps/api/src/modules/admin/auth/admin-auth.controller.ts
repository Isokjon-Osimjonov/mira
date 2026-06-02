import type { Request, Response } from 'express'
import { AdminLoginSchema } from './admin-auth.schema'
import * as Service from './admin-auth.service'
import { setRefreshCookie, clearRefreshCookie, getRefreshCookie } from '../../../lib/cookie'

const ok  = <T>(res: Response, data: T, status = 200) =>
  res.status(status).json({ data, error: null })
const err = (res: Response, status: number, message: string, code?: string) =>
  res.status(status).json({ data: null, error: { message, code } })

export async function login(req: Request, res: Response) {
  const parsed = AdminLoginSchema.safeParse(req.body)
  if (!parsed.success) {
    return err(res, 400, parsed.error.issues[0].message, 'VALIDATION_ERROR')
  }
  try {
    const device = req.headers['user-agent']
    const ip     = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip
    const result = await Service.adminLogin(parsed.data, device, ip)
    setRefreshCookie(res, result.refreshToken)
    return ok(res, { accessToken: result.accessToken, user: result.user })
  } catch (e: any) {
    return err(res, e.status ?? 500, e.message, e.code)
  }
}

export async function refresh(req: Request, res: Response) {
  const rawToken = getRefreshCookie(req)
  if (!rawToken) return err(res, 401, 'Refresh token topilmadi', 'NO_REFRESH_TOKEN')
  try {
    const result = await Service.refreshAdminToken(rawToken)
    setRefreshCookie(res, result.refreshToken)
    return ok(res, { accessToken: result.accessToken, user: result.user })
  } catch (e: any) {
    clearRefreshCookie(res)
    return err(res, e.status ?? 401, e.message, e.code)
  }
}

export async function logout(req: Request, res: Response) {
  const rawToken = getRefreshCookie(req)
  if (rawToken) await Service.adminLogout(rawToken).catch(() => {})
  clearRefreshCookie(res)
  return ok(res, { message: 'Chiqildi' })
}
