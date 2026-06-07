// Mobile API client
// - Access token: in memory (Zustand)
// - Refresh token: expo-secure-store (encrypted, hardware-backed)
// - 401 handling: axios-auth-refresh with queue

import axios from 'axios'
// @ts-ignore
import createAuthRefreshInterceptor from 'axios-auth-refresh'
import Constants from 'expo-constants'
import {
  getAccessToken,
  getRefreshToken,
  saveRefreshToken,
  logoutCustomer,
  useAuthStore,
} from './auth-store'
import type { ApiResponse } from '@mira/shared-types'

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://localhost:4000/api/v1'

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
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Refresh function ─────────────────────────────────────────
const refreshAuthLogic = async (failedRequest: any): Promise<void> => {
  try {
    const refreshToken = await getRefreshToken()
    if (!refreshToken) throw new Error('No refresh token stored')

    const res = await axios.post<
      ApiResponse<{
        accessToken: string
        refreshToken: string
        customer: any
      }>
    >(`${BASE_URL}/auth/refresh`, { refreshToken })

    if (res.data.data) {
      const { accessToken, refreshToken: newRefresh, customer } = res.data.data
      await saveRefreshToken(newRefresh)
      useAuthStore.getState().setAuth(accessToken, customer)
      failedRequest.config.headers.Authorization = `Bearer ${accessToken}`
      return Promise.resolve()
    }
    throw new Error('Refresh response invalid')
  } catch {
    await logoutCustomer()
    return Promise.reject()
  }
}

// @ts-ignore
createAuthRefreshInterceptor(api, refreshAuthLogic, {
  statusCodes: [401],
  retryInstance: api,
})

// ─── Response: normalize network errors ───────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
