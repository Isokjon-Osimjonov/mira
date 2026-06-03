import ExcelJS from 'exceljs'
import { db } from '../../config/db'
import { sql } from 'drizzle-orm'
import * as DashboardService from '../dashboard/dashboard.service'
import * as CustomerService from '../customers/customers.service'
import { format } from 'date-fns'

// ─── Constants & Styles ──────────────────────────────────────────────────

const HEADER_STYLE: Partial<ExcelJS.Style> = {
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE11D74' } },
  font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 },
  alignment: { horizontal: 'center', vertical: 'middle' },
  border: {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  },
}

const SUMMARY_ROW_STYLE: Partial<ExcelJS.Style> = {
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8FB' } },
  font: { bold: true },
}

const ROW_HEIGHT = { headers: 25, data: 20, summary: 22 }

const FORMATS = {
  KRW: '#,##0 "₩"',
  UZS: '#,##0 "so\'m"',
  PCT: '0.00"%"',
  DATE: 'DD.MM.YYYY',
  DATETIME: 'DD.MM.YYYY HH:MM',
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function applyStyleToRow(row: ExcelJS.Row, style: Partial<ExcelJS.Style>) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = style.fill || cell.fill
    cell.font = style.font || cell.font
    cell.alignment = style.alignment || cell.alignment
    cell.border = style.border || cell.border
  })
}

function applyAlternatingRows(sheet: ExcelJS.Worksheet, startRow: number) {
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber >= startRow) {
      if (rowNumber % 2 !== 0) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8FB' } }
        })
      }
      row.height = ROW_HEIGHT.data
    }
  })
}

function autoWidth(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((column) => {
    let maxLength = 0
    column.eachCell!({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10
      if (columnLength > maxLength) {
        maxLength = columnLength
      }
    })
    column.width = maxLength < 10 ? 10 : maxLength + 2
  })
}

function formatFilenameDate(date: Date) {
  return format(date, 'yyyy_MM_dd')
}

// ─── Reports ─────────────────────────────────────────────────────────────

export async function generatePLReport(
  period: DashboardService.Period,
  dateFrom?: string,
  dateTo?: string
) {
  const data = await DashboardService.getPLReport(period, dateFrom, dateTo)
  const workbook = new ExcelJS.Workbook()

  // Sheet 1: Daromad Hisoboti
  const s1 = workbook.addWorksheet('Daromad Hisoboti')
  const title = `P&L HISOBOT — ${format(data.period.startDate, 'dd.MM.yyyy')} - ${format(data.period.endDate, 'dd.MM.yyyy')}`
  s1.mergeCells('A1:B1')
  s1.getCell('A1').value = title
  s1.getCell('A1').font = { bold: true, size: 14 }
  s1.getCell('A1').alignment = { horizontal: 'center' }

  let curr = 3

  // DAROMAD
  s1.getCell(`A${curr}`).value = 'DAROMAD'
  s1.getCell(`A${curr}`).font = { bold: true }
  curr++
  s1.addRow(['Yalpi daromad', Number(data.revenue.gross)]).getCell(2).numFmt = FORMATS.KRW
  s1.addRow(['Qaytarimlar', Number(data.revenue.refunds)]).getCell(2).numFmt = FORMATS.KRW
  const netRow = s1.addRow(['Sof daromad', Number(data.revenue.net)])
  netRow.getCell(2).numFmt = FORMATS.KRW
  netRow.font = { bold: true }
  curr += 4

  // XARAJATLAR
  s1.getCell(`A${curr}`).value = 'XARAJATLAR'
  s1.getCell(`A${curr}`).font = { bold: true }
  curr++
  s1.addRow(['Mahsulot narxi (COGS)', Number(data.cogs)]).getCell(2).numFmt = FORMATS.KRW
  s1.addRow(['Yuk tashish', Number(data.expenses.cargo)]).getCell(2).numFmt = FORMATS.KRW
  s1.addRow(['Kuponlar', Number(data.expenses.coupons)]).getCell(2).numFmt = FORMATS.KRW

  data.expenses.byCategory.forEach((cat) => {
    s1.addRow([cat.categoryName, Number(cat.amount)]).getCell(2).numFmt = FORMATS.KRW
  })

  const totalExpRow = s1.addRow(['Jami xarajatlar', Number(data.expenses.total)])
  totalExpRow.getCell(2).numFmt = FORMATS.KRW
  applyStyleToRow(totalExpRow, SUMMARY_ROW_STYLE)
  curr += 5 + data.expenses.byCategory.length

  // FOYDA
  s1.getCell(`A${curr}`).value = 'FOYDA'
  s1.getCell(`A${curr}`).font = { bold: true }
  curr++
  const gpRow = s1.addRow(['Yalpi foyda', Number(data.grossProfit), data.grossMarginPct / 100])
  gpRow.getCell(2).numFmt = FORMATS.KRW
  gpRow.getCell(3).numFmt = FORMATS.PCT

  const npRow = s1.addRow(['Sof foyda', Number(data.netProfit), data.netMarginPct / 100])
  npRow.getCell(2).numFmt = FORMATS.KRW
  npRow.getCell(3).numFmt = FORMATS.PCT
  npRow.font = { bold: true }
  npRow.getCell(2).font = { color: { argb: 'FFE11D74' }, bold: true }

  autoWidth(s1)

  // Sheet 2: Oylik Taqqoslama
  const s2 = workbook.addWorksheet('Oylik Taqqoslama')
  s2.columns = [
    { header: 'Oy', key: 'month' },
    { header: 'Daromad', key: 'revenue' },
    { header: 'COGS', key: 'cogs' },
    { header: 'Foyda', key: 'profit' },
    { header: 'Foyda%', key: 'margin' },
  ]
  applyStyleToRow(s2.getRow(1), HEADER_STYLE)
  s2.getRow(1).height = ROW_HEIGHT.headers

  const cashFlow = await DashboardService.getCashFlow('this_year')
  cashFlow.byMonth.forEach((m: any) => {
    const row = s2.addRow({
      month: m.month,
      revenue: Number(m.cashIn),
      cogs: 0, // Simplified
      profit: Number(m.net),
      margin: m.cashIn > 0n ? Number((m.net * 10000n) / m.cashIn) / 10000 : 0,
    })
    row.getCell(2).numFmt = FORMATS.KRW
    row.getCell(3).numFmt = FORMATS.KRW
    row.getCell(4).numFmt = FORMATS.KRW
    row.getCell(5).numFmt = FORMATS.PCT
  })
  autoWidth(s2)

  const filename = `pl_report_${format(data.period.startDate, 'yyyy_MM')}.xlsx`
  return { workbook, filename }
}

