import { z } from 'zod'

export const AdminLoginSchema = z.object({
  email: z.string().email("Email noto'g'ri"),
  password: z.string().min(6, 'Parol kamida 6 belgi'),
})

export type AdminLoginDto = z.infer<typeof AdminLoginSchema>
