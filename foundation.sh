#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Mira Cosmetics — Foundation Layer Setup
# Creates: API types, axios instances, auth stores,
#          Socket.io, React Query, Cloudinary config
# Run from: ~/mira
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; NC='\033[0m'
step() { echo -e "\n${BLUE}[$1]${NC} $2"; }
ok()   { echo -e "   ${GREEN}✅${NC} $1"; }

echo -e "${BLUE}"
echo "  🏗️  Mira Foundation Layer Setup"
echo "  ================================="
echo -e "${NC}"

[[ ! -f ".env" ]] && { echo "❌ Run from ~/mira root"; exit 1; }

# ═══════════════════════════════════════════════════════════════
# 1. ADMIN ENV FILE
# ═══════════════════════════════════════════════════════════════
step 1 "Admin environment variables..."

cat > apps/admin/.env.local << 'EOF'
VITE_API_URL=http://localhost:4000/api/v1
VITE_SOCKET_URL=http://localhost:4000
VITE_CLOUDINARY_CLOUD_NAME=dumlctfe6
VITE_APP_NAME=Mira Cosmetics Admin
EOF
ok "apps/admin/.env.local"

# ═══════════════════════════════════════════════════════════════
# 2. SHARED TYPES — API ENVELOPE
# ═══════════════════════════════════════════════════════════════
step 2 "Shared API types..."

cat > libs/shared-types/src/api.ts << 'EOF'
// API Response Envelope — used by ALL endpoints
// Server MUST always return one of these two shapes

export interface ApiMeta {
  page:    number
  limit:   number
  total:   number
  hasNext: boolean
  hasPrev: boolean
}

export interface ApiSuccess<T> {
  data:   T
  error:  null
  meta?:  ApiMeta
}

export interface ApiErrorShape {
  data:  null
  error: {
    message:  string
    code?:    string    // 'UNAUTHORIZED' | 'NOT_FOUND' | 'RATE_LIMITED' | ...
    field?:   string    // for form field errors
    details?: Record<string, string[]>
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorShape

export interface PaginatedData<T> {
  items: T[]
  meta:  ApiMeta
}

// Type guards
export function isApiError<T>(
  res: ApiResponse<T>
): res is ApiErrorShape {
  return res.error !== null
}

export function isApiSuccess<T>(
  res: ApiResponse<T>
): res is ApiSuccess<T> {
  return res.error === null && res.data !== null
}

// Standard error codes
export const API_ERRORS = {
  UNAUTHORIZED:    'UNAUTHORIZED',
  FORBIDDEN:       'FORBIDDEN',
  NOT_FOUND:       'NOT_FOUND',
  VALIDATION:      'VALIDATION_ERROR',
  RATE_LIMITED:    'RATE_LIMITED',
  INTERNAL:        'INTERNAL_ERROR',
  INVALID_TOKEN:   'INVALID_TOKEN',
  TOKEN_EXPIRED:   'TOKEN_EXPIRED',
} as const

export type ApiErrorCode = typeof API_ERRORS[keyof typeof API_ERRORS]
EOF
ok "libs/shared-types/src/api.ts"

# Update shared-types index
cat >> libs/shared-types/src/index.ts << 'EOF'

export * from './api'
export * from './socket-events'
EOF
ok "libs/shared-types/src/index.ts updated"

# ═══════════════════════════════════════════════════════════════
# 3. SHARED UTILS — BASE AXIOS FACTORY
# ═══════════════════════════════════════════════════════════════
step 3 "Base axios factory..."

mkdir -p libs/shared-utils/src/api

cat > libs/shared-utils/src/api/create-client.ts << 'EOF'
// Base axios factory — DRY pattern
// Admin and Mobile both use this, passing their own token/refresh logic

import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosError,
} from 'axios'
// @ts-ignore — axios-auth-refresh types
import createAuthRefreshInterceptor from 'axios-auth-refresh'
import type { ApiErrorShape } from '@mira/shared-types'

export interface CreateClientOptions {
  baseURL:         string
  timeout?:        number
  getAccessToken:  () => string | null
  onRefresh:       (failedRequest: any) => Promise<void>
  onAuthFailure:   () => void
  withCredentials?: boolean   // true for admin (httpOnly cookie)
}

export function createApiClient(opts: CreateClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL:         opts.baseURL,
    timeout:         opts.timeout ?? 15_000,
    withCredentials: opts.withCredentials ?? false,
    headers: {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
    },
  })

  // ─── Request interceptor — inject access token ──────────────
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = opts.getAccessToken()
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  // ─── Response interceptor — normalize errors ────────────────
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiErrorShape>) => {
      // Normalize network errors to ApiErrorShape
      if (!error.response) {
        const netError: ApiErrorShape = {
          data:  null,
          error: {
            message: 'Tarmoq xatosi. Internet ulanishini tekshiring.',
            code:    'NETWORK_ERROR',
          },
        }
        return Promise.reject({ response: { data: netError, status: 0 } })
      }
      return Promise.reject(error)
    }
  )

  // ─── 401 interceptor — token refresh with queue ─────────────
  // axios-auth-refresh handles concurrent 401s automatically:
  // - Queues all failed requests
  // - Calls onRefresh ONCE
  // - Replays all queued requests after refresh
  createAuthRefreshInterceptor(client, opts.onRefresh, {
    statusCodes:                  [401],
    pauseInstanceWhileRefreshing: true,
    retryInstance:                client,
  })

  return client
}
EOF
ok "libs/shared-utils/src/api/create-client.ts"

