import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { analyticsApi } from '../../api/analytics.api'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { cn } from '../../lib/utils'
import { formatKRW } from '../../utils/currency'
import { ORDER_STATUS_LABELS } from '../../constants/order-transitions'

export function AnalitikPage() {
  const now = new Date()

  const [preset, setPreset] = useState<string>('this_month')
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [exporting, setExporting] = useState(false)

  const PRESETS = useMemo(
    () => [
      {
        key: 'this_month',
        label: 'Bu oy',
        from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      },
      {
        key: 'last_month',
        label: "O'tgan oy",
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
        to: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0],
      },
      {
        key: 'this_year',
        label: 'Bu yil',
        from: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      },
      {
        key: 'last_30',
        label: 'Oxirgi 30 kun',
        from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      },
      {
        key: 'custom',
        label: 'Custom',
        from: null,
        to: null,
      },
    ],
    []
  )

  const activePreset = useMemo(() => PRESETS.find((p) => p.key === preset), [preset, PRESETS])

  const dateFrom = useMemo(() => {
    if (preset === 'custom') return customFrom
    return activePreset?.from ?? ''
  }, [preset, customFrom, activePreset])

  const dateTo = useMemo(() => {
    if (preset === 'custom') return customTo
    return activePreset?.to ?? ''
  }, [preset, customTo, activePreset])

  const dateParams = useMemo(() => ({ from: dateFrom, to: dateTo }), [dateFrom, dateTo])
  const enabled = useMemo(() => !!dateFrom && !!dateTo, [dateFrom, dateTo])

  // Queries
  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ['analytics', 'overview', dateFrom, dateTo],
    queryFn: () => analyticsApi.getOverview(dateParams),
    enabled,
    staleTime: 300_000,
  })

  const { data: revenueData = [] } = useQuery({
    queryKey: ['analytics', 'revenue', dateFrom, dateTo, groupBy],
    queryFn: () => analyticsApi.getRevenue({ ...dateParams, groupBy }),
    enabled,
    staleTime: 300_000,
  })

  const { data: topProducts = [] } = useQuery({
    queryKey: ['analytics', 'top-products', dateFrom, dateTo],
    queryFn: () => analyticsApi.getTopProducts({ ...dateParams, limit: 10 }),
    enabled,
    staleTime: 300_000,
  })

  const { data: funnel = [] } = useQuery({
    queryKey: ['analytics', 'funnel', dateFrom, dateTo],
    queryFn: () => analyticsApi.getOrderFunnel(dateParams),
    enabled,
    staleTime: 300_000,
  })

  const { data: customerData } = useQuery({
    queryKey: ['analytics', 'customers', dateFrom, dateTo],
    queryFn: () => analyticsApi.getCustomers(dateParams),
    enabled,
    staleTime: 300_000,
  })

  const { data: couponStats } = useQuery({
    queryKey: ['analytics', 'coupons', dateFrom, dateTo],
    queryFn: () => analyticsApi.getCouponStats(dateParams),
    enabled,
    staleTime: 300_000,
  })

  const handleExport = async (type: 'pl' | 'orders' | 'products') => {
    if (!dateFrom || !dateTo) return
    setExporting(true)
    try {
      await analyticsApi.exportCSV({ type, from: dateFrom, to: dateTo })
      toast.success('Fayl yuklab olindi')
    } catch {
      toast.error('Export xatolik')
    } finally {
      setExporting(false)
    }
  }

  const CHART_COLORS = {
    kor: '#E30B5C',
    uzb: '#3A0311',
    total: '#6366f1',
  }

  const PIE_COLORS = ['#E30B5C', '#3A0311', '#6366f1', '#f59e0b']

  const customerPieData = customerData
    ? [
        { name: 'Yangi', value: customerData.new ?? 0 },
        { name: 'Qaytuvchi', value: customerData.returning ?? 0 },
      ]
    : []

  const regionPieData = customerData
    ? [
        { name: '🇰🇷 KOR', value: customerData.kor ?? 0 },
        { name: '🇺🇿 UZB', value: customerData.uzb ?? 0 },
      ]
    : []

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Analitika</h1>
          <p className="text-sm text-muted-foreground">
            {dateFrom && dateTo ? `${dateFrom} — ${dateTo}` : 'Davr tanlang'}
          </p>
        </div>

        {/* Export dropdown */}
        <div className="relative group">
          <Button
            variant="outline"
            size="sm"
            disabled={!enabled || exporting}
            className="rounded-lg gap-2 h-9 border-[0.5px] text-xs"
          >
            📥 Eksport
            <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
          </Button>
          <div className="absolute right-0 top-full mt-1 bg-white rounded-xl border-[0.5px] border-border shadow-lg z-10 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all min-w-[180px]">
            {[
              { type: 'pl' as const, label: 'P&L hisobi (CSV)' },
              { type: 'orders' as const, label: 'Buyurtmalar (CSV)' },
              { type: 'products' as const, label: 'Mahsulotlar (CSV)' },
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => handleExport(item.type)}
                className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date presets */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                preset === p.key ? 'bg-white shadow-sm text-gray-900' : 'text-muted-foreground'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-8 text-xs rounded-lg border-[0.5px] w-36"
            />
            <span className="text-xs text-muted-foreground">—</span>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-8 text-xs rounded-lg border-[0.5px] w-36"
            />
          </div>
        )}
      </div>

      {/* KPI Cards */}
      {ovLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-20 bg-white rounded-xl border-[0.5px] border-border animate-pulse"
            />
          ))}
        </div>
      ) : !enabled ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 opacity-50 grayscale">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 bg-gray-50 rounded-xl border-[0.5px] border-border" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Revenue */}
          <div className="bg-white rounded-xl border-[0.5px] border-border p-4">
            <p className="text-[11px] text-muted-foreground mb-1">Jami daromad</p>
            <p className="text-base font-bold text-gray-900">
              {formatKRW(overview?.revenue?.total ?? 0)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              KOR: {formatKRW(overview?.revenue?.kor ?? 0)}
            </p>
          </div>

          {/* 2. COGS */}
          <div className="bg-orange-50 rounded-xl border-[0.5px] border-orange-100 p-4">
            <p className="text-[11px] text-muted-foreground mb-1">Tannarx (COGS)</p>
            <p className="text-base font-bold text-orange-600">
              {formatKRW(overview?.cogs ?? 0)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Sotilgan tovar tannarxi</p>
          </div>

          {/* 3. Gross profit */}
          <div
            className={cn(
              'rounded-xl border-[0.5px] p-4',
              (overview?.grossProfit ?? 0) >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
            )}
          >
            <p className="text-[11px] text-muted-foreground mb-1">Yalpi foyda</p>
            <p
              className={cn(
                'text-base font-bold',
                (overview?.grossProfit ?? 0) >= 0 ? 'text-green-700' : 'text-red-600'
              )}
            >
              {formatKRW(overview?.grossProfit ?? 0)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Margin: {(overview?.grossMargin ?? 0).toFixed(1)}%
            </p>
          </div>

          {/* 4. Expenses */}
          <div className="bg-red-50 rounded-xl border-[0.5px] border-red-100 p-4">
            <p className="text-[11px] text-muted-foreground mb-1">Xarajatlar</p>
            <p className="text-base font-bold text-red-600">
              {formatKRW(overview?.expenses ?? 0)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Barcha xarajatlar</p>
          </div>

          {/* 5. Net profit — most important */}
          <div
            className={cn(
              'rounded-xl border-[0.5px] p-4',
              (overview?.netProfit ?? 0) >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            )}
          >
            <p className="text-[11px] text-muted-foreground mb-1">
              Sof foyda {(overview?.netProfit ?? 0) >= 0 ? ' 🟢' : ' 🔴'}
            </p>
            <p
              className={cn(
                'text-base font-bold',
                (overview?.netProfit ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'
              )}
            >
              {formatKRW(overview?.netProfit ?? 0)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Margin: {(overview?.netMargin ?? 0).toFixed(1)}%
            </p>
          </div>

          {/* 6. Avg order */}
          <div className="bg-blue-50 rounded-xl border-[0.5px] border-blue-100 p-4">
            <p className="text-[11px] text-muted-foreground mb-1">O'rt. buyurtma</p>
            <p className="text-base font-bold text-blue-700">
              {formatKRW(overview?.avgOrderValue ?? 0)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {(overview?.orders?.completionRate ?? 0).toFixed(0)}% bajarildi
            </p>
          </div>
        </div>
      )}

      {/* Revenue chart */}
      <div className="bg-white rounded-xl border-[0.5px] border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Daromad grafigi</h2>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {(['day', 'week', 'month'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={cn(
                  'px-3 py-1 rounded-md text-[11px] font-medium transition-all',
                  groupBy === g ? 'bg-white shadow-sm text-gray-900' : 'text-muted-foreground'
                )}
              >
                {g === 'day' ? 'Kun' : g === 'week' ? 'Hafta' : 'Oy'}
              </button>
            ))}
          </div>
        </div>

        {!enabled ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">← Davr tanlang</p>
          </div>
        ) : revenueData.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Bu davrda ma'lumot yo'q</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="korGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.kor} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={CHART_COLORS.kor} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="uzbGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.uzb} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={CHART_COLORS.uzb} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(v) =>
                  v >= 1000000
                    ? `₩${(v / 1000000).toFixed(1)}M`
                    : v >= 1000
                    ? `₩${(v / 1000).toFixed(0)}K`
                    : `₩${v}`
                }
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: any, name: any) => [
                  formatKRW(Number(value)),
                  name === 'korKrw' ? '🇰🇷 KOR' : name === 'uzbKrw' ? '🇺🇿 UZB' : 'Jami',
                ]}
                contentStyle={{
                  borderRadius: '12px',
                  border: '0.5px solid #e5e7eb',
                  fontSize: '12px',
                }}
              />
              <Legend
                formatter={(v) => (v === 'korKrw' ? '🇰🇷 KOR' : v === 'uzbKrw' ? '🇺🇿 UZB' : 'Jami')}
                wrapperStyle={{ fontSize: '11px' }}
              />
              <Area
                type="monotone"
                dataKey="korKrw"
                stroke={CHART_COLORS.kor}
                strokeWidth={2}
                fill="url(#korGrad)"
              />
              <Area
                type="monotone"
                dataKey="uzbKrw"
                stroke={CHART_COLORS.uzb}
                strokeWidth={2}
                fill="url(#uzbGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 2-column: Top Products + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="bg-white rounded-xl border-[0.5px] border-border overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-border/50">
            <h2 className="text-sm font-semibold text-gray-900">Top mahsulotlar</h2>
          </div>
          <div className="divide-y divide-border/30 flex-1">
            {!enabled ? (
              <div className="p-10 text-center">
                <p className="text-xs text-muted-foreground">Davr tanlang</p>
              </div>
            ) : topProducts.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-xs text-muted-foreground">Ma'lumot yo'q</p>
              </div>
            ) : (
              topProducts.slice(0, 8).map((p: any, i: number) => (
                <div key={p.productId} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">
                    {i + 1}
                  </span>
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      className="w-8 h-8 rounded-lg object-cover shrink-0 border-[0.5px] border-border"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{p.productName}</p>
                    <p className="text-[10px] text-muted-foreground">{p.unitsSold} ta sotildi</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold">{formatKRW(p.revenueKrw ?? 0)}</p>
                    {p.margin != null && (
                      <p
                        className={cn(
                          'text-[10px] font-medium',
                          p.margin >= 20 ? 'text-green-600' : 'text-muted-foreground'
                        )}
                      >
                        {p.margin.toFixed(0)}%
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Order Funnel */}
        <div className="bg-white rounded-xl border-[0.5px] border-border p-5 flex flex-col">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Buyurtma funnel</h2>
          <div className="flex-1">
            {!enabled ? (
              <div className="h-full flex items-center justify-center py-10">
                <p className="text-xs text-muted-foreground">Davr tanlang</p>
              </div>
            ) : funnel.length === 0 ? (
              <div className="h-full flex items-center justify-center py-10">
                <p className="text-xs text-muted-foreground">Ma'lumot yo'q</p>
              </div>
            ) : (
              <div className="space-y-2">
                {funnel.map((step: any) => (
                  <div key={step.status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 font-medium">
                        {ORDER_STATUS_LABELS[step.status] ?? step.status}
                      </span>
                      <span className="text-muted-foreground">
                        {step.count} ta ({step.percentage?.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${step.percentage ?? 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coupon statistics section */}
      <div className="bg-white rounded-xl border-[0.5px] border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="text-sm font-semibold text-gray-900">Kuponlar statistikasi</h2>
          <p className="text-[11px] text-muted-foreground">
            Ushbu davrda ishlatilgan kuponlar va ular keltirgan daromad
          </p>
        </div>

        {/* Coupon KPIs */}
        {enabled && couponStats && (
          <div className="grid grid-cols-3 gap-px bg-border/30 border-b border-border/30">
            {[
              {
                label: 'Ishlatilgan kuponlar',
                value: `${couponStats.totalUsed ?? 0} ta`,
                color: 'text-blue-700',
              },
              {
                label: 'Jami chegirma',
                value: formatKRW(couponStats.totalDiscount ?? 0),
                color: 'text-red-600',
              },
              {
                label: 'Kuponli buyurtmalar',
                value: `${couponStats.couponOrderPct?.toFixed(1) ?? 0}%`,
                color: 'text-purple-700',
              },
            ].map((kpi, i) => (
              <div key={i} className="bg-white px-4 py-3">
                <p className="text-[11px] text-muted-foreground mb-1">{kpi.label}</p>
                <p className={cn('text-base font-bold', kpi.color)}>{kpi.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Top coupons table */}
        {!enabled ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">Davr tanlang</p>
          </div>
        ) : couponStats?.topCoupons?.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-gray-50/80">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Kupon kodi
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground w-24">
                  Foydalanish
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground w-32">
                  Chegirma
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground w-32 hidden md:table-cell">
                  Daromad
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {couponStats.topCoupons.map((c: any, i: number) => (
                <tr key={c.code} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                      <code className="text-sm font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                        {c.code}
                      </code>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                        {c.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold">{c.usageCount}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-red-600">
                      -{formatKRW(c.totalDiscount ?? 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatKRW(c.revenue ?? 0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">Bu davrda kupon ishlatilmagan</p>
          </div>
        )}
      </div>

      {/* 2-column: Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer pies */}
        <div className="bg-white rounded-xl border-[0.5px] border-border p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Mijozlar tahlili</h2>
          {!enabled ? (
            <div className="h-[140px] flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Davr tanlang</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* New vs Returning */}
              <div>
                <p className="text-xs text-muted-foreground text-center mb-2">Yangi / Qaytuvchi</p>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={customerPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {customerPieData.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => [`${v} ta`]}
                      contentStyle={{
                        borderRadius: '12px',
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* KOR vs UZB */}
              <div>
                <p className="text-xs text-muted-foreground text-center mb-2">Hudud bo'yicha</p>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={regionPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      <Cell fill={CHART_COLORS.kor} />
                      <Cell fill={CHART_COLORS.uzb} />
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => [`${v} ta`]}
                      contentStyle={{
                        borderRadius: '12px',
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Top customers */}
        <div className="bg-white rounded-xl border-[0.5px] border-border overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-border/50">
            <h2 className="text-sm font-semibold text-gray-900">Top mijozlar</h2>
          </div>
          <div className="divide-y divide-border/30 flex-1">
            {!enabled ? (
              <div className="p-10 text-center">
                <p className="text-xs text-muted-foreground">Davr tanlang</p>
              </div>
            ) : customerData?.topCustomers?.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-xs text-muted-foreground">Ma'lumot yo'q</p>
              </div>
            ) : (
              (customerData?.topCustomers ?? []).slice(0, 8).map((c: any, i: number) => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">
                    {i + 1}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {c.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.orderCount} ta buyurtma</p>
                  </div>
                  <p className="text-xs font-semibold text-gray-900 shrink-0">
                    {formatKRW(c.totalSpent ?? 0)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

