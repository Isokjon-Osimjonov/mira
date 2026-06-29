import { Router } from 'express'
import { generateSignedUploadParams, type UploadFolder } from '../../config/cloudinary'
import { requireAdmin, requireCustomer } from '../../middleware/auth'
import * as ctrl from './upload.controller'

const router = Router()

// GET /api/v1/admin/upload/sign?folder=...
router.get('/sign', requireAdmin, async (req, res, next) => {
  try {
    const { folder } = req.query
    if (!folder) {
      return res
        .status(400)
        .json({ data: null, error: { message: 'Folder required', code: 'BAD_REQUEST' } })
    }

    const params = await generateSignedUploadParams(folder as UploadFolder)
    res.json({ data: params, error: null })
  } catch (err) {
    next(err)
  }
})

// Customer avatar upload — authenticated customers only
router.post('/avatar', requireCustomer, ctrl.uploadAvatar)

// Order receipt upload
router.post('/receipt', requireCustomer, ctrl.uploadReceipt)

// Admin banner upload
router.post('/banner', requireAdmin, ctrl.uploadBanner)

export default router