cat >> libs/shared-utils/src/index.ts << 'EOF'

export * from './api/create-client'
EOF
ok "libs/shared-utils/src/index.ts updated"

# ═══════════════════════════════════════════════════════════════
# 4. API — ENV UPDATE
# ═══════════════════════════════════════════════════════════════
step 4 "Updating API env config..."

cat > apps/api/src/config/env.ts << 'EOF'
import { z } from 'zod'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

const envSchema = z.object({
  // ─── App ──────────────────────────────────────────────
  NODE_ENV:  z.enum(['development', 'production', 'test']).default('development'),
  PORT:      z.string().default('4000').transform(Number),
  APP_NAME:  z.string().default('Mira Cosmetics'),

  // ─── Database ─────────────────────────────────────────
  DATABASE_URL: z.string().min(1, 'DATABASE_URL required'),

  // ─── JWT ──────────────────────────────────────────────
  JWT_SECRET:         z.string().min(32, 'JWT_SECRET min 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET min 32 chars'),
  JWT_ACCESS_EXPIRES:  z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),

  // ─── Telegram ─────────────────────────────────────────
  BOT_TOKEN:           z.string().min(1, 'BOT_TOKEN required'),
  BOT_USERNAME:        z.string().default('mira_cosmetics_bot'),
  ADMIN_GROUP_CHAT_ID: z.string().min(1, 'ADMIN_GROUP_CHAT_ID required'),
  ADMIN_BOT_CHAT_ID:   z.string().optional(),

  // ─── Cloudinary ───────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME required'),
  CLOUDINARY_API_KEY:    z.string().min(1, 'CLOUDINARY_API_KEY required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET required'),

  // ─── Exchange Rate ─────────────────────────────────────
  EXCHANGE_RATE_API_KEY: z.string().optional(),
  EXCHANGE_RATE_API_URL: z.string().default('https://v6.exchangerate-api.com/v6'),

  // ─── Eskiz SMS ─────────────────────────────────────────
  ESKIZ_EMAIL:    z.string().optional(),
  ESKIZ_PASSWORD: z.string().optional(),

  // ─── CORS & Socket ─────────────────────────────────────
  ADMIN_URL:           z.string().default('http://localhost:3000'),
  CORS_ORIGINS:        z.string().default('http://localhost:3000'),
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
EOF
ok "apps/api/src/config/env.ts"

# ═══════════════════════════════════════════════════════════════
# 5. API — CLOUDINARY CONFIG
# ═══════════════════════════════════════════════════════════════
step 5 "Cloudinary signed upload config..."

cat > apps/api/src/config/cloudinary.ts << 'EOF'
import { v2 as cloudinary } from 'cloudinary'
import { env } from './env'

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key:    env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure:     true,
})

export { cloudinary }

// Folder strategy — all uploads go to organized subfolders
export const UPLOAD_FOLDERS = {
  products:  'mira/products',
  receipts:  'mira/receipts',
  expenses:  'mira/expenses',
  telegram:  'mira/telegram',
  profiles:  'mira/profiles',
} as const

export type UploadFolder = keyof typeof UPLOAD_FOLDERS

// Generate signed upload params — client uses these to upload directly
// Security: signature expires in 1 minute, only authenticated users can get it
export async function generateSignedUploadParams(folder: UploadFolder) {
  const timestamp = Math.round(Date.now() / 1000)
  const folderPath = UPLOAD_FOLDERS[folder]

  const paramsToSign = {
    timestamp,
    folder:     folderPath,
    // Product images: allow transformation
    ...(folder === 'products' && {
      transformation: 'q_auto,f_auto,w_1200',
    }),
  }

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    env.CLOUDINARY_API_SECRET
  )

  return {
    timestamp,
    signature,
    folder:    folderPath,
    apiKey:    env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
  }
}
EOF
ok "apps/api/src/config/cloudinary.ts"

# ═══════════════════════════════════════════════════════════════
# 6. API — RATE LIMITERS
# ═══════════════════════════════════════════════════════════════
step 6 "Rate limiters..."

cat > apps/api/src/middleware/rateLimiter.ts << 'EOF'
import rateLimit from 'express-rate-limit'

const json = (message: string, code: string) => ({
  data:  null,
  error: { message, code },
})

// Strict: OTP requests — 5 per 10 min per IP
export const authLimiter = rateLimit({
  windowMs:    10 * 60 * 1000,
  max:         5,
  standardHeaders: true,
  legacyHeaders:   false,
  message: json('Juda ko\'p urinish. 10 daqiqadan keyin qayta urinib ko\'ring.', 'RATE_LIMITED'),
})

