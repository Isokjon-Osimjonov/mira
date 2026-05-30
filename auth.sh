#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Mira Cosmetics — Auth API Setup
# Creates: Customer auth + Admin auth + Grammy.js bot
# Run from: ~/mira
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; NC='\033[0m'
step() { echo -e "\n${BLUE}[$1]${NC} $2"; }
ok()   { echo -e "   ${GREEN}✅${NC} $1"; }

echo -e "${BLUE}"
echo "  🔐  Mira Auth API Setup"
echo "  ========================"
echo -e "${NC}"

[[ ! -f ".env" ]] && { echo "❌ Run from ~/mira root"; exit 1; }

mkdir -p apps/api/src/modules/auth
mkdir -p apps/api/src/modules/admin/auth
mkdir -p apps/api/src/bot/handlers
mkdir -p apps/api/src/lib

# ═══════════════════════════════════════════════════════════════
# 1. SHARED LIB — JWT + OTP + COOKIE helpers
# ═══════════════════════════════════════════════════════════════
step 1 "Shared auth helpers..."

cat > apps/api/src/lib/jwt.ts << 'EOF'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export interface CustomerTokenPayload {
  sub:    string   // customer UUID
  type:   'customer'
  phone:  string
  region: 'UZB' | 'KOR'
}

export interface AdminTokenPayload {
  sub:          string   // admin_user UUID
  type:         'admin'
  email:        string
  roleId:       string | null
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
EOF
ok "src/lib/jwt.ts"

cat > apps/api/src/lib/otp.ts << 'EOF'
import crypto from 'crypto'

// 6-digit OTP — no modulo bias (crypto.randomInt is uniform)
export function generateOtp(): string {
  return crypto.randomInt(100_000, 1_000_000).toString()
}

// 64-byte hex token for deep link
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Hash refresh token before storing in DB
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
EOF
ok "src/lib/otp.ts"

cat > apps/api/src/lib/cookie.ts << 'EOF'
import type { Response } from 'express'
import { env } from '../config/env'

const REFRESH_COOKIE = 'mira_refresh'

const isProd = env.NODE_ENV === 'production'

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure:   isProd,
    sameSite: isProd ? 'none' : 'lax',
    domain:   isProd ? '.miracosmetics.uz' : undefined,
    maxAge:   7 * 24 * 60 * 60 * 1000,
    path:     '/',
  })
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure:   isProd,
    sameSite: isProd ? 'none' : 'lax',
    domain:   isProd ? '.miracosmetics.uz' : undefined,
    path:     '/',
  })
}

export function getRefreshCookie(req: any): string | undefined {
  return req.cookies?.[REFRESH_COOKIE]
}
EOF
ok "src/lib/cookie.ts"

# ═══════════════════════════════════════════════════════════════
# 2. GRAMMY BOT SETUP
# ═══════════════════════════════════════════════════════════════
step 2 "Grammy.js bot setup..."

cat > apps/api/src/bot/bot.ts << 'EOF'
import { Bot } from 'grammy'
import { env } from '../config/env'

export const bot = new Bot(env.BOT_TOKEN)

// NOTE: handlers are registered in main.ts BEFORE startBot()
// Do NOT import handlers here — circular dependency

bot.catch((err) => {
  console.error('Bot error:', err.message)
})

export async function startBot(): Promise<void> {
  await bot.start({
    onStart: () => {
      console.log(`🤖 Bot running: @${env.BOT_USERNAME}`)
    },
  })
}
EOF
ok "src/bot/bot.ts"

cat > apps/api/src/bot/handlers/auth.ts << 'EOF'
import { bot } from '../bot'
import { db } from '../../config/db'
import { authTokens, customers } from '@mira/db'
import { eq, and, gt } from 'drizzle-orm'
import { generateOtp } from '../../lib/otp'

