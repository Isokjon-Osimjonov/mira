import api from '../lib/api'

export interface Banner {
  id: string
  title: string
  subtitle: string | null
  buttonText: string | null
  imageUrl: string | null
  bgColor: string
  linkType: string
  linkValue: string | null
  regionCode: string | null
  isActive: boolean
  sortOrder: number
}

export const bannerService = {
  getBanners: async (): Promise<Banner[]> => {
    const res = await api.get('/banners')
    return res.data.data ?? []
  },
}
