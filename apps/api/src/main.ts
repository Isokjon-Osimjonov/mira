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
