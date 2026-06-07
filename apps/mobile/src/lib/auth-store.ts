import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import axios from 'axios'

const REFRESH_TOKEN_KEY = 'mira_refresh_token'

// ─── Types ────────────────────────────────────────────────────
export interface Customer {
  id:              string
  phone:           string
  phoneRegion:     'UZB' | 'KOR'
  firstName:       string
  lastName:        string | null
  telegramId:      string | null  // server returns string not number
  profileImageUrl: string | null
  referralCode:    string | null
  isVerified?:     boolean
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

  initialize: async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
      if (!refreshToken) {
        set({ isLoading: false })
        return
      }
      // Attempt silent refresh on startup
      // so first screen load has valid access token
      const res = await axios.post(
        `${process.env.EXPO_PUBLIC_API_URL}/auth/refresh`,
        { refreshToken }
      )
      const { accessToken, refreshToken: newRefresh, customer }
        = res.data.data
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefresh)
      set({
        accessToken,
        customer,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch {
      // Refresh failed — token expired or invalid
      // Clear storage and send to login
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
      set({
        accessToken: null,
        customer: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },
}))

// Non-hook accessors for use outside React components (axios interceptors)
export const getAccessToken     = () => useAuthStore.getState().accessToken
export const getRefreshToken    = () => useAuthStore.getState().getRefreshToken()
export const saveRefreshToken   = (t: string) => useAuthStore.getState().saveRefresh(t)
export const logoutCustomer     = () => useAuthStore.getState().logout()
