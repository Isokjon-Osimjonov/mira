import { create } from 'zustand'

// ─── Types ────────────────────────────────────────────────────
export interface AdminUser {
  id:           string
  email:        string
  fullName:     string
  isSuperAdmin: boolean
  role: {
    id:          string
    name:        string
    permissions: string[]   // ['products:read', 'orders:write', ...]
  } | null
}

interface AuthState {
  // ⚠️ Access token ONLY in memory — never localStorage
  accessToken:     string | null
  user:            AdminUser | null
  isAuthenticated: boolean
  isLoading:       boolean

  // Actions
  setAuth:    (token: string, user: AdminUser) => void
  setLoading: (loading: boolean) => void
  logout:     () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken:     null,
  user:            null,
  isAuthenticated: false,
  isLoading:       true,

  setAuth: (accessToken, user) =>
    set({ accessToken, user, isAuthenticated: true, isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),

  logout: () =>
    set({ accessToken: null, user: null, isAuthenticated: false, isLoading: false }),
}))

// ─── Permission helpers ───────────────────────────────────────
export function usePermission(resource: string, action: string): boolean {
  const user = useAuthStore((s) => s.user)
  if (!user) return false
  if (user.isSuperAdmin) return true
  return user.role?.permissions.includes(`${resource}:${action}`) ?? false
}

export function useIsSuperAdmin(): boolean {
  return useAuthStore((s) => s.user?.isSuperAdmin ?? false)
}

// Non-hook version (for axios interceptors outside React)
export const getAccessToken = () => useAuthStore.getState().accessToken
export const logoutUser     = () => useAuthStore.getState().logout()
