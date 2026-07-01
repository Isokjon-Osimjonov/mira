import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { env } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { requireAdmin } from './middleware/auth'
import { apiLimiter, speedLimiter } from './middleware/rateLimiter'
import { sanitizeInputs } from './middleware/sanitize'
import { logger } from './config/logger'
import { checkDbHealth, pool } from './config/db'
import { getRedis } from './config/redis'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { Queue } from 'bullmq'
import { notificationQueue, paymentDeadlineQueue, telegramPostQueue } from './config/queues'

// Routers
import authRouter from './modules/auth/auth.router'
import adminAuthRouter from './modules/admin/auth/admin-auth.router'
import { categoryRouter, categoryAdminRouter } from './modules/categories/categories.router'
import { productRouter, productAdminRouter } from './modules/products/products.router'
import inventoryRouter from './modules/inventory/inventory.router'
import uploadRouter from './modules/upload/upload.router'
import { settingsRouter, settingsAdminRouter } from './modules/settings/settings.router'
import { bannersRouter, bannersAdminRouter } from './modules/banners/banners.router'
import { cargoDatesRouter, cargoDatesAdminRouter } from './modules/cargo-dates/cargo-dates.router'
import {
  exchangeRateRouter,
  exchangeRateAdminRouter,
} from './modules/exchange-rates/exchange-rates.router'
import cartRouter from './modules/cart/cart.router'
import { couponsAdminRouter, couponsRouter } from './modules/coupons/coupons.router'
import ordersRouter from './modules/orders/orders.router'
import { ordersAdminRouter } from './modules/orders/orders-admin.router'
import pickPackRouter from './modules/pick-pack/pick-pack.router'
import { boxesRouter, boxesAdminRouter } from './modules/boxes/boxes.router'
import {
  korShippingRouter,
  korShippingAdminRouter,
} from './modules/kor-shipping/kor-shipping.router'
import wishlistRouter from './modules/wishlists/wishlists.router'
import waitlistRouter from './modules/waitlists/waitlists.router'
import notificationRouter from './modules/notifications/notifications.router'
import adminNotificationsRouter from './modules/admin-notifications/admin-notifications.router'
import rolesRouter from './modules/roles/roles.router'
import adminUsersRouter from './modules/admin-users/admin-users.router'
import adminRouter from './modules/admin/admin.router'
import customersRouter from './modules/customers/customers.router'
import suppliersRouter from './modules/suppliers/suppliers.router'
import purchaseOrdersRouter from './modules/purchase-orders/purchase-orders.router'
import { expCategoriesRouter, expensesRouter } from './modules/expenses/expenses.router'
import dashboardRouter from './modules/dashboard/dashboard.router'
import analyticsRouter from './modules/analytics/analytics.router'
import reportsRouter from './modules/reports/reports.router'
import telegramRouter from './modules/telegram/telegram.router'
import aiRouter from './modules/ai/ai.router'
import addressesRouter from './modules/addresses/addresses.router'
import customerAddressRouter from './modules/addresses/addresses-admin.router'

