import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Search, X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { ordersApi } from '../../api/orders.api'
import { QK } from '../../constants/query-keys'
import { getErrorMessage } from '../../lib/errors'
import { StatusBadge } from '../../components/ui/status-badge'
import { DataTable } from '../../components/shared/DataTable'
import { Pagination } from '../../components/shared/Pagination'
import { EmptyState } from '../../components/shared/EmptyState'
import { SkeletonTable } from '../../components/shared/SkeletonTable'
import { KorBulkDeliveryPanel } from './KorBulkDeliveryPanel'
import { formatKRW, formatUZS } from '../../utils/currency'
import { formatDateTime, formatDeadline } from '../../utils/date'
import { useAuthStore } from '../../stores/auth.store'
import { getSocket } from '../../lib/socket'
import { queryClient } from '../../lib/query-client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ── Status tabs ────────────────────────────────────────────

const STATUS_TABS = [
  { value: '', label: 'Barchasi' },
  { value: 'PENDING_PAYMENT', label: 'Kutilmoqda' },
  { value: 'PAYMENT_REJECTED', label: 'Rad etildi' },
  { value: 'PAYMENT_SUBMITTED', label: 'Tekshirilmoqda' },
  { value: 'PAYMENT_CONFIRMED', label: 'Tasdiqlandi' },
  { value: 'PACKING', label: 'Tayyorlanmoqda' },
  { value: 'SHIPPED', label: "Jo'natildi" },
  { value: 'DELIVERED', label: 'Yetkazildi' },
  { value: 'CANCELED', label: 'Bekor' },
  { value: 'REFUNDED', label: 'Qaytarildi' },
]

// ── Countdown component ────────────────────────────────────

function Countdown({ deadline }: { deadline: string }) {
  const [info, setInfo] = useState(formatDeadline(deadline))

  useEffect(() => {
    const timer = setInterval(() => {
      setInfo(formatDeadline(deadline))
    }, 60_000) // update every minute
    return () => clearInterval(timer)
  }, [deadline])

  if (info.expired) {
    return <span className="text-[11px] font-medium text-red-500">Muddati o'tdi</span>
  }
  return (
    <span
      className={cn('text-[11px] font-medium', info.urgent ? 'text-red-500' : 'text-amber-600')}
    >
      ⏱ {info.text}
    </span>
  )
}

// ── Mobile Order Card ──────────────────────────────────────

