import { z } from 'zod'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

const envSchema = z.object({
  // ─── App ──────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000').transform(Number),
  APP_NAME: z.string().default('Mira Cosmetics'),

  // ─── Database ─────────────────────────────────────────
  DATABASE_URL: z.string().min(1, 'DATABASE_URL required'),

  // ─── JWT ──────────────────────────────────────────────
  JWT_SECRET: z.string().min(32, 'JWT_SECRET min 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET min 32 chars'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  // ─── Telegram ─────────────────────────────────────────
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN required'),
  BOT_USERNAME: z.string().default('mira_cosmetics_bot'),
  ADMIN_GROUP_CHAT_ID: z.string().min(1, 'ADMIN_GROUP_CHAT_ID required'),
  ADMIN_BOT_CHAT_ID: z.string().optional(),

  // ─── Cloudinary ───────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET required'),

  // ─── Exchange Rate ─────────────────────────────────────
  EXCHANGE_RATE_API_KEY: z.string().optional(),
  EXCHANGE_RATE_API_URL: z.string().default('https://v6.exchangerate-api.com/v6'),

  // ─── AI ────────────────────────────────────────────────
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY required'),

  // ─── Juso API ──────────────────────────────────────────
  JUSO_API_KEY: z.string().default('TESTJUSOGOKR'),

  // ─── Eskiz SMS ─────────────────────────────────────────
  ESKIZ_EMAIL: z.string().optional(),
  ESKIZ_PASSWORD: z.string().optional(),

  // ─── CORS & Socket ─────────────────────────────────────
  ADMIN_URL: z.string().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  SOCKET_CORS_ORIGINS: z.string().default('http://localhost:3000'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('\n❌ Invalid environment variables:')
  const errors = parsed.error.flatten().fieldErrors
  Object.entries(errors).forEach(([k, v]) => {
    console.error(`   ${k}: ${v?.join(', ')}`)
  })
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof parsed.data