// Standard: general API — 100 per minute per IP
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      100,
  message:  json('Juda ko\'p so\'rov.', 'RATE_LIMITED'),
})

// Upload: file uploads — 10 per minute per IP
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      10,
  message:  json('Upload limit reached.', 'RATE_LIMITED'),
})

// Admin: admin endpoints — 200 per minute
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      200,
  message:  json('Too many admin requests.', 'RATE_LIMITED'),
})
EOF
ok "apps/api/src/middleware/rateLimiter.ts"

# ═══════════════════════════════════════════════════════════════
# 7. API — AUTH MIDDLEWARE (full JWT + RBAC)
# ═══════════════════════════════════════════════════════════════
step 7 "Auth middleware (JWT + RBAC)..."

cat > apps/api/src/middleware/auth.ts << 'EOF'
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { db } from '../config/db'
import { rolePermissions, adminUsers } from '@mira/db'
import { eq, and } from 'drizzle-orm'

// ─── JWT Payload types ────────────────────────────────────────
export interface CustomerJwtPayload {
  sub:    string   // customer UUID
  type:   'customer'
  phone:  string
  region: 'UZB' | 'KOR'
  iat:    number
  exp:    number
}

export interface AdminJwtPayload {
  sub:            string  // admin_user UUID
  type:           'admin'
  email:          string
  roleId:         string | null
  isSuperAdmin:   boolean
  iat:            number
  exp:            number
}

export type JwtPayload = CustomerJwtPayload | AdminJwtPayload

// ─── Extend Express Request ───────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────
const unauthorized = (res: Response, message = 'Unauthorized') =>
  res.status(401).json({ data: null, error: { message, code: 'UNAUTHORIZED' } })

const forbidden = (res: Response, message = 'Forbidden') =>
  res.status(403).json({ data: null, error: { message, code: 'FORBIDDEN' } })

// ─── Middleware: require any valid JWT ────────────────────────
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return unauthorized(res)

  const token = header.slice(7)
  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    next()
  } catch (err: any) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
    res.status(401).json({ data: null, error: { message: 'Invalid token', code } })
  }
}

// ─── Middleware: require customer auth ────────────────────────
export function requireCustomer(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.type !== 'customer') return forbidden(res, 'Customer access only')
    next()
  })
}

// ─── Middleware: require any admin ────────────────────────────
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.type !== 'admin') return forbidden(res, 'Admin access only')
    next()
  })
}

// ─── Middleware: require super admin ─────────────────────────
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const user = req.user as AdminJwtPayload | undefined
    if (user?.type !== 'admin' || !user.isSuperAdmin) {
      return forbidden(res, 'Super admin access only')
    }
    next()
  })
}

// ─── Middleware: require specific permission ──────────────────
// Usage: requirePermission('products', 'write')
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authCheck = (cb: () => void) => requireAdmin(req, res, cb)

    authCheck(async () => {
      const user = req.user as AdminJwtPayload

      // Super admin bypasses all permission checks
      if (user.isSuperAdmin) return next()

      if (!user.roleId) return forbidden(res, `Missing permission: ${resource}:${action}`)

      // Check DB for this role's permission
      try {
        const [perm] = await db
          .select({ id: rolePermissions.id })
          .from(rolePermissions)
          .where(
            and(
              eq(rolePermissions.roleId, user.roleId),
              eq(rolePermissions.resource, resource),
              eq(rolePermissions.action, action)
            )
          )
          .limit(1)

        if (!perm) return forbidden(res, `Missing permission: ${resource}:${action}`)
        next()
      } catch {
        res.status(500).json({ data: null, error: { message: 'Permission check failed', code: 'INTERNAL_ERROR' } })
      }
    })
  }
}

// ─── JWT generators ───────────────────────────────────────────
export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as any,
  })
}

export function signRefreshToken(payload: Pick<JwtPayload, 'sub' | 'type'>) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES as any,
  })
}

export function verifyRefreshToken(token: string): Pick<JwtPayload, 'sub' | 'type'> {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as any
}
EOF
ok "apps/api/src/middleware/auth.ts"

# ═══════════════════════════════════════════════════════════════
# 8. API — SOCKET.IO SERVER
# ═══════════════════════════════════════════════════════════════
step 8 "Socket.io server setup..."

cat > apps/api/src/config/socket.ts << 'EOF'
import { Server, type Socket } from 'socket.io'
import type { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import { env } from './env'
import type {
  SocketEvents,
  ClientSocketEvents,
} from '@mira/shared-types'

// Typed Socket.io server
type MiraServer = Server<ClientSocketEvents, SocketEvents>
type MiraSocket = Socket<ClientSocketEvents, SocketEvents>

let _io: MiraServer | null = null

// ─── Auth middleware for Socket.io ───────────────────────────
function socketAuthMiddleware(socket: MiraSocket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token as string | undefined
  if (!token) return next(new Error('Authentication required'))

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as any
    if (payload.type !== 'admin') return next(new Error('Admin only'))
    ;(socket as any).adminId    = payload.sub
    ;(socket as any).adminEmail = payload.email
    next()
  } catch {
    next(new Error('Invalid token'))
  }
}

