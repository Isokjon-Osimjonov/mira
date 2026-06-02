import { bot } from '../bot'
import { env } from '../../config/env'
import { sendPushNotification } from '../../lib/push'
import { db } from '../../config/db'
import { notificationsLog } from '@mira/db'

// Send message to admin group
export async function sendAdminAlert(message: string): Promise<void> {
  try {
    await bot.api.sendMessage(env.ADMIN_GROUP_CHAT_ID, message, {
      parse_mode: 'HTML',
    })
  } catch (err) {
    console.error('Admin alert failed:', err)
  }
}

// New order alert
export async function notifyNewOrder(data: {
  orderNumber: string
  customerName: string
  customerPhone: string
  region: string
  totalAmount: number
  itemCount: number
}): Promise<void> {
  await sendAdminAlert(
    `🛒 <b>YANGI BUYURTMA!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 <b>${data.orderNumber}</b>\n` +
      `👤 ${data.customerName} ${data.customerPhone}\n` +
      `🌍 ${data.region} | ${data.itemCount} ta mahsulot\n` +
      `💰 ₩${data.totalAmount.toLocaleString()}\n` +
      `⏰ To'lov kutilmoqda`
  )
}

// Payment submitted alert
export async function notifyPaymentSubmitted(data: {
  orderNumber: string
  customerName: string
  paymentMethod: string
  paymentAmount: string
}): Promise<void> {
  await sendAdminAlert(
    `💳 <b>TO'LOV YUKLANDI!</b>\n` +
      `📦 ${data.orderNumber} — ${data.customerName}\n` +
      `🏦 ${data.paymentMethod}: ${data.paymentAmount}\n` +
      `✅ Tekshiring: admin.miracosmetics.uz`
  )
}

// Low stock alert
export async function notifyLowStock(data: {
  productName: string
  barcode: string
  currentQty: number
  threshold: number
}): Promise<void> {
  await sendAdminAlert(
    `⚠️ <b>STOK KAMAYDI!</b>\n` +
      `💄 ${data.productName}\n` +
      `📊 Qoldi: ${data.currentQty} dona (limit: ${data.threshold})\n` +
      `🔗 admin.miracosmetics.uz/inventory`
  )
}

// Customer OTP via bot DM (already in auth handler)
// Order status to customer
export async function notifyCustomer(telegramId: number, message: string): Promise<void> {
  try {
    await bot.api.sendMessage(telegramId, message, { parse_mode: 'HTML' })
  } catch (err) {
    console.error('Customer notify failed:', err)
  }
}

interface NotifyCustomerParams {
  customerId: string
  telegramId?: number | bigint | null
  expoPushToken?: string | null
  type: string // one of notificationTypeEnum values
  channel: 'TELEGRAM' | 'PUSH' | 'BOTH'
  title: string // shown in push notification
  body: string // shown in push notification
  telegramMessage?: string // HTML formatted for Telegram (if different from body)
  data?: {
    // for mobile deep linking
    orderId?: string
    productId?: string
    type?: string
  }
}

export async function notifyCustomerFull(params: NotifyCustomerParams): Promise<void> {
  const {
    customerId,
    telegramId,
    expoPushToken,
    type,
    channel,
    title,
    body,
    telegramMessage,
    data,
  } = params

  let telegramSent = false
  let pushSent = false

  // 1. Telegram DM (if telegramId exists and channel includes TELEGRAM)
  if (telegramId && (channel === 'TELEGRAM' || channel === 'BOTH')) {
    try {
      const tgId = typeof telegramId === 'bigint' ? Number(telegramId) : telegramId
      await notifyCustomer(tgId, telegramMessage ?? body)
      telegramSent = true
    } catch (err: any) {
      console.error('Telegram notify failed:', err.message)
    }
  }

  // 2. Push notification (if token exists and channel includes PUSH)
  if (expoPushToken && (channel === 'PUSH' || channel === 'BOTH')) {
    await sendPushNotification({ token: expoPushToken, title, body, data })
    pushSent = true
  }

  // 3. Always log in notifications_log (for in-app notification center)
  const actualChannel =
    telegramSent && pushSent ? 'BOTH' : telegramSent ? 'TELEGRAM' : pushSent ? 'PUSH' : 'PUSH' // default

  try {
    await db.insert(notificationsLog).values({
      customerId,
      type: type as any,
      channel: actualChannel,
      title,
      body,
      data: data ?? null,
      orderId: data?.orderId ?? null,
      status: 'SENT',
      sentAt: new Date(),
    })
  } catch (err: any) {
    console.error('Notification log failed:', err.message)
  }
}
