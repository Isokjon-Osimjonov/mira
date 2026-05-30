// Admin API client
// - Access token: in memory (Zustand) — injected via interceptor
// - Refresh token: httpOnly cookie — sent automatically (withCredentials: true)
// - 401 handling: axios-auth-refresh queues concurrent requests automatically

import axios from 'axios'
// @ts-ignore
import createAuthRefreshInterceptor from 'axios-auth-refresh'
import { getAccessToken, logoutUser, useAuthStore } from './auth-store'
import type { ApiResponse } from '@mira/shared-types'

const BASE_URL = import.meta.env.VITE_API_URL as string

// ─── Axios instance ───────────────────────────────────────────
const api = axios.create({
  baseURL:         BASE_URL,
  timeout:         20_000,
  withCredentials: true,  // send httpOnly refresh token cookie
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
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

// ─── Refresh function (called once on 401) ────────────────────
// Cookie is sent automatically — no need to pass refresh token manually
const refreshAuthLogic = async (failedRequest: any): Promise<void> => {
  try {
    // withCredentials ensures httpOnly cookie is sent
    const res = await axios.post<ApiResponse<{ accessToken: string; user: any }>>(
      `${BASE_URL}/admin/auth/refresh`,
      {},
      { withCredentials: true }
    )

    if (res.data.data) {
      const { accessToken, user } = res.data.data
      useAuthStore.getState().setAuth(accessToken, user)
      failedRequest.config.headers.Authorization = `Bearer ${accessToken}`
      return Promise.resolve()
    }
    throw new Error('Refresh failed')
  } catch {
    logoutUser()
    window.location.href = '/login'
    return Promise.reject()
  }
}

// axios-auth-refresh handles:
// - Concurrent 401s (queue all, refresh once, replay all)
// - pauseInstanceWhileRefreshing prevents new requests during refresh
// @ts-ignore — axios-auth-refresh v3 options
createAuthRefreshInterceptor(api, refreshAuthLogic, {
  statusCodes:                  [401],
  retryInstance:                api,
})

// ─── Response: normalize errors ───────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject({
        response: {
          data: {
            data:  null,
            error: {
              message: 'Tarmoq xatosi. Internet ulanishini tekshiring.',
              code:    'NETWORK_ERROR',
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
