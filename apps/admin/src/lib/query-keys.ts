// Centralized query key factory
// Consistent keys prevent stale data bugs and enable precise invalidation

export const qk = {
  // ── Auth ──────────────────────────────────────────────────
  me: () => ['me'] as const,

  // ── Dashboard ─────────────────────────────────────────────
  dashboard: {
    summary: () => ['dashboard', 'summary'] as const,
    salesChart: (period: string) => ['dashboard', 'sales-chart', period] as const,
    topProducts: () => ['dashboard', 'top-products'] as const,
  },

  // ── Products ──────────────────────────────────────────────
  products: {
    all: () => ['products'] as const,
    list: (filters: Record<string, unknown>) => ['products', 'list', filters] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },

  // ── Categories ────────────────────────────────────────────
  categories: {
    all: () => ['categories'] as const,
    tree: () => ['categories', 'tree'] as const,
  },

  // ── Orders ────────────────────────────────────────────────
  orders: {
    all: () => ['orders'] as const,
    list: (filters: Record<string, unknown>) => ['orders', 'list', filters] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
    count: (status: string) => ['orders', 'count', status] as const,
  },

  // ── Customers ─────────────────────────────────────────────
  customers: {
    all: () => ['customers'] as const,
    list: (filters: Record<string, unknown>) => ['customers', 'list', filters] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
  },

  // ── Inventory ─────────────────────────────────────────────
  inventory: {
    products: (filters: Record<string, unknown>) => ['inventory', 'products', filters] as const,
    batches: (productId: string) => ['inventory', 'batches', productId] as const,
    movements: (batchId: string) => ['inventory', 'movements', batchId] as const,
  },

  // ── Coupons ───────────────────────────────────────────────
  coupons: {
    all: () => ['coupons'] as const,
    list: (filters: Record<string, unknown>) => ['coupons', 'list', filters] as const,
    detail: (id: string) => ['coupons', 'detail', id] as const,
  },

  // ── Settings ──────────────────────────────────────────────
  settings: { all: () => ['settings'] as const },
  exchangeRates: { list: () => ['exchange-rates'] as const },
  boxes: { all: () => ['boxes'] as const },

  // ── Admin users ───────────────────────────────────────────
  adminUsers: {
    all: () => ['admin-users'] as const,
    detail: (id: string) => ['admin-users', 'detail', id] as const,
  },
  roles: { all: () => ['roles'] as const },

  // ── Analytics ─────────────────────────────────────────────
  analytics: {
    daily: (date: string, region: string) => ['analytics', 'daily', date, region] as const,
    monthly: (month: string) => ['analytics', 'monthly', month] as const,
  },

  // ── Telegram ──────────────────────────────────────────────
  telegram: {
    channels: () => ['telegram', 'channels'] as const,
    posts: (filters: Record<string, unknown>) => ['telegram', 'posts', filters] as const,
  },

  // ── Expenses ──────────────────────────────────────────────
  expenses: {
    list: (filters: Record<string, unknown>) => ['expenses', 'list', filters] as const,
    categories: () => ['expenses', 'categories'] as const,
  },
}
