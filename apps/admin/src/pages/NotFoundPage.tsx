import { Link } from '@tanstack/react-router'
import { Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center
                    justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-8xl font-bold text-primary/20 mb-4
                        select-none">
          404
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Sahifa topilmadi
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Siz qidirgan sahifa mavjud emas yoki
          o'chirib tashlangan
        </p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" asChild
            className="rounded-lg gap-2">
            <Link to={-1 as any}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Orqaga
            </Link>
          </Button>
          <Button size="sm" asChild className="rounded-lg gap-2">
            <Link to="/dashboard">
              <Home className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
