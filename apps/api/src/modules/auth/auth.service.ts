import { db } from '../../config/db'
import { authTokens, customers, refreshTokens, userNotificationSettings } from '@mira/db'
import { eq, and, gt, lt } from 'drizzle-orm'
import { generateToken, generateOtp, hashToken } from '../../lib/otp'
import { checkPhoneRateLimit } from '../../middleware/rateLimiter'
import { signAccess, signRefresh, verifyRefresh } from '../../lib/jwt'
import { env } from '../../config/env'
import type { RequestOtpDto, VerifyOtpDto } from './auth.schema'

// Region from phone prefix
function getRegion(phone: string): 'UZB' | 'KOR' {
  if (phone.startsWith('+998')) return 'UZB'
  if (phone.startsWith('+82')) return 'KOR'
  return 'UZB'
}

// Telegram deep link
function buildDeepLink(token: string): string {
  return `https://t.me/${env.BOT_USERNAME}?start=${token}`
}

// ─── Request OTP ──────────────────────────────────────────────
export async function requestOtp(dto: RequestOtpDto) {
  const { phone } = dto

  // Per-phone rate limit (max 3 per 10 min)
  if (!checkPhoneRateLimit(phone)) {
    throw {
      status: 429,
      code: 'PHONE_RATE_LIMITED',
      message: "Bu raqam uchun juda ko'p urinildi. 10 daqiqadan keyin qayta urinib ko'ring",
    }
  }

  // Clean up expired tokens for this phone
  await db
    .delete(authTokens)
    .where(and(eq(authTokens.phone, phone), lt(authTokens.expiresAt, new Date())))

  // Generate token (deep link) + OTP (set by bot after /start)
  const token = generateToken()
  const expires = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

  await db.insert(authTokens).values({
    token,
    phone,
    expiresAt: expires,
  })

  return {
    deepLink: buildDeepLink(token),
    expiresIn: 300, // seconds
  }
}