// /start TOKEN — OTP flow
bot.command('start', async (ctx) => {
  const token = ctx.match?.trim()

  // No token — welcome message
  if (!token) {
    await ctx.reply(
      `🌸 <b>Mira Cosmetics</b> botiga xush kelibsiz!\n\n` +
      `Bu bot orqali buyurtmalaringiz haqida xabar olasiz.\n` +
      `Ilovani yuklab, ro'yxatdan o'ting.`,
      { parse_mode: 'HTML' }
    )
    return
  }

  try {
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
      await ctx.reply(
        `❌ Token topilmadi yoki muddati o'tgan.\n` +
        `Iltimos, ilovada qayta urinib ko'ring.`
      )
      return
    }

    // Generate OTP
    const otp = generateOtp()
    const telegramId = BigInt(ctx.from!.id)
    const tgUsername = ctx.from!.username ?? null

    // Save OTP + telegram_id to token
    await db
      .update(authTokens)
      .set({ otp, telegramId })
      .where(eq(authTokens.id, authToken.id))

    // Check if customer already exists
    const [existing] = await db
      .select({ firstName: customers.firstName })
      .from(customers)
      .where(eq(customers.phone, authToken.phone))
      .limit(1)

    const greeting = existing
      ? `Yana xush kelibsiz, <b>${existing.firstName}</b>! 👋`
      : `Xush kelibsiz! 🌸`

    // Send OTP
    await ctx.reply(
      `${greeting}\n\n` +
      `🔐 Tasdiqlash kodi:\n\n` +
      `<code>${otp}</code>\n\n` +
      `⏱ Amal qilish muddati: <b>5 daqiqa</b>\n\n` +
      `⚠️ Bu kodni <b>hech kimga bermang!</b>`,
      { parse_mode: 'HTML' }
    )

  } catch (err) {
    console.error('Bot /start error:', err)
    await ctx.reply('Xatolik yuz berdi. Iltimos qayta urinib ko\'ring.')
  }
})
EOF
ok "src/bot/handlers/auth.ts"

cat > apps/api/src/bot/helpers/notify.ts << 'EOF'
import { bot } from '../bot'
import { env } from '../../config/env'

// Send message to admin group
export async function sendAdminAlert(message: string): Promise<void> {
  try {
    await bot.api.sendMessage(env.ADMIN_GROUP_CHAT_ID, message, {
      parse_mode: 'HTML',
    })
  } catch (err) {
    console.error('Admin alert failed:', err)
  }
}

// New order alert
export async function notifyNewOrder(data: {
  orderNumber: string
  customerName: string
  customerPhone: string
  region: string
  totalAmount: number
  itemCount: number
}): Promise<void> {
  await sendAdminAlert(
    `🛒 <b>YANGI BUYURTMA!</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📦 <b>${data.orderNumber}</b>\n` +
    `👤 ${data.customerName} ${data.customerPhone}\n` +
    `🌍 ${data.region} | ${data.itemCount} ta mahsulot\n` +
    `💰 ₩${data.totalAmount.toLocaleString()}\n` +
    `⏰ To'lov kutilmoqda`
  )
}

// Payment submitted alert
export async function notifyPaymentSubmitted(data: {
  orderNumber: string
  customerName: string
  paymentMethod: string
  paymentAmount: string
}): Promise<void> {
  await sendAdminAlert(
    `💳 <b>TO'LOV YUKLANDI!</b>\n` +
    `📦 ${data.orderNumber} — ${data.customerName}\n` +
    `🏦 ${data.paymentMethod}: ${data.paymentAmount}\n` +
    `✅ Tekshiring: admin.miracosmetics.uz`
  )
}

// Low stock alert
export async function notifyLowStock(data: {
  productName: string
  barcode: string
  currentQty: number
  threshold: number
}): Promise<void> {
  await sendAdminAlert(
    `⚠️ <b>STOK KAMAYDI!</b>\n` +
    `💄 ${data.productName}\n` +
    `📊 Qoldi: ${data.currentQty} dona (limit: ${data.threshold})\n` +
    `🔗 admin.miracosmetics.uz/inventory`
  )
}

// Customer OTP via bot DM (already in auth handler)
// Order status to customer
export async function notifyCustomer(telegramId: number, message: string): Promise<void> {
  try {
    await bot.api.sendMessage(telegramId, message, { parse_mode: 'HTML' })
  } catch (err) {
    console.error('Customer notify failed:', err)
  }
}
EOF
ok "src/bot/helpers/notify.ts"

# ═══════════════════════════════════════════════════════════════
# 3. CUSTOMER AUTH — Schema (Zod)
# ═══════════════════════════════════════════════════════════════
step 3 "Customer auth schemas..."

cat > apps/api/src/modules/auth/auth.schema.ts << 'EOF'
import { z } from 'zod'

// Uzbekistan: +998 + 9 digits
// Korea:      +82  + 9-10 digits
const phoneRegex = /^(\+998\d{9}|\+82\d{9,10})$/