// ─── Init ────────────────────────────────────────────────────
export function initSocket(server: HttpServer): MiraServer {
  _io = new Server<ClientSocketEvents, SocketEvents>(server, {
    cors: {
      origin:      env.SOCKET_CORS_ORIGINS.split(','),
      credentials: true,
    },
    transports:         ['websocket', 'polling'],
    pingTimeout:        60_000,
    pingInterval:       25_000,
    upgradeTimeout:     30_000,
    allowUpgrades:      true,
  })

  _io.use(socketAuthMiddleware)

  _io.on('connection', (socket: MiraSocket) => {
    const adminId = (socket as any).adminId as string

    // Admin joins their room + shared admins room
    socket.join(`admin:${adminId}`)
    socket.join('admins')

    // Client events
    socket.on('admin:join', ({ adminId: id }) => {
      socket.join(`admin:${id}`)
    })

    socket.on('admin:leave', () => {
      socket.leave('admins')
    })

    socket.on('order:viewed', ({ orderId }) => {
      // Can mark notification as read etc.
    })

    socket.on('disconnect', () => {
      socket.leave('admins')
    })
  })

  return _io
}

// ─── Get instance ─────────────────────────────────────────────
export function getIO(): MiraServer {
  if (!_io) throw new Error('Socket.io not initialized — call initSocket first')
  return _io
}

// ─── Emit helpers — type-safe ─────────────────────────────────
export const emit = {
  // ── Orders ──────────────────────────────────────────────────
  orderNew: (data: SocketEvents['order:new']) =>
    getIO().to('admins').emit('order:new', data),

  orderStatusChanged: (data: SocketEvents['order:status_changed']) =>
    getIO().to('admins').emit('order:status_changed', data),

  orderAutoCanceled: (data: SocketEvents['order:auto_canceled']) =>
    getIO().to('admins').emit('order:auto_canceled', data),

  // ── Payments ────────────────────────────────────────────────
  paymentReceiptUploaded: (data: SocketEvents['payment:receipt_uploaded']) =>
    getIO().to('admins').emit('payment:receipt_uploaded', data),

  paymentConfirmed: (data: SocketEvents['payment:confirmed']) =>
    getIO().to('admins').emit('payment:confirmed', data),

  paymentRejected: (data: SocketEvents['payment:rejected']) =>
    getIO().to('admins').emit('payment:rejected', data),

  // ── Stock ───────────────────────────────────────────────────
  stockLow: (data: SocketEvents['stock:low']) =>
    getIO().to('admins').emit('stock:low', data),

  stockOut: (data: SocketEvents['stock:out']) =>
    getIO().to('admins').emit('stock:out', data),

  stockBack: (data: SocketEvents['stock:back']) =>
    getIO().to('admins').emit('stock:back', data),

  // ── Exchange rate ───────────────────────────────────────────
  exchangeRateUpdated: (data: SocketEvents['exchange_rate:updated']) =>
    getIO().to('admins').emit('exchange_rate:updated', data),

  // ── Notification badge count ────────────────────────────────
  notificationCount: (data: SocketEvents['notification:count']) =>
    getIO().to('admins').emit('notification:count', data),
}
EOF
ok "apps/api/src/config/socket.ts"

# ═══════════════════════════════════════════════════════════════
# 9. API — APP.TS (Express setup separated from main.ts)
# ═══════════════════════════════════════════════════════════════
step 9 "Express app setup..."

cat > apps/api/src/app.ts << 'EOF'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { env } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { apiLimiter } from './middleware/rateLimiter'

export function createApp() {
  const app = express()

  // ─── Security ──────────────────────────────────────────────
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }))
  app.use(cors({
    origin:      env.CORS_ORIGINS.split(','),
    credentials: true,   // allow httpOnly cookies
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))

  // ─── Parsing ───────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())  // parse httpOnly refresh token cookie

  // ─── Logging ───────────────────────────────────────────────
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'))

  // ─── Global rate limit ─────────────────────────────────────
  app.use('/api', apiLimiter)

  // ─── Health ────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      data: {
        status:  'ok',
        env:     env.NODE_ENV,
        version: process.env.npm_package_version ?? '0.1.0',
        uptime:  Math.round(process.uptime()),
      },
      error: null,
    })
  })

  // ─── Routes ────────────────────────────────────────────────
  // TODO: add routers as features are built
  // app.use('/api/v1/auth',      authRouter)
  // app.use('/api/v1/admin/auth', adminAuthRouter)
  // app.use('/api/v1/products',  productsRouter)
  // app.use('/api/v1/orders',    ordersRouter)
  // app.use('/api/v1/upload',    uploadRouter)

  // ─── 404 ───────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      data:  null,
      error: { message: 'Route not found', code: 'NOT_FOUND' },
    })
  })

  // ─── Error handler ─────────────────────────────────────────
  app.use(errorHandler)

  return app
}
EOF
ok "apps/api/src/app.ts"

