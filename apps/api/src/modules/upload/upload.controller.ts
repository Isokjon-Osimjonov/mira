import type { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { cloudinary } from '../../config/cloudinary'

// In-memory storage for multer
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Faqat image/jpeg, image/png, image/webp turlari ruxsat etilgan') as any)
    }
  },
}).single('file')

const receiptUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(
        new Error('Faqat image/jpeg, image/png, image/webp yoki PDF turlari ruxsat etilgan') as any
      )
    }
  },
}).single('receipt')

const bannerUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Faqat image/jpeg, image/png, image/webp turlari ruxsat etilgan') as any)
    }
  },
}).single('banner')

export async function uploadReceipt(req: Request, res: Response, next: NextFunction) {
  receiptUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        data: null,
        error: { message: err.message, code: 'UPLOAD_ERROR' },
      })
    }

    if (!req.file) {
      return res.status(400).json({
        data: null,
        error: { message: 'Fayl tanlanmagan', code: 'FILE_REQUIRED' },
      })
    }

    try {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'mira/receipts',
          resource_type: 'auto',
        },
        (error, result) => {
          if (error || !result) {
            return res.status(500).json({
              data: null,
              error: { message: 'Cloudinary upload failed', code: 'CLOUDINARY_ERROR' },
            })
          }

          res.json({
            data: { url: result.secure_url },
            error: null,
          })
        }
      )

      uploadStream.end(req.file.buffer)
    } catch (err) {
      next(err)
    }
  })
}

export async function uploadAvatar(req: Request, res: Response, next: NextFunction) {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        data: null,
        error: { message: err.message, code: 'UPLOAD_ERROR' },
      })
    }

    if (!req.file) {
      return res.status(400).json({
        data: null,
        error: { message: 'Fayl tanlanmagan', code: 'FILE_REQUIRED' },
      })
    }

    try {
      // Upload to Cloudinary using stream
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'mira/avatars',
          resource_type: 'image',
          transformation: [{ width: 500, height: 500, crop: 'limit' }],
        },
        (error, result) => {
          if (error || !result) {
            return res.status(500).json({
              data: null,
              error: { message: 'Cloudinary upload failed', code: 'CLOUDINARY_ERROR' },
            })
          }

          res.json({
            data: { url: result.secure_url },
            error: null,
          })
        }
      )

      uploadStream.end(req.file.buffer)
    } catch (err) {
      next(err)
    }
  })
}

export async function uploadBanner(req: Request, res: Response, next: NextFunction) {
  bannerUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        data: null,
        error: { message: err.message, code: 'UPLOAD_ERROR' },
      })
    }

    if (!req.file) {
      return res.status(400).json({
        data: null,
        error: { message: 'Fayl tanlanmagan', code: 'FILE_REQUIRED' },
      })
    }

    try {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'mira/banners',
          resource_type: 'auto',
        },
        (error, result) => {
          if (error || !result) {
            return res.status(500).json({
              data: null,
              error: { message: 'Cloudinary upload failed', code: 'CLOUDINARY_ERROR' },
            })
          }

          res.json({
            data: { url: result.secure_url },
            error: null,
          })
        }
      )

      uploadStream.end(req.file.buffer)
    } catch (err) {
      next(err)
    }
  })
}
