export const QK = {
  // Auth
  ME: ['admin', 'me'],

  // Settings
  SETTINGS:       ['settings'],
  EXCHANGE_RATES: ['exchange-rates'],
  EXCHANGE_LATEST: ['exchange-rates', 'latest'],

  // Products
  PRODUCTS:       (params?: object) => ['products', params],
  PRODUCT:        (id: string)      => ['products', id],
  CATEGORIES:     ['categories'],
  BRANDS:         ['brands'],
  INVENTORY:      (params?: object) => ['inventory', params],
  INVENTORY_STOCK: ['inventory', 'stock'],
  BATCHES:        (productId: string) => ['batches', productId],
  WRITE_OFFS:     (params?: object) => ['write-offs', params],

  // Orders
  ORDERS:         (params?: object) => ['orders', params],
  ORDER:          (id: string)      => ['orders', id],
  ORDER_EXPENSES: (id: string)      => ['orders', id, 'expenses'],
  PACK_STATUS:    (id: string)      => ['orders', id, 'pack-status'],

  // Customers
  CUSTOMERS:      (params?: object) => ['customers', params],
  CUSTOMER:       (id: string)      => ['customers', id],
  CUSTOMER_ORDERS: (id: string)     => ['customers', id, 'orders'],

  // Coupons
  COUPONS:        (params?: object) => ['coupons', params],
  COUPON:         (id: string)      => ['coupons', id],

  // Dashboard
  DASHBOARD_OVERVIEW:   (period: string) => ['dashboard', 'overview', period],
  DASHBOARD_REVENUE:    (period: string) => ['dashboard', 'revenue', period],
  DASHBOARD_PL:         (period: string) => ['dashboard', 'pl', period],
  DASHBOARD_PRODUCTS:   (period: string) => ['dashboard', 'products', period],
  DASHBOARD_INVENTORY:  ['dashboard', 'inventory'],
  DASHBOARD_CUSTOMERS:  (period: string) => ['dashboard', 'customers', period],
  DASHBOARD_COUPONS:    (period: string) => ['dashboard', 'coupons', period],
  DASHBOARD_CASH_FLOW:  (period: string) => ['dashboard', 'cashflow', period],

  // Suppliers
  SUPPLIERS:      (params?: object) => ['suppliers', params],
  PURCHASE_ORDERS: (params?: object) => ['purchase-orders', params],
  PO:             (id: string)      => ['purchase-orders', id],

  // Expenses
  EXPENSES:       (params?: object) => ['expenses', params],
  EXPENSE_CATS:   ['expense-categories'],

  // Roles
  ROLES:          ['roles'],
  ROLE:           (id: string) => ['roles', id],
  PERMISSIONS:    ['roles', 'permissions-matrix'],

  // Admin users
  ADMIN_USERS:    ['admin-users'],

  // Telegram
  TG_CHANNELS:    ['telegram', 'channels'],
  TG_POSTS:       (params?: object) => ['telegram', 'posts', params],

  // Boxes & Shipping
  BOXES:          ['boxes'],
  KOR_SHIPPING:   ['kor-shipping-tiers'],
} as const
