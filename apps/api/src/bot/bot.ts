import { Bot } from 'grammy'
import { env } from '../config/env'
import { authHandlers } from './handlers/auth'

export const bot = new Bot(env.BOT_TOKEN)

// Register handlers
bot.use(authHandlers)

bot.catch((err) => {
  console.error('Bot error:', err.message)
})

export async function startBot(): Promise<void> {
  await bot.start({
    onStart: () => {
      console.log(`🤖 Bot running: @${env.BOT_USERNAME}`)
    },
  })
}
