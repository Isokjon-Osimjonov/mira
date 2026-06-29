import { Queue, Worker } from 'bullmq'
import { getRedis } from './redis'
import { queueLogger } from './logger'
import { env } from './env'

const connection = () => ({
  host: new URL(env.REDIS_URL).hostname,
  port: parseInt(new URL(env.REDIS_URL).port || '6379'),
})

// ── Queue definitions ──────────────────

export const notificationQueue = new Queue('notifications', {
  connection: connection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
})

export const paymentDeadlineQueue = new Queue('payment-deadline', {
  connection: connection(),
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: true,
    removeOnFail: { count: 20 },
  },
})

export const telegramPostQueue = new Queue('telegram-posts', {
  connection: connection(),
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: true,
  },
})

// ── Notification Worker ────────────────

export const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    const { type, params } = job.data

    if (type === 'CUSTOMER_NOTIFY') {
      const { notifyCustomerFull } = await import('../bot/helpers/notify')
      await notifyCustomerFull(params)
    }

    if (type === 'ADMIN_ALERT') {
      const { sendAdminAlert } = await import('../bot/helpers/notify')
      await sendAdminAlert(params.message)
    }

    // Waitlist notification removed

    queueLogger.info({ jobId: job.id, type }, 'Notification processed')
  },
  { connection: connection(), concurrency: 10 }
)

// ── Payment Deadline Worker ────────────

export const paymentDeadlineWorker = new Worker(
  'payment-deadline',
  async (job) => {
    const { orderId, type } = job.data

    if (type === 'REMINDER') {
      const { sendDeadlineReminders } = await import('../modules/orders/orders.service')
      // Note: Implementation of sending a specific reminder will be done by adapting sendDeadlineReminders
      // Or we can just use the existing cron for now if it gets complex to refactor.
      // But let's assume we create a sendOrderDeadlineReminder for a specific order.
      const { sendOrderDeadlineReminder } = await import('../modules/orders/orders.service')
      await sendOrderDeadlineReminder(orderId)
    }

    if (type === 'AUTO_CANCEL') {
      const { cancelOrder } = await import('../modules/orders/orders.service')
      await cancelOrder(orderId, null, "To'lov muddati o'tdi")
    }

    queueLogger.info({ jobId: job.id, orderId, type }, 'Deadline job done')
  },
  { connection: connection(), concurrency: 5 }
)

// ── Telegram Post Worker ───────────────

export const telegramPostWorker = new Worker(
  'telegram-posts',
  async (job) => {
    const { postId } = job.data
    const { sendPost } = await import('../modules/telegram/telegram.service')
    await sendPost(postId)
    queueLogger.info({ jobId: job.id, postId }, 'Telegram post sent')
  },
  { connection: connection(), concurrency: 3 }
)

// ── Error handlers ─────────────────────
;[notificationWorker, paymentDeadlineWorker, telegramPostWorker].forEach((worker) => {
  worker.on('failed', (job, err) => {
    queueLogger.error(
      {
        jobId: job?.id,
        queue: job?.queueName,
        err: err.message,
        attempts: job?.attemptsMade,
      },
      'Job failed'
    )
  })
})

// ── Helper: queue notification ─────────

export async function queueNotification(
  type: 'CUSTOMER_NOTIFY' | 'ADMIN_ALERT' | 'WAITLIST',
  params: unknown
): Promise<void> {
  try {
    await notificationQueue.add(
      type,
      { type, params },
      {
        priority: type === 'ADMIN_ALERT' ? 1 : 2,
      }
    )
  } catch (err: any) {
    queueLogger.error({ err: err.message }, 'Failed to queue notification')
    // Fallback: try direct send
    if (type === 'ADMIN_ALERT') {
      const { sendAdminAlert } = await import('../bot/helpers/notify')
      await sendAdminAlert((params as any).message).catch(() => {})
    }
  }
}

// ── Schedule payment deadline job ──────

export async function schedulePaymentDeadline(orderId: string, deadline: Date): Promise<void> {
  if (!getRedis()) return // skip if Redis unavailable

  const now = Date.now()
  const deadlineMs = deadline.getTime()

  // Reminder: 10 min before deadline
  const reminderDelay = deadlineMs - now - 10 * 60 * 1000
  if (reminderDelay > 0) {
    await paymentDeadlineQueue.add(
      'reminder',
      { orderId, type: 'REMINDER' },
      {
        delay: reminderDelay,
        jobId: `reminder-${orderId}`, // dedup
        attempts: 2,
      }
    )
  }

  // Auto-cancel: at deadline
  const cancelDelay = deadlineMs - now + 5000 // 5s buffer
  if (cancelDelay > 0) {
    await paymentDeadlineQueue.add(
      'auto-cancel',
      { orderId, type: 'AUTO_CANCEL' },
      {
        delay: cancelDelay,
        jobId: `cancel-${orderId}`, // dedup
        attempts: 2,
      }
    )
  }
}

// ── Schedule telegram post ─────────────

export async function scheduleTelegramPost(postId: string, scheduledAt: Date): Promise<void> {
  if (!getRedis()) return
  const delay = scheduledAt.getTime() - Date.now()
  if (delay <= 0) return
  await telegramPostQueue.add(
    'send-post',
    { postId },
    {
      delay,
      jobId: `post-${postId}`, // dedup
      attempts: 2,
    }
  )
}

export function initQueues(): void {
  if (!getRedis()) {
    queueLogger.warn('Redis unavailable — queues disabled, using cron fallback')
    return
  }
  queueLogger.info('BullMQ queues initialized')
}
