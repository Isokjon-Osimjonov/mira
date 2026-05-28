// Brand: Violet Luxe (confirmed by client)
// All values = Tailwind v3 violet palette
export const BRAND = {
  DEFAULT: '#7C3AED', // violet-600 — primary
  dark:    '#4C1D95', // violet-900 — dark variant
  soft:    '#EDE9FE', // violet-100 — soft background
  bg:      '#F5F3FF', // violet-50  — page background
  text:    '#2E1065', // violet-950 — body text on light
} as const

export const REGION = { UZB: 'UZB', KOR: 'KOR' } as const
export type Region = keyof typeof REGION

export const CARGO_USD_PER_KG   = 10
export const KOR_DELIVERY_KRW   = 3000
export const OTP_TTL_MINUTES    = 5
export const OTP_MAX_ATTEMPTS   = 3
export const JWT_ACCESS_MINUTES = 15
export const JWT_REFRESH_DAYS   = 7
