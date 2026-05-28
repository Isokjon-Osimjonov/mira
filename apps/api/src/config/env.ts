import { z } from 'zod'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

const envSchema = z.object({
  NODE_ENV:              z.enum(['development', 'production', 'test']).default('development'),
  PORT:                  z.string().default('4000').transform(Number),
  DATABASE_URL:          z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET:            z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET:    z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  BOT_TOKEN:             z.string().optional(),
  BOT_USERNAME:          z.string().default('mira_cosmetics_bot'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY:    z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  EXCHANGE_RATE_API_KEY: z.string().optional(),
  ADMIN_URL:             z.string().default('http://localhost:3000'),
  CORS_ORIGINS:          z.string().default('http://localhost:3000'),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
