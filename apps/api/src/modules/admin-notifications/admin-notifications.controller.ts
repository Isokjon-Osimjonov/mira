import type { Request, Response } from 'express'
import * as service from './admin-notifications.service'

const ok = <T>(res: Response, data: T) => res.json({ data, error: null })
const err = (res: Response, status: number, message: string) =>
  res.status(status).json({ data: null, error: { message } })

export async function getNotifications(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20
    const data = await service.getNotifications(limit)
    return ok(res, data)
  } catch (e: any) {
    return err(res, 500, e.message)
  }
}

export async function getUnreadCount(req: Request, res: Response) {
  try {
    const count = await service.getUnreadCount()
    return ok(res, { count })
  } catch (e: any) {
    return err(res, 500, e.message)
  }
}

export async function markAllRead(req: Request, res: Response) {
  try {
    await service.markAllRead()
    return ok(res, { success: true })
  } catch (e: any) {
    return err(res, 500, e.message)
  }
}

export async function clearAll(req: Request, res: Response) {
  try {
    await service.clearAll()
    return ok(res, { success: true })
  } catch (e: any) {
    return err(res, 500, e.message)
  }
}
