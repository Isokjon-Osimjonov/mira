import { Router } from 'express'
import { generateSignedUploadParams, type UploadFolder } from '../../config/cloudinary'
import { requireAdmin } from '../../middleware/auth'

const router = Router()

// GET /api/v1/admin/upload/sign?folder=...
router.get('/sign', requireAdmin, async (req, res, next) => {
  try {
    const { folder } = req.query
    if (!folder) {
      return res.status(400).json({ data: null, error: { message: 'Folder required', code: 'BAD_REQUEST' } })
    }

    const params = await generateSignedUploadParams(folder as UploadFolder)
    res.json({ data: params, error: null })
  } catch (err) {
    next(err)
  }
})

export default router
