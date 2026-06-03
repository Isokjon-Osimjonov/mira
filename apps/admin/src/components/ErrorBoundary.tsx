import { Component, type ReactNode } from 'react'
import * as Sentry from '@sentry/react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  State
> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    // Log to Sentry if configured
    if (import.meta.env.VITE_SENTRY_DSN) {
      Sentry.captureException(error, { extra: info })
    }
    console.error('ErrorBoundary caught:', error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center
                        min-h-[400px] p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50
                          flex items-center justify-center mb-4">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Xatolik yuz berdi
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Sahifani yangilang yoki qaytadan urinib ko'ring
          </p>
          <Button
            size="sm"
            onClick={() => window.location.reload()}
            className="rounded-lg"
          >
            Yangilash
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
