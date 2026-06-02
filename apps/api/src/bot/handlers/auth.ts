import { Composer } from 'grammy'
import { db } from '../../config/db'
import { authTokens, customers } from '@mira/db'
import { eq, and, gt } from 'drizzle-orm'
import { generateOtp } from '../../lib/otp'

export const authHandlers = new Composer()

// /start TOKEN — OTP flow
authHandlers.command('start', async (ctx) => {
  console.log('🤖 /start received, token:', ctx.match?.slice(0, 20))
  const token = ctx.match?.trim()

  if (!token) {
    await ctx.reply(
      `🌸 <b>Mira Cosmetics</b> botiga xush kelibsiz!\n\nIlovani yuklab, ro'yxatdan o'ting.`,
      { parse_mode: 'HTML' }
    )
    return
  }

  try {
    const [authToken] = await db
      .select()
      .from(authTokens)
      .where(
        and(
          eq(authTokens.token, token),
          eq(authTokens.used, false),
          gt(authTokens.expiresAt, new Date())
        )
      )
      .limit(1)

    if (!authToken) {
      await ctx.reply(`❌ Token topilmadi yoki muddati o'tgan.\nIltimos, ilovada qayta urinib ko'ring.`)
      return
    }

    const otp = generateOtp()
    const telegramId = ctx.from!.id

    await db
      .update(authTokens)
      .set({ otp, telegramId })
      .where(eq(authTokens.id, authToken.id))

    const [existing] = await db
      .select({ firstName: customers.firstName })
      .from(customers)
      .where(eq(customers.phone, authToken.phone))
      .limit(1)

    const greeting = existing
      ? `Xush kelibsiz, <b>${existing.firstName}</b>! 👋`
      : `Xush kelibsiz! 🌸`

    await ctx.reply(
      `${greeting}\n\n🔐 Tasdiqlash kodi:\n\n<code>${otp}</code>\n\n⏱ Amal qilish muddati: <b>5 daqiqa</b>\n\n⚠️ Bu kodni <b>hech kimga bermang!</b>`,
      { parse_mode: 'HTML' }
    )

  } catch (err) {
    console.error('Bot /start error:', err)
    await ctx.reply('Xatolik yuz berdi. Iltimos qayta urinib ko\'ring.')
  }
})
