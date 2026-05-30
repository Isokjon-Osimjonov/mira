import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

const REFRESH_TOKEN_KEY = 'mira_refresh_token'

// ─── Types ────────────────────────────────────────────────────
export interface Customer {
  id:              string
  phone:           string
  phoneRegion:     'UZB' | 'KOR'
  firstName:       string
  lastName:        string | null
  telegramId:      number | null
  profileImageUrl: string | null
  referralCode:    string | null
  isVerified:      boolean
}

interface AuthState {
  accessToken:     string | null
  customer:        Customer | null
  isAuthenticated: boolean
  isLoading:       boolean   // true on app start while checking SecureStore

  // Actions
  setAuth:         (token: string, customer: Customer) => void
  setCustomer:     (customer: Customer) => void
  saveRefresh:     (token: string) => Promise<void>
  logout:          () => Promise<void>
  initialize:      () => Promise<void>
  getRefreshToken: () => Promise<string | null>
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken:     null,
  customer:        null,
  isAuthenticated: false,
  isLoading:       true,

  setAuth: (accessToken, customer) =>
    set({ accessToken, customer, isAuthenticated: true, isLoading: false }),

  setCustomer: (customer) => set({ customer }),

  saveRefresh: async (token) => {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token)
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
    set({ accessToken: null, customer: null, isAuthenticated: false, isLoading: false })
  },

  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),

  // Called on app start — check if refresh token exists
  initialize: async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
      if (!refreshToken) {
        set({ isLoading: false })
        return
      }
      // Refresh token exists — will be used by axios interceptor on first 401
      // We don't call refresh here to avoid unnecessary API calls on startup
      // The first API call will trigger refresh if access token is missing
      set({ isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },
}))

// Non-hook accessors for use outside React components (axios interceptors)
export const getAccessToken     = () => useAuthStore.getState().accessToken
export const getRefreshToken    = () => useAuthStore.getState().getRefreshToken()
export const saveRefreshToken   = (t: string) => useAuthStore.getState().saveRefresh(t)
export const logoutCustomer     = () => useAuthStore.getState().logout()
