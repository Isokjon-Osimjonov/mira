import { v2 as cloudinary } from 'cloudinary'
import { env } from './env'

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
})

export { cloudinary }

// Folder strategy — all uploads go to organized subfolders
export const UPLOAD_FOLDERS = {
  products: 'mira/products',
  receipts: 'mira/receipts',
  expenses: 'mira/expenses',
  telegram: 'mira/telegram',
  profiles: 'mira/profiles',
} as const

export type UploadFolder = keyof typeof UPLOAD_FOLDERS

// Generate signed upload params — client uses these to upload directly
// Security: signature expires in 1 minute, only authenticated users can get it
export async function generateSignedUploadParams(folder: UploadFolder) {
  const timestamp = Math.round(Date.now() / 1000)
  const folderPath = UPLOAD_FOLDERS[folder]

  const paramsToSign = {
    timestamp,
    folder: folderPath,
    // Product images: allow transformation
    ...(folder === 'products' && {
      transformation: 'q_auto,f_auto,w_1200',
    }),
  }

  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET)

  return {
    timestamp,
    signature,
    folder: folderPath,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
  }
}