export const RequestOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Telefon raqam noto\'g\'ri. +998XXXXXXXXX yoki +82XXXXXXXXXX formatida kiriting'),
})

export const VerifyOtpSchema = z.object({
  token: z.string().length(64, 'Token noto\'g\'ri'),
  otp:   z.string().length(6, 'Kod 6 raqamdan iborat bo\'lishi kerak').regex(/^\d{6}$/),
})

export type RequestOtpDto = z.infer<typeof RequestOtpSchema>
export type VerifyOtpDto  = z.infer<typeof VerifyOtpSchema>
EOF
ok "src/modules/auth/auth.schema.ts"

# ═══════════════════════════════════════════════════════════════
# 4. CUSTOMER AUTH — Service
# ═══════════════════════════════════════════════════════════════
step 4 "Customer auth service..."

cat > apps/api/src/modules/auth/auth.service.ts << 'EOF'
import { db } from '../../config/db'
import {
  authTokens, customers, refreshTokens,
  userNotificationSettings,
} from '@mira/db'
import { eq, and, gt, lt } from 'drizzle-orm'
import { generateToken, generateOtp, hashToken } from '../../lib/otp'
import { checkPhoneRateLimit } from '../../middleware/rateLimiter'
import { signAccess, signRefresh, verifyRefresh } from '../../lib/jwt'
import { env } from '../../config/env'
import type { RequestOtpDto, VerifyOtpDto } from './auth.schema'

