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
  | '7d'
  | '30d'
  | 'month'
  | 'custom'

export const REVENUE_STATUSES: ("PAYMENT_CONFIRMED" | "PACKING" | "SHIPPED" | "DELIVERED")[] = 
  ['PAYMENT_CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED']

// ─── Helpers ─────────────────────────────────────────────────────────────

export function getPeriodDates(period: Period, dateFrom?: string, dateTo?: string) {
  const now = new Date()
  let startDate: Date
  let endDate: Date = endOfDay(now)

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
    case 'month':
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
    case '7d':
      startDate = startOfDay(subDays(now, 6))
      break
    case '30d':
      startDate = startOfDay(subDays(now, 29))
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

export async function getOverview(period: Period) {
  const { startDate, endDate } = getPeriodDates(period)
  const { startDate: prevStart, endDate: prevEnd } = getPreviousPeriodDates(startDate, endDate)

  // 1. Today vs Yesterday
  const today = startOfDay(new Date())
  const yesterday = subDays(today, 1)

  const [todayRev] = await db
    .select({
      revenue: sql<string>`COALESCE(SUM(${orders.totalAmount} - ${orders.refundAmount}), 0)`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.paymentConfirmedAt, today),
        lte(orders.paymentConfirmedAt, endOfDay(today)),
        inArray(orders.status, REVENUE_STATUSES)
      )
    )

  const [yestRev] = await db
    .select({
      revenue: sql<string>`COALESCE(SUM(${orders.totalAmount} - ${orders.refundAmount}), 0)`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.paymentConfirmedAt, startOfDay(yesterday)),
        lte(orders.paymentConfirmedAt, endOfDay(yesterday)),
        inArray(orders.status, REVENUE_STATUSES)
      )
    )

  const todayRevenue = Number(todayRev.revenue)
  const yestRevenue = Number(yestRev.revenue)
  const todayRevenueChange =
    yestRevenue > 0 ? Math.round(((todayRevenue - yestRevenue) / yestRevenue) * 100) : 0

  // 2. Period vs Previous Period
  const [periodRev] = await db
    .select({
      revenue: sql<string>`COALESCE(SUM(${orders.totalAmount} - ${orders.refundAmount}), 0)`,
      count: count(orders.id),
    })
    .from(orders)
    .where(
      and(
        gte(orders.paymentConfirmedAt, startDate),
        lte(orders.paymentConfirmedAt, endDate),
        inArray(orders.status, REVENUE_STATUSES)
      )
    )

  const [prevRev] = await db
    .select({
      revenue: sql<string>`COALESCE(SUM(${orders.totalAmount} - ${orders.refundAmount}), 0)`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.paymentConfirmedAt, prevStart),
        lte(orders.paymentConfirmedAt, prevEnd),
        inArray(orders.status, REVENUE_STATUSES)
      )
    )

  const periodRevenue = Number(periodRev.revenue)
  const previousRevenue = Number(prevRev.revenue)
  const periodRevenueChange =
    previousRevenue > 0 ? Math.round(((periodRevenue - previousRevenue) / previousRevenue) * 100) : 0

  // 3. Pending & Total
  const [pending] = await db
    .select({ count: count() })
    .from(orders)
    .where(inArray(orders.status, ['PENDING_PAYMENT', 'PAYMENT_SUBMITTED']))

  const [totalInPeriod] = await db
    .select({ count: count() })
    .from(orders)
    .where(and(gte(orders.createdAt, startDate), lte(orders.createdAt, endDate)))

  return {
    todayRevenue,
    todayRevenueChange,
    periodRevenue,
    periodRevenueChange,
    pendingOrders: Number(pending?.count || 0),
    totalOrders: Number(totalInPeriod?.count || 0),
  }
}
// ─── Charts ──────────────────────────────────────────────────────────────

export async function getRevenue(period: Period) {
  const { startDate, endDate } = getPeriodDates(period)
  const startStr = format(startDate, 'yyyy-MM-dd')
  const endStr = format(endDate, 'yyyy-MM-dd')

  const rows = await db
    .select({
      date: dailySalesSummary.date,
      revenue: sum(dailySalesSummary.revenueKrw),
    })
    .from(dailySalesSummary)
    .where(and(gte(dailySalesSummary.date, startStr), lte(dailySalesSummary.date, endStr)))
    .groupBy(dailySalesSummary.date)
    .orderBy(asc(dailySalesSummary.date))

  const daily: { date: string; revenue: number }[] = []
  let current = new Date(startDate)
  while (current <= endDate) {
    const key = format(current, 'yyyy-MM-dd')
    const row = rows.find((r) => r.date === key)
    daily.push({
      date: key,
      revenue: Number(row?.revenue || 0),
    })
    current.setDate(current.getDate() + 1)
  }

  return { daily }
}

export async function getOrdersByStatus(period: Period) {
  const { startDate, endDate } = getPeriodDates(period)

  const rows = await db
    .select({
      status: orders.status,
      count: count(),
    })
    .from(orders)
    .where(and(gte(orders.createdAt, startDate), lte(orders.createdAt, endDate)))
    .groupBy(orders.status)

  return rows.map((r) => ({
    status: r.status,
    count: Number(r.count),
  }))
}

// ─── P&L Report ──────────────────────────────────────────────────────────

export async function getPL(period: Period) {
  return getPLReport(period)
}

