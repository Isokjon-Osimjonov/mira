import type { Request, Response } from 'express'
import * as service from './notifications.service'
import { z } from 'zod'

export async function getNotifications(req: Request, res: Response) {
  try {
    const customerId = (req.user as any).sub
    const page = req.query.page ? Number(req.query.page) : undefined
    const limit = req.query.limit ? Number(req.query.limit) : undefined
    const unreadOnly = req.query.unreadOnly === 'true'

    const result = await service.getNotifications(customerId, { page, limit, unreadOnly })
    return res.json({
      data: result.items,
      unreadCount: result.unreadCount,
      meta: result.meta,
      error: null,
    })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getUnreadCount(req: Request, res: Response) {
  try {
    const customerId = (req.user as any).sub
    const count = await service.getUnreadCount(customerId)
    return res.json({ data: { count }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function markAsRead(req: Request, res: Response) {
  try {
    const customerId = (req.user as any).sub
    const notificationId = req.params.id
    await service.markAsRead(customerId, notificationId)
    return res.json({ data: { success: true }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function markAllAsRead(req: Request, res: Response) {
  try {
    const customerId = (req.user as any).sub
    await service.markAllAsRead(customerId)
    return res.json({ data: { success: true }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function adminSendNotification(req: Request, res: Response) {
  try {
    const schema = z.object({
      customerIds: z.array(z.string().uuid()).optional(),
      type: z.enum(['PROMO', 'SYSTEM']),
      title: z.string().min(1),
      body: z.string().min(1),
      channel: z.enum(['PUSH', 'TELEGRAM', 'BOTH']),
    })
    const validated = schema.parse(req.body)
    const result = await service.sendManualNotification(validated)
    return res.json({ data: result, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res
        .status(400)
        .json({ data: null, error: { message: "Ma'lumotlar noto'g'ri", code: 'VALIDATION_ERROR' } })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}
