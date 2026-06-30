import { Router } from 'expo-router'

export function requireAuth(
  isAuthenticated: boolean,
  router: Router,
  intendedPath: string
): boolean {
  if (isAuthenticated) return true
  router.push({
    pathname: '/auth/login',
    params: { returnTo: intendedPath }
  })
  return false
}
