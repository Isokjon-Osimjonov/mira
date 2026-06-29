// libs/shared-types/src/socket-events.ts
// Complete event definitions — Socket.io + Telegram Bot

// ─────────────────────────────────────────────────────────────
// SOCKET.IO EVENTS
// Server → Admin Panel (real-time UI updates)
// ─────────────────────────────────────────────────────────────

export interface SocketEvents {
  // ── ORDERS ──────────────────────────────────────────────────

  'order:new': {
    orderId: string
    orderNumber: string // MIRA-260529-0001
    customerId: string
    customerName: string
    region: 'UZB' | 'KOR'
    totalAmount: number // KRW
    createdAt: string
  }

  'order:status_changed': {
    orderId: string
    orderNumber: string
    fromStatus: string
    toStatus: string
    changedBy: string | null // admin name or 'system'
    note: string | null
    changedAt: string
  }

  'order:auto_canceled': {
    orderId: string
    orderNumber: string
    reason: 'payment_deadline_expired'
    canceledAt: string
  }

  // ── PAYMENTS ────────────────────────────────────────────────

  'payment:receipt_uploaded': {
    orderId: string
    orderNumber: string
    customerId: string
    customerName: string
    customerPhone: string
    receiptUrl: string
    paymentMethod: string
    paymentAmount: number
    paymentCurrency: string // KRW or UZS
    uploadedAt: string
  }

  'payment:confirmed': {
    orderId: string
    orderNumber: string
    confirmedBy: string // admin name
    confirmedAt: string
  }

  'payment:rejected': {
    orderId: string
    orderNumber: string
    rejectedBy: string
    reason: string // shown to customer
    rejectedAt: string
  }

  // ── INVENTORY ───────────────────────────────────────────────

  'stock:low': {
    productId: string
    productName: string
    barcode: string
    currentQty: number
    threshold: number // settings.low_stock_threshold
    batchCount: number
  }

  'stock:out': {
    productId: string
    productName: string
    barcode: string
    outAt: string
  }

  'stock:back': {
    productId: string
    productName: string
    barcode: string
    newQty: number
    batchId: string
    receivedAt: string
  }

  // ── CUSTOMERS ───────────────────────────────────────────────

  'customer:new': {
    customerId: string
    phone: string
    region: string
    registeredAt: string
  }

  // ── EXCHANGE RATES ───────────────────────────────────────────

  'exchange_rate:updated': {
    krwToUzs: number
    usdToKrw: number
    cargoRateKrw: number
    source: 'API' | 'MANUAL'
    updatedAt: string
  }

  'settings:updated': {}

  // ── SYSTEM ──────────────────────────────────────────────────

  'admin:connected': {
    adminId: string
    adminName: string
    connectedAt: string
  }

  'notification:count': {
    unreadOrders: number // new orders waiting action
    pendingPayments: number // receipts waiting verification
    lowStockItems: number
  }
}

// Client → Server
export interface ClientSocketEvents {
  'admin:join': { adminId: string; token: string }
  'admin:leave': {}
  'order:viewed': { orderId: string } // mark as seen
  'notification:mark_read': { type: string } // clear badge
}

// ─────────────────────────────────────────────────────────────
// TELEGRAM BOT NOTIFICATIONS
// Grammy.js → Telegram chats
// ─────────────────────────────────────────────────────────────

export type TelegramNotificationTarget =
  | { type: 'customer'; telegramId: number } // customer Telegram DM
  | { type: 'admin_group'; chatId: string } // admin group/channel
  | { type: 'admin_user'; telegramId: number } // specific admin's DM

export interface TelegramNotifications {
  // ─────────────────────────────────────────
  // CUSTOMER NOTIFICATIONS (DM via bot)
  // ─────────────────────────────────────────

  'customer.otp': {
    target: TelegramNotificationTarget
    otp: string
    ttl: number // minutes
    // Message:
    // 🔐 Tasdiqlash kodi: 123456
    // ⏱ Amal qilish muddati: 5 daqiqa
  }

  'customer.order_confirmed': {
    target: TelegramNotificationTarget
    orderNumber: string
    totalAmount: number
    currency: string
    paymentDeadlineMinutes: number
    // Message:
    // ✅ Buyurtmangiz qabul qilindi!
    // 📦 #MIRA-260529-0001
    // 💰 ₩144,200
    // ⏰ To'lovni 30 daqiqa ichida yuklang
  }

