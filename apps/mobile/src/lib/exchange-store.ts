import { create } from 'zustand'

interface ExchangeState {
  rate: number // KRW to UZS multiplier
  updatedAt: string | null
  setRate: (rate: number, updatedAt: string) => void
}

export const useExchangeStore = create<ExchangeState>((set) => ({
  rate: 12, // fallback rate
  updatedAt: null,
  setRate: (rate, updatedAt) => set({ rate, updatedAt }),
}))
