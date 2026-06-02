import { z } from 'zod'

export const createChannelSchema = z.object({
  chatId: z.string().min(5, 'Chat ID kiritilmadi'),
  channelName: z.string().min(2, 'Kanal nomi kiritilmadi'),
  channelUsername: z.string().optional().nullable(),
  regionCode: z.enum(['UZB', 'KOR']).optional().nullable(),
})

export const updateChannelSchema = z.object({
  channelName: z.string().min(2).optional(),
  channelUsername: z.string().optional().nullable(),
  regionCode: z.enum(['UZB', 'KOR']).optional().nullable(),
  isActive: z.boolean().optional(),
})

export const createPostSchema = z.object({
  title: z.string().min(1, 'Sarlavha kiritilmadi'),
  content: z.string().min(1, 'Kontent kiritilmadi'),
  imageUrl: z.string().url().optional().nullable(),
  productId: z.string().uuid().optional().nullable(),
  channelIds: z.array(z.string().uuid()).min(1, 'Kamida bitta kanalni tanlang'),
  scheduledAt: z.string().datetime().optional().nullable(),
})

export const updatePostSchema = createPostSchema.partial().extend({
  channelIds: z.array(z.string().uuid()).optional(),
})

export type CreateChannelDto = z.infer<typeof createChannelSchema>
export type UpdateChannelDto = z.infer<typeof updateChannelSchema>
export type CreatePostDto = z.infer<typeof createPostSchema>
export type UpdatePostDto = z.infer<typeof updatePostSchema>
