import PDFDocument from 'pdfkit'
import axios from 'axios'
import { Response } from 'express'

interface InvoiceItem {
  productName: string
  brandName: string
  barcode: string
  sku: string
  quantity: number
  unitPrice: bigint // KRW
  subtotal: bigint // KRW
  isWholesale: boolean
  hasCoupon: boolean // if coupon applied to this item
  imageUrl?: string // Cloudinary URL (may be empty)
}

interface InvoiceData {
  order: {
    orderNumber: string
    createdAt: Date
    paymentConfirmedAt?: Date
    status: string
    subtotal: bigint // before discounts + cargo
    couponDiscount: bigint // from coupon
    orderDiscount: bigint // manual order level discount
    orderDiscountPct?: number // if percentage discount
    cargoFee: bigint
    totalAmount: bigint // final total
    couponCode?: string // if coupon used
    regionCode: string // UZB or KOR
  }
  items: InvoiceItem[]
  customer: { firstName: string; lastName?: string | null; phone: string }
  delivery: {
    fullName: string
    phone: string
    addressLine1: string
    addressLine2?: string | null
    city?: string | null
    province?: string | null
    postalCode?: string | null
    regionCode: string
  }
  exchangeRate?: { krwToUzs: number }
}

// ── ASYNC image loader ──────────────────

async function loadImageBuffer(url: string): Promise<Buffer | null> {
  if (!url) return null
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 5000,
      headers: { 'User-Agent': 'MiraInvoice/1.0' },
    })
    return Buffer.from(res.data)
  } catch {
    return null
  }
}

// ── Draw rounded image ──────────────────

function drawRoundedImage(
  doc: PDFKit.PDFDocument,
  buffer: Buffer,
  x: number,
  y: number,
  size: number,
  radius: number = 4
): void {
  doc
    .save()
    .roundedRect(x, y, size, size, radius)
    .clip()
    .image(buffer, x, y, { width: size, height: size, cover: [size, size] })
    .restore()
}

// ── Draw placeholder (when no image) ───

function drawImagePlaceholder(doc: PDFKit.PDFDocument, x: number, y: number, size: number): void {
  doc.save().roundedRect(x, y, size, size, 4).fillAndStroke('#f0f0f0', '#e0e0e0').restore()
  // Camera icon text
  doc
    .fillColor('#cccccc')
    .fontSize(8)
    .text('📷', x, y + size / 2 - 5, { width: size, align: 'center' })
}

// ── MAIN FUNCTION (now ASYNC) ───────────

