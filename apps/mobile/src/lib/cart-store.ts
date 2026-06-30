import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import * as SecureStore from 'expo-secure-store'
import { cartService, type Cart, type CartItem } from '../services/cart.service'
import { productService } from '../services/product.service'

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

interface CartState {
  cart: Cart | null
  isLoading: boolean
  itemCount: number
  guestItems: { productId: string; quantity: number }[]

  fetchCart: () => Promise<void>
  addItem: (productId: string, quantity: number) => Promise<void>
  updateItem: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  setCart: (cart: Cart) => void
  clearGuestItems: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      isLoading: false,
      itemCount: 0,
      guestItems: [],

      setCart: (cart) =>
        set({
          cart,
          itemCount: cart.summary.itemCount,
        }),

      clearGuestItems: () => set({ guestItems: [] }),

      fetchCart: async () => {
        set({ isLoading: true })
        try {
          const { useAuthStore } = await import('./auth-store')
          const { useRegionStore } = await import('./region-store')
          
          if (!useAuthStore.getState().isAuthenticated) {
            const guestItems = get().guestItems
            const hydratedItems: CartItem[] = []
            let subtotal = 0
            const guestRegion = useRegionStore.getState().guestRegion
            
            for (const gItem of guestItems) {
              try {
                const p = await productService.getProductById(gItem.productId)
                if (!p.isActive) continue // gracefully handle deactivated products
                
                const config = p.regionalConfigs?.find(c => c.regionCode === guestRegion) || p.regionalConfigs?.[0]
                
                let price = Number(config?.retailPrice || 0)
                if (config?.minWholesaleQty && gItem.quantity >= config.minWholesaleQty && config.wholesalePrice) {
                  price = Number(config.wholesalePrice)
                }
                
                const itemSubtotal = price * gItem.quantity
                subtotal += itemSubtotal
                
                hydratedItems.push({
                  id: p.id, // we map guest itemId to productId
                  productId: p.id,
                  name: p.name,
                  brandName: p.brandName,
                  imageUrls: p.imageUrls,
                  quantity: gItem.quantity,
                  unitPrice: price,
                  isWholesale: price === Number(config?.wholesalePrice),
                  subtotal: itemSubtotal,
                  currency: 'KRW',
                  weightGrams: p.weightGrams || 0,
                  stockAvailable: p.totalStock,
                  inStock: p.totalStock >= gItem.quantity,
                  isActive: p.isActive
                })
              } catch (e) {
                // Ignore errors for individual items (e.g. 404 deleted)
              }
            }
            
            const guestCount = hydratedItems.reduce((acc, item) => acc + item.quantity, 0)
            set({
              cart: {
                id: 'guest',
                regionCode: guestRegion,
                items: hydratedItems,
                summary: { itemCount: guestCount, subtotal, currency: 'KRW' },
                autoApplyCoupons: []
              },
              itemCount: guestCount,
            })
            return
          }

          const cart = await cartService.getCart()
          set({ cart, itemCount: cart.summary.itemCount })
        } catch {
          // ignore
        } finally {
          set({ isLoading: false })
        }
      },

      addItem: async (productId, quantity) => {
        const { useAuthStore } = await import('./auth-store')
        if (!useAuthStore.getState().isAuthenticated) {
          const guestItems = [...get().guestItems]
          const existingIndex = guestItems.findIndex(i => i.productId === productId)
          if (existingIndex >= 0) {
            guestItems[existingIndex].quantity += quantity
          } else {
            guestItems.push({ productId, quantity })
          }
          set({ guestItems })
          await get().fetchCart()
          return
        }

        const cart = await cartService.addItem(productId, quantity)
        set({ cart, itemCount: cart.summary.itemCount })
      },

      removeItem: async (itemId) => {
        const { useAuthStore } = await import('./auth-store')
        if (!useAuthStore.getState().isAuthenticated) {
          const guestItems = get().guestItems.filter(i => i.productId !== itemId)
          set({ guestItems })
          await get().fetchCart()
          return
        }

        await cartService.removeItem(itemId)
        await get().fetchCart()
      },

      updateItem: async (itemId, quantity) => {
        const { useAuthStore } = await import('./auth-store')
        if (!useAuthStore.getState().isAuthenticated) {
          if (quantity <= 0) {
            await get().removeItem(itemId)
            return
          }
          const guestItems = [...get().guestItems]
          const existingIndex = guestItems.findIndex(i => i.productId === itemId)
          if (existingIndex >= 0) {
            guestItems[existingIndex].quantity = quantity
          }
          set({ guestItems })
          await get().fetchCart()
          return
        }

        if (quantity === 0) {
          await get().removeItem(itemId)
          return
        }
        await cartService.updateItem(itemId, quantity)
        await get().fetchCart()
      },

      clearCart: async () => {
        const { useAuthStore } = await import('./auth-store')
        if (!useAuthStore.getState().isAuthenticated) {
          set({ guestItems: [], cart: null, itemCount: 0 })
          return
        }
        await cartService.clearCart()
        set({ cart: null, itemCount: 0 })
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ guestItems: state.guestItems }),
    }
  )
)
