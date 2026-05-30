import { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:    1_000 * 60,        // 1 minute
      gcTime:       1_000 * 60 * 10,   // 10 minutes
      refetchOnWindowFocus: true,
      retry: (failureCount, error: any) => {
        // Don't retry auth errors
        const status = error?.response?.status
        if (status === 401 || status === 403 || status === 404) return false
        return failureCount < 2
      },
    },
    mutations: {
      onError: (error: any) => {
        const msg = error?.response?.data?.error?.message
          ?? error?.message
          ?? 'Xatolik yuz berdi'
        toast.error(msg)
      },
    },
  },
})

// ─── Socket-driven cache invalidation ────────────────────────
// Call these from your Socket event listeners to keep UI fresh

export const invalidate = {
  orders:    () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  order:     (id: string) => queryClient.invalidateQueries({ queryKey: ['orders', 'detail', id] }),
  inventory: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
  dashboard: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  customers: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  settings:  () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  rates:     () => queryClient.invalidateQueries({ queryKey: ['exchange-rates'] }),
}
