import api from '../lib/api'
import { Product } from './product.service'

export interface WishlistItem extends Product {
  inStock: boolean
}

export const wishlistService = {
  getWishlist: async (): Promise<WishlistItem[]> => {
    const res = await api.get('/wishlists')
    return res.data.data ?? []
  },

  addToWishlist: async (productId: string): Promise<void> => {
    await api.post('/wishlists', { productId })
  },

  removeFromWishlist: async (productId: string): Promise<void> => {
    await api.delete(`/wishlists/${productId}`)
  },
}
