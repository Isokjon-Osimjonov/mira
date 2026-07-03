import { format } from 'date-fns'

interface InvoiceItem {
  name: string
  brandName?: string | null
  barcode?: string | null
  quantity: number
  unitPrice: bigint | string | number
  subtotal: bigint | string | number
  retailPrice?: bigint | string | number | null
  wholesalePrice?: bigint | string | number | null
  isWholesale: boolean
}

interface InvoiceData {
  orderNumber: string
  createdAt: Date | string
  regionCode: 'KOR' | 'UZB'
  customerName: string
  customerPhone: string
  deliveryAddress: string
  subtotal: bigint | string | number
  cargoFee: bigint | string | number
  boxCostKrw?: bigint | string | number | null
  totalAmount: bigint | string | number
  discountAmount?: bigint | string | number | null
  couponCode?: string | null
  items: InvoiceItem[]
}

function formatPrice(
  amount: bigint | string | number,
  region: 'KOR' | 'UZB'
): string {
  const num = Math.round(Number(amount))
  // Both regions show KRW since all price
  // snapshots are stored in KRW
  return `₩${num.toLocaleString('ko-KR')}`
}

export function generateInvoiceHtml(
  data: InvoiceData
): string {
  const dateStr = format(
    new Date(data.createdAt),
    'dd.MM.yyyy HH:mm'
  )
  const region = data.regionCode

  // Calculate retail sum for savings display
  const retailSum = data.items.reduce((acc, item) => {
    const retail = item.retailPrice
      ? BigInt(Math.round(Number(item.retailPrice)))
      : BigInt(Math.round(Number(item.unitPrice)))
    return acc + retail * BigInt(item.quantity)
  }, 0n)

  const wholesaleSavings =
    retailSum - BigInt(Math.round(Number(data.subtotal)))
  const couponSavings =
    BigInt(Math.round(Number(data.discountAmount || 0)))
  const totalSavings = wholesaleSavings + couponSavings

  const itemsHtml = data.items.map(item => {
    const unitPrice =
      BigInt(Math.round(Number(item.unitPrice)))
    const retailPrice = item.retailPrice
      ? BigInt(Math.round(Number(item.retailPrice)))
      : null
    const hasDiscount =
      retailPrice !== null && retailPrice > unitPrice

    return `
    <tr style="border-bottom:0.5px solid #eee;">
      <td style="padding:8px;text-align:left;">
        <div style="font-size:12px;font-weight:500;
          color:#000;">${item.name}</div>
        <div style="font-size:10px;color:#888;">
          ${item.brandName ?? ''}
          ${item.barcode ? `• ${item.barcode}` : ''}
        </div>
      </td>
      <td style="padding:8px;text-align:center;
        font-size:12px;">${item.quantity}</td>
      <td style="padding:8px;text-align:right;
        font-size:12px;">
        ${hasDiscount
          ? `<div style="font-size:10px;color:#888;
              text-decoration:line-through;">
              ${formatPrice(retailPrice!, region)}
             </div>`
          : ''}
        <div>${formatPrice(item.unitPrice, region)}</div>
        ${item.isWholesale
          ? `<div style="font-size:9px;
              color:#16a34a;font-weight:500;">
              (ulgurji)</div>`
          : ''}
      </td>
      <td style="padding:8px;text-align:right;
        font-size:12px;font-weight:500;">
        ${formatPrice(item.subtotal, region)}
      </td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport"
    content="width=device-width,initial-scale=1.0">
  <title>Hisob-faktura ${data.orderNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #f0f0f0;
      font-family: system-ui,-apple-system,sans-serif;
      color: #333; line-height: 1.4;
    }
    .invoice-page {
      width: 210mm; min-height: 297mm;
      margin: 20px auto; background: #fff;
      padding: 15mm 20mm;
      display: flex; flex-direction: column;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    @media print {
      @page { size: A4 portrait; margin: 15mm 20mm; }
      body { background: #fff; }
      .invoice-page {
        box-shadow: none; margin: 0;
        width: 100%; min-height: auto; padding: 0;
      }
      .no-print { display: none !important; }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }
    .brand-name {
      font-size: 18px; font-weight: 700;
      color: #7C3AED; letter-spacing: -0.5px;
    }
    .brand-url { font-size: 10px; color: #888; }
    .invoice-title {
      font-size: 13px; font-weight: 600;
      text-align: right;
    }
    .invoice-meta {
      font-size: 10px; color: #888;
      text-align: right;
    }
    .divider { border-top: 0.5px solid #e0e0e0; }
    .customer-delivery {
      display: flex;
      justify-content: space-between;
      padding: 12px 0; margin-bottom: 4px;
    }
    .section-label {
      font-size: 9px; color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px; margin-bottom: 4px;
    }
    .customer-name {
      font-size: 12px; font-weight: 600;
      margin-bottom: 2px;
    }
    .detail { font-size: 10px; color: #888; }
    .delivery-address {
      font-size: 10px; color: #888;
      max-width: 200px; text-align: right;
    }
    .products-table {
      width: 100%; border-collapse: collapse;
      margin: 16px 0;
    }
    .products-table th {
      font-size: 9px; color: #888;
      text-transform: uppercase;
      padding: 6px 8px; font-weight: 500;
      border-top: 0.5px solid #e0e0e0;
      border-bottom: 0.5px solid #e0e0e0;
      background: #fafafa;
    }
    .totals {
      display: flex; flex-direction: column;
      align-items: flex-end;
      gap: 5px; margin-top: 8px;
      padding-right: 8px;
    }
    .total-row {
      display: flex; justify-content: space-between;
      width: 230px; font-size: 11px;
    }
    .total-row.main {
      font-size: 14px; font-weight: 700;
      color: #7C3AED;
      border-top: 1.5px solid #7C3AED;
      padding-top: 8px; margin-top: 4px;
    }
    .savings { color: #16a34a; }
    .footer {
      margin-top: auto;
      border-top: 0.5px solid #e0e0e0;
      padding-top: 14px;
      display: flex; justify-content: space-between;
    }
    .footer-brand {
      font-size: 11px; font-weight: 600;
      color: #7C3AED; margin-bottom: 4px;
    }
    .footer-detail {
      font-size: 10px; color: #888;
      margin-bottom: 2px;
    }
    .footer-thanks {
      font-size: 10px; color: #888;
      font-style: italic; text-align: center;
      margin-top: 14px;
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;
    padding:16px 0 20px;display:flex;gap:8px;
    justify-content:center;">
    <button onclick="window.print()" style="
      padding:8px 20px;font-size:12px;
      font-weight:500;cursor:pointer;
      border:none;background:#7C3AED;
      color:#fff;border-radius:6px;">
      🖨️ Chop etish
    </button>
    <button onclick="window.print()" style="
      padding:8px 20px;font-size:12px;
      font-weight:500;cursor:pointer;
      border:1px solid #7C3AED;
      background:#fff;color:#7C3AED;
      border-radius:6px;">
      📥 PDF saqlash
    </button>
  </div>

  <div class="invoice-page">
    <div class="header">
      <div>
        <div class="brand-name">Mira Market</div>
        <div class="brand-url">miramarket.uz</div>
      </div>
      <div>
        <div class="invoice-title">
          Hisob-faktura
        </div>
        <div class="invoice-meta">
          № ${data.orderNumber}
        </div>
        <div class="invoice-meta">${dateStr}</div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="customer-delivery">
      <div>
        <div class="section-label">MIJOZ</div>
        <div class="customer-name">
          ${data.customerName}
        </div>
        <div class="detail">${data.customerPhone}</div>
        <div class="detail">
          ${region === 'KOR'
            ? '🇰🇷 Koreya' : "🇺🇿 O'zbekiston"}
        </div>
      </div>
      <div>
        <div class="section-label">
          YETKAZIB BERISH
        </div>
        <div class="delivery-address">
          ${data.deliveryAddress}
        </div>
      </div>
    </div>

    <div class="divider" style="margin-bottom:4px;">
    </div>

    <table class="products-table">
      <thead>
        <tr>
          <th style="text-align:left;">MAHSULOT</th>
          <th style="text-align:center;width:55px;">
            MIQDOR</th>
          <th style="text-align:right;width:110px;">
            NARX</th>
          <th style="text-align:right;width:110px;">
            JAMI</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <div class="totals">

      ${wholesaleSavings > 0n ? `
      <div class="total-row">
        <span>Chakana jami</span>
        <span>${formatPrice(retailSum, region)}</span>
      </div>
      <div class="total-row savings">
        <span>Ulgurji chegirma</span>
        <span>−${formatPrice(
          wholesaleSavings, region)}</span>
      </div>` : ''}

      <div class="total-row">
        <span>Mahsulotlar jami</span>
        <span>${formatPrice(
          data.subtotal, region)}</span>
      </div>

      ${data.couponCode && couponSavings > 0n ? `
      <div class="total-row savings">
        <span>Kupon (${data.couponCode})</span>
        <span>−${formatPrice(
          couponSavings, region)}</span>
      </div>` : ''}

      ${Number(data.cargoFee) > 0 ? `
      <div class="total-row">
        <span>${region === 'KOR'
          ? 'Yetkazib berish'
          : 'Kargo'}</span>
        <span>${formatPrice(
          data.cargoFee, region)}</span>
      </div>` : ''}

      ${data.boxCostKrw
        && Number(data.boxCostKrw) > 0 ? `
      <div class="total-row">
        <span>Quti narxi</span>
        <span>${formatPrice(
          data.boxCostKrw, region)}</span>
      </div>` : ''}

      <div class="total-row main">
        <span>JAMI TO'LOV</span>
        <span>${formatPrice(
          data.totalAmount, region)}</span>
      </div>

      ${totalSavings > 0n ? `
      <div class="total-row savings" style="
        font-weight:500;
        border-top:0.5px dashed #16a34a;
        padding-top:5px;margin-top:2px;">
        <span>✨ Tejadingiz</span>
        <span>${formatPrice(
          totalSavings, region)}</span>
      </div>` : ''}
    </div>

    <div class="footer">
      <div>
        <div class="footer-brand">Mira Market</div>
        <div class="footer-detail">DI COSMETICS</div>
        <div class="footer-detail">
          서울특별시 양천구 가로공원로71길 2, 1층
        </div>
        <div class="footer-detail">
          Ro'yxat: 472-41-01304
        </div>
      </div>
      <div style="text-align:right;">
        <div class="footer-detail">
          miramarket.uz
        </div>
        <div class="footer-detail">
          Telegram: @mira_cosmetics_bot
        </div>
      </div>
    </div>

    <div class="footer-thanks">
      Xaridingiz uchun rahmat! 🌸
    </div>
  </div>
</body>
</html>`
}
