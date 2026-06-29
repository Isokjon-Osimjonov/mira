import api from '../lib/api'

export interface CargoDate {
  id: string
  cargoDate: string
  note: string | null
}

export const cargoDateService = {
  getUpcoming: async (): Promise<CargoDate[]> => {
    const res = await api.get('/cargo-dates')
    return res.data.data ?? []
  },
}