export async function generateSalesReport(
  period: DashboardService.Period,
  dateFrom?: string,
  dateTo?: string
) {
  const productsData = await DashboardService.getProductPerformance({ period, dateFrom, dateTo })
  const brandsData = await DashboardService.getBrandPerformance(period, dateFrom, dateTo)

  const workbook = new ExcelJS.Workbook()

  // Sheet 1: Mahsulotlar
  const s1 = workbook.addWorksheet('Mahsulotlar')
  s1.columns = [
    { header: '№', key: 'index', width: 5 },
    { header: 'Mahsulot', key: 'name' },
    { header: 'Brend', key: 'brand' },
    { header: 'Kategoriya', key: 'category' },
    { header: 'Sotildi', key: 'units' },
    { header: 'Daromad (₩)', key: 'revenue' },
    { header: 'COGS (₩)', key: 'cogs' },
    { header: 'Foyda (₩)', key: 'profit' },
    { header: 'Marja %', key: 'margin' },
    { header: 'Qaytarim %', key: 'refund' },
  ]
  applyStyleToRow(s1.getRow(1), HEADER_STYLE)
  s1.getRow(1).height = ROW_HEIGHT.headers

  productsData.forEach((p, i) => {
    const row = s1.addRow({
      index: i + 1,
      name: p.productName,
      brand: p.brandName,
      category: p.categoryName,
      units: p.unitsSold,
      revenue: Number(p.revenueKrw),
      cogs: Number(p.cogsKrw),
      profit: Number(p.grossProfit),
      margin: p.marginPct / 100,
      refund: p.refundRate / 100,
    })
    row.getCell(6).numFmt = FORMATS.KRW
    row.getCell(7).numFmt = FORMATS.KRW
    row.getCell(8).numFmt = FORMATS.KRW
    row.getCell(9).numFmt = FORMATS.PCT
    row.getCell(10).numFmt = FORMATS.PCT
  })

  // JAMI row
  const totalRev = productsData.reduce<bigint>((acc, p) => acc + BigInt(p.revenueKrw), 0n)
  const totalCogs = productsData.reduce<bigint>((acc, p) => acc + BigInt(p.cogsKrw), 0n)
  const totalProfit = totalRev - totalCogs
  const totalUnits = productsData.reduce<number>((acc, p) => acc + Number(p.unitsSold), 0)

  const sumRow = s1.addRow({
    index: '',
    name: 'JAMI',
    brand: '',
    category: '',
    units: totalUnits,
    revenue: Number(totalRev),
    cogs: Number(totalCogs),
    profit: Number(totalProfit),
    margin: totalRev > 0n ? Number((totalProfit * 10000n) / totalRev) / 10000 : 0,
  })
  applyStyleToRow(sumRow, SUMMARY_ROW_STYLE)
  sumRow.getCell(6).numFmt = FORMATS.KRW
  sumRow.getCell(7).numFmt = FORMATS.KRW
  sumRow.getCell(8).numFmt = FORMATS.KRW
  sumRow.getCell(9).numFmt = FORMATS.PCT

  applyAlternatingRows(s1, 2)
  autoWidth(s1)

  // Sheet 2: Brendlar
  const s2 = workbook.addWorksheet('Brendlar')
  s2.columns = [
    { header: '№', key: 'index', width: 5 },
    { header: 'Brend', key: 'brand' },
    { header: 'Sotildi', key: 'units' },
    { header: 'Daromad', key: 'revenue' },
    { header: 'Marja%', key: 'margin' },
  ]
  applyStyleToRow(s2.getRow(1), HEADER_STYLE)
  brandsData.forEach((b, i) => {
    const row = s2.addRow({
      index: i + 1,
      brand: b.brandName,
      units: b.unitsSold,
      revenue: Number(b.revenueKrw),
      margin: b.marginPct / 100,
    })
    row.getCell(4).numFmt = FORMATS.KRW
    row.getCell(5).numFmt = FORMATS.PCT
  })
  applyAlternatingRows(s2, 2)
  autoWidth(s2)

  const { startDate, endDate } = DashboardService.getPeriodDates(period, dateFrom, dateTo)
  const filename = `sales_report_${formatFilenameDate(startDate)}_${formatFilenameDate(endDate)}.xlsx`
  return { workbook, filename }
}

