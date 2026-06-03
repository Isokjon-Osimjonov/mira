import type { Request, Response } from 'express'
import * as service from './dashboard.service'

export async function getOverview(req: Request, res: Response) {
  try {
    const period = (req.query.period as any) || '7d'
    const data = await service.getOverview(period)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getRevenue(req: Request, res: Response) {
  try {
    const period = (req.query.period as any) || '7d'
    const data = await service.getRevenue(period)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getOrdersByStatus(req: Request, res: Response) {
  try {
    const period = (req.query.period as any) || '7d'
    const data = await service.getOrdersByStatus(period)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getPL(req: Request, res: Response) {
  try {
    const period = (req.query.period as any) || '7d'
    const data = await service.getPL(period)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getTransactions(req: Request, res: Response) {
  try {
    const period = (req.query.period as service.Period) || 'this_month'
    const dateFrom = req.query.dateFrom as string
    const dateTo = req.query.dateTo as string
    const region = req.query.region as string
    const page = req.query.page ? Number(req.query.page) : 1
    const limit = req.query.limit ? Number(req.query.limit) : 20

    const result = await service.getTransactions({ period, dateFrom, dateTo, region, page, limit })

    const safeItems = result.items.map((i) => ({
      ...i,
      totalAmountKrw: Number(i.totalAmountKrw),
      totalAmountUzs: Number(i.totalAmountUzs),
      discountAmount: Number(i.discountAmount),
    }))

    const safeMeta = {
      ...result.meta,
      totalRevenueKrw: Number(result.meta.totalRevenueKrw),
      totalRevenueUzs: Number(result.meta.totalRevenueUzs),
    }

    return res.json({ data: safeItems, meta: safeMeta, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getProductPerformance(req: Request, res: Response) {
  try {
    const period = (req.query.period as service.Period) || 'this_month'
    const dateFrom = req.query.dateFrom as string
    const dateTo = req.query.dateTo as string
    const region = req.query.region as string
    const sort = req.query.sort as string
    const brand = req.query.brand as string
    const categoryId = req.query.categoryId as string

    const data = await service.getProductPerformance({
      period,
      dateFrom,
      dateTo,
      region,
      sort,
      brand,
      categoryId,
    })

    const safeData = data.map((i) => ({
      ...i,
      revenueKrw: Number(i.revenueKrw),
      cogsKrw: Number(i.cogsKrw),
      grossProfit: Number(i.grossProfit),
    }))

    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getBrandPerformance(req: Request, res: Response) {
  try {
    const period = (req.query.period as service.Period) || 'this_month'
    const dateFrom = req.query.dateFrom as string
    const dateTo = req.query.dateTo as string

    const data = await service.getBrandPerformance(period, dateFrom, dateTo)

    const safeData = data.map((i) => ({
      ...i,
      revenueKrw: Number(i.revenueKrw),
    }))

    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getInventoryHealth(_req: Request, res: Response) {
  try {
    const data = await service.getInventoryHealth()
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getCustomerAnalytics(req: Request, res: Response) {
  try {
    const period = (req.query.period as service.Period) || 'this_month'
    const dateFrom = req.query.dateFrom as string
    const dateTo = req.query.dateTo as string

    const data = await service.getCustomerAnalytics(period, dateFrom, dateTo)

    const safeData = {
      ...data,
      aovTrend: data.aovTrend.map((t) => ({ ...t, avgOrderValue: Number(t.avgOrderValue) })),
      topCustomers: data.topCustomers.map((c) => ({ ...c, totalSpent: Number(c.totalSpent) })),
    }

    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getCouponAnalytics(req: Request, res: Response) {
  try {
    const period = (req.query.period as service.Period) || 'this_month'
    const dateFrom = req.query.dateFrom as string
    const dateTo = req.query.dateTo as string

    const data = await service.getCouponAnalytics(period, dateFrom, dateTo)

    const safeData = {
      ...data,
      totalDiscountGiven: Number(data.totalDiscountGiven),
      avgDiscountPerOrder: Number(data.avgDiscountPerOrder),
      coupons: data.coupons.map((c) => ({
        ...c,
        totalDiscountGiven: Number(c.totalDiscountGiven),
        revenueGenerated: Number(c.revenueGenerated),
      })),
    }

    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getCashFlow(req: Request, res: Response) {
  try {
    const period = (req.query.period as service.Period) || 'this_month'
    const dateFrom = req.query.dateFrom as string
    const dateTo = req.query.dateTo as string

    const data = await service.getCashFlow(period, dateFrom, dateTo)

    const safeData = {
      ...data,
      cashIn: {
        ...data.cashIn,
        fromOrders: Number(data.cashIn.fromOrders),
        total: Number(data.cashIn.total),
      },
      cashOut: {
        ...data.cashOut,
        generalExpenses: Number(data.cashOut.generalExpenses),
        purchaseOrders: Number(data.cashOut.purchaseOrders),
        total: Number(data.cashOut.total),
      },
      netCashFlow: Number(data.netCashFlow),
      byMonth: data.byMonth.map((m: any) => ({
        ...m,
        cashIn: Number(m.cashIn),
        cashOut: Number(m.cashOut),
        net: Number(m.net),
      })),
    }

    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getAdminPerformance(req: Request, res: Response) {
  try {
    const period = (req.query.period as service.Period) || 'this_month'
    const dateFrom = req.query.dateFrom as string
    const dateTo = req.query.dateTo as string

    const data = await service.getAdminPerformance(period, dateFrom, dateTo)

    const safeData = data.map((r) => ({
      ...r,
      revenueConfirmed: Number(r.revenueConfirmed),
    }))

    return res.json({ data: safeData, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}
