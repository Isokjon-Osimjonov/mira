import PDFDocument from 'pdfkit'
import { Response } from 'express'

interface InvoiceData {
  order: {
    orderNumber: string
    createdAt: Date
    status: string
    totalAmount: bigint
    discountAmount: bigint
    cargoFee: bigint
    currency: string
  }
  items: Array<{
    productName: string
    quantity: number
    unitPrice: bigint
    subtotal: bigint
    isWholesale: boolean
  }>
  customer: {
    firstName: string
    lastName: string | null
    phone: string
  }
  delivery: {
    fullName: string
    phone: string
    addressLine1: string
    city?: string
    postalCode?: string
    regionCode: string
  }
  company: {
    name: string
    website: string
    telegram: string
  }
  exchangeRate?: {
    krwToUzs: number
  }
}

export function generateInvoicePDF(data: InvoiceData, res: Response): void {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: `Invoice ${data.order.orderNumber}`,
      Author: 'Mira Cosmetics',
    },
  })

  // Stream to response
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${data.order.orderNumber}.pdf"`)
  doc.pipe(res)

  const PINK = '#E11D74'
  const DARK = '#1a1a1a'
  const GRAY = '#666666'
  const W = 495 // page width (595 - 50*2)

  // ── HEADER ──────────────────────────────
  // Logo/Company block
  doc.rect(50, 50, W, 70).fill(PINK)
  doc.fillColor('white').fontSize(24).font('Helvetica-Bold').text('MIRA COSMETICS', 70, 65)
  doc.fontSize(10).font('Helvetica').text('miracosmetics.uz | @mira_cosmetics_bot', 70, 95)

  // Invoice label
  doc
    .fillColor('white')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('HISOB-FAKTURA', 400, 65, { align: 'right', width: 140 })
  doc
    .fontSize(10)
    .font('Helvetica')
    .text(`#${data.order.orderNumber}`, 400, 85, { align: 'right', width: 140 })

  // ── ORDER INFO ───────────────────────────
  let y = 140
  doc.fillColor(DARK).fontSize(10)

  // Left: customer info
  doc.font('Helvetica-Bold').text('MIJOZ:', 50, y)
  doc
    .font('Helvetica')
    .text(`${data.customer.firstName} ${data.customer.lastName ?? ''}`, 50, y + 15)
    .text(data.customer.phone, 50, y + 28)

  // Right: order meta
  const orderDate = data.order.createdAt.toLocaleDateString('uz-UZ')
  doc.font('Helvetica-Bold').text('SANA:', 350, y, { width: 195, align: 'right' })
  doc.font('Helvetica').text(orderDate, 350, y + 15, { width: 195, align: 'right' })

  // ── DELIVERY ADDRESS ────────────────────
  y += 70
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#eeeeee').stroke()
  y += 10

  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text('YETKAZISH MANZILI:', 50, y)
  y += 15
  doc
    .font('Helvetica')
    .fillColor(GRAY)
    .text(data.delivery.fullName, 50, y)
    .text(data.delivery.phone, 50, y + 13)
    .text(data.delivery.addressLine1, 50, y + 26)
  if (data.delivery.city) {
    doc.text(`${data.delivery.city}, ${data.delivery.postalCode ?? ''}`, 50, y + 39)
  }

  // ── ITEMS TABLE ─────────────────────────
  y += 80

  // Table header
  doc.rect(50, y, W, 25).fill(PINK)
  doc
    .fillColor('white')
    .font('Helvetica-Bold')
    .fontSize(9)
    .text('MAHSULOT', 55, y + 8)
    .text('MIQDOR', 320, y + 8, { width: 50, align: 'center' })
    .text('NARX (KRW)', 370, y + 8, { width: 80, align: 'right' })
    .text('JAMI (KRW)', 450, y + 8, { width: 90, align: 'right' })

  y += 25

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]
    const rowY = y + i * 30

    // Alternate row bg
    if (i % 2 === 0) {
      doc.rect(50, rowY, W, 30).fill('#fafafa')
    }

    doc
      .fillColor(DARK)
      .font('Helvetica')
      .fontSize(9)
      .text(item.productName, 55, rowY + 10, { width: 260 })
      .text(item.quantity.toString(), 320, rowY + 10, { width: 50, align: 'center' })
      .text(`₩${Number(item.unitPrice).toLocaleString()}`, 370, rowY + 10, {
        width: 80,
        align: 'right',
      })
      .text(`₩${Number(item.subtotal).toLocaleString()}`, 450, rowY + 10, {
        width: 90,
        align: 'right',
      })

    if (item.isWholesale) {
      doc.fillColor(PINK).fontSize(7).text('Ulguji', 55, rowY + 20)
    }
  }

  y += data.items.length * 30 + 10

  // ── TOTALS ───────────────────────────────
  doc.moveTo(350, y).lineTo(545, y).strokeColor('#dddddd').stroke()
  y += 10

  const addTotalRow = (label: string, amount: bigint, bold = false) => {
    if (bold) {
      doc.font('Helvetica-Bold').fillColor(DARK)
    } else {
      doc.font('Helvetica').fillColor(GRAY)
    }
    doc
      .fontSize(10)
      .text(label, 350, y, { width: 100 })
      .text(`₩${Number(amount).toLocaleString()}`, 450, y, { width: 90, align: 'right' })
    y += 18
  }

  addTotalRow(
    'Mahsulotlar:',
    data.order.totalAmount - data.order.cargoFee + data.order.discountAmount
  )
  if (data.order.discountAmount > 0n) {
    addTotalRow('Chegirma:', -data.order.discountAmount)
  }
  if (data.order.cargoFee > 0n) {
    addTotalRow('Yetkazish:', data.order.cargoFee)
  }
  doc.moveTo(350, y).lineTo(545, y).strokeColor(PINK).lineWidth(1).stroke()
  y += 5
  addTotalRow('JAMI:', data.order.totalAmount, true)

  // UZS equivalent if available
  if (data.exchangeRate && data.delivery.regionCode === 'UZB') {
    const uzsTotal = Math.round(Number(data.order.totalAmount) * data.exchangeRate.krwToUzs)
    doc.font('Helvetica').fillColor(GRAY).fontSize(9).text(`≈ ${uzsTotal.toLocaleString()} so'm`, 350, y)
    y += 20
  }

  // ── FOOTER ───────────────────────────────
  y = 750 // near bottom of A4
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#eeeeee').stroke()
  doc
    .fillColor(GRAY)
    .fontSize(8)
    .font('Helvetica')
    .text('Xaridingiz uchun rahmat! • miracosmetics.uz', 50, y + 10, { align: 'center', width: W })

  doc.end()
}
