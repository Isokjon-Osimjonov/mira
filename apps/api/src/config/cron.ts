import cron from 'node-cron'
import { execSync } from 'child_process'
import * as fs from 'fs'
import { InputFile } from 'grammy'
import { env } from './env'
import { logger } from './logger'
import {
  cancelExpiredOrders,
  reconcileDailySummary,
  sendDeadlineReminders,
} from '../modules/orders/orders.service'
import { fetchAndSaveExchangeRate } from '../modules/exchange-rates/exchange-rates.service'
import { checkExpiringBatches, checkAllProductsStock } from '../modules/inventory/inventory.service'
import { bot } from '../bot/bot'
import { sendAdminAlert } from '../bot/helpers/notify'

// Store tasks globally to prevent duplicates during development hot-reloads
declare global {
  var __cronInitialized: boolean | undefined
}

export function initCronJobs(): void {
  if (env.NODE_ENV === 'test') return

  if (global.__cronInitialized) {
    logger.info('Cron jobs already initialized, skipping...')
    return
  }

  global.__cronInitialized = true

  // 1. Auto-cancel — every minute
  cron.schedule(
    '* * * * *',
    async () => {
      try {
        const count = await cancelExpiredOrders()
        if (count > 0) {
          logger.info(`Auto-cancel: ${count} ta buyurtma bekor qilindi`)
        }
      } catch (err: any) {
        logger.error({ err: err.message }, 'Auto-cancel cron error')
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
        logger.info(`Kurs yangilandi: 1 KRW = ${rate.krwToUzs} UZS`)
      } catch (err: any) {
        logger.error({ err: err.message }, 'Exchange rate cron error')
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
        logger.info('Kunlik hisobot tekshirildi')
      } catch (err: any) {
        logger.error({ err: err.message }, 'Reconciliation cron error')
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
        logger.error({ err: err.message }, 'Deadline reminder cron error')
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
        logger.info('Muddati tekshirildi')
      } catch (err: any) {
        logger.error({ err: err.message }, 'Expiry check cron error')
      }
    },
    { timezone: 'Asia/Seoul' }
  )

  // 8. Daily low stock check — 08:05 KST
  cron.schedule(
    '5 8 * * *',
    async () => {
      try {
        await checkAllProductsStock()
        logger.info('Kam qoldiq tekshirildi')
      } catch (err: any) {
        logger.error(
          { err: err.message },
          'Low stock check cron error'
        )
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
        logger.info('Backup muvaffaqiyatli')
      } catch (err: any) {
        logger.error(
          { err: err.message },
          'Backup cron error'
        )
      }
    },
    { timezone: 'Asia/Seoul' }
  )

  logger.info('Cron jobs initialized')
}

export async function backupDatabase(): Promise<void> {
  const timestamp = new Date().toISOString().slice(0, 10)
  const filename = `mira_backup_${timestamp}.sql`
  const filepath = `/tmp/${filename}`

  try {
    // Run pg_dump directly
    execSync(
      `pg_dump "${env.DATABASE_URL}"` +
      ` -f "${filepath}"` +
      ` --no-owner --clean`,
      { timeout: 60000 }
    )

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
    logger.info(`Backup yuborildi: ${sizeMB} MB`)
  } catch (err: any) {
    logger.error({ err: err.message }, 'Backup error')
    await sendAdminAlert(`❌ DB backup xatolik: ${err.message}`)
  }
}
