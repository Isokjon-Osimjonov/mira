import { db } from '../../config/db'
import {
  telegramChannels,
  telegramPosts,
  telegramPostChannels,
  telegramPostSettings,
  products,
  productRegionalConfigs,
} from '@mira/db'
import { eq, and, sql, desc, asc, isNull, inArray, count } from 'drizzle-orm'
import { bot } from '../../bot/bot'
import { env } from '../../config/env'
import { openai, VISION_MODEL } from '../../config/openai'
import type {
  CreateChannelDto,
  UpdateChannelDto,
  CreatePostDto,
  UpdatePostDto,
} from './telegram.schema'
import { logger } from '../../config/logger'

// ─── AI Caption ─────────────────────────────────────────────────────────

export async function generateCaption(params: {
  productId: string
  showRetail: boolean
  showWholesale: boolean
  phone?: string
  language?: 'uz' | 'ko'
}) {
  const [product] = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.descriptionUz,
      brandName: products.brandName,
    })
    .from(products)
    .where(eq(products.id, params.productId))
    .limit(1)

  if (!product) throw { status: 404, message: 'Mahsulot topilmadi' }

  const configs = await db
    .select()
    .from(productRegionalConfigs)
    .where(
      and(
        eq(productRegionalConfigs.productId, params.productId),
        eq(productRegionalConfigs.regionCode, 'KOR')
      )
    )
    .limit(1)

  const config = configs[0]
  const retailPrice = config?.retailPrice || 0n
  const wholesalePrice = config?.wholesalePrice || 0n

  const AI_PROMPT = `
Sen Mira Cosmetics marketing mutaxassisisan.
Quyidagi mahsulot uchun Telegram post matni yoz.

Mahsulot: ${product.name}
Brend: ${product.brandName}
Tavsif: ${product.description ?? ''}

QOIDA - aynan shu formatda yoz:

[Qisqa catchphrase — 1 jumla, emoji bilan]

[MAHSULOT NOMI KATTA HARFDA]

[2-3 jumla tavsif, foydalari haqida]

✦ [Xususiyat 1]
✦ [Xususiyat 2]
✦ [Xususiyat 3]

Faqat MATN qismini yoz.
Narxlar, telefon, linklar QO'SHMA.
Hashtaglar: #${product.brandName?.replace(/\s+/g, '') || 'MiraCosmetics'} #Kosmetika
Uzbek tilida yoz. Emoji ishlatish mumkin.
Maksimal 5 qator.
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: AI_PROMPT }],
    })

    const caption = response.choices[0].message.content || ''
    return { caption }
  } catch (error) {
    logger.error({ error, productId: params.productId }, 'OpenAI caption generation failed')
    throw { status: 502, message: 'AI matn yaratishda xatolik yuz berdi' }
  }
}

// ─── Channels ────────────────────────────────────────────────────────────

export async function getChannels(query: { isActive?: boolean }) {
  let where: any = sql`1=1`
  if (query.isActive !== undefined) {
    where = and(where, eq(telegramChannels.isActive, query.isActive))
  }

  const items = await db
    .select({
      id: telegramChannels.id,
      chatId: telegramChannels.chatId,
      channelName: telegramChannels.channelName,
      channelUsername: telegramChannels.channelUsername,
      regionCode: telegramChannels.regionCode,
      isActive: telegramChannels.isActive,
      createdAt: telegramChannels.createdAt,
      lastPostAt: sql<Date>`(SELECT MAX(sent_at) FROM telegram_post_channels WHERE channel_id = ${telegramChannels.id})`,
      postCount:
        sql<number>`(SELECT COUNT(*) FROM telegram_post_channels WHERE channel_id = ${telegramChannels.id} AND status = 'SENT')`.mapWith(
          Number
        ),
    })
    .from(telegramChannels)
    .where(where)
    .orderBy(asc(telegramChannels.channelName))

  return items
}

export async function createChannel(data: CreateChannelDto, adminId: string) {
  // Check unique chatId
  const [existing] = await db
    .select()
    .from(telegramChannels)
    .where(eq(telegramChannels.chatId, data.chatId))
    .limit(1)
  if (existing)
    throw {
      status: 409,
      code: 'CHANNEL_DUPLICATE',
      message: "Ushbu chat ID allaqachon ro'yxatdan o'tgan",
    }

  // Test bot access
  try {
    await bot.api.getChat(data.chatId)
  } catch (err) {
    throw {
      status: 400,
      code: 'CHANNEL_BOT_NOT_ADMIN',
      message: 'Bot bu kanalga kira olmaydi. Botni admin qiling.',
    }
  }

  const [created] = await db
    .insert(telegramChannels)
    .values({
      ...data,
      addedBy: adminId,
    })
    .returning()

  return created
}

export async function updateChannel(id: string, data: UpdateChannelDto) {
  const [updated] = await db
    .update(telegramChannels)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(telegramChannels.id, id))
    .returning()
  if (!updated) throw { status: 404, code: 'CHANNEL_NOT_FOUND', message: 'Kanal topilmadi' }
  return updated
}

export async function deleteChannel(id: string) {
  const [deleted] = await db.delete(telegramChannels).where(eq(telegramChannels.id, id)).returning()
  if (!deleted) throw { status: 404, code: 'CHANNEL_NOT_FOUND', message: 'Kanal topilmadi' }
  return deleted
}

export async function testChannel(id: string) {
  const [channel] = await db
    .select()
    .from(telegramChannels)
    .where(eq(telegramChannels.id, id))
    .limit(1)
  if (!channel) throw { status: 404, code: 'CHANNEL_NOT_FOUND', message: 'Kanal topilmadi' }

  try {
    const chat = await bot.api.getChat(channel.chatId)
    await bot.api.sendMessage(channel.chatId, '✅ Mira Cosmetics bot ulanishi tasdiqlandi!')
    return { success: true, chatTitle: (chat as any).title || (chat as any).first_name }
  } catch (err) {
    throw {
      status: 400,
      code: 'CHANNEL_BOT_NOT_ADMIN',
      message: 'Xabar yuborishda xatolik yuz berdi. Bot kanalda adminligini tekshiring.',
    }
  }
}

// ─── Settings ────────────────────────────────────────────────────────────

export async function getTelegramPostSettings() {
  const [settings] = await db.select().from(telegramPostSettings).limit(1)
  return settings
}

export async function updateTelegramPostSettings(data: {
  phone?: string
  link1Label?: string
  link1Url?: string
  link2Label?: string
  link2Url?: string
  link3Label?: string
  link3Url?: string
}) {
  const [settings] = await db.select().from(telegramPostSettings).limit(1)
  const [updated] = await db
    .update(telegramPostSettings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(telegramPostSettings.id, settings.id))
    .returning()
  return updated
}

// ─── Posts ───────────────────────────────────────────────────────────────

export async function getPosts(query: {
  page?: number
  limit?: number
  status?: string
  dateFrom?: string
  dateTo?: string
}) {
  const page = query.page || 1
  const limit = query.limit || 20
  const offset = (page - 1) * limit

  let where: any = sql`1=1`
  if (query.status) where = and(where, eq(telegramPosts.status, query.status as any))
  if (query.dateFrom)
    where = and(where, sql`${telegramPosts.createdAt} >= ${new Date(query.dateFrom)}`)
  if (query.dateTo) where = and(where, sql`${telegramPosts.createdAt} <= ${new Date(query.dateTo)}`)

  const itemsQuery = await db
    .select({
      post: telegramPosts,
      channelCount:
        sql<number>`(SELECT COUNT(*) FROM telegram_post_channels WHERE post_id = ${telegramPosts.id})`.mapWith(
          Number
        ),
    })
    .from(telegramPosts)
    .where(where)
    .orderBy(desc(telegramPosts.createdAt))
    .limit(limit)
    .offset(offset)

  const [countRes] = await db.select({ count: count() }).from(telegramPosts).where(where)
  const total = Number(countRes?.count || 0)

  return {
    items: itemsQuery.map((row) => ({ ...row.post, channelCount: row.channelCount })),
    meta: { page, limit, total, hasNext: offset + limit < total, hasPrev: page > 1 },
  }
}

export async function getPostById(id: string) {
  const [post] = await db.select().from(telegramPosts).where(eq(telegramPosts.id, id)).limit(1)
  if (!post) throw { status: 404, code: 'POST_NOT_FOUND', message: 'Post topilmadi' }

  const postChannels = await db
    .select({
      id: telegramPostChannels.id,
      status: telegramPostChannels.status,
      sentAt: telegramPostChannels.sentAt,
      errorMsg: telegramPostChannels.errorMsg,
      channelId: telegramChannels.id,
      channelName: telegramChannels.channelName,
      chatId: telegramChannels.chatId,
    })
    .from(telegramPostChannels)
    .innerJoin(telegramChannels, eq(telegramPostChannels.channelId, telegramChannels.id))
    .where(eq(telegramPostChannels.postId, id))

  return { ...post, channels: postChannels }
}

export async function createPost(data: CreatePostDto, adminId: string) {
  // 1. Each channel verify exists and isActive
  const channels = await db
    .select()
    .from(telegramChannels)
    .where(and(inArray(telegramChannels.id, data.channelIds), eq(telegramChannels.isActive, true)))
  if (channels.length === 0)
    throw { status: 400, message: "Hech bo'lmaganda bitta faol kanalni tanlang" }

  const newPost = await db.transaction(async (tx) => {
    const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null
    const isImmediate = !scheduledAt || scheduledAt <= new Date()

    const [post] = await tx
      .insert(telegramPosts)
      .values({
        title: data.title,
        content: data.content,
        imageUrl: data.imageUrl,
        productId: data.productId,
        status: isImmediate ? 'DRAFT' : 'SCHEDULED',
        scheduledAt: scheduledAt,
        createdBy: adminId,
      })
      .returning()

    const postChannelsToInsert = data.channelIds.map((cid) => ({
      postId: post.id,
      channelId: cid,
      status: 'PENDING',
    }))

    await tx.insert(telegramPostChannels).values(postChannelsToInsert as any)

    return post
  })

  if (newPost.scheduledAt && newPost.status === 'SCHEDULED') {
    const { scheduleTelegramPost } = await import('../../config/queues')
    await scheduleTelegramPost(newPost.id, newPost.scheduledAt).catch((e) =>
      console.error('Failed to schedule telegram post:', e)
    )
  }

  return newPost
}

export async function updatePost(id: string, data: UpdatePostDto) {
  const [post] = await db.select().from(telegramPosts).where(eq(telegramPosts.id, id)).limit(1)
  if (!post) throw { status: 404, code: 'POST_NOT_FOUND', message: 'Post topilmadi' }
  if (post.status === 'SENT')
    throw {
      status: 400,
      code: 'POST_ALREADY_SENT',
      message: "Yuborilgan postni tahrirlab bo'lmaydi",
    }

  return await db.transaction(async (tx) => {
    const updates: any = { updatedAt: new Date() }
    if (data.title !== undefined) updates.title = data.title
    if (data.content !== undefined) updates.content = data.content
    if (data.imageUrl !== undefined) updates.imageUrl = data.imageUrl
    if (data.productId !== undefined) updates.productId = data.productId
    if (data.scheduledAt !== undefined) {
      const sch = data.scheduledAt ? new Date(data.scheduledAt) : null
      updates.scheduledAt = sch
      updates.status = sch && sch > new Date() ? 'SCHEDULED' : 'DRAFT'
    }

    const [updated] = await tx
      .update(telegramPosts)
      .set(updates)
      .where(eq(telegramPosts.id, id))
      .returning()

    if (data.channelIds) {
      await tx.delete(telegramPostChannels).where(eq(telegramPostChannels.postId, id))
      const postChannelsToInsert = data.channelIds.map((cid) => ({
        postId: id,
        channelId: cid,
        status: 'PENDING',
      }))
      await tx.insert(telegramPostChannels).values(postChannelsToInsert as any)
    }

    // Reschedule if needed
    if (data.scheduledAt) {
      const sch = new Date(data.scheduledAt)
      if (sch > new Date()) {
        const { scheduleTelegramPost } = await import('../../config/queues')
        await scheduleTelegramPost(id, sch).catch((e) =>
          console.error('Failed to reschedule telegram post:', e)
        )
      }
    }

    return updated
  })
}

export async function deletePost(id: string) {
  const [post] = await db.select().from(telegramPosts).where(eq(telegramPosts.id, id)).limit(1)
  if (!post) throw { status: 404, code: 'POST_NOT_FOUND', message: 'Post topilmadi' }
  if (post.status === 'SENT')
    throw { status: 400, code: 'FORBIDDEN', message: "Yuborilgan postni o'chirib bo'lmaydi" }

  const [deleted] = await db
    .update(telegramPosts)
    .set({ status: 'ARCHIVED', updatedAt: new Date() })
    .where(eq(telegramPosts.id, id))
    .returning()
  return deleted
}

// ─── Broadcast Logic ─────────────────────────────────────────────────────

export async function sendPost(postId: string): Promise<void> {
  const [post] = await db.select().from(telegramPosts).where(eq(telegramPosts.id, postId)).limit(1)
  if (!post || post.status === 'ARCHIVED') return

  // Update overall post status to starting
  await db
    .update(telegramPosts)
    .set({ status: 'SENT', sentAt: new Date() })
    .where(eq(telegramPosts.id, postId))

  const channels = await db
    .select({
      id: telegramPostChannels.id,
      chatId: telegramChannels.chatId,
    })
    .from(telegramPostChannels)
    .innerJoin(telegramChannels, eq(telegramPostChannels.channelId, telegramChannels.id))
    .where(and(eq(telegramPostChannels.postId, postId), eq(telegramPostChannels.status, 'PENDING')))

  let allSent = true
  let anyFailed = false

  for (const chan of channels) {
    try {
      let text = post.content

      // Length limits
      const limit = post.imageUrl ? 1024 : 4096
      if (text.length > limit) {
        text = text.substring(0, limit - 3) + '...'
      }

      let res: any
      if (post.imageUrl) {
        res = await bot.api.sendPhoto(chan.chatId, post.imageUrl, {
          caption: text,
          parse_mode: 'HTML',
        })
      } else {
        res = await bot.api.sendMessage(chan.chatId, text, {
          parse_mode: 'HTML',
        })
      }

      await db
        .update(telegramPostChannels)
        .set({
          status: 'SENT',
          sentAt: new Date(),
          telegramMessageId: res.message_id.toString(),
        })
        .where(eq(telegramPostChannels.id, chan.id))
    } catch (err: any) {
      allSent = false
      anyFailed = true
      await db
        .update(telegramPostChannels)
        .set({
          status: 'FAILED',
          errorMsg: err.message,
        })
        .where(eq(telegramPostChannels.id, chan.id))
    }
  }

  const finalStatus = allSent ? 'SENT' : anyFailed ? 'FAILED' : 'SENT'
  await db.update(telegramPosts).set({ status: finalStatus }).where(eq(telegramPosts.id, postId))
}
