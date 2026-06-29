import { useAuthStore } from '../stores/auth.store'

export function usePermission() {
  const { canView, canWrite, user } = useAuthStore()
  return {
    hasPermission: (resource: string, action: string) => {
      if (action === 'read') return canView(resource)
      if (action === 'write') return canWrite(resource)
      return false
    },
    canRead: canView,
    canWrite,
    canDelete: canWrite, // Default delete to write permission
    isSuperAdmin: user?.isSuperAdmin ?? false,
    user,
  }
}

// Component helper
export function PermissionGate({
  resource,
  action = 'read',
  children,
  fallback = null,
}: {
  resource: string
  action?: 'read' | 'write' | 'delete'
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { canView, canWrite, user } = useAuthStore()
  if (!user) return <>{fallback}</>
  if (user.isSuperAdmin) return <>{children}</>

  let hasPerm = false
  if (action === 'read') hasPerm = canView(resource)
  if (action === 'write' || action === 'delete') hasPerm = canWrite(resource)

  return hasPerm ? <>{children}</> : <>{fallback}</>
}