# ─── Install cookie-parser ──────────────────────────────────────
cd apps/api && pnpm add cookie-parser @types/cookie-parser 2>/dev/null | tail -1
cd ../..
ok "cookie-parser installed"

# ═══════════════════════════════════════════════════════════════
# 10. API — MAIN.TS (refactored with Socket.io)
# ═══════════════════════════════════════════════════════════════
step 10 "Refactoring main.ts with Socket.io..."

cat > apps/api/src/main.ts << 'EOF'
import { createServer } from 'http'
import { createApp }    from './app'
import { initSocket }   from './config/socket'
import { pool }         from './config/db'
import { env }          from './config/env'

async function bootstrap() {
  const app        = createApp()
  const httpServer = createServer(app)

  // Init Socket.io (must be before listen)
  initSocket(httpServer)

  httpServer.listen(env.PORT, () => {
    console.log(`\n🚀 API:    http://localhost:${env.PORT}`)
    console.log(`🔌 Socket: ws://localhost:${env.PORT}`)
    console.log(`🌿 Env:    ${env.NODE_ENV}\n`)
  })

  // ─── Graceful shutdown ──────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down...`)
    await pool.end()
    httpServer.close(() => {
      console.log('✅ Server closed')
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))
}

bootstrap().catch((err) => {
  console.error('❌ Bootstrap failed:', err)
  process.exit(1)
})
EOF
ok "apps/api/src/main.ts"

# ═══════════════════════════════════════════════════════════════
# 11. ADMIN — AUTH STORE (Zustand + memory token)
# ═══════════════════════════════════════════════════════════════
step 11 "Admin auth store..."

mkdir -p apps/admin/src/lib apps/admin/src/hooks apps/admin/src/types

cat > apps/admin/src/lib/auth-store.ts << 'EOF'
import { create } from 'zustand'

// ─── Types ────────────────────────────────────────────────────
export interface AdminUser {
  id:           string
  email:        string
  fullName:     string
  isSuperAdmin: boolean
  role: {
    id:          string
    name:        string
    permissions: string[]   // ['products:read', 'orders:write', ...]
  } | null
}

interface AuthState {
  // ⚠️ Access token ONLY in memory — never localStorage
  accessToken:     string | null
  user:            AdminUser | null
  isAuthenticated: boolean
  isLoading:       boolean

  // Actions
  setAuth:    (token: string, user: AdminUser) => void
  setLoading: (loading: boolean) => void
  logout:     () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken:     null,
  user:            null,
  isAuthenticated: false,
  isLoading:       true,

  setAuth: (accessToken, user) =>
    set({ accessToken, user, isAuthenticated: true, isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),

  logout: () =>
    set({ accessToken: null, user: null, isAuthenticated: false, isLoading: false }),
}))

// ─── Permission helpers ───────────────────────────────────────
export function usePermission(resource: string, action: string): boolean {
  const user = useAuthStore((s) => s.user)
  if (!user) return false
  if (user.isSuperAdmin) return true
  return user.role?.permissions.includes(`${resource}:${action}`) ?? false
}

export function useIsSuperAdmin(): boolean {
  return useAuthStore((s) => s.user?.isSuperAdmin ?? false)
}

// Non-hook version (for axios interceptors outside React)
export const getAccessToken = () => useAuthStore.getState().accessToken
export const logoutUser     = () => useAuthStore.getState().logout()
EOF
ok "apps/admin/src/lib/auth-store.ts"

# ═══════════════════════════════════════════════════════════════
# 12. ADMIN — AXIOS INSTANCE
# ═══════════════════════════════════════════════════════════════
step 12 "Admin axios instance..."

cat > apps/admin/src/lib/api.ts << 'EOF'
// Admin API client
// - Access token: in memory (Zustand) — injected via interceptor
// - Refresh token: httpOnly cookie — sent automatically (withCredentials: true)
// - 401 handling: axios-auth-refresh queues concurrent requests automatically

import axios from 'axios'
// @ts-ignore
import createAuthRefreshInterceptor from 'axios-auth-refresh'
import { getAccessToken, logoutUser, useAuthStore } from './auth-store'
import type { ApiResponse } from '@mira/shared-types'

const BASE_URL = import.meta.env.VITE_API_URL as string

// ─── Axios instance ───────────────────────────────────────────
const api = axios.create({
  baseURL:         BASE_URL,
  timeout:         20_000,
  withCredentials: true,  // send httpOnly refresh token cookie
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
})

// ─── Request: inject access token ─────────────────────────────
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Refresh function (called once on 401) ────────────────────
// Cookie is sent automatically — no need to pass refresh token manually
const refreshAuthLogic = async (failedRequest: any): Promise<void> => {
  try {
    // withCredentials ensures httpOnly cookie is sent
    const res = await axios.post<ApiResponse<{ accessToken: string; user: any }>>(
      `${BASE_URL}/admin/auth/refresh`,
      {},
      { withCredentials: true }
    )

    if (res.data.data) {
      const { accessToken, user } = res.data.data
      useAuthStore.getState().setAuth(accessToken, user)
      failedRequest.config.headers.Authorization = `Bearer ${accessToken}`
      return Promise.resolve()
    }
    throw new Error('Refresh failed')
  } catch {
    logoutUser()
    window.location.href = '/login'
    return Promise.reject()
  }
}

