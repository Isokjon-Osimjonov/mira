import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { router } from './router'
import { queryClient } from './lib/query-client'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        expand={false}
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize:   '14px',
            borderRadius: '10px',
          },
          classNames: {
            success: 'bg-green-50 border-green-200 text-green-800',
            error:   'bg-red-50 border-red-200 text-red-800',
            warning: 'bg-amber-50 border-amber-200 text-amber-800',
            info:    'bg-blue-50 border-blue-200 text-blue-800',
          }
        }}
      />
    </QueryClientProvider>
  </StrictMode>
)
