import { Button } from '@/components/ui/button'

export function ErrorPage({ error }: { error?: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <p className="text-8xl font-bold text-red-200 mb-4">500</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Xatolik yuz berdi</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Tizimda kutilmagan xatolik. Sahifani yangilang yoki keyinroq urinib ko'ring.
        </p>
        {error?.message && (
          <code className="text-xs bg-red-50 text-red-600 px-3 py-2 rounded-lg block mb-4 text-left">
            {error.message}
          </code>
        )}
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="rounded-lg gap-2"
          >
            🔄 Yangilash
          </Button>
          <Button
            onClick={() => (window.location.href = '/dashboard')}
            className="rounded-lg gap-2"
          >
            🏠 Bosh sahifa
          </Button>
        </div>
      </div>
    </div>
  )
}