// axios-auth-refresh handles:
// - Concurrent 401s (queue all, refresh once, replay all)
// - pauseInstanceWhileRefreshing prevents new requests during refresh
createAuthRefreshInterceptor(api, refreshAuthLogic, {
  statusCodes:                  [401],
  pauseInstanceWhileRefreshing: true,
  retryInstance:                api,
})

// ─── Response: normalize errors ───────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject({
        response: {
          data: {
            data:  null,
            error: {
              message: 'Tarmoq xatosi. Internet ulanishini tekshiring.',
              code:    'NETWORK_ERROR',
            },
          },
          status: 0,
        },
      })
    }
    return Promise.reject(error)
  }
)

export default api
EOF
ok "apps/admin/src/lib/api.ts"

# ═══════════════════════════════════════════════════════════════
# 13. ADMIN — SOCKET CLIENT
# ═══════════════════════════════════════════════════════════════
step 13 "Admin Socket.io client..."

cat > apps/admin/src/lib/socket.ts << 'EOF'
import { io, type Socket } from 'socket.io-client'
import type { SocketEvents, ClientSocketEvents } from '@mira/shared-types'
import { getAccessToken } from './auth-store'

type MiraAdminSocket = Socket<SocketEvents, ClientSocketEvents>

let socket: MiraAdminSocket | null = null

export function connectSocket(): MiraAdminSocket {
  if (socket?.connected) return socket

  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string

  socket = io(SOCKET_URL, {
    auth:             { token: getAccessToken() },
    transports:       ['websocket'],
    reconnection:     true,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 5_000,
    reconnectionAttempts: 10,
  }) as MiraAdminSocket

  socket.on('connect',    () => console.log('🔌 Socket connected'))
  socket.on('disconnect', (reason) => console.log('🔌 Socket disconnected:', reason))
  socket.on('connect_error', (err) => console.error('🔌 Socket error:', err.message))

  return socket
}

export function getSocket(): MiraAdminSocket | null {
  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}

// Type-safe event listener helper
export function onSocketEvent<K extends keyof SocketEvents>(
  event: K,
  handler: (data: SocketEvents[K]) => void
): () => void {
  const s = getSocket()
  if (!s) return () => {}

  s.on(event as any, handler as any)
  return () => s.off(event as any, handler as any)
}
EOF
ok "apps/admin/src/lib/socket.ts"

# ═══════════════════════════════════════════════════════════════
# 14. ADMIN — QUERY CLIENT (React Query + Socket invalidation)
# ═══════════════════════════════════════════════════════════════
step 14 "Admin React Query client..."

cat > apps/admin/src/lib/query-client.ts << 'EOF'
import { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:    1_000 * 60,        // 1 minute
      gcTime:       1_000 * 60 * 10,   // 10 minutes
      refetchOnWindowFocus: true,
      retry: (failureCount, error: any) => {
        // Don't retry auth errors
        const status = error?.response?.status
        if (status === 401 || status === 403 || status === 404) return false
        return failureCount < 2
      },
    },
    mutations: {
      onError: (error: any) => {
        const msg = error?.response?.data?.error?.message
          ?? error?.message
          ?? 'Xatolik yuz berdi'
        toast.error(msg)
      },
    },
  },
})

// ─── Socket-driven cache invalidation ────────────────────────
// Call these from your Socket event listeners to keep UI fresh

export const invalidate = {
  orders:    () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  order:     (id: string) => queryClient.invalidateQueries({ queryKey: ['orders', 'detail', id] }),
  inventory: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
  dashboard: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  customers: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  settings:  () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  rates:     () => queryClient.invalidateQueries({ queryKey: ['exchange-rates'] }),
}
EOF
ok "apps/admin/src/lib/query-client.ts"

# ═══════════════════════════════════════════════════════════════
# 15. ADMIN — QUERY KEYS FACTORY
# ═══════════════════════════════════════════════════════════════
step 15 "Admin React Query keys factory..."

cat > apps/admin/src/lib/query-keys.ts << 'EOF'
// Centralized query key factory
// Consistent keys prevent stale data bugs and enable precise invalidation

