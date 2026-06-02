import { db } from '../../config/db'
import {
  orders,
  orderItems,
  products,
  categories,
  customers,
  coupons,
  couponRedemptions,
  inventoryBatches,
  exchangeRateSnapshots,
  expenses,
  expenseCategories,
  purchaseOrders,
  dailySalesSummary,
  adminUsers,
  settings,
} from '@mira/db'
import {
  eq,
  and,
  sql,
  desc,
  asc,
  sum,
  count,
  isNull,
  gte,
  lte,
  or,
  inArray,
  countDistinct,
  avg,
} from 'drizzle-orm'

// ─── Local Date Helpers ──────────────────────────────────────────────────

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function subDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - days)
  return d
}

function subWeeks(date: Date, weeks: number): Date {
  return subDays(date, weeks * 7)
}

function subMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() - months)
  return d
}

function startOfWeek(date: Date, options?: { weekStartsOn: number }): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day < (options?.weekStartsOn || 0) ? 7 : 0) + day - (options?.weekStartsOn || 0)
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfWeek(date: Date, options?: { weekStartsOn: number }): Date {
  const d = startOfWeek(date, options)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

function startOfMonth(date: Date): Date {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  d.setHours(23, 59, 59, 999)
  return d
}

function startOfYear(date: Date): Date {
  const d = new Date(date.getFullYear(), 0, 1)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfYear(date: Date): Date {
  const d = new Date(date.getFullYear(), 11, 31)
  d.setHours(23, 59, 59, 999)
  return d
}

function diffInDays(date1: Date, date2: Date): number {
  return Math.abs(Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24)))
}

