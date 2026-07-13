import { z } from 'zod'

export const createAdminUserSchema = z
  .object({
    email: z.string().email("Noto'g'ri email formati"),
    fullName: z.string().min(2, "Ism kamida 2 ta belgidan iborat bo'lishi kerak"),
    password: z.string().min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak").optional(),
    roleId: z.string().uuid().optional().nullable(),
    isSuperAdmin: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      if (data.isSuperAdmin && data.roleId) return false
      return true
    },
    { message: "Super admin bo'lsa rol tanlab bo'lmaydi", path: ['roleId'] }
  )
  .refine(
    (data) => {
      if (!data.isSuperAdmin && !data.roleId) return false
      return true
    },
    { message: 'Rol tanlash majburiy', path: ['roleId'] }
  )

export const updateAdminUserSchema = z
  .object({
    fullName: z.string().min(2).optional(),
    roleId: z.string().uuid().optional().nullable(),
    isActive: z.boolean().optional(),
    isSuperAdmin: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.isSuperAdmin === true && data.roleId) return false
      return true
    },
    { message: "Super admin bo'lsa rol tanlab bo'lmaydi", path: ['roleId'] }
  )

export type CreateAdminUserDto = z.infer<typeof createAdminUserSchema>
export type UpdateAdminUserDto = z.infer<typeof updateAdminUserSchema>
