import type { Request, Response, NextFunction } from 'express'
import * as Sentry from '@sentry/node'
import { logger } from '../config/logger'

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  // Capture in Sentry (if configured)
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, {
      user: (req as any).user ? { id: (req as any).user.sub } : undefined,
      tags: { path: req.path, method: req.method },
    })
  }

  // Known business errors (thrown with status/code)
  if (err.status && err.code) {
    return res.status(err.status).json({
      data: null,
      error: { message: err.message, code: err.code }
    })
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      data: null,
      error: {
        message: `Invalid input: ${err.errors?.[0]?.message}`,
        code: 'VALIDATION_ERROR'
      }
    })
  }

  // Unknown errors
  const isDev = process.env.NODE_ENV === 'development'
  
  logger.error({
    path:      req.path,
    method:    req.method,
    err:       err.message,
    stack:     err.stack,
    body:      req.body ? '[hidden]' : undefined
  }, 'UNHANDLED ERROR')

  return res.status(500).json({
    data: null,
    error: {
      message: isDev ? err.message : 'Ichki xatolik yuz berdi',
      code: 'INTERNAL_ERROR'
    }
  })
}
