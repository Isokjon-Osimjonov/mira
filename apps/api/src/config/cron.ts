import cron from 'node-cron'
import { env } from './env'
import { cancelExpiredOrders, reconcileDailySummary, sendDeadlineReminders } from '../modules/orders/orders.service'
import { fetchAndSaveExchangeRate } from '../modules/exchange-rates/exchange-rates.service'
import { sendScheduledPosts } from '../modules/telegram/telegram.service'

export function initCronJobs(): void {
  if (env.NODE_ENV === 'test') return

  // 1. Auto-cancel — every minute
  cron.schedule('* * * * *', async () => {
    try {
      const count = await cancelExpiredOrders()
      if (count > 0) {
        console.log(`🕐 Auto-cancel: ${count} ta buyurtma bekor qilindi`)
      }
    } catch (err: any) {
      console.error('❌ Auto-cancel cron error:', err.message)
    }
  }, { timezone: 'Asia/Seoul' })

  // 2. Exchange rate — daily 09:00 KST
  cron.schedule('0 0 * * *', async () => {
    try {
      if (!env.EXCHANGE_RATE_API_KEY) return
      const rate = await fetchAndSaveExchangeRate()
      console.log(`💱 Kurs yangilandi: 1 KRW = ${rate.krwToUzs} UZS`)
    } catch (err: any) {
      console.error('❌ Exchange rate cron error:', err.message)
    }
  }, { timezone: 'Asia/Seoul' })

  // 3. Scheduled telegram posts — every 5 min
  cron.schedule('*/5 * * * *', async () => {
    try {
      const count = await sendScheduledPosts()
      if (count > 0) {
        console.log(`📢 ${count} ta post yuborildi`)
      }
    } catch (err: any) {
      console.error('❌ Telegram posts cron error:', err.message)
    }
  }, { timezone: 'Asia/Seoul' })

  // 4. Daily reconciliation — 23:59
  cron.schedule('59 23 * * *', async () => {
    try {
      await reconcileDailySummary()
      console.log('📊 Kunlik hisobot tekshirildi')
    } catch (err: any) {
      console.error('❌ Reconciliation cron error:', err.message)
    }
  }, { timezone: 'Asia/Seoul' })

  // 5. Deadline reminders — every minute
  cron.schedule('* * * * *', async () => {
    try {
      await sendDeadlineReminders()
    } catch (err: any) {
      console.error('❌ Deadline reminder cron error:', err.message)
    }
  }, { timezone: 'Asia/Seoul' })

  console.log('⏰ Cron jobs started')
}
