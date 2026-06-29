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
import { ManualOrderPage } from './pages/orders/ManualOrderPage'
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
import { RequirePermission } from './components/RequirePermission'

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
      <RequirePermission resource="analytics">
        <AnalitikPage />
      </RequirePermission>
    </ErrorBoundary>
  ),
})

const productsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/products',
  component: () => (
    <ErrorBoundary>
      <RequirePermission resource="products">
        <ProductsPage />
      </RequirePermission>
    </ErrorBoundary>
  ),
})

const categoriesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/categories',
  component: () => (
    <ErrorBoundary>
      <RequirePermission resource="products">
        <CategoriesPage />
      </RequirePermission>
    </ErrorBoundary>
  ),
})

const boxesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/boxes',
  component: () => (
    <ErrorBoundary>
      <RequirePermission resource="products">
        <QutularPage />
      </RequirePermission>
    </ErrorBoundary>
  ),
})

const suppliersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/suppliers',
  component: () => (
    <ErrorBoundary>
      <RequirePermission resource="products">
        <YetkazuvchilarPage />
      </RequirePermission>
    </ErrorBoundary>
  ),
})

const couponsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/coupons',
  component: () => (
    <ErrorBoundary>
      <RequirePermission resource="coupons">
        <KupunlarPage />
      </RequirePermission>
    </ErrorBoundary>
  ),
})

const bannersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/banners',
  component: () => (
    <ErrorBoundary>
      <RequirePermission resource="settings">
        <BannersPage />
      </RequirePermission>
    </ErrorBoundary>
  ),
})

const telegramRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/telegram',
  component: () => (
    <ErrorBoundary>
      <RequirePermission resource="telegram">
        <TelegramPage />
      </RequirePermission>
    </ErrorBoundary>
  ),
})

const purchaseOrdersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/purchase-orders',
  component: () => (
    <ErrorBoundary>
      <RequirePermission resource="inventory">
        <BuyurtmaBerish />
      </RequirePermission>
    </ErrorBoundary>
  ),
})

const cargoDatesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/cargo-dates',
  component: () => (
    <ErrorBoundary>
      <RequirePermission resource="products">
        <CargoDatesPage />
      </RequirePermission>
    </ErrorBoundary>
  ),
})

const reportsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/reports',
  component: () => (
    <ErrorBoundary>
      <RequirePermission resource="analytics">
        <HisobotlarPage />
      </RequirePermission>
    </ErrorBoundary>
  ),
})

const inventoryRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/inventory',
  component: () => (
    <ErrorBoundary>
      <RequirePermission resource="inventory">
        <InventoryPage />
      </RequirePermission>
    </ErrorBoundary>
  ),
})

const settingsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/settings',
  component: () => (
    <ErrorBoundary>
      <RequirePermission resource="settings">
        <SettingsPage />
      </RequirePermission>
    </ErrorBoundary>
  ),
})

const expensesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/expenses',
  component: () => (
    <ErrorBoundary>
      <RequirePermission resource="expenses">
        <ExpensesPage />
      </RequirePermission>
    </ErrorBoundary>
  ),
})

const adminsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/admin-users',
  component: () => (
    <ErrorBoundary>
      <RequirePermission resource="users">
        <AdminsPage />
      </RequirePermission>
    </ErrorBoundary>
  ),
})

const rolesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/roles',
  component: () => (
    <ErrorBoundary>
      <RequirePermission resource="roles">
        <RollarPage />
      </RequirePermission>
    </ErrorBoundary>
  ),
})

const customersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/customers',
  component: () => (
    <ErrorBoundary>
      <RequirePermission resource="customers">
        <CustomersPage />
      </RequirePermission>
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
        <RequirePermission resource="customers">
          <CustomerDetailPage id={customerId} />
        </RequirePermission>
      </ErrorBoundary>
    )
  },
})

const walkInCustomerRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/customers/walk-in',
  component: () => (
    <ErrorBoundary>
      <RequirePermission resource="customers">
        <WalkInPage />
      </RequirePermission>
    </ErrorBoundary>
  ),
})

const ordersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/orders',
  component: () => (
    <ErrorBoundary>
      <RequirePermission resource="orders">
        <OrdersPage />
      </RequirePermission>
    </ErrorBoundary>
  ),
})

const ordersNewRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/orders/new',
  component: () => (
    <ErrorBoundary>
      <RequirePermission resource="orders">
        <ManualOrderPage />
      </RequirePermission>
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
        <RequirePermission resource="orders">
          <OrderDetailPage id={orderId} />
        </RequirePermission>
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
      <RequirePermission resource="settings">
        <AuditLogPage />
      </RequirePermission>
    </ErrorBoundary>
  ),
})

const systemRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/system',
  component: () => (
    <ErrorBoundary>
      <RequirePermission resource="settings">
        <SystemHealthPage />
      </RequirePermission>
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
    ordersNewRoute,
    orderDetailRoute,
    profileRoute,
    auditRoute,
    systemRoute,
    // Add other routes here as they are created
  ]),
  notFoundRoute,
])

export const router = createRouter({ routeTree })
