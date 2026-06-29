import { db } from '../../config/db'
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import {
  orders,
  orderItems,
  products,
  customers,
  expenses,
  expenseCategories,
  dailySalesSummary,
  inventoryBatches,
} from '@mira/db'
import { eq, and, sql, desc, asc, sum, count, gte, lte, inArray, countDistinct } from 'drizzle-orm'
import { getRedis } from '../../config/redis'

const REVENUE_STATUSES = ['PAYMENT_CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED'] as any[]

// ─── Cache Helpers ───────────────────────────────────────────────────────

async function getCached<T>(key: string): Promise<T | null> {
  const redis = getRedis()
  if (!redis) return null
  const cached = await redis.get(`analytics:${key}`)
  return cached ? JSON.parse(cached) : null
}

async function setCache(key: string, data: any, ttl = 300) {
  const redis = getRedis()
  if (!redis) return
  await redis.set(`analytics:${key}`, JSON.stringify(data), 'EX', ttl)
}

export async function invalidateAnalyticsCache() {
  const redis = getRedis()
  if (!redis) return
  const keys = await redis.keys('analytics:*')
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}

// ─── Analytics Service ───────────────────────────────────────────────────

export async function getOverview(from: string, to: string) {
  const cacheKey = `overview:${from}:${to}`
  const cached = await getCached<any>(cacheKey)
  if (cached) return cached

  const startDate = from ? startOfDay(new Date(from)) : startOfMonth(new Date())
  const endDate = to ? endOfDay(new Date(to)) : endOfMonth(new Date())

  // 1. Revenue & Orders
  const [revenueStats] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${orders.totalAmount})::text, '0')`,
      kor: sql<string>`COALESCE(SUM(CASE WHEN ${orders.deliveryRegion} = 'KOR' THEN ${orders.totalAmount} ELSE 0 END)::text, '0')`,
      uzb: sql<string>`COALESCE(SUM(CASE WHEN ${orders.deliveryRegion} = 'UZB' THEN ${orders.totalAmount} ELSE 0 END)::text, '0')`,
      orderCount: count(orders.id),
      completedCount: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'DELIVERED')`,
      cancelledCount: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'CANCELED')`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.paymentConfirmedAt, startDate),
        lte(orders.paymentConfirmedAt, endDate),
        inArray(orders.status, REVENUE_STATUSES)
      )
    )

  const revenueTotal = BigInt(revenueStats?.total || '0')
  const revenueKor = BigInt(revenueStats?.kor || '0')
  const revenueUzb = BigInt(revenueStats?.uzb || '0')
  const totalOrders = Number(revenueStats?.orderCount || 0)
  const completedOrders = Number(revenueStats?.completedCount || 0)
  const cancelledOrders = Number(revenueStats?.cancelledCount || 0)

  // 2. COGS from transactional data
  const [cogsStats] = await db
    .select({
      cogs: sql<string>`COALESCE(SUM(${orderItems.quantity} * ${inventoryBatches.costPrice})::text, '0')`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(inventoryBatches, eq(inventoryBatches.id, orderItems.batchId))
    .where(
      and(
        gte(orders.paymentConfirmedAt, startDate),
        lte(orders.paymentConfirmedAt, endDate),
        inArray(orders.status, REVENUE_STATUSES)
      )
    )

  const cogs = BigInt(cogsStats?.cogs || '0')
  const grossProfit = revenueTotal - cogs
  const grossMargin = revenueTotal > 0n ? Number((grossProfit * 10000n) / revenueTotal) / 100 : 0

  // 3. Expenses
  const expResult = await db.execute(
    sql`SELECT COALESCE(SUM(amount_krw)::text,'0')
        as total FROM expenses
        WHERE expense_date >= ${from}::date
        AND expense_date <= ${to}::date`
  )
  const totalExpenses = BigInt((expResult.rows[0] as any)?.total ?? '0')
  const netProfit = grossProfit - totalExpenses
  const netMargin = revenueTotal > 0n ? Number((netProfit * 10000n) / revenueTotal) / 100 : 0

  // 4. Customers
  const [customerStats] = await db
    .select({
      total: count(customers.id),
      newCount: sql<number>`COUNT(*) FILTER (WHERE ${customers.createdAt} BETWEEN ${startDate} AND ${endDate})`,
    })
    .from(customers)
    .where(eq(customers.isActive, true))

  const [activeCustomers] = await db
    .select({ count: countDistinct(orders.customerId) })
    .from(orders)
    .where(and(gte(orders.createdAt, startDate), lte(orders.createdAt, endDate)))

  const avgOrderValue = totalOrders > 0 ? Number(revenueTotal / BigInt(totalOrders)) : 0

  const result = {
    revenue: {
      total: Number(revenueTotal),
      kor: Number(revenueKor),
      uzb: Number(revenueUzb),
    },
    cogs: Number(cogs),
    grossProfit: Number(grossProfit),
    grossMargin,
    expenses: Number(totalExpenses),
    netProfit: Number(netProfit),
    netMargin,
    orders: {
      total: totalOrders,
      completed: completedOrders,
      cancelled: cancelledOrders,
      completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
    },
    customers: {
      total: Number(customerStats?.total || 0),
      new: Number(customerStats?.newCount || 0),
      returning: Number(activeCustomers?.count || 0) - Number(customerStats?.newCount || 0),
      returnRate:
        Number(customerStats?.total || 0) > 0
          ? ((Number(activeCustomers?.count || 0) - Number(customerStats?.newCount || 0)) /
              Number(customerStats?.total || 0)) *
            100
          : 0,
    },
    avgOrderValue,
  }

  await setCache(cacheKey, result)
  return result
}

export async function getRevenue(from: string, to: string, groupBy: 'day' | 'week' | 'month') {
  const cacheKey = `revenue:${from}:${to}:${groupBy}`
  const cached = await getCached<any>(cacheKey)
  if (cached) return cached

  let groupSql: any
  if (groupBy === 'day') groupSql = sql`${dailySalesSummary.date}`
  else if (groupBy === 'week') groupSql = sql`date_trunc('week', ${dailySalesSummary.date}::date)`
  else groupSql = sql`date_trunc('month', ${dailySalesSummary.date}::date)`

  const rows = await db
    .select({
      date: groupSql,
      totalKrw: sum(dailySalesSummary.revenueKrw),
      korKrw: sql<string>`SUM(CASE WHEN ${dailySalesSummary.regionCode} = 'KOR' THEN ${dailySalesSummary.revenueKrw} ELSE 0 END)`,
      uzbKrw: sql<string>`SUM(CASE WHEN ${dailySalesSummary.regionCode} = 'UZB' THEN ${dailySalesSummary.revenueKrw} ELSE 0 END)`,
    })
    .from(dailySalesSummary)
    .where(and(gte(dailySalesSummary.date, from), lte(dailySalesSummary.date, to)))
    .groupBy(groupSql)
    .orderBy(asc(groupSql))

  const result = rows.map((r: any) => ({
    date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
    totalKrw: Number(r.totalKrw || 0),
    korKrw: Number(r.korKrw || 0),
    uzbKrw: Number(r.uzbKrw || 0),
  }))

  await setCache(cacheKey, result)
  return result
}

export async function getTopProducts(from: string, to: string, limit = 10) {
  const cacheKey = `top-products:${from}:${to}:${limit}`
  const cached = await getCached<any>(cacheKey)
  if (cached) return cached

  const rows = await db
    .select({
      productId: dailySalesSummary.productId,
      unitsSold: sum(dailySalesSummary.unitsSold),
      revenueKrw: sum(dailySalesSummary.revenueKrw),
      cogsKrw: sum(dailySalesSummary.cogsKrw),
    })
    .from(dailySalesSummary)
    .where(and(gte(dailySalesSummary.date, from), lte(dailySalesSummary.date, to)))
    .groupBy(dailySalesSummary.productId)
    .orderBy(desc(sum(dailySalesSummary.revenueKrw)))
    .limit(limit)

  const result = await Promise.all(
    rows.map(async (r) => {
      const [p] = await db
        .select({ name: products.name, imageUrls: products.imageUrls })
        .from(products)
        .where(eq(products.id, r.productId))
        .limit(1)

      const revenue = Number(r.revenueKrw || 0)
      const cogs = Number(r.cogsKrw || 0)
      const grossProfit = revenue - cogs
      const margin = revenue > 0 ? (grossProfit * 100) / revenue : 0

      return {
        productId: r.productId,
        productName: p?.name || 'Nomaʼlum',
        imageUrl: (p?.imageUrls as string[])?.[0] || null,
        unitsSold: Number(r.unitsSold || 0),
        revenueKrw: revenue,
        cogsKrw: cogs,
        grossProfit,
        margin,
      }
    })
  )

  await setCache(cacheKey, result)
  return result
}

export async function getPL(from: string, to: string) {
  const cacheKey = `pl:${from}:${to}`
  const cached = await getCached<any>(cacheKey)
  if (cached) return cached

  const startDate = startOfDay(new Date(from))
  const endDate = endOfDay(new Date(to))

  const [revenueStats] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${orders.totalAmount})::text, '0')`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.paymentConfirmedAt, startDate),
        lte(orders.paymentConfirmedAt, endDate),
        inArray(orders.status, REVENUE_STATUSES)
      )
    )

  const revenue = Number(revenueStats?.total || 0)

  const [summaryData] = await db
    .select({
      cogs: sql<string>`COALESCE(SUM(${orderItems.quantity} * ${inventoryBatches.costPrice})::text, '0')`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(inventoryBatches, eq(inventoryBatches.id, orderItems.batchId))
    .where(
      and(
        gte(orders.paymentConfirmedAt, startDate),
        lte(orders.paymentConfirmedAt, endDate),
        inArray(orders.status, REVENUE_STATUSES)
      )
    )

  const cogs = Number(summaryData?.cogs || 0)
  const grossProfit = revenue - cogs
  const grossMargin = revenue > 0 ? (grossProfit * 100) / revenue : 0

  const expensesByCategory = await db
    .select({
      category: expenseCategories.name,
      amount: sql<string>`COALESCE(SUM(${expenses.amountKrw})::text, '0')`,
    })
    .from(expenses)
    .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .where(
      and(
        gte(expenses.expenseDate, sql`${from}::date`),
        lte(expenses.expenseDate, sql`${to}::date`)
      )
    )
    .groupBy(expenseCategories.name)

  const totalExpenses = expensesByCategory.reduce((acc, e) => acc + Number(e.amount), 0)
  const netProfit = grossProfit - totalExpenses
  const netMargin = revenue > 0 ? (netProfit * 100) / revenue : 0

  const result = {
    period: `${from} to ${to}`,
    revenue,
    cogs,
    grossProfit,
    grossMargin,
    expenses: expensesByCategory.map((e) => ({
      category: e.category,
      amount: Number(e.amount),
    })),
    totalExpenses,
    netProfit,
    netMargin,
  }

  await setCache(cacheKey, result)
  return result
}

export async function getOrderFunnel(from: string, to: string) {
  const cacheKey = `funnel:${from}:${to}`
  const cached = await getCached<any>(cacheKey)
  if (cached) return cached

  const startDate = new Date(from)
  const endDate = new Date(to)
  endDate.setHours(23, 59, 59, 999)

  const rows = await db
    .select({
      status: orders.status,
      count: count(orders.id),
    })
    .from(orders)
    .where(and(gte(orders.createdAt, startDate), lte(orders.createdAt, endDate)))
    .groupBy(orders.status)

  const total = rows.reduce((acc, r) => acc + Number(r.count), 0)

  // Define the order of the funnel
  const statuses = [
    'PENDING_PAYMENT',
    'PAYMENT_SUBMITTED',
    'PAYMENT_CONFIRMED',
    'PACKING',
    'SHIPPED',
    'DELIVERED',
  ]

  const result = statuses.map((s) => {
    const row = rows.find((r) => r.status === s)
    const count = Number(row?.count || 0)
    return {
      status: s,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }
  })

  await setCache(cacheKey, result)
  return result
}

export async function getCustomers(from: string, to: string) {
  const cacheKey = `customers:${from}:${to}`
  const cached = await getCached<any>(cacheKey)
  if (cached) return cached

  const startDate = new Date(from)
  const endDate = new Date(to)
  endDate.setHours(23, 59, 59, 999)

  const [newCustomers] = await db
    .select({ count: count() })
    .from(customers)
    .where(and(gte(customers.createdAt, startDate), lte(customers.createdAt, endDate)))

  const activeInPeriod = await db
    .select({ customerId: orders.customerId })
    .from(orders)
    .where(and(gte(orders.createdAt, startDate), lte(orders.createdAt, endDate)))
    .groupBy(orders.customerId)

  const returning = activeInPeriod.length - Number(newCustomers?.count || 0)

  const [regions] = await db
    .select({
      uzb: sql<number>`COUNT(*) FILTER (WHERE ${customers.phoneRegion} = 'UZB')`,
      kor: sql<number>`COUNT(*) FILTER (WHERE ${customers.phoneRegion} = 'KOR')`,
    })
    .from(customers)
    .where(eq(customers.isActive, true))

  const topCustomers = await db
    .select({
      id: customers.id,
      name: customers.firstName,
      orderCount: count(orders.id),
      totalSpent: sum(orders.totalAmount),
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(
      and(
        gte(orders.paymentConfirmedAt, startDate),
        lte(orders.paymentConfirmedAt, endDate),
        inArray(orders.status, REVENUE_STATUSES)
      )
    )
    .groupBy(customers.id, customers.firstName)
    .orderBy(desc(sum(orders.totalAmount)))
    .limit(10)

  const result = {
    new: Number(newCustomers?.count || 0),
    returning: returning > 0 ? returning : 0,
    kor: Number(regions?.kor || 0),
    uzb: Number(regions?.uzb || 0),
    topCustomers: topCustomers.map((c) => ({
      id: c.id,
      name: c.name,
      orderCount: Number(c.orderCount),
      totalSpent: Number(c.totalSpent || 0),
    })),
  }

  await setCache(cacheKey, result)
  return result
}

export async function getCouponStats(from: string, to: string) {
  const cacheKey = `coupons:${from}:${to}`
  const cached = await getCached<any>(cacheKey)
  if (cached) return cached

  const startDate = new Date(from)
  const endDate = new Date(to)
  endDate.setHours(23, 59, 59, 999)

  // 1. Top coupons by total discount
  const topCoupons = await db
    .select({
      code: orders.couponCode,
      usageCount: count(orders.id),
      totalDiscount: sum(orders.discountAmount),
      revenue: sum(orders.totalAmount),
    })
    .from(orders)
    .where(
      and(
        gte(orders.paymentConfirmedAt, startDate),
        lte(orders.paymentConfirmedAt, endDate),
        inArray(orders.status, REVENUE_STATUSES),
        sql`${orders.couponCode} IS NOT NULL`
      )
    )
    .groupBy(orders.couponCode)
    .orderBy(desc(sum(orders.discountAmount)))
    .limit(10)

  // 2. Summary stats
  const [summary] = await db
    .select({
      totalUsed: count(orders.id),
      totalDiscount: sum(orders.discountAmount),
    })
    .from(orders)
    .where(
      and(
        gte(orders.paymentConfirmedAt, startDate),
        lte(orders.paymentConfirmedAt, endDate),
        inArray(orders.status, REVENUE_STATUSES),
        sql`${orders.couponCode} IS NOT NULL`
      )
    )

  // 3. Total orders in period for percentage calculation
  const [totalOrdersRes] = await db
    .select({ count: count() })
    .from(orders)
    .where(
      and(
        gte(orders.paymentConfirmedAt, startDate),
        lte(orders.paymentConfirmedAt, endDate),
        inArray(orders.status, REVENUE_STATUSES)
      )
    )

  const totalUsed = Number(summary?.totalUsed || 0)
  const totalOrders = Number(totalOrdersRes?.count || 0)

  const result = {
    totalUsed,
    totalDiscount: Number(summary?.totalDiscount || 0),
    ordersWithCoupon: totalUsed,
    couponOrderPct: totalOrders > 0 ? (totalUsed / totalOrders) * 100 : 0,
    topCoupons: topCoupons.map((c) => ({
      code: c.code,
      usageCount: Number(c.usageCount || 0),
      totalDiscount: Number(c.totalDiscount || 0),
      revenue: Number(c.revenue || 0),
      type: 'DISCOUNT', // Placeholder if type not in orders table
    })),
  }

  await setCache(cacheKey, result)
  return result
}

export async function exportCSV(
  type: 'pl' | 'orders' | 'products' | 'revenue' | 'inventory' | 'customers' | 'expenses',
  from: string,
  to: string
) {
  const startDate = new Date(from)
  const endDate = new Date(to)
  endDate.setHours(23, 59, 59, 999)

  if (type === 'pl') {
    const pl = await getPL(from, to)
    let csv = 'Kategoriya,Miqdor (KRW)\n'
    csv += `Daromad,${Number(pl.revenue)}\n`
    csv += `Tannarx (COGS),${Number(pl.cogs)}\n`
    csv += `Yalpi foyda,${Number(pl.grossProfit)}\n`
    pl.expenses.forEach((e: any) => {
      csv += `${e.category},${Number(e.amount)}\n`
    })
    csv += `Jami xarajat,${Number(pl.totalExpenses)}\n`
    csv += `Sof foyda,${Number(pl.netProfit)}\n`
    return csv
  }

  if (type === 'products') {
    const products = await getTopProducts(from, to, 1000)
    let csv = 'Mahsulot,Sotilgan (ta),Daromad (KRW),Tannarx (KRW),Yalpi foyda (KRW),Margin (%)\n'
    products.forEach((p: any) => {
      csv += `"${p.productName}",${p.unitsSold},${Number(p.revenueKrw)},${Number(p.cogsKrw)},${Number(p.grossProfit)},${p.margin.toFixed(2)}\n`
    })
    return csv
  }

  if (type === 'orders') {
    const items = await db
      .select({
        orderNumber: orders.orderNumber,
        customerName: customers.firstName,
        region: orders.deliveryRegion,
        totalAmount: orders.totalAmount,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(and(gte(orders.createdAt, startDate), lte(orders.createdAt, endDate)))
      .orderBy(desc(orders.createdAt))

    let csv = 'Buyurtma #,Mijoz,Region,Summa (KRW),Status,Sana\n'
    items.forEach((o: any) => {
      csv += `${o.orderNumber},"${o.customerName || 'Nomaʼlum'}",${o.region},${Number(o.totalAmount)},${o.status},${o.createdAt?.toISOString().split('T')[0]}\n`
    })
    return csv
  }

  if (type === 'revenue') {
    const data = await getRevenue(from, to, 'day')
    let csv = 'Sana,Jami (KRW),KOR (KRW),UZB (KRW)\n'
    data.forEach((r: any) => {
      csv += `${r.date},${Number(r.totalKrw)},${Number(r.korKrw)},${Number(r.uzbKrw)}\n`
    })
    return csv
  }

  if (type === 'inventory') {
    const items = await db
      .select({
        name: products.name,
        brand: products.brandName,
        barcode: products.barcode,
        currentQty: sql<string>`(SELECT COALESCE(SUM(current_qty), 0)::text FROM inventory_batches WHERE product_id = ${products.id})`,
        avgCost: sql<string>`(SELECT COALESCE(AVG(cost_price), 0)::text FROM inventory_batches WHERE product_id = ${products.id})`,
      })
      .from(products)
      .where(sql`deleted_at IS NULL`)

    let csv = "Mahsulot,Brend,Shtrixkod,Soni,O'rtacha tannarx (KRW)\n"
    items.forEach((i: any) => {
      csv += `"${i.name}",${i.brand || ''},${i.barcode || ''},${i.currentQty},${Number(i.avgCost).toFixed(0)}\n`
    })
    return csv
  }

  if (type === 'customers') {
    const items = await db
      .select({
        name: customers.firstName,
        phone: customers.phone,
        region: customers.phoneRegion,
        orderCount: count(orders.id),
        totalSpent: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)::text`,
      })
      .from(customers)
      .leftJoin(orders, eq(customers.id, orders.customerId))
      .groupBy(customers.id)
      .orderBy(desc(sql`SUM(${orders.totalAmount})`))

    let csv = 'Mijoz,Telefon,Region,Buyurtmalar soni,Jami xarid (KRW)\n'
    items.forEach((c: any) => {
      csv += `"${c.name}",${c.phone},${c.region},${c.orderCount},${c.totalSpent}\n`
    })
    return csv
  }

  if (type === 'expenses') {
    const items = await db
      .select({
        category: expenseCategories.name,
        amount: expenses.amountKrw,
        description: expenses.description,
        date: expenses.expenseDate,
      })
      .from(expenses)
      .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .where(
        and(
          gte(expenses.expenseDate, sql`${from}::date`),
          lte(expenses.expenseDate, sql`${to}::date`)
        )
      )
      .orderBy(desc(expenses.expenseDate))

    let csv = 'Sana,Kategoriya,Tavsif,Miqdor (KRW)\n'
    items.forEach((e: any) => {
      csv += `${e.date},${e.category || 'Boshqa'},"${e.description}",${Number(e.amount)}\n`
    })
    return csv
  }

  return ''
}
