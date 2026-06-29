import { Platform } from 'react-native'
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
import type { Customer } from '../lib/auth-store'

export interface UpdateProfilePayload {
  firstName: string
  lastName?: string | null
  profileImageUrl?: string | null
}

export const customerService = {
  getMe: async (): Promise<Customer> => {
    const res = await api.get<ApiResponse<Customer>>('/auth/me')
    return res.data.data!
  },

  updateProfile: async (payload: UpdateProfilePayload): Promise<Customer> => {
    const body: Record<string, any> = {
      firstName: payload.firstName,
    }
    if (payload.lastName !== undefined) {
      body.lastName = payload.lastName
    }
    // Only include profileImageUrl if explicitly provided
    // Never send null — would erase existing photo
    if (payload.profileImageUrl !== undefined && payload.profileImageUrl !== null) {
      body.profileImageUrl = payload.profileImageUrl
    }
    const res = await api.patch<ApiResponse<Customer>>('/auth/profile', body)
    return res.data.data!
  },

  savePushToken: async (expoPushToken: string): Promise<void> => {
    await api.post('/auth/push-token', {
      token: expoPushToken,
      platform: Platform.OS, // 'ios' | 'android'
    })
  },
}