function format(date: Date, formatStr: string): string {
  if (formatStr !== 'yyyy-MM-dd') return date.toISOString()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export type Period =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom'

export const REVENUE_STATUSES = ['PAYMENT_CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED']

// ─── Helpers ─────────────────────────────────────────────────────────────

export function getPeriodDates(period: Period, dateFrom?: string, dateTo?: string) {
  const now = new Date()
  let startDate: Date
  let endDate: Date

  switch (period) {
    case 'today':
      startDate = startOfDay(now)
      endDate = endOfDay(now)
      break
    case 'yesterday':
      const yest = subDays(now, 1)
      startDate = startOfDay(yest)
      endDate = endOfDay(yest)
      break
    case 'this_week':
      startDate = startOfWeek(now, { weekStartsOn: 1 }) // Monday
      endDate = endOfWeek(now, { weekStartsOn: 1 })
      break
    case 'last_week':
      const lastWeek = subWeeks(now, 1)
      startDate = startOfWeek(lastWeek, { weekStartsOn: 1 })
      endDate = endOfWeek(lastWeek, { weekStartsOn: 1 })
      break
    case 'this_month':
      startDate = startOfMonth(now)
      endDate = endOfMonth(now)
      break
    case 'last_month':
      const lastMonth = subMonths(now, 1)
      startDate = startOfMonth(lastMonth)
      endDate = endOfMonth(lastMonth)
      break
    case 'this_year':
      startDate = startOfYear(now)
      endDate = endOfYear(now)
      break
    case 'custom':
      if (!dateFrom || !dateTo)
        throw { status: 400, message: 'Custom period requires dateFrom and dateTo' }
      startDate = startOfDay(new Date(dateFrom))
      endDate = endOfDay(new Date(dateTo))
      break
    default:
      startDate = startOfMonth(now)
      endDate = endOfMonth(now)
  }

  return { startDate, endDate }
}

function getPreviousPeriodDates(startDate: Date, endDate: Date) {
  const duration = endDate.getTime() - startDate.getTime()
  const prevEndDate = new Date(startDate.getTime() - 1)
  const prevStartDate = new Date(prevEndDate.getTime() - duration)
  return { startDate: prevStartDate, endDate: prevEndDate }
}

// ─── Overview ────────────────────────────────────────────────────────────

export async function getOverview(period: Period, dateFrom?: string, dateTo?: string) {
  const { startDate, endDate } = getPeriodDates(period, dateFrom, dateTo)

  // 1. Revenue & Orders
  const [revenueStats] = await db
    .select({
      gross: sql<string>`COALESCE(SUM(${orders.totalAmount}), '0')`,
      refunds: sql<string>`COALESCE(SUM(${orders.refundAmount}), '0')`,
      total: count(orders.id),
    })
    .from(orders)
    .where(
      and(
        gte(orders.paymentConfirmedAt, startDate),
        lte(orders.paymentConfirmedAt, endDate),
        sql`${orders.status} IN ('PAYMENT_CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED')`
      )
    )

  const grossRevenue = BigInt(revenueStats.gross || '0')
  const totalRefunds = BigInt(revenueStats.refunds || '0')
  const netRevenue = grossRevenue - totalRefunds

  const [orderStatusCounts] = await db
    .select({
      pending: sql<string>`COUNT(*) FILTER (WHERE ${orders.status} IN ('PENDING_PAYMENT', 'PAYMENT_REJECTED'))`,
      processing: sql<string>`COUNT(*) FILTER (WHERE ${orders.status} IN ('PAYMENT_SUBMITTED', 'PAYMENT_CONFIRMED', 'PACKING'))`,
      shipping: sql<string>`COUNT(*) FILTER (WHERE ${orders.status} = 'SHIPPED')`,
      delivered: sql<string>`COUNT(*) FILTER (WHERE ${orders.status} = 'DELIVERED')`,
      canceled: sql<string>`COUNT(*) FILTER (WHERE ${orders.status} = 'CANCELED')`,
      refunded: sql<string>`COUNT(*) FILTER (WHERE ${orders.status} = 'REFUNDED')`,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, startDate), lte(orders.createdAt, endDate)))

  // 2. Customers
  const [totalCustomers] = await db
    .select({ count: count() })
    .from(customers)
    .where(and(eq(customers.isActive, true), isNull(customers.deletedAt)))
  const [newCustomers] = await db
    .select({ count: count() })
    .from(customers)
    .where(and(gte(customers.createdAt, startDate), lte(customers.createdAt, endDate)))

  const returningCountRes = await db.execute(sql`
    SELECT COUNT(*) as count FROM (
      SELECT customer_id FROM orders 
      WHERE status IN ('PAYMENT_CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED')
      GROUP BY customer_id HAVING COUNT(*) >= 2
    ) as sub
  `)
  const returningCount = Number(
    (returningCountRes as any).rows?.[0]?.count || (returningCountRes as any)[0]?.count || 0
  )

  // 3. Profit & Expenses
  const [summaryData] = await db
    .select({
      revenue: sql<string>`SUM(${dailySalesSummary.revenueKrw})`,
      cogs: sql<string>`SUM(${dailySalesSummary.cogsKrw})`,
    })
    .from(dailySalesSummary)
    .where(
      and(
        gte(dailySalesSummary.date, format(startDate, 'yyyy-MM-dd')),
        lte(dailySalesSummary.date, format(endDate, 'yyyy-MM-dd'))
      )
    )

  const [expensesTotal] = await db
    .select({ total: sql<string>`SUM(${expenses.amountKrw})` })
    .from(expenses)
    .where(
      and(
        gte(expenses.expenseDate, format(startDate, 'yyyy-MM-dd')),
        lte(expenses.expenseDate, format(endDate, 'yyyy-MM-dd'))
      )
    )

  const cogs = BigInt(summaryData?.cogs || '0')
  const grossProfit = netRevenue - cogs
  const grossMarginPct = netRevenue > 0n ? Number((grossProfit * 10000n) / netRevenue) / 100 : 0

  const generalExpenses = BigInt(expensesTotal?.total || '0')
  const netProfit = grossProfit - generalExpenses
  const netMarginPct = netRevenue > 0n ? Number((netProfit * 10000n) / netRevenue) / 100 : 0

  // 4. Pending Payments
  const [pendingPayments] = await db
    .select({
      count: count(),
      totalAmount: sql<string>`SUM(${orders.totalAmount})`,
    })
    .from(orders)
    .where(eq(orders.status, 'PAYMENT_SUBMITTED'))

  // 5. Inventory Value
  const [inventoryValue] = await db
    .select({
      value: sql<string>`SUM(${inventoryBatches.costPrice} * ${inventoryBatches.currentQty})`,
    })
    .from(inventoryBatches)

  return {
    revenue: {
      gross: grossRevenue,
      refunds: totalRefunds,
      net: netRevenue,
    },
    orders: {
      total: Number(revenueStats.total || 0),
      pending: Number(orderStatusCounts.pending || 0),
      processing: Number(orderStatusCounts.processing || 0),
      shipping: Number(orderStatusCounts.shipping || 0),
      delivered: Number(orderStatusCounts.delivered || 0),
      canceled: Number(orderStatusCounts.canceled || 0),
      refunded: Number(orderStatusCounts.refunded || 0),
    },
    customers: {
      total: Number(totalCustomers?.count || 0),
      new: Number(newCustomers?.count || 0),
      returning: returningCount,
    },
    profit: {
      cogs,
      grossProfit,
      grossMarginPct,
      expenses: generalExpenses,
      netProfit,
      netMarginPct,
    },
    pendingPayments: {
      count: Number(pendingPayments?.count || 0),
      totalAmount: BigInt(pendingPayments?.totalAmount || '0'),
    },
    inventoryValue: BigInt(inventoryValue?.value || '0'),
  }
}
// ─── Charts ──────────────────────────────────────────────────────────────

