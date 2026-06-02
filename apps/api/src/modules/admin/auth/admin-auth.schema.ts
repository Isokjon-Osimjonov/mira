import { z } from 'zod'

export const AdminLoginSchema = z.object({
  email: z.string().email("Email noto'g'ri"),
  password: z.string().min(6, 'Parol kamida 6 belgi'),
})

export const AdminChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Joriy parolni kiriting'),
    newPassword: z
      .string()
      .min(8, 'Yangi parol kamida 8 belgi')
      .regex(/(?=.*[A-Z])(?=.*[0-9])/, 'Kamida 1 ta katta harf va 1 ta raqam'),
    confirmPassword: z.string().min(1, 'Parolni tasdiqlang'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Parollar mos kelmadi',
    path: ['confirmPassword'],
  })

export type AdminLoginDto = z.infer<typeof AdminLoginSchema>
export type AdminChangePasswordDto = z.infer<typeof AdminChangePasswordSchema>
