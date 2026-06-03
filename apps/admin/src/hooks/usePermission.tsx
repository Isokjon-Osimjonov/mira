import { useAuthStore } from '../stores/auth.store'

export function usePermission() {
  const { hasPermission, canRead, canWrite,
          canDelete, user } = useAuthStore()
  return {
    hasPermission,
    canRead,
    canWrite,
    canDelete,
    isSuperAdmin: user?.isSuperAdmin ?? false,
    user,
  }
}

// Component helper
export function PermissionGate({
  resource,
  action = 'read',
  children,
  fallback = null
}: {
  resource:  string
  action?:   'read' | 'write' | 'delete'
  children:  React.ReactNode
  fallback?: React.ReactNode
}) {
  const { hasPermission, user } = useAuthStore()
  if (!user) return fallback
  if (user.isSuperAdmin || hasPermission(resource, action)) {
    return <>{children}</>
  }
  return <>{fallback}</>
}