function OrderCard({ order, onClick }: { order: any; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border-[0.5px] border-border
                 p-4 cursor-pointer hover:shadow-sm transition-shadow
                 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-semibold text-gray-900">#{order.orderNumber}</p>
          <p className="text-[11px] text-muted-foreground">{formatDateTime(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} type="order" />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-full bg-primary/10
                        flex items-center justify-center
                        text-xs font-bold text-primary shrink-0"
        >
          {order.customerName?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-900">{order.customerName}</p>
          <p className="text-[11px] text-muted-foreground">{order.customerPhone}</p>
        </div>
        <span
          className={cn(
            'ml-auto text-[10px] font-medium px-1.5 py-0.5',
            'rounded border-[0.5px]',
            order.region === 'KOR'
              ? 'bg-blue-50 text-blue-600 border-blue-200'
              : 'bg-green-50 text-green-600 border-green-200'
          )}
        >
          {order.region}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">{order.itemCount} ta mahsulot</p>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900">{formatKRW(order.totalAmount)}</p>
          {order.region === 'UZB' && order.krwToUzsRate && (
            <p className="text-[10px] text-muted-foreground">
              ≈ {formatUZS(Math.round(order.totalAmount * order.krwToUzsRate))}
            </p>
          )}
        </div>
      </div>

      {order.status === 'PENDING_PAYMENT' && order.paymentDeadline && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <Countdown deadline={order.paymentDeadline} />
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────

export function OrdersPage() {
  const navigate = useNavigate()
  const canWrite = useAuthStore((s) => s.canWrite)

  // URL search params for filter persistence
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [region, setRegion] = useState('')
  const [page, setPage] = useState(1)
  const LIMIT = 20

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [status, region, debouncedSearch])

  // ── Queries ──────────────────────────────────────────────

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QK.ORDERS({
      page,
      limit: LIMIT,
      status,
      region,
      search: debouncedSearch,
    }),
    queryFn: () =>
      ordersApi.list({
        page,
        limit: LIMIT,
        status: status || undefined,
        region: region || undefined,
        search: debouncedSearch || undefined,
      }),
  })

  const { data: statusCounts } = useQuery({
    queryKey: ['orders', 'status-counts'],
    queryFn: ordersApi.getStatusCounts,
    refetchInterval: 30_000,
  })

  // ── Socket real-time updates ──────────────────────────────

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const refresh = () => {
      queryClient.removeQueries()
    }
    socket.on('order:new', refresh)
    socket.on('payment:receipt_uploaded', refresh)
    socket.on('payment:confirmed', refresh)
    return () => {
      socket.off('order:new', refresh)
      socket.off('payment:receipt_uploaded', refresh)
      socket.off('payment:confirmed', refresh)
    }
  }, [])

  const orders = data?.data ?? []
  const meta = data?.meta

  // ── Render ────────────────────────────────────────────────

  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    selected.size === orders.length
      ? setSelected(new Set())
      : setSelected(new Set(orders.map((o: any) => o.id)))
  }

  const bulkStatusMutation = useMutation({
    mutationFn: (data: { ids: string[]; status: string }) =>
      api.post('/admin/orders/bulk-status', data).then((r) => r.data),
    onSuccess: (data, vars) => {
      queryClient.removeQueries()
      if (data.failed && data.failed.length > 0) {
        toast.warning(
          `${data.succeeded.length} ta yangilandi, ${data.failed.length} ta o'tkazib yuborildi`
        )
      } else {
        toast.success(`${vars.ids.length} ta buyurtma yangilandi`)
      }
      setSelected(new Set())
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  // ── Table columns (desktop) ───────────────────────────────

  const columns = [
    {
      key: 'checkbox',
      header: (
        <input
          type="checkbox"
          checked={selected.size === orders.length && orders.length > 0}
          onChange={toggleAll}
          className="rounded cursor-pointer"
        />
      ),
      width: '40px',
      cell: (row: any) => (
        <input
          type="checkbox"
          checked={selected.has(row.id)}
          onChange={() => toggleSelect(row.id)}
          className="rounded cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: 'order',
      header: 'Buyurtma',
      width: '180px',
      cell: (row: any) => (
        <div>
          <p className="text-xs font-semibold text-gray-900">#{row.orderNumber}</p>
          <p className="text-[11px] text-muted-foreground">{formatDateTime(row.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Mijoz',
      width: '160px',
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full bg-primary/10
                          flex items-center justify-center
                          text-xs font-bold text-primary shrink-0"
          >
            {row.customerName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">{row.customerName}</p>
            <p className="text-[11px] text-muted-foreground">{row.customerPhone}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'region',
      header: 'Hudud',
      width: '70px',
      cell: (row: any) => (
        <span
          className={cn(
            'text-[10px] font-medium px-2 py-0.5 rounded-md',
            'border-[0.5px]',
            row.region === 'KOR'
              ? 'bg-blue-50 text-blue-600 border-blue-200'
              : 'bg-green-50 text-green-600 border-green-200'
          )}
        >
          {row.region}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Mahsulot',
      width: '80px',
      cell: (row: any) => <span className="text-xs text-muted-foreground">{row.itemCount} ta</span>,
    },
    {
      key: 'total',
      header: 'Summa',
      width: '110px',
      cell: (row: any) => (
        <div className="text-right pr-4">
          <p className="text-xs font-semibold text-gray-900">{formatKRW(row.totalAmount)}</p>
          {row.region === 'UZB' && row.krwToUzsRate && (
            <p className="text-[10px] text-muted-foreground">
              ≈ {formatUZS(Math.round(row.totalAmount * row.krwToUzsRate))}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Holat',
      width: '160px',
      cell: (row: any) => (
        <div className="space-y-1">
          <StatusBadge status={row.status} type="order" />
          {row.status === 'PENDING_PAYMENT' && row.paymentDeadline && (
            <Countdown deadline={row.paymentDeadline} />
          )}
        </div>
      ),
    },
    {
      key: 'action',
      header: '',
      width: '40px',
      cell: () => (
        <span
          className="text-muted-foreground
                         group-hover:text-primary transition-colors"
        >
          →
        </span>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Buyurtmalar</h1>
          <p className="text-sm text-muted-foreground">
            {meta?.total ? `Jami ${meta.total} ta buyurtma` : 'Barcha buyurtmalarni boshqaring'}
          </p>
        </div>
        {canWrite('orders') && (
          <Button
            size="sm"
            className="rounded-lg gap-2 h-9"
            onClick={() => navigate({ to: '/orders/new' } as any)}
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">Yangi buyurtma</span>
          </Button>
        )}
      </div>

      {/* Status tabs */}
      <div
        className="flex gap-1 overflow-x-auto pb-1
                      scrollbar-none -mx-1 px-1"
      >
        {STATUS_TABS.map((tab) => {
          const count = tab.value === '' ? meta?.total : (statusCounts as any)?.[tab.value]
          return (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                'text-xs font-medium whitespace-nowrap',
                'transition-all border-[0.5px]',
                status === tab.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-muted-foreground',
                'border-border hover:border-primary/30'
              )}
            >
              {tab.label}
              {count !== undefined && count > 0 && (
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5',
                    'rounded-full min-w-[18px] text-center',
                    status === tab.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <KorBulkDeliveryPanel />

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2
                             h-3.5 w-3.5 text-muted-foreground"
            strokeWidth={1.5}
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buyurtma №, telefon yoki ism..."
            className="pl-9 h-9 text-sm rounded-lg border-[0.5px]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2
                         text-muted-foreground hover:text-gray-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger
            className="w-[110px] h-9 text-sm
                                    rounded-lg border-[0.5px]"
          >
            <SelectValue placeholder="Hudud" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="ALL">Barchasi</SelectItem>
            <SelectItem value="KOR">🇰🇷 Koreya</SelectItem>
            <SelectItem value="UZB">🇺🇿 O'zbekiston</SelectItem>
          </SelectContent>
        </Select>

        {(search || (region && region !== 'ALL')) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch('')
              setRegion('')
            }}
            className="h-9 rounded-lg text-xs gap-1 border-[0.5px]"
          >
            <X className="h-3.5 w-3.5" />
            Tozalash
          </Button>
        )}
      </div>

      {/* Table (desktop) / Cards (mobile) */}
      {isError ? (
        <div
          className="bg-white rounded-xl border-[0.5px]
                        border-border p-8 text-center"
        >
          <p className="text-sm text-muted-foreground mb-3">Ma'lumotlarni yuklashda xatolik</p>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="rounded-lg">
            Qayta yuklash
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div
            className="hidden md:block bg-white rounded-xl
                          border-[0.5px] border-border overflow-hidden"
          >
            {isLoading ? (
              <SkeletonTable cols={7} rows={8} />
            ) : orders.length === 0 ? (
              <EmptyState
                message="Buyurtmalar topilmadi"
                description={
                  search || status || region
                    ? "Filtrlarni o'zgartirib ko'ring"
                    : "Hali buyurtma yo'q"
                }
              />
            ) : (
              <>
                <DataTable
                  data={orders}
                  columns={columns}
                  rowKey={(r) => r.id}
                  onRowClick={(r) =>
                    navigate({
                      to: '/orders/$id',
                      params: { id: r.id },
                    })
                  }
                  stickyFirstCol
                />
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
          <div className="md:hidden">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-28 bg-white rounded-xl
                               border-[0.5px] border-border
                               animate-pulse"
                  />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <EmptyState message="Buyurtmalar topilmadi" />
            ) : (
              <div className="space-y-3">
                {orders.map((order: any) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onClick={() =>
                      navigate({
                        to: '/orders/$id',
                        params: { id: order.id },
                      })
                    }
                  />
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
            )}
          </div>
        </>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-xl px-4 py-3 shadow-xl flex items-center gap-3 z-50">
          <span className="text-sm font-medium">{selected.size} ta tanlandi</span>
          <div className="w-px h-4 bg-white/30" />

          <Select
            value=""
            onValueChange={(val) => {
              if (val) {
                bulkStatusMutation.mutate({ ids: Array.from(selected), status: val })
              }
            }}
          >
            <SelectTrigger className="w-[180px] h-8 bg-white/10 border-white/20 text-white text-xs focus:ring-0 focus:ring-offset-0">
              <SelectValue placeholder="Holatni o'zgartirish..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="PAYMENT_CONFIRMED">Tasdiqlash</SelectItem>
              <SelectItem value="PACKING">Tayyorlash</SelectItem>
              <SelectItem value="SHIPPED">Jo'natish</SelectItem>
              <SelectItem value="DELIVERED">Yetkazildi deb belgilash</SelectItem>
              <SelectItem value="CANCELED">Bekor qilish</SelectItem>
              <SelectItem value="REFUNDED">Pulni qaytarish</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="ghost"
            className="text-red-300 hover:bg-white/10 rounded-lg text-xs h-8 px-2"
            onClick={() => setSelected(new Set())}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
