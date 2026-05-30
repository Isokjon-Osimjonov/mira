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