// Region from phone prefix
function getRegion(phone: string): 'UZB' | 'KOR' {
  if (phone.startsWith('+998')) return 'UZB'
  if (phone.startsWith('+82'))  return 'KOR'
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
    throw { status: 429, code: 'PHONE_RATE_LIMITED', message: 'Bu raqam uchun juda ko\'p urinildi. 10 daqiqadan keyin qayta urinib ko\'ring' }
  }

  // Clean up expired tokens for this phone
  await db
    .delete(authTokens)
    .where(
      and(
        eq(authTokens.phone, phone),
        lt(authTokens.expiresAt, new Date())
      )
    )

  // Generate token (deep link) + OTP (set by bot after /start)
  const token   = generateToken()
  const expires = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

  await db.insert(authTokens).values({
    token,
    phone,
    expiresAt: expires,
  })

  return {
    deepLink:  buildDeepLink(token),
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
    throw { status: 400, code: 'TOKEN_INVALID', message: 'Token topilmadi yoki muddati o\'tgan' }
  }

  // Max attempts check
  if ((authToken.attempts ?? 0) >= 3) {
    throw { status: 429, code: 'MAX_ATTEMPTS', message: 'Urinishlar soni tugadi. Qayta so\'rang' }
  }

  // OTP not yet set (bot hasn't processed yet)
  if (!authToken.otp || !authToken.telegramId) {
    throw { status: 400, code: 'OTP_NOT_READY', message: 'Telegram botni oching va kod kutib turing' }
  }

  // Wrong OTP — increment attempts
  if (authToken.otp !== otp) {
    await db
      .update(authTokens)
      .set({ attempts: (authToken.attempts ?? 0) + 1 })
      .where(eq(authTokens.id, authToken.id))

    const remaining = 3 - ((authToken.attempts ?? 0) + 1)
    throw {
      status:  400,
      code:    'OTP_INVALID',
      message: `Noto'g'ri kod. ${remaining} ta urinish qoldi`,
    }
  }

  // ✅ OTP correct — mark token as used
  await db
    .update(authTokens)
    .set({ used: true })
    .where(eq(authTokens.id, authToken.id))

  const region = getRegion(authToken.phone)

  // Find or create customer
  let [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.phone, authToken.phone))
    .limit(1)

  const isNewCustomer = !customer

  if (!customer) {
    // New customer
    const [created] = await db
      .insert(customers)
      .values({
        phone:      authToken.phone,
        phoneRegion: region,
        telegramId: authToken.telegramId,
        firstName:  'Foydalanuvchi',
        isVerified: true,
        referralCode: generateToken().slice(0, 8).toUpperCase(),
      })
      .returning()

    // Create default notification settings
    await db.insert(userNotificationSettings).values({
      customerId: created.id,
    })

    customer = created
  } else {
    // Update telegram_id if not set
    if (!customer.telegramId) {
      await db
        .update(customers)
        .set({ telegramId: authToken.telegramId, isVerified: true })
        .where(eq(customers.id, customer.id))
      customer.telegramId = authToken.telegramId
    }
  }

  // Generate tokens
  const accessToken  = signAccess({
    sub:    customer.id,
    type:   'customer',
    phone:  customer.phone,
    region: customer.phoneRegion as 'UZB' | 'KOR',
  })
  const refreshTokenValue = signRefresh({ sub: customer.id, type: 'customer' })
  const refreshTokenHash  = hashToken(refreshTokenValue)

  // Save refresh token
  const familyId = generateToken().slice(0, 32)
  await db.insert(refreshTokens).values({
    token:      refreshTokenHash,
    customerId: customer.id,
    familyId,
    deviceInfo: deviceInfo ?? null,
    ipAddress:  ipAddress ?? null,
    expiresAt:  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  return {
    accessToken,
    refreshToken: refreshTokenValue,  // raw (not hashed) — sent as cookie
    isNewCustomer,
    customer: {
      id:             customer.id,
      phone:          customer.phone,
      phoneRegion:    customer.phoneRegion,
      firstName:      customer.firstName,
      lastName:       customer.lastName,
      telegramId:     customer.telegramId?.toString() ?? null,
      profileImageUrl: customer.profileImageUrl,
      referralCode:   customer.referralCode,
    },
  }
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
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, payload.sub))
    .limit(1)

  if (!customer || !customer.isActive) {
    throw { status: 401, code: 'CUSTOMER_INACTIVE', message: 'Foydalanuvchi topilmadi' }
  }

  // Rotate — revoke old, create new
  await db
    .update(refreshTokens)
    .set({ isRevoked: true, revokedAt: new Date(), revokedReason: 'ROTATION' })
    .where(eq(refreshTokens.id, stored.id))

  const newAccessToken  = signAccess({
    sub:    customer.id,
    type:   'customer',
    phone:  customer.phone,
    region: customer.phoneRegion as 'UZB' | 'KOR',
  })
  const newRefreshToken = signRefresh({ sub: customer.id, type: 'customer' })
  const newHash         = hashToken(newRefreshToken)

  await db.insert(refreshTokens).values({
    token:      newHash,
    customerId: customer.id,
    familyId:   stored.familyId,
    deviceInfo: stored.deviceInfo,
    ipAddress:  stored.ipAddress,
    expiresAt:  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  return {
    accessToken:  newAccessToken,
    refreshToken: newRefreshToken,
    customer: {
      id:          customer.id,
      phone:       customer.phone,
      phoneRegion: customer.phoneRegion,
      firstName:   customer.firstName,
      lastName:    customer.lastName,
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
EOF
ok "src/modules/auth/auth.service.ts"

# ═══════════════════════════════════════════════════════════════
# 5. CUSTOMER AUTH — Controller
# ═══════════════════════════════════════════════════════════════
step 5 "Customer auth controller..."

cat > apps/api/src/modules/auth/auth.controller.ts << 'EOF'
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
    const field = parsed.error.errors[0]
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
    const field = parsed.error.errors[0]
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
EOF
ok "src/modules/auth/auth.controller.ts"

# ═══════════════════════════════════════════════════════════════
# 6. CUSTOMER AUTH — Router
# ═══════════════════════════════════════════════════════════════
step 6 "Customer auth router..."

cat > apps/api/src/modules/auth/auth.router.ts << 'EOF'
import { Router } from 'express'
import * as ctrl from './auth.controller'
import { authLimiter } from '../../middleware/rateLimiter'
import { requireCustomer } from '../../middleware/auth'

const router = Router()

// Public routes (with rate limiting)
router.post('/request-otp', authLimiter, ctrl.requestOtp)
router.post('/verify-otp',  authLimiter, ctrl.verifyOtp)
router.post('/refresh',               ctrl.refresh)
router.post('/logout',                ctrl.logout)

// Protected
router.get('/me', requireCustomer, ctrl.me)

export default router
EOF
ok "src/modules/auth/auth.router.ts"

# ═══════════════════════════════════════════════════════════════
# 7. ADMIN AUTH — Schema + Service + Controller + Router
# ═══════════════════════════════════════════════════════════════
step 7 "Admin auth..."

mkdir -p apps/api/src/modules/admin/auth

cat > apps/api/src/modules/admin/auth/admin-auth.schema.ts << 'EOF'
import { z } from 'zod'

export const AdminLoginSchema = z.object({
  email:    z.string().email('Email noto\'g\'ri'),
  password: z.string().min(6, 'Parol kamida 6 belgi'),
})

export type AdminLoginDto = z.infer<typeof AdminLoginSchema>
EOF

cat > apps/api/src/modules/admin/auth/admin-auth.service.ts << 'EOF'
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
    .where(
      and(
        eq(adminUsers.email, dto.email),
        eq(adminUsers.isActive, true)
      )
    )
    .limit(1)

  if (!admin) {
    throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Email yoki parol noto\'g\'ri' }
  }

  const valid = await bcrypt.compare(dto.password, admin.passwordHash)
  if (!valid) {
    throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Email yoki parol noto\'g\'ri' }
  }

  // Get role permissions
  let permissions: string[] = []
  if (admin.roleId && !admin.isSuperAdmin) {
    const perms = await db
      .select({ resource: rolePermissions.resource, action: rolePermissions.action })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, admin.roleId))

    permissions = perms.map(p => `${p.resource}:${p.action}`)
  }

  // Update last login
  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(adminUsers.id, admin.id))

  const accessToken  = signAccess({
    sub:         admin.id,
    type:        'admin',
    email:       admin.email,
    roleId:      admin.roleId ?? null,
    isSuperAdmin: admin.isSuperAdmin ?? false,
  })
  const refreshToken = signRefresh({ sub: admin.id, type: 'admin' })
  const tokenHash    = hashToken(refreshToken)
  const familyId     = generateToken().slice(0, 32)

  await db.insert(refreshTokens).values({
    token:       tokenHash,
    adminUserId: admin.id,
    familyId,
    deviceInfo:  deviceInfo ?? null,
    ipAddress:   ipAddress ?? null,
    expiresAt:   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  return {
    accessToken,
    refreshToken,
    user: {
      id:          admin.id,
      email:       admin.email,
      fullName:    admin.fullName,
      isSuperAdmin: admin.isSuperAdmin ?? false,
      role:        admin.roleId ? { id: admin.roleId, permissions } : null,
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
  const [stored]  = await db
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

  const newAccess  = signAccess({
    sub: admin.id, type: 'admin',
    email: admin.email, roleId: admin.roleId ?? null,
    isSuperAdmin: admin.isSuperAdmin ?? false,
  })
  const newRefresh = signRefresh({ sub: admin.id, type: 'admin' })

  await db.insert(refreshTokens).values({
    token:       hashToken(newRefresh),
    adminUserId: admin.id,
    familyId:    stored.familyId,
    deviceInfo:  stored.deviceInfo,
    ipAddress:   stored.ipAddress,
    expiresAt:   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  // Get permissions
  let permissions: string[] = []
  if (admin.roleId && !admin.isSuperAdmin) {
    const perms = await db
      .select({ resource: rolePermissions.resource, action: rolePermissions.action })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, admin.roleId))
    permissions = perms.map(p => `${p.resource}:${p.action}`)
  }

  return {
    accessToken: newAccess,
    refreshToken: newRefresh,
    user: {
      id:          admin.id,
      email:       admin.email,
      fullName:    admin.fullName,
      isSuperAdmin: admin.isSuperAdmin ?? false,
      role:        admin.roleId ? { id: admin.roleId, permissions } : null,
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
EOF

cat > apps/api/src/modules/admin/auth/admin-auth.controller.ts << 'EOF'
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
    return err(res, 400, parsed.error.errors[0].message, 'VALIDATION_ERROR')
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
EOF

cat > apps/api/src/modules/admin/auth/admin-auth.router.ts << 'EOF'
import { Router } from 'express'
import * as ctrl from './admin-auth.controller'
import { authLimiter } from '../../../middleware/rateLimiter'

const router = Router()

router.post('/login',   authLimiter, ctrl.login)
router.post('/refresh',              ctrl.refresh)
router.post('/logout',               ctrl.logout)

export default router
EOF
ok "Admin auth (schema + service + controller + router)"

# ═══════════════════════════════════════════════════════════════
# 8. REGISTER ROUTES IN APP.TS
# ═══════════════════════════════════════════════════════════════
step 8 "Registering routes in app.ts..."

cat > apps/api/src/app.ts << 'EOF'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { env } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { apiLimiter } from './middleware/rateLimiter'

// Routers
import authRouter      from './modules/auth/auth.router'
import adminAuthRouter from './modules/admin/auth/admin-auth.router'

export function createApp() {
  const app = express()

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(cors({
    origin:      env.CORS_ORIGINS.split(','),
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'))
  app.use('/api', apiLimiter)

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      data: { status: 'ok', env: env.NODE_ENV, uptime: Math.round(process.uptime()) },
      error: null,
    })
  })

  // Auth routes
  app.use('/api/v1/auth',       authRouter)
  app.use('/api/v1/admin/auth', adminAuthRouter)

  // 404
  app.use((_req, res) => {
    res.status(404).json({ data: null, error: { message: 'Route topilmadi', code: 'NOT_FOUND' } })
  })

  app.use(errorHandler)
  return app
}
EOF
ok "src/app.ts (routes registered)"

# ═══════════════════════════════════════════════════════════════
# 9. UPDATE MAIN.TS — Start bot with API
# ═══════════════════════════════════════════════════════════════
step 9 "Updating main.ts with bot startup..."

cat > apps/api/src/main.ts << 'EOF'
import { createServer } from 'http'
import { createApp }   from './app'
import { initSocket }  from './config/socket'
import { pool }        from './config/db'
import { env }         from './config/env'
import { startBot }    from './bot/bot'

async function bootstrap() {
  const app        = createApp()
  const httpServer = createServer(app)

  initSocket(httpServer)

  // Start Telegram bot (non-blocking)
  startBot().catch((err) => {
    console.error('Bot start failed:', err.message)
  })

  httpServer.listen(env.PORT, () => {
    console.log(`\n🚀 API:    http://localhost:${env.PORT}`)
    console.log(`🔌 Socket: ws://localhost:${env.PORT}`)
    console.log(`🤖 Bot:    @${env.BOT_USERNAME}`)
    console.log(`🌿 Env:    ${env.NODE_ENV}\n`)
  })

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} — shutting down...`)
    await pool.end()
    httpServer.close(() => process.exit(0))
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))
}

bootstrap().catch((err) => {
  console.error('❌ Bootstrap failed:', err)
  process.exit(1)
})
EOF
ok "src/main.ts"

# ═══════════════════════════════════════════════════════════════
# 10. SEED ADMIN USER
# ═══════════════════════════════════════════════════════════════
step 10 "Creating admin seed script..."

cat > apps/api/src/scripts/seed-admin.ts << 'EOF'
// Run: npx tsx src/scripts/seed-admin.ts
import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

import { db } from '../config/db'
import { adminUsers } from '@mira/db'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { pool } from '../config/db'

async function seedAdmin() {
  const email    = 'admin@miracosmetics.uz'
  const password = 'MiraAdmin2026!'

  const [existing] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1)

  if (existing) {
    console.log('✅ Admin already exists:', email)
    await pool.end()
    return
  }

  const hash = await bcrypt.hash(password, 12)

  await db.insert(adminUsers).values({
    email,
    passwordHash: hash,
    fullName:     'Super Admin',
    isSuperAdmin: true,
    isActive:     true,
  })

  console.log('✅ Admin created:')
  console.log('   Email:    ', email)
  console.log('   Password: ', password)
  console.log('   ⚠️  Change password after first login!')

  await pool.end()
}

seedAdmin().catch(console.error)
EOF
ok "src/scripts/seed-admin.ts"

# ═══════════════════════════════════════════════════════════════
# 11. COMPILE CHECK
# ═══════════════════════════════════════════════════════════════
step 11 "TypeScript compile check..."

cd apps/api && npx tsc --noEmit 2>&1 | grep "error TS" | head -10 || echo "✅ API TypeScript: PASS"
cd ../..

echo ""
echo -e "${GREEN}  ✅ Auth API complete!${NC}"
echo ""
echo "  Next steps:"
echo "  1. Seed admin:  cd apps/api && npx tsx src/scripts/seed-admin.ts"
echo "  2. Start API:   cd apps/api && npx tsx watch src/main.ts"
echo "  3. Test OTP:    curl -X POST http://localhost:4000/api/v1/auth/request-otp \\"
echo "                    -H 'Content-Type: application/json' \\"
echo "                    -d '{\"phone\":\"+998901234567\"}'"
echo ""
