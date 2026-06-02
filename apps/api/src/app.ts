import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { env } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { apiLimiter, speedLimiter } from './middleware/rateLimiter'
import { sanitizeInputs } from './middleware/sanitize'

// Routers
import authRouter from './modules/auth/auth.router'
import adminAuthRouter from './modules/admin/auth/admin-auth.router'
import { categoryRouter, categoryAdminRouter } from './modules/categories/categories.router'
import { productRouter, productAdminRouter } from './modules/products/products.router'
import inventoryRouter from './modules/inventory/inventory.router'
import uploadRouter from './modules/upload/upload.router'
import { settingsRouter, settingsAdminRouter } from './modules/settings/settings.router'
import {
  exchangeRateRouter,
  exchangeRateAdminRouter,
} from './modules/exchange-rates/exchange-rates.router'
import cartRouter from './modules/cart/cart.router'
import { couponsAdminRouter } from './modules/coupons/coupons.router'
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
import rolesRouter from './modules/roles/roles.router'
import adminUsersRouter from './modules/admin-users/admin-users.router'
import customersRouter from './modules/customers/customers.router'
import suppliersRouter from './modules/suppliers/suppliers.router'
import purchaseOrdersRouter from './modules/purchase-orders/purchase-orders.router'
import { expCategoriesRouter, expensesRouter } from './modules/expenses/expenses.router'
import dashboardRouter from './modules/dashboard/dashboard.router'
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
  app.use(
    cors({
      origin: env.CORS_ORIGINS.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
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
  app.use('/api/v1/auth', authRouter)
  app.use('/api/v1/admin/auth', adminAuthRouter)

  // Public Products & Categories
  app.use('/api/v1/categories', categoryRouter)
  app.use('/api/v1/products', productRouter)
  app.use('/api/v1/settings', settingsRouter)
  app.use('/api/v1/exchange-rates', exchangeRateRouter)

  // Customer specific
  app.use('/api/v1/cart', cartRouter)
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
  app.use('/api/v1/admin/exchange-rates', exchangeRateAdminRouter)
  app.use('/api/v1/admin/coupons', couponsAdminRouter)
  app.use('/api/v1/admin/orders', ordersAdminRouter)
  app.use('/api/v1/admin/orders', pickPackRouter)
  app.use('/api/v1/admin/boxes', boxesAdminRouter)
  app.use('/api/v1/admin/kor-shipping-tiers', korShippingAdminRouter)
  app.use('/api/v1/admin/roles', rolesRouter)
  app.use('/api/v1/admin/users', adminUsersRouter)
  app.use('/api/v1/admin/customers', customersRouter)
  app.use('/api/v1/admin/customers', customerAddressRouter)
  app.use('/api/v1/admin/suppliers', suppliersRouter)
  app.use('/api/v1/admin/purchase-orders', purchaseOrdersRouter)
  app.use('/api/v1/admin/expense-categories', expCategoriesRouter)
  app.use('/api/v1/admin/expenses', expensesRouter)
  app.use('/api/v1/admin/dashboard', dashboardRouter)
  app.use('/api/v1/admin/reports', reportsRouter)
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
