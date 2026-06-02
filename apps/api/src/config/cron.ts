import cron from 'node-cron'
import { execSync } from 'child_process'
import * as fs from 'fs'
import { InputFile } from 'grammy'
import { env } from './env'
import {
  cancelExpiredOrders,
  reconcileDailySummary,
  sendDeadlineReminders,
} from '../modules/orders/orders.service'
import { fetchAndSaveExchangeRate } from '../modules/exchange-rates/exchange-rates.service'
import { sendScheduledPosts } from '../modules/telegram/telegram.service'
import { checkExpiringBatches } from '../modules/inventory/inventory.service'
import { bot } from '../bot/bot'
import { sendAdminAlert } from '../bot/helpers/notify'

export function initCronJobs(): void {
  if (env.NODE_ENV === 'test') return

  // 1. Auto-cancel — every minute
  cron.schedule(
    '* * * * *',
    async () => {
      try {
        const count = await cancelExpiredOrders()
        if (count > 0) {
          console.log(`🕐 Auto-cancel: ${count} ta buyurtma bekor qilindi`)
        }
      } catch (err: any) {
        console.error('❌ Auto-cancel cron error:', err.message)
      }
    },
    { timezone: 'Asia/Seoul' }
  )

  // 2. Exchange rate — daily 09:00 KST
  cron.schedule(
    '0 0 * * *',
    async () => {
      try {
        if (!env.EXCHANGE_RATE_API_KEY) return
        const rate = await fetchAndSaveExchangeRate()
        console.log(`💱 Kurs yangilandi: 1 KRW = ${rate.krwToUzs} UZS`)
      } catch (err: any) {
        console.error('❌ Exchange rate cron error:', err.message)
      }
    },
    { timezone: 'Asia/Seoul' }
  )

  // 3. Scheduled telegram posts — every 5 min
  cron.schedule(
    '*/5 * * * *',
    async () => {
      try {
        const count = await sendScheduledPosts()
        if (count > 0) {
          console.log(`📢 ${count} ta post yuborildi`)
        }
      } catch (err: any) {
        console.error('❌ Telegram posts cron error:', err.message)
      }
    },
    { timezone: 'Asia/Seoul' }
  )

  // 4. Daily reconciliation — 23:59
  cron.schedule(
    '59 23 * * *',
    async () => {
      try {
        await reconcileDailySummary()
        console.log('📊 Kunlik hisobot tekshirildi')
      } catch (err: any) {
        console.error('❌ Reconciliation cron error:', err.message)
      }
    },
    { timezone: 'Asia/Seoul' }
  )

  // 5. Deadline reminders — every minute
  cron.schedule(
    '* * * * *',
    async () => {
      try {
        await sendDeadlineReminders()
      } catch (err: any) {
        console.error('❌ Deadline reminder cron error:', err.message)
      }
    },
    { timezone: 'Asia/Seoul' }
  )

  // 6. Expiry check — daily 08:00 KST
  cron.schedule(
    '0 8 * * *',
    async () => {
      try {
        await checkExpiringBatches()
        console.log('📅 Muddati tekshirildi')
      } catch (err: any) {
        console.error('❌ Expiry check cron error:', err.message)
      }
    },
    { timezone: 'Asia/Seoul' }
  )

  // 7. DB Backup — daily 03:00 KST
  cron.schedule(
    '0 3 * * *',
    async () => {
      try {
        await backupDatabase()
      } catch (err: any) {
        console.error('❌ Backup cron error:', err.message)
      }
    },
    { timezone: 'Asia/Seoul' }
  )

  console.log('⏰ Cron jobs started')
}

export async function backupDatabase(): Promise<void> {
  const timestamp = new Date().toISOString().slice(0, 10)
  const filename = `mira_backup_${timestamp}.sql`
  const filepath = `/tmp/${filename}`

  try {
    // Run pg_dump
    execSync(`pg_dump ${env.DATABASE_URL} -f ${filepath} --no-owner --clean`, { timeout: 60000 })

    // Gzip
    execSync(`gzip ${filepath}`)
    const gzPath = `${filepath}.gz`

    // Get file size
    const stats = fs.statSync(gzPath)
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2)

    // Send to admin Telegram group
    await bot.api.sendDocument(env.ADMIN_GROUP_CHAT_ID, new InputFile(gzPath, `${filename}.gz`), {
      caption: `🗄 <b>DB Backup</b>\n📅 ${timestamp}\n📦 ${sizeMB} MB`,
      parse_mode: 'HTML',
    })

    // Cleanup
    fs.unlinkSync(gzPath)
    console.log(`✅ Backup yuborildi: ${sizeMB} MB`)
  } catch (err: any) {
    console.error('❌ Backup error:', err.message)
    await sendAdminAlert(`❌ DB backup xatolik: ${err.message}`)
  }
}