  'customer.payment_deadline_reminder': {
    target: TelegramNotificationTarget
    orderNumber: string
    minutesRemaining: number
    // Message:
    // ⚠️ Diqqat! Buyurtma #MIRA-260529-0001
    // To'lovni yuklashga 10 daqiqa qoldi!
    // Aks holda buyurtma bekor qilinadi.
  }

  'customer.payment_confirmed': {
    target: TelegramNotificationTarget
    orderNumber: string
    // Message:
    // 💚 To'lovingiz tasdiqlandi!
    // 📦 #MIRA-260529-0001 tayyorlanmoqda
  }

  'customer.payment_rejected': {
    target: TelegramNotificationTarget
    orderNumber: string
    reason: string
    // Message:
    // ❌ To'lov kvitansiyasi rad etildi
    // 📦 #MIRA-260529-0001
    // 💬 Sabab: {reason}
    // 🔄 Iltimos, qayta yuklang
  }

  'customer.order_shipped': {
    target: TelegramNotificationTarget
    orderNumber: string
    trackingNumber: string | null
    // Message:
    // 🚀 Buyurtmangiz yo'lda!
    // 📦 #MIRA-260529-0001
    // 🔍 Kuzatuv raqami: {trackingNumber}
  }

  'customer.order_delivered': {
    target: TelegramNotificationTarget
    orderNumber: string
    // Message:
    // 🎉 Buyurtmangiz yetib keldi!
    // 📦 #MIRA-260529-0001
    // Xaridingizdan mamnun bo'lishingizni umid qilamiz 🌸
  }

  'customer.order_canceled': {
    target: TelegramNotificationTarget
    orderNumber: string
    reason: 'auto_cancel' | 'admin_cancel' | 'customer_cancel'
    // Message:
    // ❌ Buyurtma bekor qilindi
    // 📦 #MIRA-260529-0001
  }

  'customer.stock_back': {
    target: TelegramNotificationTarget
    productName: string
    productUrl: string // deep link to product in app
    // Message:
    // 🌟 Kutgan mahsulotingiz mavjud bo'ldi!
    // 💄 {productName}
    // 👆 Buyurtma berish uchun bosing
  }

  // ─────────────────────────────────────────
  // ADMIN NOTIFICATIONS (group/DM)
  // ─────────────────────────────────────────

  'admin.new_order': {
    target: TelegramNotificationTarget
    orderNumber: string
    customerName: string
    customerPhone: string
    region: string
    totalAmount: number
    itemCount: number
    // Message:
    // 🛒 YANGI BUYURTMA!
    // ━━━━━━━━━━━━━━━━━━━━
    // 📦 #MIRA-260529-0001
    // 👤 Isokjon +998901234567
    // 🌍 UZB | 3 ta mahsulot
    // 💰 ₩144,200
    // ⏰ To'lov kutilmoqda
  }

  'admin.payment_submitted': {
    target: TelegramNotificationTarget
    orderNumber: string
    customerName: string
    paymentMethod: string
    paymentAmount: string // formatted with currency
    // Message:
    // 💳 TO'LOV YUKLANDI!
    // 📦 #MIRA-260529-0001 — Isokjon
    // 🏦 Korean Bank: ₩144,200
    // ✅ Tekshiring: admin.miracosmetics.uz
  }

  'admin.low_stock_alert': {
    target: TelegramNotificationTarget
    productName: string
    barcode: string
    currentQty: number
    threshold: number
    // Message:
    // ⚠️ STOK KAMAYDI!
    // 💄 COSRX Snail Mucin Serum
    // 📊 Qoldi: 5 dona (limit: 10)
    // 🔗 Yangilash: admin.miracosmetics.uz/inventory
  }

  'admin.out_of_stock': {
    target: TelegramNotificationTarget
    productName: string
    // Message:
    // 🚨 STOK TUGADI!
    // 💄 {productName}
    // Darhol inventar to'ldiring!
  }

  'admin.order_auto_canceled': {
    target: TelegramNotificationTarget
    orderNumber: string
    reason: string
    // Message:
    // ⏰ Buyurtma avtomatik bekor qilindi
    // 📦 #MIRA-260529-0001
    // Sabab: To'lov muddati o'tdi
  }

  'admin.daily_summary': {
    target: TelegramNotificationTarget
    date: string
    orderCount: number
    revenue: number
    newCustomers: number
    // Message (har kuni soat 23:59):
    // 📊 KUNLIK HISOBOT — 29.05.2026
    // ━━━━━━━━━━━━━━━━━━━━
    // 🛒 Buyurtmalar: 12
    // 💰 Daromad: ₩1,840,000
    // 👥 Yangi mijozlar: 3
    // 📦 Jo'natilgan: 8
  }
}
