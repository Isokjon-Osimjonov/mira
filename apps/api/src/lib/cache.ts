import { getRedis } from '../config/redis'
import { cacheLogger } from '../config/logger'

export const CACHE_TTL = {
  SETTINGS: 5 * 60, // 5 minutes
  EXCHANGE_RATE: 5 * 60, // 5 minutes
  CATEGORIES: 30 * 60, // 30 minutes
  BRANDS: 30 * 60, // 30 minutes
  KOR_SHIPPING: 60 * 60, // 1 hour
  BOXES: 60 * 60, // 1 hour
} as const

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis()
  if (!redis) return null
  try {
    const val = await redis.get(key)
    if (!val) return null
    cacheLogger.debug({ key }, 'Cache hit')
    return JSON.parse(val) as T
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value))
    cacheLogger.debug({ key, ttl: ttlSeconds }, 'Cache set')
  } catch {}
}

export async function cacheDelete(...keys: string[]): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.del(...keys)
    cacheLogger.debug({ keys }, 'Cache invalidated')
  } catch {}
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) await redis.del(...keys)
  } catch {}
}
