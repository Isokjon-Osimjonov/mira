import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { env } from './env'
import * as schema from '@mira/db'
import { dbLogger } from './logger'

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: env.DB_POOL_IDLE_MS,
  connectionTimeoutMillis: 5000,
  statement_timeout: env.DB_TIMEOUT_MS,
  application_name: 'mira-api',
})

pool.on('connect', () => {
  dbLogger.debug('New DB connection established')
})

pool.on('error', (err) => {
  dbLogger.error({ err: err.message }, 'DB pool error')
})

pool.on('remove', () => {
  dbLogger.debug('DB connection removed from pool')
})

export const db = drizzle(pool, { schema, logger: false })

// Health check function
export async function checkDbHealth(): Promise<boolean> {
  try {
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    return true
  } catch {
    return false
  }
}
