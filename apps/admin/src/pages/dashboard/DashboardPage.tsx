import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Package,
  Boxes,
  AlertTriangle,
  Clock,
  DollarSign,
  ClipboardCheck,
  Tag,
} from 'lucide-react'
import { analyticsApi, type DashboardPeriod } from '../../api/analytics.api'
import { ordersApi } from '../../api/orders.api'
import { QK } from '../../constants/query-keys'
import { formatKRW, formatUZS } from '../../utils/currency'
import { formatDeadline } from '../../utils/date'
import { StatusBadge } from '../../components/ui/status-badge'
import { SkeletonTable } from '../../components/shared/SkeletonTable'
import { useExchangeRate } from '../../hooks/useExchangeRate'
import { getSocket } from '../../lib/socket'
import { queryClient } from '../../lib/query-client'
import { cn } from '@/lib/utils'

// ── Period selector ────────────────────────────────────────

const PERIODS: { label: string; value: DashboardPeriod }[] = [
  { label: '7 kun', value: '7d' },
  { label: '30 kun', value: '30d' },
  { label: 'Bu oy', value: 'month' },
]

// ── KPI Card ───────────────────────────────────────────────

function KpiCard({
  title,
  value,
  sub,
  change,
  icon: Icon,
  iconColor,
  loading,
  onClick,
}: {
  title: string
  value: string
  sub?: string
  change?: { value: number; label: string }
  icon: React.ElementType
  iconColor: string
  loading?: boolean
  onClick?: () => void
}) {
  if (loading) {
    return (
      <div
        className="bg-white rounded-xl border-[0.5px]
                      border-border p-5 animate-pulse"
      >
        <div className="h-3 w-24 bg-gray-100 rounded mb-3" />
        <div className="h-7 w-32 bg-gray-100 rounded mb-2" />
        <div className="h-3 w-20 bg-gray-100 rounded" />
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border-[0.5px] border-border p-5',
        'transition-shadow hover:shadow-sm',
        onClick && 'cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', iconColor)}>
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      {change && (
        <div
          className={cn(
            'flex items-center gap-1 mt-2 text-xs font-medium',
            change.value >= 0 ? 'text-green-600' : 'text-red-500'
          )}
        >
          {change.value >= 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {Math.abs(change.value)}% {change.label}
        </div>
      )}
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate()
  const { rate } = useExchangeRate()
  const [period, setPeriod] = useState<DashboardPeriod>('7d')

  // ── Queries ──────────────────────────────────────────────

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: QK.DASHBOARD_OVERVIEW(period),
    queryFn: () => analyticsApi.getDashboardOverview(period),
    refetchInterval: 30_000, // auto refresh every 30s
  })

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: QK.DASHBOARD_REVENUE(period),
    queryFn: () => analyticsApi.getDashboardRevenue(period),
    refetchInterval: 60_000,
  })

  const { data: ordersByStatus } = useQuery({
    queryKey: ['dashboard', 'orders-by-status', period],
    queryFn: () => analyticsApi.getOrdersByStatus(period),
    refetchInterval: 30_000,
  })

  const { data: topProducts } = useQuery({
    queryKey: QK.DASHBOARD_PRODUCTS(period),
    queryFn: () => analyticsApi.getDashboardProducts(period),
  })

  const { data: inventoryStats } = useQuery({
    queryKey: QK.DASHBOARD_INVENTORY,
    queryFn: () => analyticsApi.getInventory(),
    refetchInterval: 60_000,
  })

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['dashboard', 'recent-orders'],
    queryFn: () => ordersApi.list({ limit: 10, page: 1 }),
    refetchInterval: 30_000,
  })

  const { data: pendingPayments } = useQuery({
    queryKey: ['dashboard', 'pending-payments'],
    queryFn: () =>
      ordersApi.list({
        status: 'PENDING_PAYMENT',
        limit: 5,
        page: 1,
      }),
    refetchInterval: 15_000,
  })

  // ── Socket: live KPI updates ──────────────────────────────
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const refresh = () => {
      queryClient.invalidateQueries({
        queryKey: ['dashboard'],
      })
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

  // ── Chart colors ─────────────────────────────────────────
  const STATUS_COLORS: Record<string, string> = {
    PENDING_PAYMENT: '#f59e0b',
    PAYMENT_SUBMITTED: '#3b82f6',
    PAYMENT_CONFIRMED: '#10b981',
    PAYMENT_REJECTED: '#ef4444',
    PACKING: '#8b5cf6',
    SHIPPED: '#6366f1',
    DELIVERED: '#16a34a',
    CANCELED: '#9ca3af',
    REFUNDED: '#f97316',
  }

  const STATUS_LABELS: Record<string, string> = {
    PENDING_PAYMENT: "To'lov kutilmoqda",
    PAYMENT_SUBMITTED: "To'lov yuborildi",
    PAYMENT_CONFIRMED: "To'lov tasdiqlandi",
    PAYMENT_REJECTED: "To'lov rad etildi",
    PACKING: 'Tayyorlanmoqda',
    SHIPPED: "Jo'natildi",
    DELIVERED: 'Yetkazildi',
    CANCELED: 'Bekor qilindi',
    REFUNDED: 'Qaytarildi',
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      {/* Page header + Period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Biznes ko'rsatkichlari</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium',
                'transition-all',
                period === p.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-muted-foreground hover:text-gray-700'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Row 1: KPI Cards (6) ─────────────────────────── */}
      <div
        className="grid grid-cols-2 md:grid-cols-3
                      xl:grid-cols-6 gap-3"
      >
        {/* 1. Bugungi daromad */}
        <KpiCard
          title="Bugungi daromad"
          value={formatKRW(overview?.todayRevenue ?? 0)}
          sub={
            overview?.todayDiscounts > 0
              ? `Chegirmalar: -${formatKRW(overview.todayDiscounts)}`
              : 'Bugungi tushum'
          }
          change={
            overview?.todayRevenueChange
              ? { value: overview.todayRevenueChange, label: 'kechadan' }
              : undefined
          }
          icon={DollarSign}
          iconColor="bg-primary/10 text-primary"
          loading={overviewLoading}
        />

        {/* 2. Oy daromadi */}
        <KpiCard
          title="Oy daromadi"
          value={formatKRW(overview?.periodRevenue ?? 0)}
          sub={
            overview?.hasDiscounts
              ? `Chegirmalar: -${formatKRW(overview.periodDiscounts)}`
              : 'Jami tushum'
          }
          change={
            overview?.periodRevenueChange
              ? { value: overview.periodRevenueChange, label: "o'tgandan" }
              : undefined
          }
          icon={TrendingUp}
          iconColor="bg-green-50 text-green-600"
          loading={overviewLoading}
        />

        {/* 2.5 Kupon chegirmalari */}
        {overview?.hasDiscounts && (
          <KpiCard
            title="Kupon chegirmalari"
            value={`-${formatKRW(overview.periodDiscounts ?? 0)}`}
            sub="Chegirma sifatida berilgan"
            change={undefined}
            icon={Tag}
            iconColor="bg-green-50 text-green-600"
            loading={overviewLoading}
          />
        )}

        {/* 3. To'lov kutilmoqda */}
        <KpiCard
          title="To'lov kutilmoqda"
          value={`${overview?.pendingPayment ?? 0} ta`}
          sub="mijoz to'lashi kerak"
          icon={Clock}
          iconColor="bg-amber-50 text-amber-600"
          loading={overviewLoading}
          onClick={() =>
            navigate({
              to: '/orders',
              search: { status: 'PENDING_PAYMENT' },
            })
          }
        />

        {/* 3.5. Tasdiqlash kutilmoqda */}
        <KpiCard
          title="Tasdiqlash kutilmoqda"
          value={`${overview?.pendingConfirmation ?? 0} ta`}
          sub="admin tekshirishi kerak"
          icon={ClipboardCheck}
          iconColor="bg-orange-50 text-orange-600"
          loading={overviewLoading}
          onClick={() =>
            navigate({
              to: '/orders',
              search: { status: 'PAYMENT_SUBMITTED' },
            })
          }
        />

        {/* 4. Jami buyurtmalar (period) */}
        <KpiCard
          title="Buyurtmalar"
          value={`${overview?.totalOrders ?? 0} ta`}
          sub={`${period === '7d' ? '7' : period === '30d' ? '30' : 'bu oy'} ichida`}
          icon={ShoppingBag}
          iconColor="bg-blue-50 text-blue-600"
          loading={overviewLoading}
          onClick={() => navigate({ to: '/orders' })}
        />

        {/* 5. Mahsulotlar soni (inventory count) */}
        <KpiCard
          title="Mahsulotlar soni"
          value={`${inventoryStats?.totalProducts ?? 0} ta`}
          sub={`${inventoryStats?.activeProducts ?? 0} ta aktiv`}
          icon={Package}
          iconColor="bg-violet-50 text-violet-600"
          loading={!inventoryStats}
          onClick={() => navigate({ to: '/inventory' })}
        />

        {/* 6. Ombor qiymati */}
        <KpiCard
          title="Ombor qiymati"
          value={formatKRW(inventoryStats?.totalValueKrw ?? 0)}
          sub={`${inventoryStats?.lowStockCount ?? 0} ta kam qolgan`}
          icon={Boxes}
          iconColor={
            (inventoryStats?.lowStockCount ?? 0) > 0
              ? 'bg-red-50 text-red-500'
              : 'bg-gray-100 text-gray-500'
          }
          loading={!inventoryStats}
          onClick={() =>
            navigate({
              to: '/inventory',
              search: { filter: 'low_stock' },
            })
          }
        />
      </div>

      {/* ── Row 2: Revenue Chart + Orders by Status ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Revenue chart */}
        <div
          className="lg:col-span-2 bg-white rounded-xl
                        border-[0.5px] border-border p-5"
        >
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Daromad dinamikasi</h2>
          {revenueLoading ? (
            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData?.daily ?? []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E11D74" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#E11D74" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v)
                    return `${d.getDate()}.${d.getMonth() + 1}`
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `₩${(v / 1000).toFixed(0)}K` : `₩${v}`
                  }
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip
                  formatter={(value: any) => [formatKRW(Number(value || 0)), 'Daromad']}
                  labelFormatter={(label: any) => {
                    const d = new Date(label)
                    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
                  }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '0.5px solid #e5e7eb',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#E11D74"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Orders by status donut */}
        <div
          className="bg-white rounded-xl border-[0.5px]
                        border-border p-5"
        >
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Buyurtma holatlari</h2>
          {!ordersByStatus ? (
            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={ordersByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="count"
                  nameKey="status"
                >
                  {ordersByStatus.map((entry: any) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#e5e7eb'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any, name: any) => [`${v} ta`, STATUS_LABELS[name] ?? name]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '0.5px solid #e5e7eb',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  formatter={(value: any) => STATUS_LABELS[value] ?? value}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Row 3: Recent Orders + Top Products ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Recent orders */}
        <div
          className="lg:col-span-2 bg-white rounded-xl
                        border-[0.5px] border-border overflow-hidden"
        >
          <div
            className="flex items-center justify-between
                          px-5 py-4 border-b border-border/50"
          >
            <h2 className="text-sm font-semibold text-gray-900">Oxirgi buyurtmalar</h2>
            <button
              onClick={() => navigate({ to: '/orders' })}
              className="text-xs text-primary hover:underline font-medium"
            >
              Barchasini ko'rish →
            </button>
          </div>
          {ordersLoading ? (
            <SkeletonTable cols={4} rows={5} />
          ) : (
            <div className="divide-y divide-border/30">
              {(recentOrders?.data ?? []).slice(0, 8).map((order: any) => (
                <div
                  key={order.id}
                  onClick={() =>
                    navigate({
                      to: '/orders/$id',
                      params: { id: order.id },
                    })
                  }
                  className="flex items-center justify-between
                             px-5 py-3 hover:bg-gray-50/80
                             cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-900">#{order.orderNumber}</p>
                      <p className="text-[11px] text-muted-foreground">{order.customerName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} type="order" />
                    <p
                      className="text-xs font-semibold text-gray-900
                                  min-w-[80px] text-right"
                    >
                      {formatKRW(order.totalAmount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top products */}
        <div
          className="bg-white rounded-xl border-[0.5px]
                        border-border p-5"
        >
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Top mahsulotlar</h2>
          <div className="space-y-3">
            {(topProducts ?? []).slice(0, 5).map((p: any, i: number) => (
              <div key={p.productId} className="flex items-center gap-3">
                <span
                  className="text-xs font-bold text-muted-foreground
                                 w-4 shrink-0"
                >
                  {i + 1}
                </span>
                {p.imageUrl && (
                  <img
                    src={p.imageUrl}
                    alt={p.productName}
                    className="w-8 h-8 min-w-[2rem] shrink-0 rounded-md object-cover border border-border/50"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-medium text-gray-900
                                truncate"
                  >
                    {p.productName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.soldQty} ta · {formatKRW(p.revenueKrw)}
                  </p>
                </div>
              </div>
            ))}
            {!topProducts && (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 4: Pending Payments + Low Stock ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Pending payments */}
        <div
          className="bg-white rounded-xl border-[0.5px]
                        border-border overflow-hidden"
        >
          <div
            className="flex items-center gap-2 px-5 py-4
                          border-b border-border/50"
          >
            <div
              className="w-2 h-2 rounded-full bg-amber-500
                            animate-pulse"
            />
            <h2 className="text-sm font-semibold text-gray-900">To'lov kutilmoqda</h2>
          </div>
          <div className="divide-y divide-border/30">
            {(pendingPayments?.data ?? []).slice(0, 5).map((order: any) => {
              const deadline = order.paymentDeadline ? formatDeadline(order.paymentDeadline) : null
              return (
                <div
                  key={order.id}
                  onClick={() =>
                    navigate({
                      to: '/orders/$id',
                      params: { id: order.id },
                    })
                  }
                  className="flex items-center justify-between
                             px-5 py-3 hover:bg-gray-50/80
                             cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-xs font-medium text-gray-900">#{order.orderNumber}</p>
                    <p className="text-[11px] text-muted-foreground">{order.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-900">
                      {formatKRW(order.totalAmount)}
                    </p>
                    {deadline && (
                      <p
                        className={cn(
                          'text-[11px] font-medium',
                          deadline.urgent ? 'text-red-500' : 'text-muted-foreground'
                        )}
                      >
                        {deadline.text}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
            {!pendingPayments?.data?.length && (
              <p
                className="text-xs text-muted-foreground
                            text-center py-6"
              >
                Kutilayotgan to'lovlar yo'q 🎉
              </p>
            )}
          </div>
        </div>

        {/* Low stock alerts */}
        <div
          className="bg-white rounded-xl border-[0.5px]
                        border-border overflow-hidden"
        >
          <div
            className="flex items-center justify-between
                          px-5 py-4 border-b border-border/50"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" strokeWidth={1.5} />
              <h2 className="text-sm font-semibold text-gray-900">Kam qolgan mahsulotlar</h2>
            </div>
            <button
              onClick={() => navigate({ to: '/inventory' })}
              className="text-xs text-primary hover:underline font-medium"
            >
              Inventar →
            </button>
          </div>
          <div className="divide-y divide-border/30">
            {(inventoryStats?.lowStockItems ?? []).slice(0, 5).map((item: any) => (
              <div
                key={item.productId}
                className="flex items-center justify-between
                           px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="w-7 h-7 min-w-[1.75rem] shrink-0 rounded-md object-cover border border-border/50"
                    />
                  )}
                  <div>
                    <p className="text-xs font-medium text-gray-900">{item.productName}</p>
                    <p className="text-[11px] text-muted-foreground">{item.brandName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      'text-xs font-bold',
                      item.availableStock === 0 ? 'text-red-500' : 'text-amber-600'
                    )}
                  >
                    {item.availableStock} ta
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.availableStock === 0 ? 'Tugagan' : 'Kam qolgan'}
                  </p>
                </div>
              </div>
            ))}
            {inventoryStats && !inventoryStats.lowStockItems?.length && (
              <p
                className="text-xs text-muted-foreground
                            text-center py-6"
              >
                Barcha mahsulotlar yetarli ✅
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
