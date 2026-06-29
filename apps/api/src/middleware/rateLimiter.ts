import rateLimit from 'express-rate-limit'
import slowDown from 'express-slow-down'
import { env } from '../config/env'

const json = (message: string, code: string) => ({
  data: null,
  error: { message, code },
})

const isDev = env.NODE_ENV === 'development'

export const speedLimiter = slowDown({
  windowMs: 60 * 1000, // 1 minute
  delayAfter: 50, // after 50 requests
  delayMs: (hits) => (hits - 50) * 200, // +200ms per request
  maxDelayMs: 5000, // max 5 second delay
})

export const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 5,
  message: json("Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring.", 'RATE_LIMITED'),
})

// Strict: OTP requests — 10 per 10 min per IP (200 in dev)
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isDev ? 200 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: json("Juda ko'p urinish. 10 daqiqadan keyin qayta urinib ko'ring.", 'RATE_LIMITED'),
})

// Standard: general API — 500 per minute per IP (Increased from 100)
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === '/health'
  },
  message: json("Juda ko'p so'rov.", 'RATE_LIMIT_EXCEEDED'),
})

// Upload: file uploads — 10 per minute per IP
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: json('Upload limit reached.', 'RATE_LIMITED'),
})

// Admin: admin endpoints — 200 per minute (1000 in dev)
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 1000 : 200,
  message: json('Too many admin requests.', 'RATE_LIMITED'),
})

// AI: image analysis — 10 per minute
export const imageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    data: null,
    error: {
      message: 'Rasm tahlil limiti: minutiga 10 ta',
      code: 'RATE_LIMITED',
    },
  },
})

// AI: text generation — 20 per minute
export const aiTextLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    data: null,
    error: {
      message: 'AI matn tahlil limiti: minutiga 20 ta',
      code: 'RATE_LIMITED',
    },
  },
})

// ─── Per-phone OTP rate limit ─────────────────────────────────
const phoneMap = new Map<string, { count: number; resetAt: number }>()

export function checkPhoneRateLimit(phone: string): boolean {
  const now = Date.now()
  const window = 10 * 60 * 1000
  const max = 3
  const entry = phoneMap.get(phone)
  if (!entry || entry.resetAt < now) {
    phoneMap.set(phone, { count: 1, resetAt: now + window })
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}

setInterval(
  () => {
    const now = Date.now()
    for (const [k, v] of phoneMap.entries()) {
      if (v.resetAt < now) phoneMap.delete(k)
    }
  },
  30 * 60 * 1000
)
