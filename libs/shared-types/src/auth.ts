export const ALL_RESOURCES = [
  'orders',
  'products',
  'customers',
  'inventory',
  'coupons',
  'expenses',
  'analytics',
  'telegram',
  'settings',
  'users',
  'roles',
] as const

export type AppResource = (typeof ALL_RESOURCES)[number]

export interface Permission {
  resource: AppResource | string
  action: 'read' | 'write' | string
}
