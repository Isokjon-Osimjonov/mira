import type { Request, Response } from 'express'
import { AdminLoginSchema, AdminChangePasswordSchema } from './admin-auth.schema'
import * as Service from './admin-auth.service'
import { setRefreshCookie, clearRefreshCookie, getRefreshCookie } from '../../../lib/cookie'
import type { AdminJwtPayload } from '../../../middleware/auth'
import { authLogger } from '../../../config/logger'

const ok = <T>(res: Response, data: T, status = 200) =>
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
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip
    const result = await Service.adminLogin(parsed.data, device, ip)
    setRefreshCookie(res, result.refreshToken)
    return ok(res, {
      accessToken: result.accessToken,
      mustChangePassword: result.mustChangePassword,
      user: result.user,
    })
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
    return ok(res, {
      accessToken: result.accessToken,
      mustChangePassword: result.mustChangePassword,
      user: result.user,
    })
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

export async function changePassword(req: Request, res: Response) {
  const admin = req.user as AdminJwtPayload
  const parsed = AdminChangePasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return err(res, 400, parsed.error.issues[0].message, 'VALIDATION_ERROR')
  }
  try {
    await Service.changePassword(admin.sub, parsed.data)
    clearRefreshCookie(res)
    return ok(res, { success: true, message: 'Parol muvaffaqiyatli yangilandi' })
  } catch (e: any) {
    return err(res, e.status ?? 500, e.message, e.code)
  }
}

export async function getMe(req: Request, res: Response) {
  const admin = req.user as AdminJwtPayload
  try {
    const data = await Service.getAdminMe(admin.sub)
    return ok(res, data)
  } catch (e: any) {
    authLogger.error({ err: e.message, adminId: admin?.sub }, 'GET /me failed')
    return err(res, e.status ?? 500, e.message ?? 'Ichki xatolik', e.code ?? 'INTERNAL_ERROR')
  }
}

export async function updateProfile(req: Request, res: Response) {
  const admin = req.user as AdminJwtPayload
  try {
    const data = await Service.updateProfile(admin.sub, { fullName: req.body.fullName })
    return ok(res, data)
  } catch (e: any) {
    return err(res, e.status ?? 500, e.message ?? 'Ichki xatolik', e.code ?? 'INTERNAL_ERROR')
  }
}

export async function getAuditLogs(req: Request, res: Response) {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined
    const limit = req.query.limit ? Number(req.query.limit) : undefined
    const adminId = req.query.adminId as string | undefined
    const action = req.query.action as string | undefined

    const data = await Service.getAuditLogs({ page, limit, adminId, action })
    return res.json({ data: data.items, meta: data.meta, error: null })
  } catch (e: any) {
    return err(res, e.status ?? 500, e.message ?? 'Ichki xatolik', e.code ?? 'INTERNAL_ERROR')
  }
}
