import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Search, X, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, any> = {
  order: { label: 'Buyurtma', color: 'bg-blue-50 text-blue-700' },
  product: { label: 'Mahsulot', color: 'bg-green-50 text-green-700' },
  customer: { label: 'Mijoz', color: 'bg-purple-50 text-purple-700' },
  coupon: { label: 'Kupon', color: 'bg-orange-50 text-orange-700' },
}

export function GlobalSearch() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [debQ, setDebQ] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebQ(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['global-search', debQ],
    queryFn: async () => {
      if (debQ.length < 2) return []
      const res = await api.get(`/admin/search?q=${debQ}`)
      return res.data.data ?? []
    },
    enabled: debQ.length >= 2,
    staleTime: 10_000,
  })

  const handleSelect = (item: any) => {
    navigate({ to: item.link })
    setOpen(false)
    setQuery('')
  }

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => {
          setOpen(true)
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border-[0.5px] border-border bg-gray-50 text-muted-foreground text-xs hover:bg-gray-100 transition-colors w-48 lg:w-64"
      >
        <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
        <span className="flex-1 text-left">Qidirish...</span>
        <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-[10px] font-mono">⌘K</kbd>
      </button>

      <button
        onClick={() => setOpen(true)}
        className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Search className="h-4 w-4 text-gray-600" strokeWidth={1.5} />
      </button>

      {/* Search modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => {
              setOpen(false)
              setQuery('')
            }}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border-[0.5px] border-border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
              <Search className="h-4 w-4 text-gray-400 shrink-0" strokeWidth={1.5} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buyurtma, mahsulot, mijoz..."
                className="flex-1 text-sm outline-none bg-transparent"
                autoComplete="off"
              />
              {query && (
                <button onClick={() => setQuery('')}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-mono text-gray-500">
                ESC
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {debQ.length < 2 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-muted-foreground">Qidirish uchun kamida 2 ta belgi</p>
                </div>
              ) : isLoading ? (
                <div className="px-4 py-8 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <p className="text-[11px] text-muted-foreground">Qidirilmoqda...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-muted-foreground">
                    "{debQ}" bo'yicha natija topilmadi
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {results.map((item: any) => {
                    const typeInfo = TYPE_LABELS[item.type] ?? TYPE_LABELS.product
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleSelect(item)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left group"
                      >
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded shrink-0',
                            typeInfo.color
                          )}
                        >
                          {typeInfo.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary transition-colors">
                            {item.title}
                          </p>
                          {item.sub && (
                            <p className="text-[11px] text-muted-foreground truncate">{item.sub}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1">
                          →
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