export async function getRevenueChart(
  period: Period,
  dateFrom?: string,
  dateTo?: string,
  region?: string
) {
  const { startDate, endDate } = getPeriodDates(period, dateFrom, dateTo)
  const startStr = format(startDate, 'yyyy-MM-dd')
  const endStr = format(endDate, 'yyyy-MM-dd')

  const rows = await db
    .select({
      date: dailySalesSummary.date,
      region: dailySalesSummary.regionCode,
      revenue: sum(dailySalesSummary.revenueKrw),
    })
    .from(dailySalesSummary)
    .where(
      and(
        gte(dailySalesSummary.date, startStr),
        lte(dailySalesSummary.date, endStr),
        region ? eq(dailySalesSummary.regionCode, region) : undefined
      )
    )
    .groupBy(dailySalesSummary.date, dailySalesSummary.regionCode)
    .orderBy(asc(dailySalesSummary.date))

  const dateMap: Record<string, { total: number; uzb: number; kor: number }> = {}

  // Fill all dates in range with 0
  let current = new Date(startDate)
  while (current <= endDate) {
    const key = format(current, 'yyyy-MM-dd')
    dateMap[key] = { total: 0, uzb: 0, kor: 0 }
    current.setDate(current.getDate() + 1)
  }

  let totalRevenue = 0n
  let uzbRevenue = 0n
  let korRevenue = 0n

  rows.forEach((row) => {
    const d = row.date
    const rev = BigInt(row.revenue || 0)
    if (dateMap[d]) {
      dateMap[d].total += Number(rev)
      if (row.region === 'UZB') {
        dateMap[d].uzb += Number(rev)
        uzbRevenue += rev
      } else if (row.region === 'KOR') {
        dateMap[d].kor += Number(rev)
        korRevenue += rev
      }
      totalRevenue += rev
    }
  })

  const labels = Object.keys(dateMap).sort()
  const datasets = {
    total: labels.map((l) => dateMap[l].total),
    uzb: labels.map((l) => dateMap[l].uzb),
    kor: labels.map((l) => dateMap[l].kor),
  }

  return {
    labels,
    datasets,
    summary: {
      totalRevenue,
      uzbRevenue,
      korRevenue,
      uzbPct: totalRevenue > 0n ? Number((uzbRevenue * 10000n) / totalRevenue) / 100 : 0,
      korPct: totalRevenue > 0n ? Number((korRevenue * 10000n) / totalRevenue) / 100 : 0,
    },
  }
}

// ─── P&L Report ──────────────────────────────────────────────────────────

export async function getPLReport(period: Period, dateFrom?: string, dateTo?: string) {
  const { startDate, endDate } = getPeriodDates(period, dateFrom, dateTo)
  const { startDate: prevStart, endDate: prevEnd } = getPreviousPeriodDates(startDate, endDate)

  const currentData = await getOverview(period, dateFrom, dateTo)

  // Need to get previous overview to compare
  const prevPeriodType = period === 'custom' ? 'custom' : period // Simplified
  const prevData = await getOverview(
    'custom',
    format(prevStart, 'yyyy-MM-dd'),
    format(prevEnd, 'yyyy-MM-dd')
  )

  const [dailyAggs] = await db
    .select({
      cargo: sum(dailySalesSummary.cargoKrw),
      coupons: sum(dailySalesSummary.couponDiscountKrw),
    })
    .from(dailySalesSummary)
    .where(
      and(
        gte(dailySalesSummary.date, format(startDate, 'yyyy-MM-dd')),
        lte(dailySalesSummary.date, format(endDate, 'yyyy-MM-dd'))
      )
    )

  const expensesByCategory = await db
    .select({
      categoryName: expenseCategories.name,
      categoryIcon: expenseCategories.icon,
      amount: sum(expenses.amountKrw),
    })
    .from(expenses)
    .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .where(
      and(
        gte(expenses.expenseDate, format(startDate, 'yyyy-MM-dd')),
        lte(expenses.expenseDate, format(endDate, 'yyyy-MM-dd'))
      )
    )
    .groupBy(expenseCategories.name, expenseCategories.icon)

  const cargo = BigInt(dailyAggs?.cargo || 0)
  const couponsAmt = BigInt(dailyAggs?.coupons || 0)
  const generalExpenses = currentData.profit.expenses
  const totalExpenses = cargo + couponsAmt + generalExpenses

  const revenueDeltaPct =
    prevData.revenue.net > 0n
      ? Number(((currentData.revenue.net - prevData.revenue.net) * 10000n) / prevData.revenue.net) /
        100
      : 0
  const profitDeltaPct =
    prevData.profit.netProfit !== 0n
      ? Number(
          ((currentData.profit.netProfit - prevData.profit.netProfit) * 10000n) /
            (prevData.profit.netProfit > 0n ? prevData.profit.netProfit : 1n)
        ) / 100
      : 0

  return {
    period: { startDate, endDate },
    revenue: currentData.revenue,
    cogs: currentData.profit.cogs,
    grossProfit: currentData.profit.grossProfit,
    grossMarginPct: currentData.profit.grossMarginPct,
    expenses: {
      cargo,
      coupons: couponsAmt,
      general: generalExpenses,
      byCategory: expensesByCategory.map((e) => ({
        categoryName: e.categoryName,
        categoryIcon: e.categoryIcon,
        amount: BigInt(e.amount || 0),
        pct:
          generalExpenses > 0n
            ? Number((BigInt(e.amount || 0) * 10000n) / generalExpenses) / 100
            : 0,
      })),
      total: totalExpenses,
    },
    netProfit: currentData.profit.netProfit,
    netMarginPct: currentData.profit.netMarginPct,
    comparison: {
      revenueDeltaPct,
      profitDeltaPct,
    },
  }
}

