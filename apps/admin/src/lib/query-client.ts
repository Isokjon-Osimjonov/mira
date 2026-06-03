import { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getErrorMessage } from './errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          1 * 60 * 1000,   // 1 minute
      gcTime:             5 * 60 * 1000,   // 5 minutes
      retry:              1,
      refetchOnWindowFocus: false,          // prevent annoying refetch
      throwOnError:       false,
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
