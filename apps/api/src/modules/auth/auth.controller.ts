import type { Request, Response } from 'express'
import { RequestOtpSchema, VerifyOtpSchema } from './auth.schema'
import * as AuthService from './auth.service'
import { setRefreshCookie, clearRefreshCookie, getRefreshCookie } from '../../lib/cookie'
import { db } from '../../config/db'
import { customers } from '@mira/db'
import { eq } from 'drizzle-orm'

const ok  = <T>(res: Response, data: T, status = 200) =>
  res.status(status).json({ data, error: null })

const err = (res: Response, status: number, message: string, code?: string) =>
  res.status(status).json({ data: null, error: { message, code } })

// POST /auth/request-otp
export async function requestOtp(req: Request, res: Response) {
  const parsed = RequestOtpSchema.safeParse(req.body)
  if (!parsed.success) {
    const field = parsed.error.issues[0]
    return err(res, 400, field.message, 'VALIDATION_ERROR')
  }

  try {
    const result = await AuthService.requestOtp(parsed.data)
    return ok(res, result)
  } catch (e: any) {
    return err(res, e.status ?? 500, e.message ?? 'Xatolik', e.code)
  }
}

// POST /auth/verify-otp
export async function verifyOtp(req: Request, res: Response) {
  const parsed = VerifyOtpSchema.safeParse(req.body)
  if (!parsed.success) {
    const field = parsed.error.issues[0]
    return err(res, 400, field.message, 'VALIDATION_ERROR')
  }

  try {
    const deviceInfo = req.headers['user-agent']
    const ipAddress  = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip

    const result = await AuthService.verifyOtp(parsed.data, deviceInfo, ipAddress)

    // Set httpOnly cookie for refresh token
    setRefreshCookie(res, result.refreshToken)

    return ok(res, {
      accessToken:   result.accessToken,
      isNewCustomer: result.isNewCustomer,
      customer:      result.customer,
    })
  } catch (e: any) {
    return err(res, e.status ?? 500, e.message ?? 'Xatolik', e.code)
  }
}

// POST /auth/refresh
export async function refresh(req: Request, res: Response) {
  const rawToken = getRefreshCookie(req)
  if (!rawToken) {
    return err(res, 401, 'Refresh token topilmadi', 'NO_REFRESH_TOKEN')
  }

  try {
    const result = await AuthService.refreshCustomerToken(rawToken)
    setRefreshCookie(res, result.refreshToken)
    return ok(res, { accessToken: result.accessToken, customer: result.customer })
  } catch (e: any) {
    clearRefreshCookie(res)
    return err(res, e.status ?? 401, e.message ?? 'Xatolik', e.code)
  }
}

// POST /auth/logout
export async function logout(req: Request, res: Response) {
  const rawToken = getRefreshCookie(req)
  if (rawToken) {
    await AuthService.logoutCustomer(rawToken).catch(() => {})
  }
  clearRefreshCookie(res)
  return ok(res, { message: 'Chiqildi' })
}

// GET /auth/me
export async function me(req: Request, res: Response) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, (req.user as any).sub))
    .limit(1)

  if (!customer) return err(res, 404, 'Foydalanuvchi topilmadi', 'NOT_FOUND')

  return ok(res, {
    id:             customer.id,
    phone:          customer.phone,
    phoneRegion:    customer.phoneRegion,
    firstName:      customer.firstName,
    lastName:       customer.lastName,
    profileImageUrl: customer.profileImageUrl,
    telegramId:     customer.telegramId?.toString() ?? null,
    referralCode:   customer.referralCode,
    isVerified:     customer.isVerified,
  })
}