// ─── Transactions ────────────────────────────────────────────────────────

export async function getTransactions(query: {
  period: Period
  dateFrom?: string
  dateTo?: string
  region?: string
  page?: number
  limit?: number
}) {
  const { startDate, endDate } = getPeriodDates(query.period, query.dateFrom, query.dateTo)
  const page = query.page || 1
  const limit = query.limit || 20
  const offset = (page - 1) * limit

  let where = and(
    gte(orders.paymentConfirmedAt, startDate),
    lte(orders.paymentConfirmedAt, endDate),
    sql`${orders.status} IN ('PAYMENT_CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED')`,
    query.region ? eq(orders.deliveryRegion, query.region) : undefined
  )

  const items = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerName: customers.firstName,
      customerPhone: customers.phone,
      region: orders.deliveryRegion,
      totalAmountKrw: orders.totalAmount,
      discountAmount: orders.discountAmount,
      status: orders.status,
      paymentConfirmedAt: orders.paymentConfirmedAt,
      rateSnapshotId: orders.rateSnapshotId,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(where)
    .orderBy(desc(orders.paymentConfirmedAt))
    .limit(limit)
    .offset(offset)

  const [countRes] = await db
    .select({ count: count(), totalKrw: sum(orders.totalAmount) })
    .from(orders)
    .where(where)

  // UZS calculation needs rates
  const latestRate = await db
    .select()
    .from(exchangeRateSnapshots)
    .orderBy(desc(exchangeRateSnapshots.createdAt))
    .limit(1)
    .then((r) => r[0])

  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      let rate = latestRate
      if (item.rateSnapshotId) {
        const [stored] = await db
          .select()
          .from(exchangeRateSnapshots)
          .where(eq(exchangeRateSnapshots.id, item.rateSnapshotId))
          .limit(1)
        if (stored) rate = stored
      }

      const totalAmountUzs = item.totalAmountKrw * BigInt(rate?.krwToUzs || 12)

      return {
        ...item,
        totalAmountUzs,
      }
    })
  )

  const totalRevenueKrw = BigInt(countRes?.totalKrw || 0)
  const totalRevenueUzs = totalRevenueKrw * BigInt(latestRate?.krwToUzs || 12)

  return {
    items: enrichedItems,
    meta: {
      page,
      limit,
      total: Number(countRes?.count || 0),
      hasNext: offset + limit < Number(countRes?.count || 0),
      hasPrev: page > 1,
      totalRevenueKrw,
      totalRevenueUzs,
    },
  }
}

// ─── Products ────────────────────────────────────────────────────────────

