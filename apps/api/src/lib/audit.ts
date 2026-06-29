import { db } from '../config/db'
import { adminAuditLogs } from '@mira/db'
import { logger } from '../config/logger'

export async function logAudit(params: {
  adminId?: string
  adminName?: string
  action: string
  entityType?: string
  entityId?: string
  oldValue?: any
  newValue?: any
  ip?: string
}) {
  try {
    await db.insert(adminAuditLogs).values({
      adminId: params.adminId,
      adminName: params.adminName,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValue: params.oldValue,
      newValue: params.newValue,
      ipAddress: params.ip,
    })
  } catch (err) {
    // Never crash on audit failure
    logger.warn({ err }, 'Audit log failed')
  }
}
