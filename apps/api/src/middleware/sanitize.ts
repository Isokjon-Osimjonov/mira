import type { Request, Response, NextFunction } from 'express'
import { sanitizeHtml } from '../lib/sanitize'

// Fields that should be HTML sanitized
const SANITIZE_FIELDS = [
  'customerNote',
  'adminNote',
  'description',
  'notes',
  'reason',
  'refundNote',
  'note',
]

export function sanitizeInputs(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    for (const key of SANITIZE_FIELDS) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeHtml(req.body[key])
      }
    }
  }
  next()
}