export async function getProductPerformance(query: {
  period: Period
  dateFrom?: string
  dateTo?: string
  region?: string
  sort?: string
  brand?: string
  categoryId?: string
}) {
  const { startDate, endDate } = getPeriodDates(query.period, query.dateFrom, query.dateTo)
  const days = diffInDays(endDate, startDate) || 1

  const summaryRows = await db
    .select({
      productId: dailySalesSummary.productId,
      unitsSold: sum(dailySalesSummary.unitsSold),
      revenueKrw: sum(dailySalesSummary.revenueKrw),
      cogsKrw: sum(dailySalesSummary.cogsKrw),
      refundCount: sum(dailySalesSummary.refundCount),
    })
    .from(dailySalesSummary)
    .where(
      and(
        gte(dailySalesSummary.date, format(startDate, 'yyyy-MM-dd')),
        lte(dailySalesSummary.date, format(endDate, 'yyyy-MM-dd')),
        query.region ? eq(dailySalesSummary.regionCode, query.region) : undefined
      )
    )
    .groupBy(dailySalesSummary.productId)

  const items = await Promise.all(
    summaryRows.map(async (row) => {
      const [product] = await db
        .select({
          id: products.id,
          name: products.name,
          brandName: products.brandName,
          categoryName: categories.name,
          imageUrls: products.imageUrls,
        })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(
          and(
            eq(products.id, row.productId),
            query.brand ? eq(products.brandName, query.brand) : undefined,
            query.categoryId ? eq(products.categoryId, query.categoryId) : undefined
          )
        )
        .limit(1)

      if (!product) return null

      const unitsSold = Number(row.unitsSold || 0)
      const revenue = BigInt(row.revenueKrw || 0)
      const cogs = BigInt(row.cogsKrw || 0)
      const grossProfit = revenue - cogs
      const marginPct = revenue > 0n ? Number((grossProfit * 10000n) / revenue) / 100 : 0
      const refundCount = Number(row.refundCount || 0)

      const [stock] = await db
        .select({ total: sum(inventoryBatches.currentQty) })
        .from(inventoryBatches)
        .where(eq(inventoryBatches.productId, product.id))
      const currentStock = Number(stock?.total || 0)

      return {
        productId: product.id,
        productName: product.name,
        brandName: product.brandName,
        categoryName: product.categoryName,
        imageUrl: (product.imageUrls as string[])?.[0] || null,
        unitsSold,
        revenueKrw: revenue,
        cogsKrw: cogs,
        grossProfit,
        marginPct,
        refundCount,
        refundRate: unitsSold > 0 ? (refundCount / unitsSold) * 100 : 0,
        currentStock,
        stockVelocity: unitsSold / days,
        isDead: unitsSold === 0 && currentStock > 0,
      }
    })
  )

  const filteredItems = items.filter((i) => i !== null) as any[]

  if (query.sort === 'revenue') filteredItems.sort((a, b) => Number(b.revenueKrw - a.revenueKrw))
  else if (query.sort === 'units') filteredItems.sort((a, b) => b.unitsSold - a.unitsSold)
  else if (query.sort === 'margin') filteredItems.sort((a, b) => b.marginPct - a.marginPct)

  return filteredItems
}

// ─── Brands ──────────────────────────────────────────────────────────────

export async function getBrandPerformance(period: Period, dateFrom?: string, dateTo?: string) {
  const { startDate, endDate } = getPeriodDates(period, dateFrom, dateTo)

  const rows = await db
    .select({
      brandName: products.brandName,
      unitsSold: sum(dailySalesSummary.unitsSold),
      revenueKrw: sum(dailySalesSummary.revenueKrw),
      cogsKrw: sum(dailySalesSummary.cogsKrw),
      productCount: countDistinct(products.id),
    })
    .from(dailySalesSummary)
    .innerJoin(products, eq(dailySalesSummary.productId, products.id))
    .where(
      and(
        gte(dailySalesSummary.date, format(startDate, 'yyyy-MM-dd')),
        lte(dailySalesSummary.date, format(endDate, 'yyyy-MM-dd'))
      )
    )
    .groupBy(products.brandName)

  const items = await Promise.all(
    rows.map(async (row) => {
      const revenue = BigInt(row.revenueKrw || 0)
      const cogs = BigInt(row.cogsKrw || 0)
      const marginPct = revenue > 0n ? Number(((revenue - cogs) * 10000n) / revenue) / 100 : 0

      // Top product for this brand
      const [topProduct] = await db
        .select({ name: products.name })
        .from(dailySalesSummary)
        .innerJoin(products, eq(dailySalesSummary.productId, products.id))
        .where(
          and(
            eq(products.brandName, row.brandName!),
            gte(dailySalesSummary.date, format(startDate, 'yyyy-MM-dd')),
            lte(dailySalesSummary.date, format(endDate, 'yyyy-MM-dd'))
          )
        )
        .groupBy(products.id, products.name)
        .orderBy(desc(sum(dailySalesSummary.revenueKrw)))
        .limit(1)

      return {
        brandName: row.brandName,
        unitsSold: Number(row.unitsSold || 0),
        revenueKrw: revenue,
        marginPct,
        productCount: row.productCount,
        topProduct: topProduct?.name || 'N/A',
      }
    })
  )

  return items.sort((a, b) => Number(b.revenueKrw - a.revenueKrw))
}

