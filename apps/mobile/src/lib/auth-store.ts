import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

// ─── Types ────────────────────────────────────────────────────
export interface Customer {
  id: string
  phone: string
  phoneRegion: 'UZB' | 'KOR'
  firstName: string
  lastName: string | null
  telegramId: string | null
  profileImageUrl: string | null
  referralCode: string | null
  isVerified?: boolean
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  customer: Customer | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  setAuth: (accessToken: string, refreshToken: string, customer: Customer) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setCustomer: (customer: Customer) => void
  logout: () => Promise<void>
  initialize: () => Promise<void>
  getRefreshToken: () => Promise<string | null>
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  customer: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (accessToken, refreshToken, customer) => {
    set({ accessToken, refreshToken, customer, isAuthenticated: true, isLoading: false })
    SecureStore.setItemAsync('accessToken', accessToken)
    SecureStore.setItemAsync('refreshToken', refreshToken)
    SecureStore.setItemAsync('customer', JSON.stringify(customer))
  },

  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken })
    SecureStore.setItemAsync('accessToken', accessToken)
    SecureStore.setItemAsync('refreshToken', refreshToken)
  },

  setCustomer: (customer) => {
    set({ customer })
    SecureStore.setItemAsync('customer', JSON.stringify(customer))
  },

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync('accessToken'),
      SecureStore.deleteItemAsync('refreshToken'),
      SecureStore.deleteItemAsync('customer'),
    ])
    set({
      accessToken: null,
      refreshToken: null,
      customer: null,
      isAuthenticated: false,
      isLoading: false,
    })
  },

  getRefreshToken: () => SecureStore.getItemAsync('refreshToken'),

  initialize: async () => {
    try {
      const [accessToken, refreshToken, customerStr] = await Promise.all([
        SecureStore.getItemAsync('accessToken'),
        SecureStore.getItemAsync('refreshToken'),
        SecureStore.getItemAsync('customer'),
      ])

      if (accessToken && customerStr) {
        const customer = JSON.parse(customerStr)
        set({
          accessToken,
          refreshToken,
          customer,
          isAuthenticated: true,
          isLoading: false,
        })

      } else {
        set({ isLoading: false })

      }
    } catch (err) {
      set({ isLoading: false })
      console.error('Auth initialize error:', err)
    }
  },
}))

// Non-hook accessors
export const getAccessToken = () => useAuthStore.getState().accessToken
export const getRefreshToken = () => useAuthStore.getState().getRefreshToken()
export const saveRefreshToken = (t: string) =>
  useAuthStore.getState().setTokens(useAuthStore.getState().accessToken || '', t)
export const logoutCustomer = () => useAuthStore.getState().logout()
