import { create } from 'zustand'
import { wishlistService, WishlistItem } from '../services/wishlist.service'

interface WishlistState {
  items: WishlistItem[]
  productIds: Set<string>
  isLoading: boolean
  fetchWishlist: () => Promise<void>
  toggle: (productId: string) => Promise<void>
  isWishlisted: (productId: string) => boolean
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  productIds: new Set(),
  isLoading: false,

  fetchWishlist: async () => {
    try {
      const { useAuthStore } = await import('./auth-store')
      if (!useAuthStore.getState().isAuthenticated) {
        set({ items: [], productIds: new Set() })
        return
      }
    } catch {}

    set({ isLoading: true })
    try {
      const items = await wishlistService.getWishlist()
      set({
        items,
        productIds: new Set(items.map((i) => i.id)),
      })
    } catch {
      /* ignore if not logged in */
    } finally {
      set({ isLoading: false })
    }
  },

  toggle: async (productId: string) => {
    const { productIds } = get()
    const isWishlisted = productIds.has(productId)

    // Optimistic update
    const newIds = new Set(productIds)
    if (isWishlisted) {
      newIds.delete(productId)
    } else {
      newIds.add(productId)
    }
    set({ productIds: newIds })

    try {
      if (isWishlisted) {
        await wishlistService.removeFromWishlist(productId)
      } else {
        await wishlistService.addToWishlist(productId)
      }
    } catch {
      // Revert on error
      set({ productIds })
    }
  },

  isWishlisted: (productId: string) => {
    return get().productIds.has(productId)
  },
}))
