import Redis from 'ioredis'
import { env } from './env'
import { logger } from './logger'

let redisClient: Redis | null = null

export function getRedis(): Redis | null {
  return redisClient
}

export async function connectRedis(): Promise<void> {
  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 5000,
      lazyConnect: true,
    })

    redisClient.on('error', (err) => {
      logger.warn({ err: err.message }, 'Redis error (degraded mode)')
    })

    redisClient.on('connect', () => {
      logger.info('Redis connected')
    })

    await redisClient.connect()
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Redis unavailable — continuing without cache')
    redisClient = null
  }
}
