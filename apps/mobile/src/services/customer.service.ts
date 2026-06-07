import { Platform } from 'react-native'
import api from '../lib/api'
import type { ApiResponse } from '@mira/shared-types'
import type { Customer } from '../lib/auth-store'

export interface UpdateProfilePayload {
  firstName:       string
  lastName?:       string | null
  profileImageUrl?: string | null
}

export const customerService = {

  getMe: async (): Promise<Customer> => {
    const res = await api.get<ApiResponse<Customer>>('/auth/me')
    return res.data.data!
  },

  updateProfile: async (payload: UpdateProfilePayload):
    Promise<Customer> => {
    const res = await api.patch<ApiResponse<Customer>>(
      '/auth/profile',
      {
        firstName: payload.firstName,
        lastName:  payload.lastName ?? null,
        profileImageUrl: payload.profileImageUrl ?? null,
      }
    )
    return res.data.data!
  },

  savePushToken: async (expoPushToken: string):
    Promise<void> => {
    await api.post('/auth/push-token', {
      token:    expoPushToken,
      platform: Platform.OS,  // 'ios' | 'android'
    })
  },
}
