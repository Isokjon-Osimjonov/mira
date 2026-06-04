import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  CreditCard,
  Truck,
  TrendingUp,
  ShoppingCart,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { settingsApi } from '../../api/settings.api'
import { QK } from '../../constants/query-keys'
import { formatKRW, formatUZS } from '../../utils/currency'
import { formatDateTime } from '../../utils/date'
import { getErrorMessage } from '../../lib/errors'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const TABS = [
  { id: 'payment', label: "To'lov usullari", icon: CreditCard },
  { id: 'shipping', label: 'Yetkazib berish', icon: Truck },
  { id: 'exchange', label: 'Valyuta kursi', icon: TrendingUp },
  { id: 'order', label: 'Buyurtma sozlamalari', icon: ShoppingCart },
]

export function SettingsPage() {
  const [tab, setTab] = useState('payment')

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Sozlamalar</h1>
        <p className="text-sm text-muted-foreground mt-1">Tizim sozlamalarini boshqaring</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab navigation */}
        <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible lg:w-60 shrink-0 pb-1 lg:pb-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border-[0.5px]',
                'text-left w-full',
                tab === t.id
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-muted-foreground border-border hover:bg-gray-50'
              )}
            >
              <t.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          {tab === 'payment' && <PaymentMethodsTab />}
          {tab === 'shipping' && <ShippingTiersTab />}
          {tab === 'exchange' && <ExchangeRateTab />}
          {tab === 'order' && <OrderSettingsTab />}
        </div>
      </div>
    </div>
  )
}

