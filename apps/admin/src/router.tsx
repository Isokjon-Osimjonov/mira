import { createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from './stores/auth.store'
import { AppLayout } from './layouts/AppLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { AnalitikPage } from './pages/analytics/AnalitikPage'
import { ProductsPage } from './pages/products/ProductsPage'
import { CategoriesPage } from './pages/categories/CategoriesPage'
import { InventoryPage } from './pages/inventory/InventoryPage'
import { CustomersPage } from './pages/customers/CustomersPage'
import { CustomerDetailPage } from './pages/customers/CustomerDetailPage'
import { WalkInPage } from './pages/customers/WalkInPage'
import { OrdersPage } from './pages/orders/OrdersPage'
import { OrderDetailPage } from './pages/orders/OrderDetailPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { ExpensesPage } from './pages/expenses/ExpensesPage'
import { AdminsPage } from './pages/admins/AdminsPage'
import { RollarPage } from './pages/roles/RollarPage'
import { QutularPage } from './pages/boxes/QutularPage'
import { YetkazuvchilarPage } from './pages/suppliers/YetkazuvchilarPage'
import { KupunlarPage } from './pages/coupons/KupunlarPage'
import { BannersPage } from './pages/banners/BannersPage'
import { TelegramPage } from './pages/telegram/TelegramPage'
import { BuyurtmaBerish } from './pages/purchase-orders/BuyurtmaBerish'
import { CargoDatesPage } from './pages/cargo-dates/CargoDatesPage'
import { HisobotlarPage } from './pages/reports/HisobotlarPage'
import { ProfilePage } from './pages/profile/ProfilePage'
import { AuditLogPage } from './pages/audit/AuditLogPage'
import { SystemHealthPage } from './pages/system/SystemHealthPage'
import { NotFoundPage } from './pages/errors/NotFoundPage'
import { ErrorBoundary } from './components/ErrorBoundary'

// For TanStack Router we define the root route and children
const rootRoute = createRootRoute()

// Auth guard component can be handled using TanStack beforeLoad if preferred,
// but for simplicity we will just export a function that configures the router

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  beforeLoad: async () => {
    const { accessToken, user } = useAuthStore.getState()
    if (!accessToken || !user) {
      throw redirect({
        to: '/login',
      })
    }
  },
  component: AppLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({
      to: '/dashboard',
    })
  },
})

const dashboardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/dashboard',
  component: () => (
    <ErrorBoundary>
      <DashboardPage />
    </ErrorBoundary>
  ),
})

const analyticsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/analytics',
  component: () => (
    <ErrorBoundary>
      <AnalitikPage />
    </ErrorBoundary>
  ),
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
      <QutularPage />
    </ErrorBoundary>
  )
})

const suppliersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/suppliers',
  component: () => (
    <ErrorBoundary>
      <YetkazuvchilarPage />
    </ErrorBoundary>
  )
})

const couponsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/coupons',
  component: () => (
    <ErrorBoundary>
      <KupunlarPage />
    </ErrorBoundary>
  )
})

const bannersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/banners',
  component: () => (
    <ErrorBoundary>
      <BannersPage />
    </ErrorBoundary>
  )
})

const telegramRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/telegram',
  component: () => (
    <ErrorBoundary>
      <TelegramPage />
    </ErrorBoundary>
  )
})

const purchaseOrdersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/purchase-orders',
  component: () => (
    <ErrorBoundary>
      <BuyurtmaBerish />
    </ErrorBoundary>
  )
})

const cargoDatesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/cargo-dates',
  component: () => (
    <ErrorBoundary>
      <CargoDatesPage />
    </ErrorBoundary>
  )
})

const reportsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/reports',
  component: () => (
    <ErrorBoundary>
      <HisobotlarPage />
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
  ),
})

const settingsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/settings',
  component: () => (
    <ErrorBoundary>
      <SettingsPage />
    </ErrorBoundary>
  ),
})

const expensesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/expenses',
  component: () => (
    <ErrorBoundary>
      <ExpensesPage />
    </ErrorBoundary>
  ),
})

const adminsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/admin-users',
  component: () => (
    <ErrorBoundary>
      <AdminsPage />
    </ErrorBoundary>
  ),
})

const rolesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/roles',
  component: () => (
    <ErrorBoundary>
      <RollarPage />
    </ErrorBoundary>
  ),
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
  path: '/customers/$customerId',
  component: () => {
    const { customerId } = customerDetailRoute.useParams()
    return (
      <ErrorBoundary>
        <CustomerDetailPage id={customerId} />
      </ErrorBoundary>
    )
  },
})

const walkInCustomerRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/customers/walk-in',
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
  path: '/orders/$orderId',
  component: () => {
    const { orderId } = orderDetailRoute.useParams()
    return (
      <ErrorBoundary>
        <OrderDetailPage id={orderId} />
      </ErrorBoundary>
    )
  },
})

const profileRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/profile',
  component: () => (
    <ErrorBoundary>
      <ProfilePage />
    </ErrorBoundary>
  ),
})

const auditRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/audit',
  component: () => (
    <ErrorBoundary>
      <AuditLogPage />
    </ErrorBoundary>
  ),
})

const systemRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/system',
  component: () => (
    <ErrorBoundary>
      <SystemHealthPage />
    </ErrorBoundary>
  ),
})

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: NotFoundPage,
})

// Catch-all route definition for TanStack Router is a bit different,
// but we will provide a simple setup that satisfies the requirement.

const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([
    indexRoute,
    dashboardRoute,
    analyticsRoute,
    productsRoute,
    categoriesRoute,
    boxesRoute,
    suppliersRoute,
    couponsRoute,
    bannersRoute,
    telegramRoute,
    purchaseOrdersRoute,
    cargoDatesRoute,
    reportsRoute,
    inventoryRoute,
    settingsRoute,
    expensesRoute,
    adminsRoute,
    rolesRoute,
    customersRoute,
    customerDetailRoute,
    walkInCustomerRoute,
    ordersRoute,
    orderDetailRoute,
    profileRoute,
    auditRoute,
    systemRoute,
    // Add other routes here as they are created
  ]),
  notFoundRoute
])

export const router = createRouter({ routeTree })
