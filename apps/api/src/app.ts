import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { env } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { apiLimiter } from './middleware/rateLimiter'

// Routers
import authRouter      from './modules/auth/auth.router'
import adminAuthRouter from './modules/admin/auth/admin-auth.router'

export function createApp() {
  const app = express()

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(cors({
    origin:      env.CORS_ORIGINS.split(','),
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'))
  app.use('/api', apiLimiter)

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      data: { status: 'ok', env: env.NODE_ENV, uptime: Math.round(process.uptime()) },
      error: null,
    })
  })

  // Auth routes
  app.use('/api/v1/auth',       authRouter)
  app.use('/api/v1/admin/auth', adminAuthRouter)

  // 404
  app.use((_req, res) => {
    res.status(404).json({ data: null, error: { message: 'Route topilmadi', code: 'NOT_FOUND' } })
  })

  app.use(errorHandler)
  return app
}
