import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env'
import { pool } from './config/db'
import { errorHandler } from './middleware/errorHandler'

const app = express()

// ─── Middleware ──────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: env.CORS_ORIGINS.split(','),
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'))

// ─── Health check ────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV })
})

// ─── Routes ──────────────────────────────────────
// TODO: add routers here
// app.use('/api/v1/auth',     authRouter)
// app.use('/api/v1/products', productsRouter)
// app.use('/api/v1/orders',   ordersRouter)

// ─── Error handler ───────────────────────────────
app.use(errorHandler)

// ─── Start ───────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(`🚀 API running on http://localhost:${env.PORT}`)
  console.log(`   ENV: ${env.NODE_ENV}`)
})

// ─── Graceful shutdown ───────────────────────────
process.on('SIGTERM', async () => {
  await pool.end()
  process.exit(0)
})

export default app
