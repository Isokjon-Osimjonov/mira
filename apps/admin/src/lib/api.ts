import axios, { AxiosError } from 'axios'
import createAuthRefreshInterceptor from 'axios-auth-refresh'

const API_BASE = import.meta.env.VITE_API_URL
  ?? 'http://localhost:4000'

export const api = axios.create({
  baseURL:         `${API_BASE}/api/v1`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
  timeout: 30_000,
})

// ── Refresh interceptor (MUST be registered FIRST) ──

createAuthRefreshInterceptor(
  api,
  async (failedRequest) => {
    // Use raw axios to avoid interceptor loops
    const res = await axios.post(
      `${API_BASE}/api/v1/admin/auth/refresh`,
      {},
      { withCredentials: true }
    )
    const { accessToken, mustChangePassword } = res.data.data

    // Update store with new token
    const { useAuthStore } = await import('../stores/auth.store')
    const store = useAuthStore.getState()
    store.setToken(accessToken)
    if (mustChangePassword) store.setMustChangePassword(true)

    // Update the failed request's auth header for retry
    failedRequest.response.config.headers['Authorization'] =
      `Bearer ${accessToken}`

    return Promise.resolve()
  },
  {
    statusCodes: [401],
  }
)

// ── Request interceptor: attach access token ──

api.interceptors.request.use(
  async (config) => {
    const { useAuthStore } = await import('../stores/auth.store')
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor: only for non-auth errors ──

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    const status = error.response?.status
    const code   = error.response?.data?.error?.code

    // Skip 401 — handled by createAuthRefreshInterceptor
    if (status === 401) {
      return Promise.reject(error)
    }

    // Attach friendly message for other errors
    const enhancedError = error as any
    enhancedError.errorCode = code ?? 'UNKNOWN'

    return Promise.reject(enhancedError)
  }
)