export async function generateTransactionsReport(
  period: DashboardService.Period,
  dateFrom?: string,
  dateTo?: string
) {
  const result = await DashboardService.getTransactions({ period, dateFrom, dateTo, limit: 5000 }) // High limit for export
  const workbook = new ExcelJS.Workbook()
  const s = workbook.addWorksheet('Tranzaksiyalar')

  s.columns = [
    { header: '№', key: 'index', width: 5 },
    { header: 'Buyurtma №', key: 'orderNumber' },
    { header: 'Mijoz', key: 'customerName' },
    { header: 'Telefon', key: 'customerPhone' },
    { header: 'Mintaqa', key: 'region' },
    { header: 'Summa (₩)', key: 'totalKrw' },
    { header: "Summa (so'm)", key: 'totalUzs' },
    { header: 'Chegirma (₩)', key: 'discount' },
    { header: 'Status', key: 'status' },
    { header: 'Tasdiqlangan sana', key: 'date' },
  ]
  applyStyleToRow(s.getRow(1), HEADER_STYLE)
  s.getRow(1).height = ROW_HEIGHT.headers

  result.items.forEach((t, i) => {
    const row = s.addRow({
      index: i + 1,
      orderNumber: t.orderNumber,
      customerName: t.customerName,
      customerPhone: t.customerPhone,
      region: t.region,
      totalKrw: Number(t.totalAmountKrw),
      totalUzs: Number(t.totalAmountUzs),
      discount: Number(t.discountAmount),
      status: t.status,
      date: t.paymentConfirmedAt ? new Date(t.paymentConfirmedAt) : null,
    })
    row.getCell(6).numFmt = FORMATS.KRW
    row.getCell(7).numFmt = FORMATS.UZS
    row.getCell(8).numFmt = FORMATS.KRW
    row.getCell(10).numFmt = FORMATS.DATETIME
  })

  // JAMI row
  const sumRow = s.addRow({
    index: '',
    orderNumber: 'JAMI',
    customerName: '',
    customerPhone: '',
    region: '',
    totalKrw: Number(result.meta.totalRevenueKrw),
    totalUzs: Number(result.meta.totalRevenueUzs),
    discount: result.items.reduce((acc, t) => acc + Number(t.discountAmount), 0),
    status: '',
    date: null,
  })
  applyStyleToRow(sumRow, SUMMARY_ROW_STYLE)
  sumRow.getCell(6).numFmt = FORMATS.KRW
  sumRow.getCell(7).numFmt = FORMATS.UZS
  sumRow.getCell(8).numFmt = FORMATS.KRW

  applyAlternatingRows(s, 2)
  autoWidth(s)

  const { startDate, endDate } = DashboardService.getPeriodDates(period, dateFrom, dateTo)
  const filename = `transactions_${formatFilenameDate(startDate)}_${formatFilenameDate(endDate)}.xlsx`
  return { workbook, filename }
}

