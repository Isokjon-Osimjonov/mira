import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import axios from 'axios'
import Constants from 'expo-constants'

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  ''

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
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>
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

  setTokens: async (accessToken, refreshToken) => {
    await SecureStore.setItemAsync('accessToken', accessToken)
    await SecureStore.setItemAsync('refreshToken', refreshToken)
    set({
      accessToken,
      refreshToken,
      isAuthenticated: true
    })
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
        try {
          const apiModule = await import('./api')
          apiModule.default.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        } catch (e) {
          console.error(e)
        }

        const checkAndRefreshToken = async () => {
          try {
            const accessToken = await SecureStore.getItemAsync('accessToken')
            if (!accessToken) return

            // Decode token to check expiry
            const payload = JSON.parse(atob(accessToken.split('.')[1]))
            const expiresAt = payload.exp * 1000
            const now = Date.now()
            const fiveMinutes = 5 * 60 * 1000

            // If expires within 5 minutes
            // refresh proactively
            if (expiresAt - now < fiveMinutes) {
              const refreshToken = await SecureStore.getItemAsync('refreshToken')
              if (!refreshToken) return

              const response = await axios.post(
                `${BASE_URL}/auth/refresh`,
                { refreshToken },
                {
                  headers: {
                    'X-Client-Type': 'mobile',
                  },
                }
              )

              const { accessToken: newAccess, refreshToken: newRefresh } = response.data.data

              await SecureStore.setItemAsync('accessToken', newAccess)
              await SecureStore.setItemAsync('refreshToken', newRefresh)

              useAuthStore.setState({
                accessToken: newAccess,
              })
            }
          } catch (err) {
            console.error('Proactive refresh failed:', err)
          }
        }

        // Call on app start
        checkAndRefreshToken()

        // Also check every 4 hours
        setInterval(checkAndRefreshToken, 4 * 60 * 60 * 1000)
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