export async function generateInvoicePDF(data: InvoiceData, res: Response): Promise<void> {
  // Pre-load all product images BEFORE starting PDF
  const imageBuffers: (Buffer | null)[] = await Promise.all(
    data.items.map((item) =>
      item.imageUrl ? loadImageBuffer(item.imageUrl) : Promise.resolve(null)
    )
  )

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: `Invoice ${data.order.orderNumber}`,
      Author: 'Mira Cosmetics',
    },
  })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="invoice-${data.order.orderNumber}.pdf"`
  )
  doc.pipe(res)

  const PINK = '#E11D74'
  const DARK = '#1a1a1a'
  const GRAY = '#666666'
  const LG = '#f5f5f5'
  const LINE = '#e0e0e0'
  const W = 495 // usable width (595 - 50*2)
  const IMG = 36 // product thumbnail size

  // Helper: format money
  const fmtKRW = (n: bigint) => `₩${Number(n).toLocaleString()}`
  const fmtUZS = (n: bigint, rate: number) =>
    `${Math.round(Number(n) * rate).toLocaleString()} so'm`
  const isUZB = data.order.regionCode === 'UZB'

  // ── HEADER ────────────────────────────
  doc.rect(50, 45, W, 65).fill(PINK)

  doc.fillColor('white').font('Helvetica-Bold').fontSize(20).text('MIRA COSMETICS', 65, 57)
  doc.font('Helvetica').fontSize(9).text('miracosmetics.uz  |  @mira_cosmetics_bot', 65, 82)

  // Right side
  const orderDate = (data.order.paymentConfirmedAt ?? data.order.createdAt).toLocaleDateString(
    'uz-Latn-UZ',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }
  )
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('HISOB-FAKTURA', 350, 57, { align: 'right', width: 195 })
  doc
    .font('Helvetica')
    .fontSize(9)
    .text(`#${data.order.orderNumber}`, 350, 73, { align: 'right', width: 195 })
    .text(orderDate, 350, 86, { align: 'right', width: 195 })

  // ── CUSTOMER + DELIVERY (2 columns) ──
  let y = 130
  const COL1 = 50
  const COL2 = 310

  // Section labels
  doc
    .fillColor(PINK)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text('MIJOZ:', COL1, y)
    .text('YETKAZISH BERISH:', COL2, y)

  y += 14
  // Customer
  doc
    .fillColor(DARK)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(`${data.customer.firstName} ${data.customer.lastName ?? ''}`, COL1, y)
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(GRAY)
    .text(data.customer.phone, COL1, y + 14)

  // Delivery address
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text(data.delivery.fullName, COL2, y)
  doc.font('Helvetica').fontSize(9).fillColor(GRAY)
  let addrY = y + 14
  doc.text(data.delivery.phone, COL2, addrY)
  addrY += 12
  doc.text(data.delivery.addressLine1, COL2, addrY, { width: 235 })
  addrY += 12
  if (data.delivery.city || data.delivery.province) {
    doc.text([data.delivery.province, data.delivery.city].filter(Boolean).join(', '), COL2, addrY)
    addrY += 12
  }
  if (data.delivery.postalCode) {
    doc.text(data.delivery.postalCode, COL2, addrY)
  }

  // ── DIVIDER ──────────────────────────
  y = 215
  doc.moveTo(50, y).lineTo(545, y).strokeColor(LINE).lineWidth(1).stroke()

  // ── ITEMS TABLE HEADER ───────────────
  y += 12
  const NAME_COL = 97
  const QTY_COL = 360
  const PRICE_COL = 400
  const TOTAL_COL = 450

  doc.rect(50, y, W, 22).fill(PINK)
  doc
    .fillColor('white')
    .font('Helvetica-Bold')
    .fontSize(8)
    .text('MAHSULOT', NAME_COL, y + 7)
    .text('MIQDOR', QTY_COL, y + 7, { width: 40, align: 'center' })
    .text(isUZB ? 'NARX (UZS)' : 'NARX (KRW)', PRICE_COL, y + 7, { width: 50, align: 'right' })
    .text(isUZB ? 'JAMI (UZS)' : 'JAMI (KRW)', TOTAL_COL, y + 7, { width: 90, align: 'right' })
  y += 22

  // ── ITEMS ─────────────────────────────
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]
    const ROW_H = 46

    // Alternate bg
    if (i % 2 === 0) {
      doc.rect(50, y, W, ROW_H).fill(LG)
    }

    // Product image (40x40 with rounded corners)
    const buf = imageBuffers[i]
    if (buf) {
      drawRoundedImage(doc, buf, COL1, y + 4, IMG, 4)
    } else {
      drawImagePlaceholder(doc, COL1, y + 4, IMG)
    }

    // Product name
    doc
      .fillColor(DARK)
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(item.productName, NAME_COL, y + 6, { width: 255 })

    // Barcode + tags
    let tagX = NAME_COL
    const tagY = y + 20
    doc.font('Helvetica').fontSize(7).fillColor(GRAY).text(`${item.barcode}`, tagX, tagY)

    // Wholesale badge
    if (item.isWholesale) {
      tagX += 70
      doc.roundedRect(tagX, tagY - 1, 35, 10, 2).fill('#FFF0F7')
      doc
        .fillColor(PINK)
        .font('Helvetica-Bold')
        .fontSize(6)
        .text('ULGUJI', tagX + 3, tagY + 1)
    }

    // Coupon badge
    if (item.hasCoupon) {
      tagX += item.isWholesale ? 42 : 70
      doc.roundedRect(tagX, tagY - 1, 38, 10, 2).fill('#F0FFF4')
      doc
        .fillColor('#16a34a')
        .font('Helvetica-Bold')
        .fontSize(6)
        .text('KUPON', tagX + 3, tagY + 1)
    }

    // Quantity
    doc
      .fillColor(DARK)
      .font('Helvetica')
      .fontSize(9)
      .text(item.quantity.toString(), QTY_COL, y + 14, { width: 40, align: 'center' })

    // Prices
    const unitDisplay =
      isUZB && data.exchangeRate
        ? fmtUZS(item.unitPrice, data.exchangeRate.krwToUzs)
        : fmtKRW(item.unitPrice)
    const totalDisplay =
      isUZB && data.exchangeRate
        ? fmtUZS(item.subtotal, data.exchangeRate.krwToUzs)
        : fmtKRW(item.subtotal)

    doc
      .fillColor(DARK)
      .font('Helvetica')
      .fontSize(9)
      .text(unitDisplay, PRICE_COL, y + 14, { width: 50, align: 'right' })
    doc.font('Helvetica-Bold').text(totalDisplay, TOTAL_COL, y + 14, { width: 90, align: 'right' })

    y += ROW_H
  }

  // ── TOTALS ────────────────────────────
  y += 8
  doc.moveTo(320, y).lineTo(545, y).strokeColor(LINE).stroke()
  y += 8

  const totalRowKRW = (label: string, val: bigint, color = GRAY) => {
    const display =
      isUZB && data.exchangeRate ? fmtUZS(val, data.exchangeRate.krwToUzs) : fmtKRW(val)
    doc.fillColor(color).font('Helvetica').fontSize(9).text(label, 320, y, { width: 135 })
    doc.text(display, 455, y, { width: 90, align: 'right' })
    y += 16
  }

  // Subtotal (before discounts)
  const itemsSubtotal = data.order.subtotal + data.order.couponDiscount + data.order.orderDiscount
  totalRowKRW('Mahsulotlar jami:', itemsSubtotal)

  // Coupon discount
  if (data.order.couponDiscount > 0n) {
    const couponLabel = data.order.couponCode
      ? `Kupon (${data.order.couponCode}):`
      : 'Kupon chegirma:'
    totalRowKRW(couponLabel, -data.order.couponDiscount, '#16a34a')
  }

  // Order level discount
  if (data.order.orderDiscount > 0n) {
    const discLabel = data.order.orderDiscountPct
      ? `Chegirma (${data.order.orderDiscountPct}%):`
      : "Qo'shimcha chegirma:"
    totalRowKRW(discLabel, -data.order.orderDiscount, '#16a34a')
  }

  // Cargo
  if (data.order.cargoFee > 0n) {
    totalRowKRW('Yetkazish:', data.order.cargoFee, GRAY)
  } else {
    doc
      .fillColor('#16a34a')
      .font('Helvetica')
      .fontSize(9)
      .text('Yetkazish:', 320, y, { width: 135 })
      .text('BEPUL', 455, y, { width: 90, align: 'right' })
    y += 16
  }

  // Total line
  doc.moveTo(320, y).lineTo(545, y).strokeColor(PINK).lineWidth(1.5).stroke()
  y += 6
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11).text('JAMI:', 320, y, { width: 135 })
  const totalDisplay =
    isUZB && data.exchangeRate
      ? fmtUZS(data.order.totalAmount, data.exchangeRate.krwToUzs)
      : fmtKRW(data.order.totalAmount)
  doc
    .fillColor(PINK)
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(totalDisplay, 455, y, { width: 90, align: 'right' })
  y += 18

  // Dual currency (KOR customers → show UZS equivalent, UZB → show KRW)
  if (isUZB && data.exchangeRate) {
    doc
      .fillColor(GRAY)
      .font('Helvetica')
      .fontSize(8)
      .text(
        `= ${fmtKRW(data.order.totalAmount)} (kurs: 1₩ = ${data.exchangeRate.krwToUzs} so'm)`,
        320,
        y,
        {
          width: 225,
          align: 'right',
        }
      )
    y += 14
  }

  // ── FOOTER ────────────────────────────
  const FOOTER_Y = 760 // A4 bottom area
  doc.moveTo(50, FOOTER_Y).lineTo(545, FOOTER_Y).strokeColor(LINE).lineWidth(0.5).stroke()

  doc
    .fillColor(GRAY)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text('Mira Cosmetics', 50, FOOTER_Y + 8)
  doc
    .font('Helvetica')
    .fontSize(8)
    .text('miracosmetics.uz', 50, FOOTER_Y + 19)
    .text('@mira_cosmetics_bot', 50, FOOTER_Y + 30)

  doc
    .fillColor(PINK)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text('Xaridingiz uchun rahmat! 🌸', 0, FOOTER_Y + 19, { align: 'center', width: 595 })

  doc.end()
}
