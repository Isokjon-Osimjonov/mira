import { createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from './stores/auth.store'
import { AppLayout } from './layouts/AppLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { ProductsPage } from './pages/products/ProductsPage'
import { CategoriesPage } from './pages/categories/CategoriesPage'
import { OrdersPage } from './pages/orders/OrdersPage'
import { OrderDetailPage } from './pages/orders/OrderDetailPage'
import { BoxesPage } from './pages/boxes/BoxesPage'
import { InventoryPage } from './pages/inventory/InventoryPage'
import { CustomersPage } from './pages/customers/CustomersPage'
import { CustomerDetailPage } from './pages/customers/CustomerDetailPage'
import { WalkInPage } from './pages/customers/WalkInPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ErrorBoundary } from './components/ErrorBoundary'

// For TanStack Router we define the root route and children
const rootRoute = createRootRoute()

// Auth guard component can be handled using TanStack beforeLoad if preferred,
// but for simplicity we will just export a function that configures the router

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => (
    <ErrorBoundary>
      <LoginPage />
    </ErrorBoundary>
  )
})

const changePasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/change-password',
  component: () => (
    <ErrorBoundary>
      <div>Change Password Placeholder</div>
    </ErrorBoundary>
  )
})

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  beforeLoad: ({ location }) => {
    const state = useAuthStore.getState()
    const authed = !!state.accessToken && !!state.user

    if (!authed) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.pathname !== '/login' ? location.pathname : undefined,
        },
      })
    }

    if (state.mustChangePassword && location.pathname !== '/change-password') {
      throw redirect({ to: '/change-password' })
    }
  },
  component: AppLayout
})

const dashboardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/dashboard',
  component: () => (
    <ErrorBoundary>
      <DashboardPage />
    </ErrorBoundary>
  )
})

const productsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/products',
  component: () => (
    <ErrorBoundary>
      <ProductsPage />
    </ErrorBoundary>
  ),
})

const categoriesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/categories',
  component: () => (
    <ErrorBoundary>
      <CategoriesPage />
    </ErrorBoundary>
  ),
})

const boxesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/boxes',
  component: () => (
    <ErrorBoundary>
      <BoxesPage />
    </ErrorBoundary>
  )
})

const inventoryRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/inventory',
  component: () => (
    <ErrorBoundary>
      <InventoryPage />
    </ErrorBoundary>
  )
})

const customersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/customers',
  component: () => (
    <ErrorBoundary>
      <CustomersPage />
    </ErrorBoundary>
  ),
})

const customerDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/customers/$id',
  component: function CustomerDetail() {
    const { id } = customerDetailRoute.useParams()
    return (
      <ErrorBoundary>
        <CustomerDetailPage id={id} />
      </ErrorBoundary>
    )
  },
})

const walkInCustomerRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/customers/new',
  component: () => (
    <ErrorBoundary>
      <WalkInPage />
    </ErrorBoundary>
  ),
})

const ordersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/orders',
  component: () => (
    <ErrorBoundary>
      <OrdersPage />
    </ErrorBoundary>
  ),
})

const orderDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/orders/$id',
  component: function OrderDetail() {
    const { id } = orderDetailRoute.useParams()
    return (
      <ErrorBoundary>
        <OrderDetailPage id={id} />
      </ErrorBoundary>
    )
  },
})

const indexRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' })
  }
})

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: NotFoundPage
})

// Catch-all route definition for TanStack Router is a bit different,
// but we will provide a simple setup that satisfies the requirement.

const routeTree = rootRoute.addChildren([
  loginRoute,
  changePasswordRoute,
  protectedRoute.addChildren([
    indexRoute,
    dashboardRoute,
    productsRoute,
    categoriesRoute,
    boxesRoute,
    inventoryRoute,
    customersRoute,
    customerDetailRoute,
    walkInCustomerRoute,
    ordersRoute,
    orderDetailRoute,
    // Add other routes here as they are created
  ]),
  notFoundRoute
])

export const router = createRouter({ routeTree })
