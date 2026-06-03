import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            className="flex flex-col items-center justify-center
                        min-h-[300px] p-8 text-center"
          >
            <div
              className="w-10 h-10 rounded-full bg-red-50
                          flex items-center justify-center mb-3"
            >
              <AlertTriangle className="h-4 w-4 text-red-500" strokeWidth={1.5} />
            </div>
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Xatolik yuz berdi</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Sahifani yangilang yoki qaytadan urinib ko'ring
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
              className="rounded-lg text-xs h-8"
            >
              Yangilash
            </Button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