export async function getPLReport(period: Period, dateFrom?: string, dateTo?: string) {
  const { startDate, endDate } = getPeriodDates(period, dateFrom, dateTo)
  const { startDate: prevStart, endDate: prevEnd } = getPreviousPeriodDates(startDate, endDate)

  const [revenueStats] = await db
    .select({
      gross: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      refunds: sql<string>`COALESCE(SUM(${orders.refundAmount}), 0)`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.paymentConfirmedAt, startDate),
        lte(orders.paymentConfirmedAt, endDate),
        inArray(orders.status, REVENUE_STATUSES)
      )
    )

  const [prevRev] = await db
    .select({
      net: sql<string>`COALESCE(SUM(${orders.totalAmount} - ${orders.refundAmount}), 0)`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.paymentConfirmedAt, prevStart),
        lte(orders.paymentConfirmedAt, prevEnd),
        inArray(orders.status, REVENUE_STATUSES)
      )
    )

  const grossRevenue = BigInt(revenueStats?.gross || '0')
  const totalRefunds = BigInt(revenueStats?.refunds || '0')
  const netRevenue = grossRevenue - totalRefunds

  const [summaryData] = await db
    .select({
      cogs: sql<string>`COALESCE(SUM(${dailySalesSummary.cogsKrw}), 0)`,
      cargo: sql<string>`COALESCE(SUM(${dailySalesSummary.cargoKrw}), 0)`,
      coupons: sql<string>`COALESCE(SUM(${dailySalesSummary.couponDiscountKrw}), 0)`,
    })
    .from(dailySalesSummary)
    .where(
      and(
        gte(dailySalesSummary.date, format(startDate, 'yyyy-MM-dd')),
        lte(dailySalesSummary.date, format(endDate, 'yyyy-MM-dd'))
      )
    )

  const [expensesTotal] = await db
    .select({ total: sql<string>`COALESCE(SUM(${expenses.amountKrw}), 0)` })
    .from(expenses)
    .where(
      and(
        gte(expenses.expenseDate, format(startDate, 'yyyy-MM-dd')),
        lte(expenses.expenseDate, format(endDate, 'yyyy-MM-dd'))
      )
    )

  const expensesByCategory = await db
    .select({
      categoryName: expenseCategories.name,
      categoryIcon: expenseCategories.icon,
      amount: sql<string>`COALESCE(SUM(${expenses.amountKrw}), 0)`,
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

  const cogs = BigInt(summaryData?.cogs || '0')
  const cargo = BigInt(summaryData?.cargo || '0')
  const couponsAmt = BigInt(summaryData?.coupons || '0')
  const generalExpenses = BigInt(expensesTotal?.total || '0')
  const totalExpenses = cargo + couponsAmt + generalExpenses

  const grossProfit = netRevenue - cogs
  const grossMarginPct = netRevenue > 0n ? Number((grossProfit * 10000n) / netRevenue) / 100 : 0

  const netProfit = grossProfit - totalExpenses
  const netMarginPct = netRevenue > 0n ? Number((netProfit * 10000n) / netRevenue) / 100 : 0

  const prevNet = BigInt(prevRev?.net || '0')
  const revenueDeltaPct =
    prevNet > 0n ? Number(((netRevenue - prevNet) * 10000n) / prevNet) / 100 : 0

  return {
    period: { startDate, endDate },
    revenue: { gross: grossRevenue, refunds: totalRefunds, net: netRevenue },
    cogs,
    grossProfit,
    grossMarginPct,
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
    netProfit,
    netMarginPct,
    comparison: { revenueDeltaPct },
  }
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
      imageUrls: products.imageUrls,
      isActive: products.isActive,
      barcode: products.barcode,
    })
    .from(products)
    .where(isNull(products.deletedAt))

  let totalValue = 0n
  let totalUnits = 0
  let lowStockCount = 0
  const productData: any[] = []
  const lowStockItems: any[] = []

  for (const p of allProducts) {
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

    totalValue += invValue
    totalUnits += totalQty

    let status: 'ok' | 'low' | 'out' = 'ok'
    if (totalQty === 0) status = 'out'
    else if (totalQty <= threshold) {
      status = 'low'
      lowStockCount++
      lowStockItems.push({
        productId: p.id,
        productName: p.name,
        brandName: p.brandName,
        imageUrl: (p.imageUrls as string[])?.[0] || null,
        availableStock: totalQty,
      })
    }

    productData.push({
      productId: p.id,
      productName: p.name,
      brandName: p.brandName,
      barcode: p.barcode,
      totalQty,
      inventoryValue: invValue,
      avgCostPrice: avgCost,
      batchCount: batches.length,
      nearestExpiry,
      status,
    })
  }

  return {
    totalProducts: allProducts.length,
    activeProducts: allProducts.filter((p) => p.isActive).length,
    totalValue,
    totalValueKrw: Number(totalValue), // For dashboard
    totalUnits,
    lowStockCount,
    lowStockItems: lowStockItems.sort((a, b) => a.availableStock - b.availableStock).slice(0, 10),
    products: productData, // For reports
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

      const soldQty = Number(row.unitsSold || 0)
      const revenue = Number(row.revenueKrw || 0)
      const cogs = Number(row.cogsKrw || 0)
      const grossProfit = revenue - cogs
      const marginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0
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
        soldQty,
        revenueKrw: revenue,
        cogsKrw: cogs,
        grossProfit,
        marginPct,
        refundCount,
        refundRate: soldQty > 0 ? (refundCount / soldQty) * 100 : 0,
        currentStock,
        stockVelocity: soldQty / days,
        isDead: soldQty === 0 && currentStock > 0,
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
        gte(purchaseOrders.receivedAt, format(startDate, 'yyyy-MM-dd')),
        lte(purchaseOrders.receivedAt, format(endDate, 'yyyy-MM-dd')),
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
