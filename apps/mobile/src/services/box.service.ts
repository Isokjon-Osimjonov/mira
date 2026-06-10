import api from '../lib/api'

export interface Box {
  id: string
  name: string
  sizeLabel: string | null
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
  costKrw: number
  imageUrls: string[]
  maxWeightKg: number | null
  boxWeightKg: number | null
  stockCount: number
  isActive: boolean
}

export const boxService = {
  getBoxes: async (): Promise<Box[]> => {
    const res = await api.get('/boxes')
    return res.data.data ?? []
  },
}
