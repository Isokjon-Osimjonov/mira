import { z } from 'zod'

const permissionSchema = z.object({
  resource: z.enum([
    'products',
    'orders',
    'customers',
    'inventory',
    'settings',
    'analytics',
    'telegram',
    'expenses',
    'coupons',
    'exchange_rates',
    'boxes',
    'users',
    'roles',
  ]),
  action: z.enum(['read', 'write', 'delete']),
})

export const createRoleSchema = z.object({
  name: z.string().min(2, "Rol nomi kamida 2 ta belgidan iborat bo'lishi kerak").max(50),
  description: z.string().optional().nullable(),
  permissions: z.array(permissionSchema).min(1, 'Kamida bitta huquqni tanlang'),
})

export const updateRoleSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().optional().nullable(),
  permissions: z.array(permissionSchema).optional(),
})

export const updatePermissionSchema = z.object({
  operation: z.enum(['add', 'remove']),
  resource: z.enum([
    'products',
    'orders',
    'customers',
    'inventory',
    'settings',
    'analytics',
    'telegram',
    'expenses',
    'coupons',
    'exchange_rates',
    'boxes',
    'users',
    'roles',
  ]),
  action: z.enum(['read', 'write', 'delete']),
})

export type CreateRoleDto = z.infer<typeof createRoleSchema>
export type UpdateRoleDto = z.infer<typeof updateRoleSchema>
export type UpdatePermissionDto = z.infer<typeof updatePermissionSchema>
