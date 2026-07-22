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

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: any) => void
}> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

// STEP 1: Response interceptor for refresh logic & error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as any

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const { useAuthStore } = await import('../stores/auth.store')
      const refreshToken = useAuthStore.getState().refreshToken

      if (!refreshToken) {
        isRefreshing = false
        useAuthStore.getState().logout()
        return Promise.reject(error)
      }

      try {
        const response = await axios.post(`${API_BASE}/admin/auth/refresh`, { refreshToken }, { withCredentials: true })
        const { accessToken, refreshToken: newRefreshToken, mustChangePassword } = response.data.data

        const store = useAuthStore.getState()
        store.setTokens(accessToken, newRefreshToken)
        if (mustChangePassword) store.setMustChangePassword(true)

        api.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken
        processQueue(null, accessToken)

        originalRequest.headers['Authorization'] = 'Bearer ' + accessToken
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    const code = error.response?.data?.error?.code
    const enhancedError = error as any
    enhancedError.errorCode = code ?? 'UNKNOWN'
    return Promise.reject(enhancedError)
  }
)

// STEP 2: Request interceptor: attach access token
api.interceptors.request.use(
  async (config) => {
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