export const qk = {
  // ── Auth ──────────────────────────────────────────────────
  me: () => ['me'] as const,

  // ── Dashboard ─────────────────────────────────────────────
  dashboard: {
    summary:  () => ['dashboard', 'summary'] as const,
    salesChart: (period: string) => ['dashboard', 'sales-chart', period] as const,
    topProducts: () => ['dashboard', 'top-products'] as const,
  },

  // ── Products ──────────────────────────────────────────────
  products: {
    all:    () => ['products'] as const,
    list:   (filters: Record<string, unknown>) => ['products', 'list', filters] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },

  // ── Categories ────────────────────────────────────────────
  categories: {
    all:  () => ['categories'] as const,
    tree: () => ['categories', 'tree'] as const,
  },

  // ── Orders ────────────────────────────────────────────────
  orders: {
    all:    () => ['orders'] as const,
    list:   (filters: Record<string, unknown>) => ['orders', 'list', filters] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
    count:  (status: string) => ['orders', 'count', status] as const,
  },

  // ── Customers ─────────────────────────────────────────────
  customers: {
    all:    () => ['customers'] as const,
    list:   (filters: Record<string, unknown>) => ['customers', 'list', filters] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
  },

  // ── Inventory ─────────────────────────────────────────────
  inventory: {
    products: (filters: Record<string, unknown>) => ['inventory', 'products', filters] as const,
    batches:  (productId: string) => ['inventory', 'batches', productId] as const,
    movements:(batchId: string)   => ['inventory', 'movements', batchId] as const,
  },

  // ── Coupons ───────────────────────────────────────────────
  coupons: {
    all:    () => ['coupons'] as const,
    list:   (filters: Record<string, unknown>) => ['coupons', 'list', filters] as const,
    detail: (id: string) => ['coupons', 'detail', id] as const,
  },

  // ── Settings ──────────────────────────────────────────────
  settings:     { all: () => ['settings'] as const },
  exchangeRates: { list: () => ['exchange-rates'] as const },
  boxes:         { all:  () => ['boxes'] as const },

  // ── Admin users ───────────────────────────────────────────
  adminUsers: {
    all:    () => ['admin-users'] as const,
    detail: (id: string) => ['admin-users', 'detail', id] as const,
  },
  roles: { all: () => ['roles'] as const },

  // ── Analytics ─────────────────────────────────────────────
  analytics: {
    daily:   (date: string, region: string) => ['analytics', 'daily', date, region] as const,
    monthly: (month: string)                => ['analytics', 'monthly', month] as const,
  },

  // ── Telegram ──────────────────────────────────────────────
  telegram: {
    channels: () => ['telegram', 'channels'] as const,
    posts:    (filters: Record<string, unknown>) => ['telegram', 'posts', filters] as const,
  },

  // ── Expenses ──────────────────────────────────────────────
  expenses: {
    list:       (filters: Record<string, unknown>) => ['expenses', 'list', filters] as const,
    categories: () => ['expenses', 'categories'] as const,
  },
}
EOF
ok "apps/admin/src/lib/query-keys.ts"

# ═══════════════════════════════════════════════════════════════
# 16. MOBILE — AUTH STORE
# ═══════════════════════════════════════════════════════════════
step 16 "Mobile auth store (Zustand + SecureStore)..."

mkdir -p apps/mobile/src/lib apps/mobile/src/hooks

cat > apps/mobile/src/lib/auth-store.ts << 'EOF'
import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

const REFRESH_TOKEN_KEY = 'mira_refresh_token'

// ─── Types ────────────────────────────────────────────────────
export interface Customer {
  id:              string
  phone:           string
  phoneRegion:     'UZB' | 'KOR'
  firstName:       string
  lastName:        string | null
  telegramId:      number | null
  profileImageUrl: string | null
  referralCode:    string | null
  isVerified:      boolean
}

interface AuthState {
  accessToken:     string | null
  customer:        Customer | null
  isAuthenticated: boolean
  isLoading:       boolean   // true on app start while checking SecureStore

  // Actions
  setAuth:         (token: string, customer: Customer) => void
  setCustomer:     (customer: Customer) => void
  saveRefresh:     (token: string) => Promise<void>
  logout:          () => Promise<void>
  initialize:      () => Promise<void>
  getRefreshToken: () => Promise<string | null>
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken:     null,
  customer:        null,
  isAuthenticated: false,
  isLoading:       true,

  setAuth: (accessToken, customer) =>
    set({ accessToken, customer, isAuthenticated: true, isLoading: false }),

  setCustomer: (customer) => set({ customer }),

  saveRefresh: async (token) => {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token)
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
    set({ accessToken: null, customer: null, isAuthenticated: false, isLoading: false })
  },

  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),

  // Called on app start — check if refresh token exists
  initialize: async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
      if (!refreshToken) {
        set({ isLoading: false })
        return
      }
      // Refresh token exists — will be used by axios interceptor on first 401
      // We don't call refresh here to avoid unnecessary API calls on startup
      // The first API call will trigger refresh if access token is missing
      set({ isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },
}))

// Non-hook accessors for use outside React components (axios interceptors)
export const getAccessToken     = () => useAuthStore.getState().accessToken
export const getRefreshToken    = () => useAuthStore.getState().getRefreshToken()
export const saveRefreshToken   = (t: string) => useAuthStore.getState().saveRefresh(t)
export const logoutCustomer     = () => useAuthStore.getState().logout()
EOF
ok "apps/mobile/src/lib/auth-store.ts"

# ═══════════════════════════════════════════════════════════════
# 17. MOBILE — AXIOS INSTANCE
# ═══════════════════════════════════════════════════════════════
step 17 "Mobile axios instance..."

