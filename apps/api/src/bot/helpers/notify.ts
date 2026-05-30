import { bot } from '../bot'
import { env } from '../../config/env'

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
