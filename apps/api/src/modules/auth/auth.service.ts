import { db } from '../../config/db'
import { authTokens, customers, refreshTokens, userNotificationSettings } from '@mira/db'
import { eq, and, gt, lt, ne, sql } from 'drizzle-orm'
import { generateToken, generateOtp, hashToken } from '../../lib/otp'
import { checkPhoneRateLimit } from '../../middleware/rateLimiter'
import { signAccess, signRefresh, verifyRefresh } from '../../lib/jwt'
import { env } from '../../config/env'
import type { RequestOtpDto, VerifyOtpDto, UpdateProfileDto } from './auth.schema'
import { logSecurityEvent } from '../../lib/audit-log'
import { isValidCloudinaryUrl } from '../../lib/validate-url'

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
export async function requestOtp(dto: RequestOtpDto, deviceInfo?: string, ipAddress?: string) {
  const { phone } = dto

  // Per-phone rate limit (max 3 per 10 min)
  if (!checkPhoneRateLimit(phone)) {
    logSecurityEvent({
      type: 'SUSPICIOUS_ACTIVITY',
      ip: ipAddress || 'unknown',
      userAgent: deviceInfo,
      details: { reason: 'otp_rate_limit_exceeded', phone }
    })
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

  logSecurityEvent({
    type: 'OTP_REQUEST',
    ip: ipAddress || 'unknown',
    userAgent: deviceInfo,
    details: { phone }
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
    logSecurityEvent({
      type: 'SUSPICIOUS_ACTIVITY',
      ip: ipAddress || 'unknown',
      userAgent: deviceInfo,
      details: { reason: 'otp_max_attempts_reached', phone: authToken.phone }
    })
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

  const newTelegramId = authToken.telegramId ? Number(authToken.telegramId) : null

  return await db.transaction(async (tx) => {
    // ✅ OTP correct — mark token as used
    await tx.update(authTokens).set({ used: true }).where(eq(authTokens.id, authToken.id))

    // STEP 1: Find existing customer by phone
    const [existingCustomer] = await tx
      .select()
      .from(customers)
      .where(eq(customers.phone, authToken.phone))
      .limit(1)

    // STEP 2: Check telegramId conflict
    // Only block if ANOTHER customer (different phone) owns this telegramId
    if (newTelegramId) {
      const [tgConflict] = await tx
        .select({ id: customers.id, phone: customers.phone })
        .from(customers)
        .where(
          and(
            eq(customers.telegramId, newTelegramId),
            // Allow if it's the same customer
            existingCustomer ? ne(customers.id, existingCustomer.id) : sql`true`
          )
        )
        .limit(1)

      if (tgConflict) {
        throw {
          status: 400,
          code: 'TELEGRAM_ALREADY_LINKED',
          message:
            `Bu Telegram akkaunt boshqa raqamga bog'langan. ` +
            `Avvalgi raqam: ${tgConflict.phone.slice(0, 6)}***`,
        }
      }
    }

    let customer: any
    let isNewCustomer = false

    if (existingCustomer) {
      // STEP 3A: EXISTING CUSTOMER — update telegramId if changed
      const telegramChanged = newTelegramId && existingCustomer.telegramId !== newTelegramId

      if (telegramChanged) {
        await tx
          .update(customers)
          .set({
            telegramId: newTelegramId,
            isVerified: true,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, existingCustomer.id))

        existingCustomer.telegramId = newTelegramId
      }

      customer = existingCustomer
      isNewCustomer = false
    } else {
      // STEP 3B: NEW CUSTOMER — create account
      const [created] = await tx
        .insert(customers)
        .values({
          phone: authToken.phone,
          phoneRegion: getRegion(authToken.phone),
          telegramId: newTelegramId,
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
      isNewCustomer = true
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

// ─── Profile ──────────────────────────────────────────────────
export async function updateProfile(customerId: string, data: UpdateProfileDto) {
  if (data.profileImageUrl && !isValidCloudinaryUrl(data.profileImageUrl)) {
    throw { status: 400, code: 'INVALID_URL', message: 'Faqat Cloudinary URL qabul qilinadi' }
  }

  const [updated] = await db
    .update(customers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(customers.id, customerId))
    .returning()

  if (!updated) throw { status: 404, message: 'Foydalanuvchi topilmadi' }

  return {
    id: updated.id,
    phone: updated.phone,
    firstName: updated.firstName,
    lastName: updated.lastName,
    profileImageUrl: updated.profileImageUrl,
    phoneRegion: updated.phoneRegion,
  }
}

// ─── Push Token ───────────────────────────────────────────────
export async function savePushToken(customerId: string, token: string) {
  await db
    .update(customers)
    .set({ expoPushToken: token, updatedAt: new Date() })
    .where(eq(customers.id, customerId))
}

export async function removePushToken(customerId: string) {
  await db
    .update(customers)
    .set({ expoPushToken: null, updatedAt: new Date() })
    .where(eq(customers.id, customerId))
}

// ─── Notification Settings ────────────────────────────────────
export async function getNotificationSettings(customerId: string) {
  const [settings] = await db
    .select()
    .from(userNotificationSettings)
    .where(eq(userNotificationSettings.customerId, customerId))
    .limit(1)

  if (!settings) {
    return {
      orderUpdates: true,
      promotions: false,
      stockAlerts: true,
      pushEnabled: true,
      telegramEnabled: true,
    }
  }

  return {
    orderUpdates: settings.orderStatus,
    promotions: settings.promotions,
    stockAlerts: settings.stockBack,
    pushEnabled: settings.pushEnabled,
    telegramEnabled: settings.telegramEnabled,
  }
}

export async function updateNotificationSettings(customerId: string, data: any) {
  const updates: any = { updatedAt: new Date() }
  if (data.orderUpdates !== undefined) updates.orderStatus = data.orderUpdates
  if (data.promotions !== undefined) updates.promotions = data.promotions
  if (data.stockAlerts !== undefined) updates.stockBack = data.stockAlerts
  if (data.pushEnabled !== undefined) updates.pushEnabled = data.pushEnabled
  if (data.telegramEnabled !== undefined) updates.telegramEnabled = data.telegramEnabled

  const [updated] = await db
    .insert(userNotificationSettings)
    .values({
      customerId,
      ...updates,
    })
    .onConflictDoUpdate({
      target: userNotificationSettings.customerId,
      set: updates,
    })
    .returning()

  return {
    orderUpdates: updated.orderStatus,
    promotions: updated.promotions,
    stockAlerts: updated.stockBack,
    pushEnabled: updated.pushEnabled,
    telegramEnabled: updated.telegramEnabled,
  }
}
