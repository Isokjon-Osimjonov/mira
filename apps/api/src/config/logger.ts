import pino from 'pino'
import { env } from './env'

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        // Production: JSON structured logs
        formatters: {
          level: (label) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
})

// Domain-specific child loggers
export const dbLogger = logger.child({ module: 'db' })
export const authLogger = logger.child({ module: 'auth' })
export const orderLogger = logger.child({ module: 'orders' })
export const botLogger = logger.child({ module: 'bot' })
export const queueLogger = logger.child({ module: 'queue' })
export const cacheLogger = logger.child({ module: 'cache' })
