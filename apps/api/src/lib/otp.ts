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
