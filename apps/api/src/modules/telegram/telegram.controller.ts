import type { Request, Response } from 'express'
import { logger } from '../../config/logger'
import * as service from './telegram.service'
import {
  createChannelSchema,
  updateChannelSchema,
  createPostSchema,
  updatePostSchema,
} from './telegram.schema'

// ─── Channels ────────────────────────────────────────────────────────────

export async function getChannels(req: Request, res: Response) {
  try {
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined
    const data = await service.getChannels({ isActive })
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function createChannel(req: Request, res: Response) {
  try {
    const validated = createChannelSchema.parse(req.body)
    const adminId = (req.user as any).sub
    const data = await service.createChannel(validated, adminId)
    return res.json({ data, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res.status(400).json({
        data: null,
        error: { message: "Ma'lumotlar noto'g'ri", code: 'VALIDATION_ERROR', details: e.errors },
      })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function updateChannel(req: Request, res: Response) {
  try {
    const validated = updateChannelSchema.parse(req.body)
    const data = await service.updateChannel(req.params.id, validated)
    return res.json({ data, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res.status(400).json({
        data: null,
        error: { message: "Ma'lumotlar noto'g'ri", code: 'VALIDATION_ERROR', details: e.errors },
      })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function deleteChannel(req: Request, res: Response) {
  try {
    const data = await service.deleteChannel(req.params.id)
    return res.json({ data: { id: data.id }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function testChannel(req: Request, res: Response) {
  try {
    const data = await service.testChannel(req.params.id)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

// ─── Settings ────────────────────────────────────────────────────────────

export async function getPostSettings(_req: Request, res: Response) {
  try {
    const data = await service.getTelegramPostSettings()
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function updatePostSettings(req: Request, res: Response) {
  try {
    const data = await service.updateTelegramPostSettings(req.body)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

// ─── Posts ───────────────────────────────────────────────────────────────

export async function getPosts(req: Request, res: Response) {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined
    const limit = req.query.limit ? Number(req.query.limit) : undefined
    const status = req.query.status as string | undefined
    const dateFrom = req.query.dateFrom as string | undefined
    const dateTo = req.query.dateTo as string | undefined

    const result = await service.getPosts({ page, limit, status, dateFrom, dateTo })
    return res.json({ data: result.items, meta: result.meta, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function getPostById(req: Request, res: Response) {
  try {
    const data = await service.getPostById(req.params.id)
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function createPost(req: Request, res: Response) {
  try {
    const validated = createPostSchema.parse(req.body)
    const adminId = (req.user as any).sub
    const data = await service.createPost(validated, adminId)

    // Send immediately if no schedule
    if (!validated.scheduledAt || new Date(validated.scheduledAt) <= new Date()) {
      service.sendPost(data.id).catch((err) => logger.error({ err }, 'sendPost failed'))
    }

    return res.json({ data, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res.status(400).json({
        data: null,
        error: { message: "Ma'lumotlar noto'g'ri", code: 'VALIDATION_ERROR', details: e.errors },
      })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function updatePost(req: Request, res: Response) {
  try {
    const validated = updatePostSchema.parse(req.body)
    const data = await service.updatePost(req.params.id, validated)
    return res.json({ data, error: null })
  } catch (e: any) {
    if (e.name === 'ZodError')
      return res.status(400).json({
        data: null,
        error: { message: "Ma'lumotlar noto'g'ri", code: 'VALIDATION_ERROR', details: e.errors },
      })
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function deletePost(req: Request, res: Response) {
  try {
    const data = await service.deletePost(req.params.id)
    return res.json({ data: { id: data.id, status: data.status }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function manualSendPost(req: Request, res: Response) {
  try {
    await service.sendPost(req.params.id)
    return res.json({ data: { success: true }, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}

export async function generateCaption(req: Request, res: Response) {
  try {
    const { productId, showRetail, showWholesale, phone, language } = req.body
    const data = await service.generateCaption({
      productId,
      showRetail: !!showRetail,
      showWholesale: !!showWholesale,
      phone,
      language,
    })
    return res.json({ data, error: null })
  } catch (e: any) {
    return res
      .status(e.status ?? 500)
      .json({ data: null, error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' } })
  }
}
