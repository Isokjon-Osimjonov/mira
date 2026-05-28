import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '@mira/db'
import { env } from './env'

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export const db = drizzle(pool, { schema })

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err)
  process.exit(1)
})
