import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1_000 * 60, // 1 minute
      gcTime: 1_000 * 60 * 15, // 15 minutes
      refetchOnWindowFocus: false, // RN: no window focus
      refetchOnReconnect: true, // refetch when internet back
      retry: (failureCount, error: any) => {
        const status = error?.response?.status
        if (status === 401 || status === 403 || status === 404) return false
        return failureCount < 2
      },
    },
    mutations: {
      retry: 0,
    },
  },
})