// ─── Inventory ───────────────────────────────────────────────────────────

export async function getInventoryHealth() {
  const [appSettings] = await db.select().from(settings).limit(1)
  const threshold = appSettings?.lowStockThreshold || 10

  const allProducts = await db
    .select({
      id: products.id,
      name: products.name,
      brandName: products.brandName,
      barcode: products.barcode,
    })
    .from(products)
    .where(isNull(products.deletedAt))

  let totalValue = 0n
  let totalUnits = 0
  let lowStockCount = 0
  let outOfStockCount = 0
  let deadStockCount = 0

  const now = new Date()
  const thirtyDaysAgo = subDays(now, 30)
  const thirtyDaysAgoStr = format(thirtyDaysAgo, 'yyyy-MM-dd')

  const productData = await Promise.all(
    allProducts.map(async (p) => {
      const batches = await db
        .select()
        .from(inventoryBatches)
        .where(eq(inventoryBatches.productId, p.id))

      const totalQty = batches.reduce((acc, b) => acc + b.currentQty, 0)
      const invValue = batches.reduce((acc, b) => acc + b.costPrice * BigInt(b.currentQty), 0n)
      const avgCost = batches.length > 0 ? invValue / BigInt(totalQty || 1) : 0n

      const nearestExpiry = batches.reduce((min: Date | null, b) => {
        if (!b.expiryDate) return min
        const d = new Date(b.expiryDate)
        return !min || d < min ? d : min
      }, null)

      // Last sale
      const [lastSale] = await db
        .select({ date: dailySalesSummary.date })
        .from(dailySalesSummary)
        .where(eq(dailySalesSummary.productId, p.id))
        .orderBy(desc(dailySalesSummary.date))
        .limit(1)

      // Velocity (last 30 days)
      const [velocityRow] = await db
        .select({ units: sum(dailySalesSummary.unitsSold) })
        .from(dailySalesSummary)
        .where(
          and(eq(dailySalesSummary.productId, p.id), gte(dailySalesSummary.date, thirtyDaysAgoStr))
        )
      const unitsLast30 = Number(velocityRow?.units || 0)
      const velocity = unitsLast30 / 30

      totalValue += invValue
      totalUnits += totalQty
      if (totalQty === 0) outOfStockCount++
      else if (totalQty <= threshold) lowStockCount++

      const isDead = totalQty > 0 && unitsLast30 === 0
      if (isDead) deadStockCount++

      let status: 'ok' | 'low' | 'out' | 'dead' | 'expiring_soon' = 'ok'
      if (totalQty === 0) status = 'out'
      else if (nearestExpiry && nearestExpiry.getTime() < now.getTime() + 30 * 24 * 60 * 60 * 1000)
        status = 'expiring_soon'
      else if (totalQty <= threshold) status = 'low'
      else if (isDead) status = 'dead'

      return {
        productId: p.id,
        productName: p.name,
        brandName: p.brandName,
        barcode: p.barcode,
        totalQty,
        inventoryValue: invValue,
        avgCostPrice: avgCost,
        batchCount: batches.length,
        nearestExpiry,
        lastSaleDate: lastSale?.date || null,
        stockVelocity: velocity,
        daysRemaining: velocity > 0 ? Math.floor(totalQty / velocity) : null,
        status,
      }
    })
  )

  return {
    totalValue,
    totalUnits,
    productCount: allProducts.length,
    lowStockCount,
    outOfStockCount,
    deadStockCount,
    products: productData,
  }
}

// ─── Customers ───────────────────────────────────────────────────────────

