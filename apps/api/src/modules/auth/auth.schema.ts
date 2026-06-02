import { z } from 'zod'

// Uzbekistan: +998 + 9 digits
// Korea:      +82  + 9-10 digits
const phoneRegex = /^(\+998\d{9}|\+82\d{9,10})$/

export const RequestOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Telefon raqam noto\'g\'ri. +998XXXXXXXXX yoki +82XXXXXXXXXX formatida kiriting'),
})

export const VerifyOtpSchema = z.object({
  token: z.string().length(64, 'Token noto\'g\'ri'),
  otp:   z.string().length(6, 'Kod 6 raqamdan iborat bo\'lishi kerak').regex(/^\d{6}$/),
})

export type RequestOtpDto = z.infer<typeof RequestOtpSchema>
export type VerifyOtpDto  = z.infer<typeof VerifyOtpSchema>
