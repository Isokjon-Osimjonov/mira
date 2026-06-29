import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, X } from 'lucide-react'
import { customersApi } from '../../api/customers.api'
import { QK } from '../../constants/query-keys'
import { formatKRW } from '../../utils/currency'
import { formatRelative } from '../../utils/date'
import { SkeletonTable } from '../../components/shared/SkeletonTable'
import { EmptyState } from '../../components/shared/EmptyState'
import { Pagination } from '../../components/shared/Pagination'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const LIMIT = 20

export function CustomersPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [debSearch, setDebSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => setDebSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [tab, debSearch])

  const queryParams = {
    page,
    limit: LIMIT,
    search: debSearch || undefined,
    region: tab === 'kor' ? 'KOR' : tab === 'uzb' ? 'UZB' : undefined,
    isActive: tab === 'blocked' ? false : undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: QK.CUSTOMERS(queryParams),
    queryFn: () => customersApi.list(queryParams),
  })

  const customers = data?.data ?? []
  const meta = data?.meta

  const STATUS_TABS = [
    { value: 'all', label: 'Barchasi' },
    { value: 'kor', label: '🇰🇷 KOR' },
    { value: 'uzb', label: '🇺🇿 UZB' },
    { value: 'blocked', label: 'Bloklangan' },
  ]

  const getInitials = (name: string) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mijozlar</h1>
          <p className="text-sm text-muted-foreground">
            {meta?.total ? `Jami ${meta.total} ta mijoz` : 'Barcha mijozlar'}
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-lg gap-2 h-9"
          onClick={() => navigate({ to: '/customers/walk-in' } as any)}
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          <span className="hidden sm:inline">Yangi mijoz</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium',
              'whitespace-nowrap transition-all border-[0.5px]',
              tab === t.value
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-muted-foreground border-border'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
          strokeWidth={1.5}
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ism, telefon, Telegram..."
          className="pl-9 h-9 text-sm rounded-lg border-[0.5px]"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border-[0.5px] border-border overflow-hidden">
        {isLoading ? (
          <SkeletonTable cols={7} rows={8} />
        ) : customers.length === 0 ? (
          <EmptyState message="Mijozlar topilmadi" />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-gray-50/80">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Mijoz
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground w-20">
                    Hudud
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground w-24">
                    Buyurtmalar
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                    Jami xarid
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground hidden lg:table-cell">
                    Oxirgi buyurtma
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground w-24">
                    Holat
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {customers.map((c: any) => (
                  <tr
                    key={c.id}
                    onClick={() =>
                      navigate({
                        to: '/customers/$id',
                        params: { id: c.id },
                      } as any)
                    }
                    className="hover:bg-gray-50/60 cursor-pointer transition-colors"
                  >
                    {/* Customer info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-9 h-9 rounded-full flex items-center',
                            'justify-center text-sm font-bold shrink-0',
                            !c.isActive ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
                          )}
                        >
                          {getInitials(`${c.firstName} ${c.lastName ?? ''}`)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 leading-tight">
                            {c.firstName} {c.lastName ?? ''}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-[11px] text-muted-foreground">{c.phone}</p>
                            {c.tgUsername && (
                              <span className="text-[10px] text-blue-500 font-medium">
                                @{c.tgUsername}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Region */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-semibold',
                          'px-2.5 py-1 rounded-lg border-[0.5px]',
                          c.phoneRegion === 'KOR'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                        )}
                      >
                        <span className="text-sm leading-none">
                          {c.phoneRegion === 'KOR' ? '🇰🇷' : '🇺🇿'}
                        </span>
                        <span>{c.phoneRegion}</span>
                      </span>
                    </td>

                    {/* Order count */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {c.stats?.totalOrders ?? 0}
                      </span>
                    </td>

                    {/* Total spent */}
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {(c.stats?.totalSpent ?? 0) > 0 ? formatKRW(c.stats.totalSpent) : '—'}
                      </p>
                    </td>

                    {/* Last order */}
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {c.stats?.lastOrderAt ? formatRelative(c.stats.lastOrderAt) : 'Hech qachon'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      {c.deletedAt ? (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border-[0.5px] border-gray-300">
                          O'chirilgan
                        </span>
                      ) : !c.isActive ? (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-red-50 text-red-600 border-[0.5px] border-red-200">
                          Bloklangan
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-green-50 text-green-700 border-[0.5px] border-green-200">
                          Faol
                        </span>
                      )}
                    </td>

                    {/* Arrow */}
                    <td className="px-4 py-3 text-muted-foreground text-right">→</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meta && (
              <Pagination
                page={page}
                total={meta.total}
                limit={LIMIT}
                hasNext={meta.hasNext}
                hasPrev={meta.hasPrev}
                onPage={setPage}
              />
            )}
          </>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {isLoading
          ? [1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-white rounded-xl border-[0.5px] border-border animate-pulse"
              />
            ))
          : customers.map((c: any) => (
              <div
                key={c.id}
                onClick={() =>
                  navigate({
                    to: '/customers/$id',
                    params: { id: c.id },
                  } as any)
                }
                className="bg-white rounded-xl border-[0.5px] border-border p-4 cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center',
                      'justify-center text-sm font-bold shrink-0',
                      !c.isActive ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
                    )}
                  >
                    {getInitials(`${c.firstName} ${c.lastName ?? ''}`)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {c.firstName} {c.lastName ?? ''}
                      </p>
                      <div className="flex items-center gap-1">
                        {c.deletedAt && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border-[0.5px] shrink-0 bg-gray-100 text-gray-600 border-gray-300">
                            O'chirilgan
                          </span>
                        )}
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-[10px]',
                            'font-semibold px-1.5 py-0.5 rounded-md border-[0.5px] shrink-0',
                            c.phoneRegion === 'KOR'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-green-50 text-green-700 border-green-200'
                          )}
                        >
                          <span>{c.phoneRegion === 'KOR' ? '🇰🇷' : '🇺🇿'}</span>
                          <span>{c.phoneRegion}</span>
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] text-muted-foreground">
                        {c.stats?.totalOrders ?? 0} ta buyurtma
                      </span>
                      {(c.stats?.totalSpent ?? 0) > 0 && (
                        <span className="text-[11px] font-semibold text-gray-900">
                          {formatKRW(c.stats.totalSpent)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        {meta && (
          <Pagination
            page={page}
            total={meta.total}
            limit={LIMIT}
            hasNext={meta.hasNext}
            hasPrev={meta.hasPrev}
            onPage={setPage}
          />
        )}
      </div>
    </div>
  )
}
