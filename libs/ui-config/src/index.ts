// Brand: Violet Luxe (confirmed by client)
// All values = Tailwind v3 violet palette
export const BRAND = {
  DEFAULT: '#E11D74', // violet-600 — primary
  dark: '#9D1352', // violet-900 — dark variant
  soft: '#FCE7F3', // violet-100 — soft background
  bg: '#FFF8FB', // violet-50  — page background
  text: '#1A0A10', // violet-950 — body text on light
} as const

export const REGION = { UZB: 'UZB', KOR: 'KOR' } as const
export type Region = keyof typeof REGION

export const CARGO_USD_PER_KG = 10
export const KOR_DELIVERY_KRW = 3000
export const OTP_TTL_MINUTES = 5
export const OTP_MAX_ATTEMPTS = 3
export const JWT_ACCESS_MINUTES = 15
export const JWT_REFRESH_DAYS = 7
