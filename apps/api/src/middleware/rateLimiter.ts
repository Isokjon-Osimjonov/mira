import rateLimit from 'express-rate-limit'

const json = (message: string, code: string) => ({
  data: null,
  error: { message, code },
})

// Strict: OTP requests — 5 per 10 min per IP
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: json("Juda ko'p urinish. 10 daqiqadan keyin qayta urinib ko'ring.", 'RATE_LIMITED'),
})

// Standard: general API — 100 per minute per IP
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: json("Juda ko'p so'rov.", 'RATE_LIMITED'),
})

// Upload: file uploads — 10 per minute per IP
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: json('Upload limit reached.', 'RATE_LIMITED'),
})

// Admin: admin endpoints — 200 per minute
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: json('Too many admin requests.', 'RATE_LIMITED'),
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
