import type { Request, Response } from 'express'
import * as service from './ai.service'

/**
 * POST /admin/ai/fill-product
 * Gemini (text-only)
 */
export async function fillProduct(req: Request, res: Response) {
  try {
    const result = await service.generateProductContent(req.body)
    res.json({ data: result, error: null })
  } catch (e: any) {
    res.status(e.status ?? 500).json({
      data: null,
      error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' },
    })
  }
}

/**
 * POST /admin/ai/fill-product-image
 * OpenAI GPT-4o (vision)
 */
export async function fillProductFromImage(req: Request, res: Response) {
  try {
    const { imageUrl, categoryName, additionalInfo } = req.body
    const result = await service.analyzeProductImage(imageUrl, categoryName, additionalInfo)
    res.json({ data: result, error: null })
  } catch (e: any) {
    res.status(e.status ?? 500).json({
      data: null,
      error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' },
    })
  }
}

/**
 * POST /admin/ai/generate-post (Mode A)
 * Gemini
 */
export async function generatePost(req: Request, res: Response) {
  try {
    const { productId, customNote } = req.body
    const result = await service.generateTelegramPost(productId, customNote)
    res.json({ data: result, error: null })
  } catch (e: any) {
    res.status(e.status ?? 500).json({
      data: null,
      error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' },
    })
  }
}

/**
 * POST /admin/ai/generate-post-image (Mode B)
 * OpenAI GPT-4o (vision)
 */
export async function generatePostFromImage(req: Request, res: Response) {
  try {
    const { imageUrl, korRetailPrice, uzsPrice, customNote } = req.body

    const result = await service.generateTelegramPostFromImage({
      imageUrl,
      korRetailPrice: Number(korRetailPrice),
      uzsPrice: Number(uzsPrice),
      customNote,
    })

    res.json({ data: result, error: null })
  } catch (e: any) {
    res.status(e.status ?? 500).json({
      data: null,
      error: { message: e.message, code: e.code ?? 'INTERNAL_ERROR' },
    })
  }
}
