import { create } from 'zustand'
import { cartService, type Cart } from '../services/cart.service'

interface CartState {
  cart: Cart | null
  isLoading: boolean
  itemCount: number

  fetchCart: () => Promise<void>
  addItem: (productId: string, quantity: number) => Promise<void>
  updateItem: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  setCart: (cart: Cart) => void
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isLoading: false,
  itemCount: 0,

  setCart: (cart) =>
    set({
      cart,
      itemCount: cart.summary.itemCount,
    }),

  fetchCart: async () => {
    set({ isLoading: true })
    try {
      const cart = await cartService.getCart()
      set({ cart, itemCount: cart.summary.itemCount })
    } catch {
      // ignore
    } finally {
      set({ isLoading: false })
    }
  },

  addItem: async (productId, quantity) => {
    const cart = await cartService.addItem(productId, quantity)
    set({ cart, itemCount: cart.summary.itemCount })
  },

  removeItem: async (itemId) => {
    await cartService.removeItem(itemId)
    await get().fetchCart()
  },

  updateItem: async (itemId, quantity) => {
    if (quantity === 0) {
      await get().removeItem(itemId)
      return
    }
    await cartService.updateItem(itemId, quantity)
    await get().fetchCart()
  },

  clearCart: async () => {
    await cartService.clearCart()
    set({ cart: null, itemCount: 0 })
  },
}))