export function createApp() {
  const app = express()

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'https://res.cloudinary.com'],
          connectSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  )
  const isDev = process.env.NODE_ENV !== 'production'

  app.use(
    cors({
      origin: isDev
        ? (origin, callback) => {
            if (
              !origin ||
              /^http:\/\/(localhost|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+$/.test(origin)
            ) {
              return callback(null, true)
            }
            callback(new Error('Not allowed by CORS'))
          }
        : env.CORS_ORIGINS.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Type'],
    })
  )
  app.use(speedLimiter)
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))
  app.use(sanitizeInputs)
  app.use(cookieParser())

  // BigInt serialization
  ;(BigInt.prototype as any).toJSON = function () {
    return Number(this)
  }

  // Morgan → pino integration
  const morganStream = {
    write: (msg: string) => {
      const parts = msg.trim().split(' ')
      const method = parts[0]
      const url = parts[1]
      const status = parseInt(parts[2]) || 0
      const ms = parseFloat(parts[parts.length - 2]) || 0

      const logFn = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'

      logger[logFn]({ method, url, status, ms }, `${method} ${url} ${status} ${ms}ms`)
    },
  }

  if (env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
  } else {
    // Production: JSON structured
    app.use(
      morgan(':method :url :status :res[content-length] - :response-time ms', {
        stream: morganStream,
      })
    )
  }

  app.use('/api', apiLimiter)

  const QUEUE_NAMES = [
    'notifications',
    'payment-deadline',
    'telegram-posts',
    'sales-rollup',
    'db-backup',
    'exchange-rate',
  ]

  const getDetailedQueueStats = async () => {
    return await Promise.all(
      QUEUE_NAMES.map(async (name) => {
        try {
          const q = new Queue(name, { connection: getRedis() as any })
          const [waiting, active, completed, failed, delayed] = await Promise.all([
            q.getWaitingCount(),
            q.getActiveCount(),
            q.getCompletedCount(),
            q.getFailedCount(),
            q.getDelayedCount(),
          ])
          await q.close()
          return {
            name,
            waiting,
            active,
            completed,
            failed,
            delayed,
            status: failed > 0 ? 'warning' : 'ok',
          }
        } catch {
          return {
            name,
            status: 'unavailable',
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
          }
        }
      })
    )
  }

  // Simple health check for ELB/Docker
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }))

  // Enhanced Health check
  app.get('/api/v1/health', async (_req, res) => {
    const [dbOk, redisOk] = await Promise.all([
      checkDbHealth(),
      (async () => {
        const redis = getRedis()
        if (!redis) return 'disabled'
        try {
          const start = Date.now()
          await redis.ping()
          return `ok (${Date.now() - start}ms)`
        } catch {
          return 'down'
        }
      })(),
    ])

    const queueStats = await getDetailedQueueStats()
    const status = !dbOk ? 'down' : redisOk === 'down' ? 'degraded' : 'ok'

    res.status(status === 'down' ? 503 : 200).json({
      data: {
        status,
        version: 'v0.3.0',
        uptime: Math.floor(process.uptime()),
        env: env.NODE_ENV,
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: dbOk ? 'ok' : 'down',
            poolSize: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount,
          },
          redis: { status: redisOk },
          bullmq: {
            status: 'ok',
            queues: queueStats,
          },
          bot: { status: 'ok', username: env.BOT_USERNAME },
        },
      },
      error: null,
    })
  })

  app.get('/api/v1/admin/queues/stats', requireAdmin, async (req, res) => {
    try {
      const data = await getDetailedQueueStats()
      res.json({ data, error: null })
    } catch (e: any) {
      res.status(500).json({ data: null, error: { message: e.message, code: 'QUEUE_STATS_ERROR' } })
    }
  })

  // Bull Board
  const serverAdapter = new ExpressAdapter()
  serverAdapter.setBasePath('/admin/queues')

  createBullBoard({
    queues: [
      new BullMQAdapter(notificationQueue),
      new BullMQAdapter(paymentDeadlineQueue),
      new BullMQAdapter(telegramPostQueue),
    ],
    serverAdapter,
  })

  // Protected route — admin only
  app.use(
    '/admin/queues',
    (req, res, next) => {
      const token = req.headers['x-admin-key'] || req.query.key
      if (token !== env.ADMIN_QUEUE_KEY) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      next()
    },
    serverAdapter.getRouter()
  )

  // Auth routes
  app.use('/api/v1/auth', authRouter)
  app.use('/api/v1/admin/auth', adminAuthRouter)
  app.use('/api/v1/upload', uploadRouter)

  // Public Products & Categories
  app.use('/api/v1/categories', categoryRouter)
  app.use('/api/v1/products', productRouter)
  app.use('/api/v1/brands', (req, res, next) => {
    import('./modules/products/products.controller').then((ctrl) => ctrl.getBrands(req, res, next))
  })
  app.use('/api/v1/settings', settingsRouter)
  app.use('/api/v1/banners', bannersRouter)
  app.use('/api/v1/cargo-dates', cargoDatesRouter)
  app.use('/api/v1/exchange-rates', exchangeRateRouter)

  // Customer specific
  app.use('/api/v1/cart', cartRouter)
  app.use('/api/v1/coupons', couponsRouter)
  app.use('/api/v1/orders', ordersRouter)
  app.use('/api/v1/addresses', addressesRouter)
  app.use('/api/v1/wishlists', wishlistRouter)
  app.use('/api/v1/waitlists', waitlistRouter)
  app.use('/api/v1/notifications', notificationRouter)

  // Admin specific
  app.use('/api/v1/admin/categories', categoryAdminRouter)
  app.use('/api/v1/admin/products', productAdminRouter)
  app.use('/api/v1/admin/inventory', inventoryRouter)
  app.use('/api/v1/admin/upload', uploadRouter)
  app.use('/api/v1/admin/settings', settingsAdminRouter)
  app.use('/api/v1/admin/banners', bannersAdminRouter)
  app.use('/api/v1/admin/cargo-dates', cargoDatesAdminRouter)
  app.use('/api/v1/admin/exchange-rates', exchangeRateAdminRouter)
  app.use('/api/v1/admin/coupons', couponsAdminRouter)
  app.use('/api/v1/admin/orders', ordersAdminRouter)
  app.use('/api/v1/admin/orders', pickPackRouter)
  app.use('/api/v1/admin/boxes', boxesAdminRouter)
  app.use('/api/v1/admin/kor-shipping-tiers', korShippingAdminRouter)
  app.use('/api/v1/admin/roles', rolesRouter)
  app.use('/api/v1/admin/users', adminUsersRouter)
  app.use('/api/v1/admin', adminRouter)
  app.use('/api/v1/admin/customers', customersRouter)
  app.use('/api/v1/admin/customers', customerAddressRouter)
  app.use('/api/v1/admin/suppliers', suppliersRouter)
  app.use('/api/v1/admin/purchase-orders', purchaseOrdersRouter)
  app.use('/api/v1/admin/expense-categories', expCategoriesRouter)
  app.use('/api/v1/admin/expenses', expensesRouter)
  app.use('/api/v1/admin/dashboard', dashboardRouter)
  app.use('/api/v1/admin/analytics', analyticsRouter)
  app.use('/api/v1/admin/reports', reportsRouter)
  app.use('/api/v1/admin/notifications', adminNotificationsRouter)
  app.use('/api/v1/admin/telegram', telegramRouter)
  app.use('/api/v1/admin/ai', aiRouter)

  app.use('/api/v1/boxes', boxesRouter)
  app.use('/api/v1/kor-shipping-tiers', korShippingRouter)

  // 404
  app.use((_req, res) => {
    res.status(404).json({ data: null, error: { message: 'Route topilmadi', code: 'NOT_FOUND' } })
  })

  app.use(errorHandler)
  return app
}
