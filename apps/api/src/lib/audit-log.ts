import { logger } from '../config/logger'

interface AuditEvent {
  type:
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'ACCOUNT_LOCKED'
    | 'OTP_REQUEST'
    | 'OTP_VERIFY'
    | 'ADMIN_ACTION'
    | 'SUSPICIOUS_ACTIVITY'
  userId?: string
  ip: string
  userAgent?: string
  details?: Record<string, unknown>
}

export function logSecurityEvent(event: AuditEvent): void {
  const entry = {
    timestamp: new Date().toISOString(),
    ...event,
  }
  // Console log for now (replace with file/monitoring later)
  logger.info(`[SECURITY] ${JSON.stringify(entry)}`)
}
