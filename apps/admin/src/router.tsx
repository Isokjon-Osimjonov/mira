import { createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from './stores/auth.store'
import { AppLayout } from './layouts/AppLayout'
import LoginPage from './pages/auth/LoginPage'

// For TanStack Router we define the root route and children
const rootRoute = createRootRoute()

// Auth guard component can be handled using TanStack beforeLoad if preferred,
// but for simplicity we will just export a function that configures the router

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage
})

const changePasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/change-password',
  component: () => <div>Change Password Placeholder</div>
})

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  beforeLoad: () => {
    const state = useAuthStore.getState()
    if (!state.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: AppLayout
})

const dashboardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/dashboard',
  component: () => <div>Dashboard Placeholder</div>
})

const indexRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' })
  }
})

// Catch-all route definition for TanStack Router is a bit different,
// but we will provide a simple setup that satisfies the requirement.

const routeTree = rootRoute.addChildren([
  loginRoute,
  changePasswordRoute,
  protectedRoute.addChildren([
    indexRoute,
    dashboardRoute,
    // Add other routes here as they are created
  ])
])

export const router = createRouter({ routeTree })