function PaymentMethodsTab() {
  const qc = useQueryClient()

  const { data: methods = [], isLoading } = useQuery({
    queryKey: QK.PAYMENT_METHODS,
    queryFn: settingsApi.getPaymentMethods,
    staleTime: 60_000,
  })

  const updateMutation = useMutation({
    mutationFn: ({ method, payload }: any) => settingsApi.updatePaymentMethod(method, payload),
    onSuccess: () => {
      toast.success('Saqlandi')
      qc.invalidateQueries({ queryKey: QK.PAYMENT_METHODS })
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const PAYMENT_LABELS: Record<string, any> = {
    BANK_CARD: {
      label: 'Bank kartasi',
      icon: '💳',
      desc: "KOR va UZB uchun bank o'tkazmasi",
    },
    E9PAY: {
      label: 'E9Pay',
      icon: '📱',
      desc: 'Faqat UZB uchun',
    },
    CASH: {
      label: 'Naqd pul',
      icon: '💵',
      desc: 'Yetkazib berish vaqtida',
    },
  }

  if (isLoading)
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-40 bg-white rounded-2xl border-[0.5px] border-border animate-pulse"
          />
        ))}
      </div>
    )

  return (
    <div className="space-y-4">
      {methods.map((m: any) => {
        const info = PAYMENT_LABELS[m.method] || { label: m.method, icon: '💰', desc: '' }

        return (
          <div key={m.id} className="bg-white rounded-2xl border-[0.5px] border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <span className="text-3xl">{info.icon}</span>
                <div>
                  <p className="text-base font-bold text-gray-900">{info.label}</p>
                  <p className="text-xs text-muted-foreground">{info.desc}</p>
                </div>
              </div>
              {/* Toggle */}
              <button
                onClick={() =>
                  updateMutation.mutate({
                    method: m.method,
                    payload: { isEnabled: !m.isEnabled },
                  })
                }
                disabled={updateMutation.isPending}
                className={cn(
                  'relative w-11 h-6 rounded-full transition-colors border-[0.5px]',
                  m.isEnabled ? 'bg-primary border-primary' : 'bg-gray-200 border-gray-300'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                    m.isEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>

            {m.isEnabled && (
              <div className="space-y-5 pt-5 border-t border-border/50">
                {/* Region toggles */}
                <div className="flex gap-2">
                  {['KOR', 'UZB'].map((region) => (
                    <button
                      key={region}
                      onClick={() => {
                        const regions = m.enabledRegions ?? []
                        const updated = regions.includes(region)
                          ? regions.filter((r: string) => r !== region)
                          : [...regions, region]
                        updateMutation.mutate({
                          method: m.method,
                          payload: { enabledRegions: updated },
                        })
                      }}
                      disabled={updateMutation.isPending}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border-[0.5px] transition-all',
                        m.enabledRegions?.includes(region)
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-gray-50 text-muted-foreground border-border hover:bg-gray-100'
                      )}
                    >
                      {region === 'KOR' ? '🇰🇷' : '🇺🇿'} {region}
                    </button>
                  ))}
                </div>

                {/* Account info */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Hisob raqami / ma'lumot
                  </Label>
                  <Input
                    defaultValue={m.accountInfo ?? ''}
                    placeholder="Bank: 1234 5678 9012 3456"
                    className="h-10 text-sm rounded-xl border-[0.5px]"
                    onBlur={(e) => {
                      if (e.target.value !== m.accountInfo) {
                        updateMutation.mutate({
                          method: m.method,
                          payload: { accountInfo: e.target.value },
                        })
                      }
                    }}
                  />
                </div>

                {/* Instructions */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    To'lov ko'rsatmalari (mijozga ko'rsatiladi)
                  </Label>
                  <textarea
                    rows={2}
                    defaultValue={m.instructions ?? ''}
                    placeholder="To'lovni amalga oshirgandan so'ng..."
                    className="w-full rounded-xl border-[0.5px] border-border p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    onBlur={(e) => {
                      if (e.target.value !== m.instructions) {
                        updateMutation.mutate({
                          method: m.method,
                          payload: { instructions: e.target.value },
                        })
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ShippingTiersTab() {
  const qc = useQueryClient()
  const [region, setRegion] = useState<'KOR' | 'UZB'>('KOR')
  const [adding, setAdding] = useState(false)
  const [newTier, setNewTier] = useState({ minQty: '', shippingCost: '' })

  const { data: tiers = [], isLoading } = useQuery({
    queryKey: QK.SHIPPING_TIERS,
    queryFn: settingsApi.getShippingTiers,
    staleTime: 60_000,
  })

  const filtered = tiers.filter((t: any) => t.region === region)

  const addMutation = useMutation({
    mutationFn: () =>
      settingsApi.createShippingTier({
        region,
        minQty: parseInt(newTier.minQty),
        shippingCost: parseInt(newTier.shippingCost),
      }),
    onSuccess: () => {
      toast.success("Tier qo'shildi")
      qc.invalidateQueries({ queryKey: QK.SHIPPING_TIERS })
      setNewTier({ minQty: '', shippingCost: '' })
      setAdding(false)
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsApi.deleteShippingTier(id),
    onSuccess: () => {
      toast.success("Tier o'chirildi")
      qc.invalidateQueries({ queryKey: QK.SHIPPING_TIERS })
    },
  })

  return (
    <div className="space-y-4">
      {/* Region tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['KOR', 'UZB'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className={cn(
              'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all',
              region === r ? 'bg-white shadow-sm text-gray-900' : 'text-muted-foreground hover:text-gray-700'
            )}
          >
            {r === 'KOR' ? '🇰🇷' : '🇺🇿'} {r}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border-[0.5px] border-border overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 bg-gray-50/30">
          <div>
            <p className="text-base font-bold text-gray-900">{region} yetkazib berish narxlari</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Buyurtma miqdoriga qarab narxlarni belgilang
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAdding(true)}
            className="rounded-xl gap-2 h-9 border-border text-xs font-bold"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Qo'shish
          </Button>
        </div>

        {/* Tier info note */}
        <div className="px-6 py-3 bg-blue-50/50 border-b border-blue-100/50">
          <p className="text-[11px] text-blue-700 font-medium flex items-center gap-2">
            <span className="text-base">ℹ️</span>
            Minimal buyurtma miqdori → yetkazib berish narxi. 0 KRW = bepul yetkazib berish
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Minimal miqdor (dona)
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Yetkazib berish narxi
                </th>
                <th className="px-6 py-3 w-14" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td colSpan={3} className="px-6 py-4">
                      <div className="h-6 bg-gray-100 rounded-lg animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 && !adding ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-sm text-muted-foreground font-medium">
                    Yetkazib berish qoidalari mavjud emas.
                  </td>
                </tr>
              ) : (
                filtered
                  .sort((a: any, b: any) => a.minQty - b.minQty)
                  .map((tier: any) => (
                    <tr key={tier.id} className="hover:bg-gray-50/50 group transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-900">{tier.minQty} ta va undan ko'p</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {Number(tier.shippingCost) === 0 ? (
                          <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                            Bepul 🎉
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-gray-900">
                            {formatKRW(Number(tier.shippingCost))}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => deleteMutation.mutate(tier.id)}
                          disabled={deleteMutation.isPending}
                          className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-500 transition-all"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </td>
                    </tr>
                  ))
              )}

              {/* Add new tier row */}
              {adding && (
                <tr className="bg-primary/5">
                  <td className="px-6 py-4">
                    <Input
                      value={newTier.minQty}
                      onChange={(e) => setNewTier((p) => ({ ...p, minQty: e.target.value }))}
                      type="number"
                      placeholder="5"
                      className="h-10 text-sm rounded-xl border-primary/30 w-32 focus:ring-primary/20"
                      autoFocus
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <Input
                        value={newTier.shippingCost}
                        onChange={(e) => setNewTier((p) => ({ ...p, shippingCost: e.target.value }))}
                        type="number"
                        placeholder="3000"
                        className="h-10 text-sm rounded-xl border-primary/30 w-40 focus:ring-primary/20"
                      />
                      <Button
                        size="sm"
                        onClick={() => addMutation.mutate()}
                        disabled={!newTier.minQty || !newTier.shippingCost || addMutation.isPending}
                        className="h-9 rounded-xl px-4 font-bold"
                      >
                        {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Saqlash'}
                      </Button>
                      <button
                        onClick={() => setAdding(false)}
                        className="text-muted-foreground hover:text-gray-900 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ExchangeRateTab() {
  const qc = useQueryClient()
  const [newRate, setNewRate] = useState('')

  const { data: rates = [], isLoading } = useQuery({
    queryKey: QK.EXCHANGE_RATES,
    queryFn: () => settingsApi.getExchangeRates(7),
    staleTime: 60_000,
  })

  const currentRate = rates[0]

  const updateMutation = useMutation({
    mutationFn: () => settingsApi.updateExchangeRate(parseFloat(newRate)),
    onSuccess: () => {
      toast.success('Valyuta kursi yangilandi')
      qc.invalidateQueries({ queryKey: QK.EXCHANGE_RATES })
      setNewRate('')
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  if (isLoading) return <div className="space-y-4 h-96 bg-white rounded-2xl animate-pulse" />

  return (
    <div className="space-y-4">
      {/* Current rate card */}
      <div className="bg-white rounded-2xl border-[0.5px] border-border p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="text-center sm:text-left">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Joriy kurs
          </p>
          {currentRate ? (
            <>
              <p className="text-4xl font-black text-gray-900 tracking-tight">
                1 ₩ = {Number(currentRate.krwToUzs).toLocaleString()} so'm
              </p>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                Yangilangan: {formatDateTime(currentRate.createdAt)}
              </p>
            </>
          ) : (
            <p className="text-lg font-bold text-muted-foreground">Kurs belgilanmagan</p>
          )}
        </div>
        {currentRate && (
          <div className="bg-gray-50 rounded-2xl p-4 min-w-[200px] border-[0.5px] border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Misol hisob
            </p>
            <div className="space-y-1">
              <p className="text-xs text-gray-600 font-medium">₩15,000 bo'lsa:</p>
              <p className="text-xl font-bold text-primary">
                ≈ {formatUZS(Math.round(15000 * Number(currentRate.krwToUzs)))}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Update rate */}
      <div className="bg-white rounded-2xl border-[0.5px] border-border p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
          Kursni yangilash
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <Label className="text-xs font-bold mb-2 block">Yangi kurs (1 ₩ = ? so'm)</Label>
            <Input
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              type="number"
              placeholder={currentRate ? Number(currentRate.krwToUzs).toString() : '12000'}
              className="h-11 text-base font-bold rounded-xl border-[0.5px] focus:ring-primary/20"
            />
          </div>
          {newRate && (
            <div className="pb-2 px-2 hidden sm:block">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">₩15,000 ≈</p>
              <p className="text-lg font-bold text-gray-700">
                {formatUZS(Math.round(15000 * parseFloat(newRate || '0')))}
              </p>
            </div>
          )}
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={!newRate || parseFloat(newRate) <= 0 || updateMutation.isPending}
            className="h-11 px-8 rounded-xl gap-2 font-bold w-full sm:w-auto"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Saqlash
          </Button>
        </div>
      </div>

      {/* Rate history */}
      {rates.length > 0 && (
        <div className="bg-white rounded-2xl border-[0.5px] border-border overflow-hidden shadow-sm">
          <p className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 bg-gray-50/30">
            Oxirgi 7 kun tarixi
          </p>
          <div className="divide-y divide-border/30">
            {rates.map((r: any, i: number) => (
              <div key={r.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  {i === 0 && <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />}
                  <p className="text-sm font-bold text-gray-900">
                    1 ₩ = {Number(r.krwToUzs).toLocaleString()} so'm
                  </p>
                </div>
                <p className="text-xs text-muted-foreground font-medium">{formatDateTime(r.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function OrderSettingsTab() {
  const qc = useQueryClient()

  const orderSchema = z.object({
    paymentTimeoutMinutes: z.coerce.number().int().min(5).max(1440),
    maxOrderQty: z.coerce.number().int().min(1).max(9999),
    minOrderAmountKrw: z.coerce.number().int().min(0),
  })

  const { data, isLoading } = useQuery({
    queryKey: QK.ORDER_SETTINGS,
    queryFn: settingsApi.getOrderSettings,
    staleTime: 60_000,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(orderSchema),
  })

  useEffect(() => {
    if (data) reset(data)
  }, [data, reset])

  const saveMutation = useMutation({
    mutationFn: settingsApi.updateOrderSettings,
    onSuccess: () => {
      toast.success('Sozlamalar saqlandi')
      qc.invalidateQueries({ queryKey: QK.ORDER_SETTINGS })
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  if (isLoading) return <div className="h-96 bg-white rounded-2xl animate-pulse" />

  return (
    <div className="bg-white rounded-2xl border-[0.5px] border-border p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-6">
        Buyurtma sozlamalari
      </p>

      <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-bold">To'lov muddati (daqiqa)</Label>
            <Input
              {...register('paymentTimeoutMinutes')}
              type="number"
              min="5"
              max="1440"
              className="h-10 rounded-xl border-[0.5px] focus:ring-primary/20"
            />
            <p className="text-[11px] text-muted-foreground font-medium">
              To'lov qilinmasa, buyurtma avtomatik bekor qilinadi. Default: 30 daqiqa
            </p>
            {errors.paymentTimeoutMinutes && (
              <p className="text-xs text-red-500 font-bold">5-1440 daqiqa oralig'ida bo'lishi kerak</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold">Maksimal buyurtma miqdori (dona)</Label>
            <Input
              {...register('maxOrderQty')}
              type="number"
              min="1"
              className="h-10 rounded-xl border-[0.5px] focus:ring-primary/20"
            />
            <p className="text-[11px] text-muted-foreground font-medium">
              Bir buyurtmada maksimal mahsulot soni
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold">Minimal buyurtma summasi (KRW)</Label>
            <Input
              {...register('minOrderAmountKrw')}
              type="number"
              min="0"
              className="h-10 rounded-xl border-[0.5px] focus:ring-primary/20"
            />
            <p className="text-[11px] text-muted-foreground font-medium">0 = cheklov yo'q</p>
          </div>
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            disabled={!isDirty || saveMutation.isPending}
            className="rounded-xl px-8 h-11 gap-2 font-bold"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Saqlash
          </Button>
        </div>
      </form>
    </div>
  )
}
