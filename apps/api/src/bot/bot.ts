import { Bot } from 'grammy'
import { limit } from '@grammyjs/ratelimiter'
import { env } from '../config/env'
import { logger } from '../config/logger'
import { authHandlers } from './handlers/auth'

export const bot = new Bot(env.BOT_TOKEN)

bot.use(
  limit({
    timeFrame: 3000,
    limit: 2,
    onLimitExceeded: async (ctx) => {
      await ctx.reply('⏳ Iltimos biroz kuting...')
    },
  })
)

// Register handlers
bot.use(authHandlers)

bot.catch((err) => {
  console.error('Bot error:', err.message)
})

export async function startBot(): Promise<void> {
  await bot.start({
    onStart: () => {
      logger.info(`🤖 Bot running: @${env.BOT_USERNAME}`)
    },
  })
}