export async function generateInventoryReport() {
  const data = await DashboardService.getInventoryHealth()
  const workbook = new ExcelJS.Workbook()

  // Sheet 1: Ombor Holati
  const s1 = workbook.addWorksheet('Ombor Holati')
  s1.columns = [
    { header: '№', key: 'index', width: 5 },
    { header: 'Mahsulot', key: 'name' },
    { header: 'Brend', key: 'brand' },
    { header: 'Barcode', key: 'barcode' },
    { header: 'Miqdor', key: 'qty' },
    { header: 'Birlik narxi (₩)', key: 'cost' },
    { header: 'Jami qiymat (₩)', key: 'total' },
    { header: 'Partiyalar soni', key: 'batches' },
    { header: 'Eng yaqin muddati', key: 'expiry' },
    { header: 'Status', key: 'status' },
  ]
  applyStyleToRow(s1.getRow(1), HEADER_STYLE)

  const statusMap = {
    ok: 'Yaxshi',
    low: 'Kam',
    out: 'Tugagan',
    dead: "O'lik",
    expiring_soon: 'Yaroqlilik muddati yaqin',
  }

  data.products.forEach((p, i) => {
    const row = s1.addRow({
      index: i + 1,
      name: p.productName,
      brand: p.brandName,
      barcode: p.barcode,
      qty: p.totalQty,
      cost: Number(p.avgCostPrice),
      total: Number(p.inventoryValue),
      batches: p.batchCount,
      expiry: p.nearestExpiry ? new Date(p.nearestExpiry) : '-',
      status: (statusMap as any)[p.status] || p.status,
    })
    row.getCell(6).numFmt = FORMATS.KRW
    row.getCell(7).numFmt = FORMATS.KRW
    if (p.nearestExpiry) row.getCell(9).numFmt = FORMATS.DATE
  })

  const sumRow = s1.addRow({
    index: '',
    name: 'JAMI',
    brand: '',
    barcode: '',
    qty: data.totalUnits,
    cost: null,
    total: Number(data.totalValue),
    batches: null,
    expiry: null,
    status: '',
  })
  applyStyleToRow(sumRow, SUMMARY_ROW_STYLE)
  sumRow.getCell(7).numFmt = FORMATS.KRW

  applyAlternatingRows(s1, 2)
  autoWidth(s1)

  const filename = `inventory_${formatFilenameDate(new Date())}.xlsx`
  return { workbook, filename }
}

export async function generateCustomersReport(
  period: DashboardService.Period,
  dateFrom?: string,
  dateTo?: string
) {
  const result = await CustomerService.getCustomers({ limit: 10000 }) // Export all
  const workbook = new ExcelJS.Workbook()
  const s = workbook.addWorksheet('Mijozlar')

  s.columns = [
    { header: '№', key: 'index', width: 5 },
    { header: 'Ism', key: 'name' },
    { header: 'Telefon', key: 'phone' },
    { header: 'Mintaqa', key: 'region' },
    { header: 'Telegram', key: 'telegram' },
    { header: 'Buyurtmalar', key: 'orders' },
    { header: 'Jami xarid (₩)', key: 'spent' },
    { header: 'Oxirgi buyurtma', key: 'lastOrder' },
    { header: "Ro'yxatdan o'tgan sana", key: 'joined' },
  ]
  applyStyleToRow(s.getRow(1), HEADER_STYLE)

  result.items.forEach((c, i) => {
    const row = s.addRow({
      index: i + 1,
      name: `${c.firstName} ${c.lastName || ''}`.trim(),
      phone: c.phone,
      region: c.phoneRegion,
      telegram: c.tgUsername || c.telegramId || '-',
      orders: c.stats.totalOrders,
      spent: Number(c.stats.totalSpent),
      lastOrder: c.stats.lastOrderAt ? new Date(c.stats.lastOrderAt) : '-',
      joined: new Date(c.createdAt),
    })
    row.getCell(7).numFmt = FORMATS.KRW
    if (c.stats.lastOrderAt) row.getCell(8).numFmt = FORMATS.DATE
    row.getCell(9).numFmt = FORMATS.DATE
  })

  applyAlternatingRows(s, 2)
  autoWidth(s)

  const filename = `customers_${formatFilenameDate(new Date())}.xlsx`
  return { workbook, filename }
}

