import { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getErrorMessage } from './errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            0,
      gcTime:               5 * 60_000,
      retry:                1,
      refetchOnMount:       true,
      refetchOnWindowFocus: true,
      throwOnError: false,
    },
    mutations: {
      onError: (error: any) => {
        const message = error?.friendlyMessage
          ?? getErrorMessage(error?.code ?? '')
        toast.error(message, {
          description: error?.code
            ? `Xato kodi: ${error.code}` : undefined,
          duration: 5000,
        })
      },
    }
  }
})
