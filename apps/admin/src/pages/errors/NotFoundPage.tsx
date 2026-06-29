import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-8xl font-bold text-primary/20 mb-4">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sahifa topilmadi</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Siz qidirgan sahifa mavjud emas yoki o'chirilgan.
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="rounded-lg gap-2"
          >
            ← Orqaga
          </Button>
          <Button onClick={() => navigate({ to: '/dashboard' })} className="rounded-lg gap-2">
            🏠 Bosh sahifa
          </Button>
        </div>
      </div>
    </div>
  )
}
