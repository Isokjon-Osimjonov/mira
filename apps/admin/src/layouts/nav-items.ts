export const navItems = [
  {
    group: null,
    items: [
      { title: 'Dashboard', url: '/dashboard',
        icon: 'BarChart2' }
    ]
  },
  {
    group: 'Savdo',
    items: [
      { title: 'Buyurtmalar', url: '/orders',
        icon: 'ShoppingBag', badge: 'pending_orders',
        permission: 'orders:read' },
      { title: 'Mijozlar', url: '/customers',
        icon: 'Users', permission: 'customers:read' },
      { title: 'Kuponlar', url: '/coupons',
        icon: 'Tag', permission: 'coupons:read' },
    ]
  },
  {
    group: 'Mahsulotlar',
    items: [
      { title: 'Mahsulotlar', url: '/products',
        icon: 'Package', permission: 'products:read' },
      { title: 'Kategoriyalar', url: '/categories',
        icon: 'Layers', permission: 'products:read' },
      { title: 'Inventar', url: '/inventory',
        icon: 'Boxes', badge: 'low_stock_count',
        permission: 'inventory:read' },
      { title: 'Yetkazuvchilar', url: '/suppliers',
        icon: 'Building2', permission: 'inventory:read' },
      { title: 'Buyurtma berish', url: '/purchase-orders',
        icon: 'ClipboardList', permission: 'inventory:read' },
    ]
  },
  {
    group: 'Moliya',
    items: [
      { title: 'Xarajatlar', url: '/expenses',
        icon: 'Receipt', permission: 'expenses:read' },
      { title: 'Analitika', url: '/analytics',
        icon: 'TrendingUp', permission: 'analytics:read' },
      { title: 'Hisobotlar', url: '/reports',
        icon: 'FileSpreadsheet', permission: 'analytics:read' },
    ]
  },
  {
    group: 'Marketing',
    items: [
      { title: 'Telegram', url: '/telegram',
        icon: 'Send', permission: 'telegram:read' },
    ]
  },
  {
    group: 'Tizim',
    items: [
      { title: 'Sozlamalar', url: '/settings',
        icon: 'Settings2', permission: 'settings:read' },
      { title: 'Valyuta kursi', url: '/exchange-rates',
        icon: 'Coins', permission: 'exchange_rates:read' },
      { title: 'Adminlar', url: '/admin-users',
        icon: 'Shield', superAdminOnly: true },
      { title: 'Rollar', url: '/roles',
        icon: 'Lock', superAdminOnly: true },
    ]
  }
]
