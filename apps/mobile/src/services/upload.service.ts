import api from '../lib/api'
import type { ApiResponse } from '@mira/shared-types'

export const uploadService = {
  uploadAvatar: async (localUri: string): Promise<string> => {
    // Create FormData with the image file
    const formData = new FormData()
    
    // Get filename from URI
    const filename = localUri.split('/').pop() ?? 'avatar.jpg'
    const match = /\.(\w+)$/.exec(filename)
    const type = match ? `image/${match[1]}` : 'image/jpeg'
    
    formData.append('file', {
      uri: localUri,
      name: filename,
      type,
    } as any)
    
    const res = await api.post<ApiResponse<{ url: string }>>(
      '/upload/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return res.data.data!.url
  },
}
