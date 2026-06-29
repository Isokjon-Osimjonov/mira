import api from '../lib/api'
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: any
}
import { useAuthStore } from '../lib/auth-store'
import type { Customer } from '../lib/auth-store'

export interface RequestOtpPayload {
  phone: string
  region: 'UZB' | 'KOR'
}

export interface RequestOtpResponse {
  deepLink: string // full URL from server e.g. https://t.me/bot?start=TOKEN
  expiresIn: number // seconds until token expires (300)
}

export interface VerifyOtpPayload {
  phone: string
  token: string // from requestOtp response
  otp: string // 6-digit code from Telegram
  region: 'UZB' | 'KOR'
}

export interface VerifyOtpResponse {
  accessToken: string
  refreshToken?: string
  customer: Customer
  isNewCustomer: boolean // true = show profile setup
}

export const authService = {
  requestOtp: async (payload: RequestOtpPayload): Promise<RequestOtpResponse> => {
    const res = await api.post<ApiResponse<RequestOtpResponse>>('/auth/request-otp', payload)
    return res.data.data!
  },

  verifyOtp: async (payload: VerifyOtpPayload): Promise<VerifyOtpResponse> => {
    const res = await api.post<ApiResponse<VerifyOtpResponse>>('/auth/verify-otp', payload)
    return res.data.data!
  },

  refreshToken: async (
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> => {
    const res = await api.post<
      ApiResponse<{
        accessToken: string
        refreshToken: string
      }>
    >('/auth/refresh', { refreshToken })
    return res.data.data!
  },

  logout: async (): Promise<void> => {
    try {
      const refreshToken = await useAuthStore.getState().getRefreshToken()
      await api.post('/auth/logout', {
        refreshToken: refreshToken ?? '',
      })
    } catch {
      // Logout best-effort — clear local state regardless
    }
  },

  deleteAccount: async (): Promise<void> => {
    await api.delete('/auth/account')
  },
}
