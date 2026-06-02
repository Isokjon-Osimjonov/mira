import type { Request, Response, NextFunction } from 'express'

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
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
  
  console.error('UNHANDLED ERROR:', {
    timestamp: new Date().toISOString(),
    path:      req.path,
    method:    req.method,
    error:     err.message,
    stack:     err.stack,
    body:      req.body ? '[hidden]' : undefined
  })

  return res.status(500).json({
    data: null,
    error: {
      message: isDev ? err.message : 'Ichki xatolik yuz berdi',
      code: 'INTERNAL_ERROR'
    }
  })
}
