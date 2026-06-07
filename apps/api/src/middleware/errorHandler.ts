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

  const status = err.status ?? err.statusCode ?? 500
  const code = err.code ?? (err.name === 'ZodError' ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR')
  const message =
    err.name === 'ZodError'
      ? `Invalid input: ${err.errors?.[0]?.message}`
      : err.message ?? 'Ichki xatolik'

  // Structured logging
  if (status >= 500) {
    logger.error(
      {
        err: {
          message: err.message,
          code: err.code,
          stack: err.stack,
        },
        req: {
          method: req.method,
          path: req.path,
          params: req.params,
          query: req.query,
          userId: (req as any).user?.sub ?? null,
          ip: req.ip,
        },
        status,
      },
      `${req.method} ${req.path} → ${status} ERROR`
    )
  } else if (status >= 400) {
    logger.warn(
      {
        code,
        message,
        method: req.method,
        path: req.path,
        body: req.body,
        userId: (req as any).user?.sub ?? null,
        status,
      },
      `${req.method} ${req.path} → ${status} ${code}`
    )
  }

  // Mask 500 in production
  const clientMsg =
    status >= 500 && process.env.NODE_ENV === 'production' ? 'Ichki xatolik yuz berdi' : message

  return res.status(status).json({
    data: null,
    error: { message: clientMsg, code },
  })
}
