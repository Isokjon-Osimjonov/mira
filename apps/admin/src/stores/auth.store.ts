import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Permission } from '@mira/shared-types'

export interface AdminUser {
  id: string
  email: string
  fullName: string
  isSuperAdmin: boolean
  mustChangePassword: boolean
  permissions: Permission[]
}

interface AuthState {
  accessToken: string | null
  user: AdminUser | null
  mustChangePassword: boolean
  _hasHydrated: boolean
}

interface AuthActions {
  setToken: (token: string) => void
  setUser: (user: AdminUser) => void
  setMustChangePassword: (val: boolean) => void
  logout: () => void
  setHasHydrated: (val: boolean) => void
  canView: (resource: string) => boolean
  canWrite: (resource: string) => boolean
}

type AuthStore = AuthState & AuthActions

export const authChannel = typeof window !== 'undefined' ? new BroadcastChannel('mira_auth') : null

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      accessToken: null,
      user: null,
      mustChangePassword: false,
      _hasHydrated: false,

      // Actions
      setToken: (token) => set({ accessToken: token }),

      setUser: (user) =>
        set({
          user,
          mustChangePassword: user.mustChangePassword,
        }),

      setMustChangePassword: (val) => set({ mustChangePassword: val }),

      logout: () => {
        set({
          accessToken: null,
          user: null,
          mustChangePassword: false,
        })
        // Notify other tabs
        authChannel?.postMessage('LOGOUT')
        // Best-effort API logout
        import('./api-logout').then((m) => m.apiLogout()).catch(() => {})
      },

      setHasHydrated: (val) => set({ _hasHydrated: val }),

      // Permission helpers
      canView: (resource: string) => {
        const user = get().user
        if (!user) return false
        if (user.isSuperAdmin) return true
        return user.permissions.some((p) => p.resource === resource)
      },

      canWrite: (resource: string) => {
        const user = get().user
        if (!user) return false
        if (user.isSuperAdmin) return true
        return user.permissions.some((p) => p.resource === resource && p.action === 'write')
      },
    }),
    {
      name: 'mira-admin-auth',
      storage: createJSONStorage(() => localStorage),

      // Only persist these fields (isAuthenticated is DERIVED)
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        mustChangePassword: state.mustChangePassword,
      }),

      // After localStorage is read, update derived state
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Data found in localStorage
          state.setHasHydrated(true)
        } else {
          // Empty localStorage — state is undefined
          // setTimeout ensures useAuthStore is initialized
          setTimeout(() => {
            useAuthStore.setState({ _hasHydrated: true })
          }, 0)
        }
      },
    }
  )
)

// Cross-tab sync
if (authChannel) {
  authChannel.onmessage = (event) => {
    if (event.data === 'LOGOUT') {
      useAuthStore.setState({
        accessToken: null,
        user: null,
        mustChangePassword: false,
      })
      window.location.href = '/login'
    }
    if (event.data === 'LOGIN') {
      // Other tab logged in — reload to sync
      window.location.reload()
    }
  }
}

// Selector hook (use this everywhere instead of isAuthenticated boolean)
export const useIsAuthenticated = () => useAuthStore((state) => !!state.accessToken && !!state.user)
