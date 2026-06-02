import type { Request, Response, NextFunction } from 'express'

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack)
  res.status(500).json({
    data: null,
    error: { message: err.message || 'Internal server error' },
  })
}
