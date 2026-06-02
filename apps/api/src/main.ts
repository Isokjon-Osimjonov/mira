import { createServer } from 'http'
import { createApp }   from './app'
import { initSocket }  from './config/socket'
import { pool }        from './config/db'
import { env }         from './config/env'
import { startBot }    from './bot/bot'
import { initCronJobs } from './config/cron'

async function bootstrap() {
  const app        = createApp()
  const httpServer = createServer(app)

  initSocket(httpServer)

  // Start Telegram bot (non-blocking)
  startBot().catch((err) => {
    console.error('Bot start failed:', err.message)
  })

  initCronJobs()

  httpServer.listen(env.PORT, () => {
    console.log(`\n🚀 API:    http://localhost:${env.PORT}`)
    console.log(`🔌 Socket: ws://localhost:${env.PORT}`)
    console.log(`🤖 Bot:    @${env.BOT_USERNAME}`)
    console.log(`🌿 Env:    ${env.NODE_ENV}\n`)
  })

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} — shutting down...`)
    await pool.end()
    httpServer.close(() => process.exit(0))
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))
}

bootstrap().catch((err) => {
  console.error('❌ Bootstrap failed:', err)
  process.exit(1)
})
