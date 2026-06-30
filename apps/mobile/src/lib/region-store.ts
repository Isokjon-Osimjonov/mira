import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import * as SecureStore from 'expo-secure-store'

const secureStorage = {
  getItem: async (name: string) => {
    const value = await SecureStore.getItemAsync(name)
    return value ?? null
  },
  setItem: async (name: string, value: string) => {
    await SecureStore.setItemAsync(name, value)
  },
  removeItem: async (name: string) => {
    await SecureStore.deleteItemAsync(name)
  },
}

interface RegionState {
  guestRegion: 'UZB' | 'KOR'
  setGuestRegion: (region: 'UZB' | 'KOR') => void
}

export const useRegionStore = create<RegionState>()(
  persist(
    (set) => ({
      guestRegion: 'KOR', // Default to Korea per refinement 3
      setGuestRegion: (guestRegion) => set({ guestRegion }),
    }),
    {
      name: 'region-storage',
      storage: createJSONStorage(() => secureStorage),
    }
  )
)