export async function getCustomerAnalytics(period: Period, dateFrom?: string, dateTo?: string) {
  const { startDate, endDate } = getPeriodDates(period, dateFrom, dateTo)

  const [totalRes] = await db
    .select({ count: count() })
    .from(customers)
    .where(eq(customers.isActive, true))
  const [newRes] = await db
    .select({ count: count() })
    .from(customers)
    .where(and(gte(customers.createdAt, startDate), lte(customers.createdAt, endDate)))

  const [activeInPeriod] = await db
    .select({ count: countDistinct(orders.customerId) })
    .from(orders)
    .where(and(gte(orders.createdAt, startDate), lte(orders.createdAt, endDate)))

  const returningCountRes = await db.execute(sql`
    SELECT COUNT(*) as count FROM (
      SELECT customer_id FROM orders 
      WHERE status IN ('PAYMENT_CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED')
      GROUP BY customer_id HAVING COUNT(*) >= 2
    ) as sub
  `)
  const repeatCustomers = Number((returningCountRes as any).rows?.[0]?.count || 0)

  const [regions] = await db
    .select({
      uzb: sql<number>`COUNT(*) FILTER (WHERE ${customers.phoneRegion} = 'UZB')`,
      kor: sql<number>`COUNT(*) FILTER (WHERE ${customers.phoneRegion} = 'KOR')`,
    })
    .from(customers)
    .where(eq(customers.isActive, true))

  // AOV Trend
  const aovTrend = await db
    .select({
      date: sql<string>`DATE(${orders.paymentConfirmedAt})`,
      avgValue: avg(orders.totalAmount),
    })
    .from(orders)
    .where(
      and(
        gte(orders.paymentConfirmedAt, startDate),
        lte(orders.paymentConfirmedAt, endDate),
        sql`${orders.status} IN ('PAYMENT_CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED')`
      )
    )
    .groupBy(sql`DATE(${orders.paymentConfirmedAt})`)
    .orderBy(asc(sql`DATE(${orders.paymentConfirmedAt})`))

  // Top Customers
  const topCustomers = await db
    .select({
      customerId: customers.id,
      firstName: customers.firstName,
      phone: customers.phone,
      region: customers.phoneRegion,
      orderCount: count(orders.id),
      totalSpent: sum(orders.totalAmount),
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(
      and(
        gte(orders.paymentConfirmedAt, startDate),
        lte(orders.paymentConfirmedAt, endDate),
        sql`${orders.status} IN ('PAYMENT_CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED')`
      )
    )
    .groupBy(customers.id)
    .orderBy(desc(sum(orders.totalAmount)))
    .limit(10)

  const total = Number(totalRes?.count || 0)

  return {
    totalCustomers: total,
    newInPeriod: Number(newRes?.count || 0),
    activeInPeriod: Number(activeInPeriod?.count || 0),
    repeatCustomers,
    repeatRate: total > 0 ? (repeatCustomers / total) * 100 : 0,
    uzbCount: Number(regions?.uzb || 0),
    korCount: Number(regions?.kor || 0),
    uzbPct: total > 0 ? (Number(regions?.uzb || 0) / total) * 100 : 0,
    korPct: total > 0 ? (Number(regions?.kor || 0) / total) * 100 : 0,
    aovTrend: aovTrend.map((t) => ({
      date: t.date,
      avgOrderValue: BigInt(Math.round(Number(t.avgValue || 0))),
    })),
    topCustomers: topCustomers.map((c) => ({ ...c, totalSpent: BigInt(c.totalSpent || 0) })),
  }
}

// ─── Coupons ─────────────────────────────────────────────────────────────

export async function getCouponAnalytics(period: Period, dateFrom?: string, dateTo?: string) {
  const { startDate, endDate } = getPeriodDates(period, dateFrom, dateTo)

  const [overall] = await db
    .select({
      totalUsed: count(couponRedemptions.id),
      totalDiscount: sum(couponRedemptions.discountAmount),
    })
    .from(couponRedemptions)
    .where(
      and(gte(couponRedemptions.createdAt, startDate), lte(couponRedemptions.createdAt, endDate))
    )

  const couponStats = await db
    .select({
      couponId: coupons.id,
      code: coupons.code,
      name: coupons.name,
      type: coupons.type,
      usedCount: count(couponRedemptions.id),
      totalDiscountGiven: sum(couponRedemptions.discountAmount),
      uniqueCustomers: countDistinct(couponRedemptions.customerId),
      revenueGenerated: sum(orders.totalAmount),
    })
    .from(couponRedemptions)
    .innerJoin(coupons, eq(couponRedemptions.couponId, coupons.id))
    .innerJoin(orders, eq(couponRedemptions.orderId, orders.id))
    .where(
      and(gte(couponRedemptions.createdAt, startDate), lte(couponRedemptions.createdAt, endDate))
    )
    .groupBy(coupons.id, coupons.code, coupons.name, coupons.type)

  const totalUsed = Number(overall?.totalUsed || 0)
  const totalDiscountGiven = BigInt(overall?.totalDiscount || 0)

  return {
    totalUsed,
    totalDiscountGiven,
    avgDiscountPerOrder: totalUsed > 0 ? totalDiscountGiven / BigInt(totalUsed) : 0n,
    coupons: couponStats.map((c) => ({
      ...c,
      totalDiscountGiven: BigInt(c.totalDiscountGiven || 0),
      revenueGenerated: BigInt(c.revenueGenerated || 0),
    })),
  }
}

// ─── Cash Flow ───────────────────────────────────────────────────────────

export async function getCashFlow(period: Period, dateFrom?: string, dateTo?: string) {
  const { startDate, endDate } = getPeriodDates(period, dateFrom, dateTo)

  const [cashInOrders] = await db
    .select({ total: sum(orders.paymentAmount) })
    .from(orders)
    .where(
      and(
        gte(orders.paymentConfirmedAt, startDate),
        lte(orders.paymentConfirmedAt, endDate),
        sql`${orders.status} IN ('PAYMENT_CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED')`
      )
    )
  const [cashOutExp] = await db
    .select({ total: sum(expenses.amountKrw) })
    .from(expenses)
    .where(
      and(
        gte(expenses.expenseDate, format(startDate, 'yyyy-MM-dd')),
        lte(expenses.expenseDate, format(endDate, 'yyyy-MM-dd'))
      )
    )
  const [cashOutPO] = await db
    .select({ total: sum(purchaseOrders.totalCostKrw) })
    .from(purchaseOrders)
    .where(
      and(
        gte(purchaseOrders.actualDeliveryDate, format(startDate, 'yyyy-MM-dd')),
        lte(purchaseOrders.actualDeliveryDate, format(endDate, 'yyyy-MM-dd')),
        eq(purchaseOrders.status, 'RECEIVED')
      )
    )

  const inTotal = BigInt(cashInOrders?.total || 0)
  const outExp = BigInt(cashOutExp?.total || 0)
  const outPO = BigInt(cashOutPO?.total || 0)
  const outTotal = outExp + outPO

  // Monthly breakdown (last 6 months)
  const monthlyRes = await db.execute(sql`
    SELECT 
      TO_CHAR(d.date, 'YYYY-MM') as month,
      SUM(d.cash_in) as cash_in,
      SUM(d.cash_out) as cash_out
    FROM (
      SELECT payment_confirmed_at::date as date, payment_amount as cash_in, 0 as cash_out FROM orders WHERE status IN ('PAYMENT_CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED')
      UNION ALL
      SELECT expense_date as date, 0 as cash_in, amount_krw as cash_out FROM expenses
      UNION ALL
      SELECT actual_delivery_date as date, 0 as cash_in, total_cost_krw as cash_out FROM purchase_orders WHERE status = 'RECEIVED'
    ) d
    WHERE d.date >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY 1 ORDER BY 1 DESC
  `)
  const byMonth =
    (monthlyRes as any).rows?.map((r: any) => ({
      month: r.month,
      cashIn: BigInt(r.cash_in || 0),
      cashOut: BigInt(r.cash_out || 0),
      net: BigInt(r.cash_in || 0) - BigInt(r.cash_out || 0),
    })) || []

  return {
    cashIn: { fromOrders: inTotal, total: inTotal },
    cashOut: { generalExpenses: outExp, purchaseOrders: outPO, total: outTotal },
    netCashFlow: inTotal - outTotal,
    byMonth,
  }
}

// ─── Admin Performance ───────────────────────────────────────────────────

export async function getAdminPerformance(period: Period, dateFrom?: string, dateTo?: string) {
  const { startDate, endDate } = getPeriodDates(period, dateFrom, dateTo)

  const rows = await db
    .select({
      adminId: adminUsers.id,
      adminName: adminUsers.fullName,
      ordersConfirmed: sql<number>`COUNT(orders.id) FILTER (WHERE ${orders.paymentConfirmedBy} = ${adminUsers.id})`,
      ordersPacked: sql<number>`COUNT(orders.id) FILTER (WHERE ${orders.packedBy} = ${adminUsers.id})`,
      avgConfirmTimeHours: sql<number>`AVG(EXTRACT(EPOCH FROM (${orders.paymentConfirmedAt} - ${orders.paymentSubmittedAt})) / 3600) FILTER (WHERE ${orders.paymentConfirmedBy} = ${adminUsers.id})`,
      revenueConfirmed: sql<bigint>`SUM(${orders.totalAmount}) FILTER (WHERE ${orders.paymentConfirmedBy} = ${adminUsers.id})`,
    })
    .from(adminUsers)
    .leftJoin(
      orders,
      or(eq(orders.paymentConfirmedBy, adminUsers.id), eq(orders.packedBy, adminUsers.id))
    )
    .where(
      and(
        or(
          and(gte(orders.paymentConfirmedAt, startDate), lte(orders.paymentConfirmedAt, endDate)),
          and(gte(orders.packedAt, startDate), lte(orders.packedAt, endDate))
        ),
        isNull(adminUsers.deletedAt)
      )
    )
    .groupBy(adminUsers.id, adminUsers.fullName)

  return rows.map((r) => ({
    ...r,
    revenueConfirmed: BigInt(r.revenueConfirmed || 0),
  }))
}
