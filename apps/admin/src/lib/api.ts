import axios, { AxiosError } from 'axios'
import createAuthRefreshInterceptor from 'axios-auth-refresh'
import { env } from '../config/env'

const API_BASE = env.apiUrl

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// STEP 1: Register refresh interceptor FIRST
createAuthRefreshInterceptor(
  api,
  async (failedRequest) => {
    try {
      const res = await axios.post(`${API_BASE}/admin/auth/refresh`, {}, { withCredentials: true })
      const { accessToken, mustChangePassword } = res.data.data

      const { useAuthStore } = await import('../stores/auth.store')
      const store = useAuthStore.getState()
      store.setToken(accessToken)
      if (mustChangePassword) store.setMustChangePassword(true)

      failedRequest.response.config.headers['Authorization'] = `Bearer ${accessToken}`
      return Promise.resolve()
    } catch (err) {
      // Both tokens expired or refresh failed — only place that calls logout
      const { useAuthStore } = await import('../stores/auth.store')
      useAuthStore.getState().logout()
      window.location.href = '/login'
      return Promise.reject(err)
    }
  },
  {
    statusCodes: [401],
  }
)

// STEP 2: Request interceptor: attach access token
api.interceptors.request.use(
  async (config) => {
    // skip refresh endpoint to avoid loop
    if (config.url?.includes('/admin/auth/refresh')) return config

    const { useAuthStore } = await import('../stores/auth.store')
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// STEP 3: Response interceptor: only for non-auth errors
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<any>) => {
    // DO NOT handle 401 here — refresh interceptor does it
    if (error.response?.status === 401) {
      return Promise.reject(error)
    }

    const code = error.response?.data?.error?.code
    const enhancedError = error as any
    enhancedError.errorCode = code ?? 'UNKNOWN'

    return Promise.reject(enhancedError)
  }
)
