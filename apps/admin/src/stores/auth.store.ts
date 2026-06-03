import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface AdminUser {
  id:            string
  email:         string
  fullName:      string
  isSuperAdmin:  boolean
  mustChangePassword: boolean
  role: {
    id:   string
    name: string
    permissions: string[]  // ['products:read', 'orders:write', ...]
  } | null
}

interface AuthStore {
  accessToken:         string | null
  user:                AdminUser | null
  mustChangePassword:  boolean
  isAuthenticated:     boolean
  _hasHydrated:        boolean

  setToken:            (token: string) => void
  setUser:             (user: AdminUser) => void
  setMustChangePassword: (val: boolean) => void
  setHasHydrated:      (val: boolean) => void
  logout:              () => void

  hasPermission:       (resource: string, action: string) => boolean
  canRead:             (resource: string) => boolean
  canWrite:            (resource: string) => boolean
  canDelete:           (resource: string) => boolean
}

// BroadcastChannel for cross-tab sync
export const authChannel = new BroadcastChannel('mira_auth')

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      accessToken:        null,
      user:               null,
      mustChangePassword: false,
      isAuthenticated:    false,
      _hasHydrated:       false,

      setToken: (token) => set({
        accessToken:     token,
        isAuthenticated: !!token
      }),

      setUser: (user) => set({
        user,
        isAuthenticated:    true,
        mustChangePassword: user.mustChangePassword
      }),

      setMustChangePassword: (val) => set({
        mustChangePassword: val
      }),

      setHasHydrated: (val) => set({ _hasHydrated: val }),

      logout: () => {
        set({
          accessToken:        null,
          user:               null,
          isAuthenticated:    false,
          mustChangePassword: false
        })
        
        // Clear localStorage explicitly
        localStorage.removeItem('mira-admin-auth')
        
        // Call API logout (best effort)
        import('../lib/api').then(({ api }) => {
          api.post('/admin/auth/logout').catch(() => {})
        })

        // Notify other tabs
        authChannel.postMessage('LOGOUT')
      },

      hasPermission: (resource, action) => {
        const { user } = get()
        if (!user) return false
        if (user.isSuperAdmin) return true
        if (!user.role) return false
        return user.role.permissions.includes(`${resource}:${action}`)
      },

      canRead:   (resource) => get().hasPermission(resource, 'read'),
      canWrite:  (resource) => get().hasPermission(resource, 'write'),
      canDelete: (resource) => get().hasPermission(resource, 'delete'),
    }),
    {
      name:    'mira-admin-auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
      partialize: (state) => ({
        accessToken:        state.accessToken,
        user:               state.user,
        mustChangePassword: state.mustChangePassword,
      })
    }
  )
)

// Listen for logout from other tabs
authChannel.onmessage = (event) => {
  if (event.data === 'LOGOUT') {
    useAuthStore.getState().logout()
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }
  if (event.data === 'LOGIN') {
    // Other tab logged in — reload to sync
    window.location.reload()
  }
}
