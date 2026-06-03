import axios, { AxiosError } from 'axios'
import createAuthRefreshInterceptor from 'axios-auth-refresh'
import { env } from '../config/env'
import { getErrorMessage } from './errors'
import { toast } from 'sonner'

export interface ApiResponse<T = unknown> {
  data: T | null
  error: { message: string; code: string } | null
  meta?: {
    page:      number
    limit:     number
    total:     number
    hasNext:   boolean
    hasPrev:   boolean
  }
}

// ── Axios instance ─────────────────────

export const api = axios.create({
  baseURL:         `${env.apiUrl}/api/v1`,
  withCredentials: true,   // for httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
  timeout: 30000,
})

// ── Response interceptor: parse errors ─

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    const code    = error.response?.data?.error?.code
    const message = error.response?.data?.error?.message
      ?? getErrorMessage(code ?? '')

    // Attach friendly Uzbek message
    const enhancedError = error as AxiosError & {
      friendlyMessage: string
      code: string
    }
    enhancedError.friendlyMessage = message
    enhancedError.code = code ?? 'UNKNOWN'

    return Promise.reject(enhancedError)
  }
)

// ── Token refresh interceptor ──────────

createAuthRefreshInterceptor(
  api,
  async (failedRequest) => {
    // Dynamic import to avoid circular dependency
    const { useAuthStore } = await import('../stores/auth.store')
    
    try {
      const res = await axios.post(
        `${env.apiUrl}/api/v1/admin/auth/refresh`,
        {},
        { withCredentials: true }
      )
      const { accessToken, mustChangePassword } = res.data.data
      useAuthStore.getState().setToken(accessToken)
      if (mustChangePassword) {
        useAuthStore.getState().setMustChangePassword(true)
      }
      failedRequest.response.config.headers.Authorization =
        `Bearer ${accessToken}`
      return Promise.resolve()
    } catch (err) {
      // Both tokens expired — clean logout
      useAuthStore.getState().logout()
      toast.error('Sessiya muddati tugadi. Qayta kiring.')
      setTimeout(() => { 
        window.location.href = '/login' 
      }, 1500)
      return Promise.reject(err)
    }
  },
  { statusCodes: [401] }
)