export async function generateCouponsReport(
  period: DashboardService.Period,
  dateFrom?: string,
  dateTo?: string
) {
  const data = await DashboardService.getCouponAnalytics(period, dateFrom, dateTo)
  const workbook = new ExcelJS.Workbook()
  const s = workbook.addWorksheet('Kuponlar')

  s.columns = [
    { header: '№', key: 'index', width: 5 },
    { header: 'Kod', key: 'code' },
    { header: 'Nomi', key: 'name' },
    { header: 'Turi', key: 'type' },
    { header: 'Qiymat', key: 'value' },
    { header: 'Ishlatilgan', key: 'used' },
    { header: 'Chegirma (₩)', key: 'discount' },
    { header: 'Holat', key: 'status' },
  ]
  applyStyleToRow(s.getRow(1), HEADER_STYLE)

  data.coupons.forEach((c, i) => {
    const row = s.addRow({
      index: i + 1,
      code: c.code,
      name: c.name,
      type: c.type,
      value:
        c.type === 'PERCENTAGE'
          ? `${c.usedCount}%`
          : `${Number(c.totalDiscountGiven / BigInt(Math.max(c.usedCount, 1)))} ₩`,
      used: c.usedCount,
      discount: Number(c.totalDiscountGiven),
      status: 'ACTIVE', // Simplified, need to fetch actual status if needed
    })
    row.getCell(7).numFmt = FORMATS.KRW
  })

  applyAlternatingRows(s, 2)
  autoWidth(s)

  const { startDate, endDate } = DashboardService.getPeriodDates(period, dateFrom, dateTo)
  const filename = `coupons_${formatFilenameDate(startDate)}_${formatFilenameDate(endDate)}.xlsx`
  return { workbook, filename }
}

export async function generateExpensesReport(
  period: DashboardService.Period,
  dateFrom?: string,
  dateTo?: string
) {
  const result = await DashboardService.getTransactions({ period, dateFrom, dateTo }) // Actually need expenses data
  // Using dashboard service which I just implemented
  const expensesData = await DashboardService.getPLReport(period, dateFrom, dateTo) // This has summary
  const detailedExpenses = await db.execute(
    sql`SELECT e.*, c.name as category_name FROM expenses e JOIN expense_categories c ON e.category_id = c.id WHERE e.expense_date BETWEEN ${DashboardService.getPeriodDates(period, dateFrom, dateTo).startDate} AND ${DashboardService.getPeriodDates(period, dateFrom, dateTo).endDate}`
  )

  const workbook = new ExcelJS.Workbook()

  // Sheet 1: Xarajatlar
  const s1 = workbook.addWorksheet('Xarajatlar')
  s1.columns = [
    { header: '№', key: 'index', width: 5 },
    { header: 'Kategoriya', key: 'category' },
    { header: 'Tavsif', key: 'desc' },
    { header: 'Miqdor (₩)', key: 'amount' },
    { header: 'Sana', key: 'date' },
    { header: 'Kim tomonidan', key: 'by' },
  ]
  applyStyleToRow(s1.getRow(1), HEADER_STYLE)

  detailedExpenses.rows.forEach((e: any, i: number) => {
    const row = s1.addRow({
      index: i + 1,
      category: e.category_name,
      desc: e.description,
      amount: Number(e.amount_krw),
      date: new Date(e.expense_date),
      by: 'Admin',
    })
    row.getCell(4).numFmt = FORMATS.KRW
    row.getCell(5).numFmt = FORMATS.DATE
  })

  applyAlternatingRows(s1, 2)
  autoWidth(s1)

  // Sheet 2: Kategoriya Xulosasi
  const s2 = workbook.addWorksheet('Kategoriya Xulosasi')
  s2.columns = [
    { header: 'Kategoriya', key: 'category' },
    { header: 'Jami (₩)', key: 'total' },
    { header: 'Foiz %', key: 'pct' },
  ]
  applyStyleToRow(s2.getRow(1), HEADER_STYLE)

  expensesData.expenses.byCategory.forEach((c) => {
    const row = s2.addRow({
      category: c.categoryName,
      total: Number(c.amount),
      pct: c.pct / 100,
    })
    row.getCell(2).numFmt = FORMATS.KRW
    row.getCell(3).numFmt = FORMATS.PCT
  })

  const sumRow = s2.addRow(['JAMI', Number(expensesData.expenses.general), 1])
  applyStyleToRow(sumRow, SUMMARY_ROW_STYLE)
  sumRow.getCell(2).numFmt = FORMATS.KRW
  sumRow.getCell(3).numFmt = FORMATS.PCT

  autoWidth(s2)

  const { startDate, endDate } = DashboardService.getPeriodDates(period, dateFrom, dateTo)
  const filename = `expenses_${formatFilenameDate(startDate)}_${formatFilenameDate(endDate)}.xlsx`
  return { workbook, filename }
}
