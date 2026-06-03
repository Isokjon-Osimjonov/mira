import { Router } from 'express'
import { z } from 'zod'
import * as ctrl from './ai.controller'
import { requireAdmin } from '../../middleware/auth'
import { imageLimiter, aiTextLimiter } from '../../middleware/rateLimiter'

const router = Router()

/**
 * POST /api/v1/admin/ai/fill-product
 * Input: { searchQuery, categoryName?, additionalInfo? }
 */
router.post(
  '/fill-product',
  requireAdmin,
  aiTextLimiter,
  async (req, res, next) => {
    try {
      z.object({
        productId: z.string().uuid().optional(),
        productName: z.string().optional(),
        barcode: z.string().optional(),
        imageUrl: z.string().url().optional(),
        categoryName: z.string().optional(),
        additionalInfo: z.string().max(300).optional(),
      }).parse(req.body)
      next()
    } catch (e) {
      next(e)
    }
  },
  ctrl.fillProduct
)

/**
 * POST /api/v1/admin/ai/fill-product-image
 * Input: { imageUrl, categoryName?, additionalInfo? }
 */
router.post(
  '/fill-product-image',
  requireAdmin,
  imageLimiter,
  async (req, res, next) => {
    try {
      z.object({
        imageUrl: z.string().url(),
        categoryName: z.string().optional(),
        additionalInfo: z.string().max(300).optional(),
      }).parse(req.body)
      next()
    } catch (e) {
      next(e)
    }
  },
  ctrl.fillProductFromImage
)

/**
 * POST /api/v1/admin/ai/generate-post
 * Input: { productId, customNote? }
 */
router.post(
  '/generate-post',
  requireAdmin,
  aiTextLimiter,
  async (req, res, next) => {
    try {
      z.object({
        productId: z.string().uuid(),
        customNote: z.string().max(300).optional(),
      }).parse(req.body)
      next()
    } catch (e) {
      next(e)
    }
  },
  ctrl.generatePost
)

/**
 * POST /api/v1/admin/ai/generate-post-image
 * Input: { imageUrl, korRetailPrice, uzsPrice, customNote? }
 */
router.post(
  '/generate-post-image',
  requireAdmin,
  imageLimiter,
  async (req, res, next) => {
    try {
      z.object({
        imageUrl: z.string().url(),
        korRetailPrice: z.number().positive(),
        uzsPrice: z.number().positive(),
        customNote: z.string().max(300).optional(),
      }).parse(req.body)
      next()
    } catch (e) {
      next(e)
    }
  },
  ctrl.generatePostFromImage
)

export default router
