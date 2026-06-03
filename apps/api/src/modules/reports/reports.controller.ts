import type { Request, Response } from 'express'
import * as service from './reports.service'
import type { Period } from '../dashboard/dashboard.service'

export async function getPLReport(req: Request, res: Response) {
  try {
    const period = (req.query.period as Period) || 'this_month'
    const dateFrom = req.query.dateFrom as string
    const dateTo = req.query.dateTo as string

    const { workbook, filename } = await service.generatePLReport(period, dateFrom, dateTo)

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    await workbook.xlsx.write(res)
    res.end()
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getSalesReport(req: Request, res: Response) {
  try {
    const period = (req.query.period as Period) || 'this_month'
    const dateFrom = req.query.dateFrom as string
    const dateTo = req.query.dateTo as string

    const { workbook, filename } = await service.generateSalesReport(period, dateFrom, dateTo)

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    await workbook.xlsx.write(res)
    res.end()
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getTransactionsReport(req: Request, res: Response) {
  try {
    const period = (req.query.period as Period) || 'this_month'
    const dateFrom = req.query.dateFrom as string
    const dateTo = req.query.dateTo as string

    const { workbook, filename } = await service.generateTransactionsReport(
      period,
      dateFrom,
      dateTo
    )

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    await workbook.xlsx.write(res)
    res.end()
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getInventoryReport(_req: Request, res: Response) {
  try {
    const { workbook, filename } = await service.generateInventoryReport()

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    await workbook.xlsx.write(res)
    res.end()
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getCustomersReport(req: Request, res: Response) {
  try {
    const period = (req.query.period as Period) || 'this_month'
    const dateFrom = req.query.dateFrom as string
    const dateTo = req.query.dateTo as string

    const { workbook, filename } = await service.generateCustomersReport(period, dateFrom, dateTo)

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    await workbook.xlsx.write(res)
    res.end()
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getCouponsReport(req: Request, res: Response) {
  try {
    const period = (req.query.period as Period) || 'this_month'
    const dateFrom = req.query.dateFrom as string
    const dateTo = req.query.dateTo as string

    const { workbook, filename } = await service.generateCouponsReport(period, dateFrom, dateTo)

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    await workbook.xlsx.write(res)
    res.end()
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getExpensesReport(req: Request, res: Response) {
  try {
    const period = (req.query.period as Period) || 'this_month'
    const dateFrom = req.query.dateFrom as string
    const dateTo = req.query.dateTo as string

    const { workbook, filename } = await service.generateExpensesReport(period, dateFrom, dateTo)

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    await workbook.xlsx.write(res)
    res.end()
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}
