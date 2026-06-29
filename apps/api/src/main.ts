import * as Sentry from '@sentry/node'
import { env } from './config/env'
import { logger } from './config/logger'

// Initialize Sentry first
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [Sentry.httpIntegration(), Sentry.expressIntegration()],
  })
  logger.info('Sentry error monitoring enabled')
}

import { createServer } from 'http'
import { createApp } from './app'
import { initSocket } from './config/socket'
import { pool } from './config/db'
import { startBot } from './bot/bot'
import { initCronJobs } from './config/cron'
import { connectRedis, getRedis } from './config/redis'
import {
  initQueues,
  notificationWorker,
  paymentDeadlineWorker,
  telegramPostWorker,
} from './config/queues'

async function bootstrap() {
  const app = createApp()

  if (env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app)
  }

  // 2. Connect DB (required)
  await pool.connect().then((c) => {
    c.release()
  })
  logger.info('Database pool ready')

  // 3. Connect Redis (optional)
  await connectRedis()

  // 4. Init Socket.io
  const httpServer = createServer(app)
  initSocket(httpServer)

  // 5. Init Grammy bot
  startBot().catch((err) => logger.error({ err: err.message }, 'Bot start failed'))

  // 6. Init BullMQ queues (after Redis)
  initQueues()

  // 7. Init cron jobs
  initCronJobs()

  // 8. Start server
  httpServer.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
        version: 'v0.3.1-dev',
      },
      '🚀 Mira API started'
    )
  })

  // 9. Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`)
    await Promise.all([
      pool.end(),
      getRedis()?.quit(),
      notificationWorker.close(),
      paymentDeadlineWorker.close(),
      telegramPostWorker.close(),
    ])
    httpServer.close(() => process.exit(0))
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

bootstrap().catch((err) => {
  logger.fatal({ err: err.message }, 'Fatal startup error')
  process.exit(1)
})
