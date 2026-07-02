import { Request, Response, NextFunction } from 'express'
import * as service from './analytics.service'

export async function getOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const { from, to } = req.query as { from: string; to: string }
    const data = await service.getOverview(from, to)
    res.json({ data, error: null })
  } catch (err) {
    next(err)
  }
}

export async function getRevenue(req: Request, res: Response, next: NextFunction) {
  try {
    const { from, to, groupBy } = req.query as {
      from: string
      to: string
      groupBy: 'day' | 'week' | 'month'
    }
    const data = await service.getRevenue(from, to, groupBy || 'day')
    res.json({ data, error: null })
  } catch (err) {
    next(err)
  }
}

export async function getTopProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { from, to, limit } = req.query as { from: string; to: string; limit?: string }
    const data = await service.getTopProducts(from, to, limit ? parseInt(limit) : 10)
    res.json({ data, error: null })
  } catch (err) {
    next(err)
  }
}

export async function getPL(req: Request, res: Response, next: NextFunction) {
  try {
    const { from, to } = req.query as { from: string; to: string }
    if (!from || !to) throw { status: 400, message: 'from and to dates are required' }
    const data = await service.getPL(from, to)
    res.json({ data, error: null })
  } catch (err) {
    next(err)
  }
}

export async function getOrderFunnel(req: Request, res: Response, next: NextFunction) {
  try {
    const { from, to } = req.query as { from: string; to: string }
    const data = await service.getOrderFunnel(from, to)
    res.json({ data, error: null })
  } catch (err) {
    next(err)
  }
}

export async function getCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const { from, to } = req.query as { from: string; to: string }
    const data = await service.getCustomers(from, to)
    res.json({ data, error: null })
  } catch (err) {
    next(err)
  }
}

export async function getCouponStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { from, to } = req.query as { from: string; to: string }
    const data = await service.getCouponStats(from, to)
    res.json({ data, error: null })
  } catch (err) {
    next(err)
  }
}

export async function getCouponPerformance(req: Request, res: Response, next: NextFunction) {
  try {
    const { from, to } = req.query as { from: string; to: string }
    if (!from || !to) throw { status: 400, message: 'from and to dates are required' }
    const data = await service.getCouponPerformance(from, to)
    res.json({ data, error: null })
  } catch (err) {
    next(err)
  }
}

export async function exportCSV(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, from, to } = req.query as {
      type: 'pl' | 'orders' | 'products' | 'revenue' | 'inventory' | 'customers' | 'expenses'
      from: string
      to: string
    }
    const csv = await service.exportCSV(type, from, to)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename=${type}-${from}-${to}.csv`)
    res.status(200).send(csv)
  } catch (err) {
    next(err)
  }
}