cat > apps/mobile/src/lib/api.ts << 'EOF'
// Mobile API client
// - Access token: in memory (Zustand)
// - Refresh token: expo-secure-store (encrypted, hardware-backed)
// - 401 handling: axios-auth-refresh with queue

import axios from 'axios'
// @ts-ignore
import createAuthRefreshInterceptor from 'axios-auth-refresh'
import {
  getAccessToken,
  getRefreshToken,
  saveRefreshToken,
  logoutCustomer,
  useAuthStore,
} from './auth-store'
import type { ApiResponse } from '@mira/shared-types'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL as string

// ─── Axios instance ───────────────────────────────────────────
const api = axios.create({
  baseURL:  BASE_URL,
  timeout:  20_000,
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
})

// ─── Request: inject access token ─────────────────────────────
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Refresh function ─────────────────────────────────────────
const refreshAuthLogic = async (failedRequest: any): Promise<void> => {
  try {
    const refreshToken = await getRefreshToken()
    if (!refreshToken) throw new Error('No refresh token stored')

    const res = await axios.post<ApiResponse<{
      accessToken:  string
      refreshToken: string
      customer:     any
    }>>(`${BASE_URL}/auth/refresh`, { refreshToken })

    if (res.data.data) {
      const { accessToken, refreshToken: newRefresh, customer } = res.data.data
      await saveRefreshToken(newRefresh)
      useAuthStore.getState().setAuth(accessToken, customer)
      failedRequest.config.headers.Authorization = `Bearer ${accessToken}`
      return Promise.resolve()
    }
    throw new Error('Refresh response invalid')
  } catch {
    await logoutCustomer()
    return Promise.reject()
  }
}

createAuthRefreshInterceptor(api, refreshAuthLogic, {
  statusCodes:                  [401],
  pauseInstanceWhileRefreshing: true,
  retryInstance:                api,
})

// ─── Response: normalize network errors ───────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject({
        response: {
          data: {
            data:  null,
            error: {
              message: 'Internet ulanishini tekshiring.',
              code:    'NETWORK_ERROR',
            },
          },
          status: 0,
        },
      })
    }
    return Promise.reject(error)
  }
)

export default api
EOF
ok "apps/mobile/src/lib/api.ts"

# ═══════════════════════════════════════════════════════════════
# 18. MOBILE — QUERY CLIENT
# ═══════════════════════════════════════════════════════════════
step 18 "Mobile React Query client..."

cat > apps/mobile/src/lib/query-client.ts << 'EOF'
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            1_000 * 60,      // 1 minute
      gcTime:               1_000 * 60 * 15, // 15 minutes
      refetchOnWindowFocus: false,           // RN: no window focus
      refetchOnReconnect:   true,            // refetch when internet back
      retry: (failureCount, error: any) => {
        const status = error?.response?.status
        if (status === 401 || status === 403 || status === 404) return false
        return failureCount < 2
      },
    },
    mutations: {
      retry: 0,
    },
  },
})
EOF
ok "apps/mobile/src/lib/query-client.ts"

# ═══════════════════════════════════════════════════════════════
# 19. VERIFY COMPILATION
# ═══════════════════════════════════════════════════════════════
step 19 "Verifying TypeScript compilation..."

echo ""
echo "  Checking API..."
if cd apps/api && npx tsc --noEmit 2>&1 | head -5; then
  ok "API TypeScript: PASS"
else
  echo "   ⚠️  API TypeScript has errors — check above"
fi
cd ../..

echo ""
echo "  Checking Admin..."
if cd apps/admin && npx tsc --noEmit 2>&1 | head -5; then
  ok "Admin TypeScript: PASS"
else
  echo "   ⚠️  Admin TypeScript has errors — check above"
fi
cd ../..

# ═══════════════════════════════════════════════════════════════
# DONE
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}  ✅ Foundation layer complete!${NC}"
echo ""
echo "  Created files:"
echo "  libs/shared-types/src/api.ts"
echo "  libs/shared-utils/src/api/create-client.ts"
echo "  apps/api/src/config/env.ts     (updated)"
echo "  apps/api/src/config/socket.ts"
echo "  apps/api/src/config/cloudinary.ts"
echo "  apps/api/src/middleware/auth.ts"
echo "  apps/api/src/middleware/rateLimiter.ts"
echo "  apps/api/src/app.ts"
echo "  apps/api/src/main.ts           (updated)"
echo "  apps/admin/.env.local"
echo "  apps/admin/src/lib/auth-store.ts"
echo "  apps/admin/src/lib/api.ts"
echo "  apps/admin/src/lib/socket.ts"
echo "  apps/admin/src/lib/query-client.ts"
echo "  apps/admin/src/lib/query-keys.ts"
echo "  apps/mobile/src/lib/auth-store.ts"
echo "  apps/mobile/src/lib/api.ts"
echo "  apps/mobile/src/lib/query-client.ts"
echo ""
echo "  Next: bash foundation.sh done"
echo "        → git commit"
echo "        → auth API yozish boshlaydi"
echo ""
