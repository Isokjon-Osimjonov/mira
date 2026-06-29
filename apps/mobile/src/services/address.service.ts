import api from '../lib/api'

export interface Address {
  id: string
  label: string | null
  regionCode: 'UZB' | 'KOR'
  fullName: string
  phone: string
  postalCode: string
  isDefault: boolean
  province: string | null
  city: string | null
  addressLine1: string
  addressLine2: string | null
  createdAt: string
}

export interface CreateAddressPayload {
  label?: string
  regionCode: 'UZB' | 'KOR'
  fullName: string
  phone: string
  postalCode: string
  isDefault?: boolean
  province?: string
  city?: string
  addressLine1: string
  addressLine2?: string
}

export interface JusoResult {
  zipNo: string
  roadAddr: string
  roadAddrPart1: string
  roadAddrPart2: string
  jibunAddr: string
  engAddr: string
  detBdNmList: string
  bdNm: string
  rnMgtSn: string
  udrtYn: string
  buldMnnm: string
  buldSlno: string
  mtYn: string
  lnbrMnnm: string
  lnbrSlno: string
  emdNo: string
}

export const addressService = {
  getAddresses: async (): Promise<Address[]> => {
    const res = await api.get('/addresses')
    return res.data.data ?? []
  },

  createAddress: async (data: CreateAddressPayload): Promise<Address> => {
    const res = await api.post('/addresses', data)
    return res.data.data
  },

  updateAddress: async (id: string, data: Partial<CreateAddressPayload>): Promise<Address> => {
    const res = await api.put(`/addresses/${id}`, data)
    return res.data.data
  },

  setDefault: async (id: string): Promise<void> => {
    await api.patch(`/addresses/${id}/set-default`)
  },

  deleteAddress: async (id: string): Promise<void> => {
    await api.delete(`/addresses/${id}`)
  },

  searchJuso: async (q: string): Promise<JusoResult[]> => {
    const res = await api.get('/addresses/search-juso', {
      params: { q },
    })
    return res.data.data ?? []
  },
}
