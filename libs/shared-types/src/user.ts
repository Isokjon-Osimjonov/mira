import { z } from 'zod'
import { RegionSchema } from './common'

export const UserRoleSchema = z.enum(['customer', 'admin'])
export type UserRole = z.infer<typeof UserRoleSchema>

export const UserSchema = z.object({
  id: z.string().uuid(),
  phone: z.string(),
  phone_region: RegionSchema,
  telegram_id: z.number().nullable(),
  first_name: z.string(),
  last_name: z.string().nullable(),
  role: UserRoleSchema,
  is_active: z.boolean(),
  created_at: z.string(),
})
export type User = z.infer<typeof UserSchema>