// ─── Verify OTP ───────────────────────────────────────────────
export async function verifyOtp(dto: VerifyOtpDto, deviceInfo?: string, ipAddress?: string) {
  const { token, otp } = dto

  // Find valid token
  const [authToken] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.token, token),
        eq(authTokens.used, false),
        gt(authTokens.expiresAt, new Date())
      )
    )
    .limit(1)

  if (!authToken) {
    throw { status: 400, code: 'TOKEN_INVALID', message: "Token topilmadi yoki muddati o'tgan" }
  }

  // Max attempts check
  if ((authToken.attempts ?? 0) >= 3) {
    throw { status: 429, code: 'MAX_ATTEMPTS', message: "Urinishlar soni tugadi. Qayta so'rang" }
  }

  // OTP not yet set (bot hasn't processed yet)
  if (!authToken.otp || !authToken.telegramId) {
    throw {
      status: 400,
      code: 'OTP_NOT_READY',
      message: 'Telegram botni oching va kod kutib turing',
    }
  }

  // Wrong OTP — increment attempts
  if (authToken.otp !== otp) {
    await db
      .update(authTokens)
      .set({ attempts: (authToken.attempts ?? 0) + 1 })
      .where(eq(authTokens.id, authToken.id))

    const remaining = 3 - ((authToken.attempts ?? 0) + 1)
    throw {
      status: 400,
      code: 'OTP_INVALID',
      message: `Noto'g'ri kod. ${remaining} ta urinish qoldi`,
    }
  }

  // Check if this telegram_id is already linked to different phone
  if (authToken.telegramId) {
    const [tgConflict] = await db
      .select({ id: customers.id, phone: customers.phone })
      .from(customers)
      .where(eq(customers.telegramId, Number(authToken.telegramId)))
      .limit(1)

    if (tgConflict && tgConflict.phone !== authToken.phone) {
      throw {
        status: 400,
        code: 'TELEGRAM_ALREADY_LINKED',
        message:
          'Bu Telegram akkaunt boshqa raqamga bog\'langan. ' +
          `Avvalgi raqam: ${tgConflict.phone.slice(0, 6)}***`,
      }
    }
  }

  return await db.transaction(async (tx) => {
    // ✅ OTP correct — mark token as used
    await tx.update(authTokens).set({ used: true }).where(eq(authTokens.id, authToken.id))

    const region = getRegion(authToken.phone)

    // Find or create customer
    let [customer] = await tx
      .select()
      .from(customers)
      .where(eq(customers.phone, authToken.phone))
      .limit(1)

    const isNewCustomer = !customer

    if (!customer) {
      // New customer
      const [created] = await tx
        .insert(customers)
        .values({
          phone: authToken.phone,
          phoneRegion: region,
          telegramId: authToken.telegramId ? Number(authToken.telegramId) : null,
          firstName: 'Foydalanuvchi',
          isVerified: true,
          referralCode: generateToken().slice(0, 8).toUpperCase(),
        })
        .returning()

      // Create default notification settings
      await tx.insert(userNotificationSettings).values({
        customerId: created.id,
      })

      customer = created
    } else {
      // Update telegram_id if not set
      if (!customer.telegramId) {
        await tx
          .update(customers)
          .set({
            telegramId: authToken.telegramId ? Number(authToken.telegramId) : null,
            isVerified: true,
          })
          .where(eq(customers.id, customer.id))
        customer.telegramId = authToken.telegramId
      }
    }

    // Generate tokens
    const accessToken = signAccess({
      sub: customer.id,
      type: 'customer',
      phone: customer.phone,
      region: customer.phoneRegion as 'UZB' | 'KOR',
    })
    const refreshTokenValue = signRefresh({ sub: customer.id, type: 'customer' })
    const refreshTokenHash = hashToken(refreshTokenValue)

    // Save refresh token
    const familyId = generateToken().slice(0, 32)
    await tx.insert(refreshTokens).values({
      token: refreshTokenHash,
      customerId: customer.id,
      familyId,
      deviceInfo: deviceInfo ?? null,
      ipAddress: ipAddress ?? null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    return {
      accessToken,
      refreshToken: refreshTokenValue, // raw (not hashed) — sent as cookie
      isNewCustomer,
      customer: {
        id: customer.id,
        phone: customer.phone,
        phoneRegion: customer.phoneRegion,
        firstName: customer.firstName,
        lastName: customer.lastName,
        telegramId: customer.telegramId?.toString() ?? null,
        profileImageUrl: customer.profileImageUrl,
        referralCode: customer.referralCode,
      },
    }
  })
}

// ─── Refresh ──────────────────────────────────────────────────
export async function refreshCustomerToken(rawRefreshToken: string) {
  let payload: any
  try {
    payload = verifyRefresh(rawRefreshToken)
  } catch {
    throw { status: 401, code: 'REFRESH_INVALID', message: 'Refresh token yaroqsiz' }
  }

  if (payload.type !== 'customer') {
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
    // Token reuse attack — revoke entire family
    // Revoke ALL tokens for this customer (can't get familyId without stored token)
    await db
      .update(refreshTokens)
      .set({ isRevoked: true, revokedReason: 'SECURITY', revokedAt: new Date() })
      .where(eq(refreshTokens.customerId, payload.sub))

    throw { status: 401, code: 'TOKEN_REUSE', message: 'Xavfsizlik xatosi. Qayta kiring' }
  }

  // Get customer
  const [customer] = await db.select().from(customers).where(eq(customers.id, payload.sub)).limit(1)

  if (!customer || !customer.isActive) {
    throw { status: 401, code: 'CUSTOMER_INACTIVE', message: 'Foydalanuvchi topilmadi' }
  }

  // Rotate — revoke old, create new
  await db
    .update(refreshTokens)
    .set({ isRevoked: true, revokedAt: new Date(), revokedReason: 'ROTATION' })
    .where(eq(refreshTokens.id, stored.id))

  const newAccessToken = signAccess({
    sub: customer.id,
    type: 'customer',
    phone: customer.phone,
    region: customer.phoneRegion as 'UZB' | 'KOR',
  })
  const newRefreshToken = signRefresh({ sub: customer.id, type: 'customer' })
  const newHash = hashToken(newRefreshToken)

  await db.insert(refreshTokens).values({
    token: newHash,
    customerId: customer.id,
    familyId: stored.familyId,
    deviceInfo: stored.deviceInfo,
    ipAddress: stored.ipAddress,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    customer: {
      id: customer.id,
      phone: customer.phone,
      phoneRegion: customer.phoneRegion,
      firstName: customer.firstName,
      lastName: customer.lastName,
    },
  }
}

// ─── Logout ───────────────────────────────────────────────────
export async function logoutCustomer(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken)
  await db
    .update(refreshTokens)
    .set({ isRevoked: true, revokedAt: new Date(), revokedReason: 'LOGOUT' })
    .where(eq(refreshTokens.token, tokenHash))
}
