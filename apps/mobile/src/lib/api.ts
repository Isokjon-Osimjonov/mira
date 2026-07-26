import axios from 'axios'
import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'
import { getAccessToken, useAuthStore } from './auth-store'

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  ''

// ─── Axios instance ───────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Client-Type': 'mobile',
  },
})

// ─── Request: inject access token ─────────────────────────────
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token && config.headers) {
    config.headers.Authorization = 'Bearer ' + token
  }
  return config
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

// ─── Response Interceptor ─────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Skip if no auth header was sent (guest requests should not refresh)
    if (!originalRequest.headers?.['Authorization'] &&
        !originalRequest.headers?.['authorization']) {
      return Promise.reject(error)
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken')

        if (!refreshToken) {
          throw new Error('No refresh token')
        }

        const response = await axios.post(
          `${BASE_URL}/auth/refresh`,
          { refreshToken },
          { headers: { 'X-Client-Type': 'mobile' } }
        )

        const { accessToken, refreshToken: newRefresh } = response.data.data

        // Save new tokens
        await SecureStore.setItemAsync('accessToken', accessToken)
        await SecureStore.setItemAsync('refreshToken', newRefresh)

        // Update store
        const { useAuthStore } = await import('./auth-store')
        useAuthStore.getState().setTokens?.(accessToken, newRefresh)

        // Update default header
        api.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken

        processQueue(null, accessToken)

        originalRequest.headers['Authorization'] = 'Bearer ' + accessToken

        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        // Clear tokens
        await SecureStore.deleteItemAsync('accessToken')
        await SecureStore.deleteItemAsync('refreshToken')
        await SecureStore.deleteItemAsync('customer')
        
        try {
          const { useAuthStore } = await import('./auth-store')
          useAuthStore.setState({
            accessToken: null,
            refreshToken: null,
            customer: null,
            isAuthenticated: false,
          })
        } catch {}

        try {
          const { router } = await import('expo-router')
          router.replace('/auth/login')
        } catch {}

        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Normalize network errors
    if (!error.response) {
      return Promise.reject({
        response: {
          data: {
            data: null,
            error: {
              message: 'Internet ulanishini tekshiring.',
              code: 'NETWORK_ERROR',
            },
          },
          status: 0,
        },
      })
    }

    return Promise.reject(error)
  }
)

export default api
