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

// ─── Response Interceptor ─────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh')
    ) {
      original._retry = true

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken')

        if (!refreshToken) {
          // No refresh token available — go straight to
          // logout flow instead of throwing
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

          // Return a resolved rejection that won't
          // surface as "uncaught" — the calling code
          // already expects requests to fail after logout
          return Promise.reject(error)
        }

        const response = await axios.post(
          BASE_URL + '/auth/refresh',
          { refreshToken },
          { headers: { 'X-Client-Type': 'mobile' } }
        )

        const { accessToken, refreshToken: newRefresh } = response.data.data

        await SecureStore.setItemAsync('accessToken', accessToken)
        await SecureStore.setItemAsync('refreshToken', newRefresh)

        const { useAuthStore } = await import('./auth-store')
        useAuthStore.getState().setTokens?.(accessToken, newRefresh)

        original.headers.Authorization = 'Bearer ' + accessToken
        return api(original)
      } catch (refreshError) {
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
