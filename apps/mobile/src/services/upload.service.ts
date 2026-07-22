import api from '../lib/api'
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: any
}

import * as ImageManipulator from 'expo-image-manipulator'

export const uploadService = {
  compressImage: async (uri: string) => {
    const isHeic = uri.toLowerCase().includes('.heic') || uri.toLowerCase().includes('.heif')
    const format = ImageManipulator.SaveFormat.JPEG

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1920 } }], // Resize large images
      {
        compress: 0.8,
        format,
      }
    )
    return result
  },

  uploadAvatar: async (localUri: string): Promise<string> => {
    console.log('📤 Upload Avatar starting...')
    console.log('File URI:', localUri)

    const compressed = await uploadService.compressImage(localUri)
    console.log('Compressed File URI:', compressed.uri)

    const formData = new FormData()
    const filename = compressed.uri.split('/').pop() ?? 'avatar.jpg'
    const type = filename.endsWith('.png') ? 'image/png' : 'image/jpeg'

    formData.append('file', {
      uri: compressed.uri,
      name: filename,
      type,
    } as any)

    try {
      const res = await api.post<ApiResponse<{ url: string }>>('/upload/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      })
      console.log('✅ Upload Avatar success:', res.data.data?.url)
      return res.data.data!.url
    } catch (err: any) {
      console.log('❌ Upload error:', err)
      console.log('❌ Status:', err?.response?.status)
      console.log('❌ Response:', JSON.stringify(err?.response?.data))
      console.log('❌ Message:', err?.message)
      throw err
    }
  },

  uploadReceipt: async (localUri: string): Promise<string> => {
    console.log('📤 Upload Receipt starting...')
    console.log('File URI:', localUri)

    const compressed = await uploadService.compressImage(localUri)
    console.log('Compressed File URI:', compressed.uri)

    const formData = new FormData()
    const filename = compressed.uri.split('/').pop() ?? 'receipt.jpg'
    const type = filename.endsWith('.png') ? 'image/png' : 'image/jpeg'

    formData.append('receipt', {
      uri: compressed.uri,
      name: filename,
      type,
    } as any)

    try {
      const res = await api.post<ApiResponse<{ url: string }>>('/upload/receipt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      })
      console.log('✅ Upload Receipt success:', res.data.data?.url)
      return res.data.data!.url
    } catch (err: any) {
      console.log('❌ Upload error:', err)
      console.log('❌ Status:', err?.response?.status)
      console.log('❌ Response:', JSON.stringify(err?.response?.data))
      console.log('❌ Message:', err?.message)
      throw err
    }
  },
}
