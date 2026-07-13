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
  RefreshCw,
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
import { ToggleSwitch } from '../../components/ui/ToggleSwitch'

const TABS = [
  { id: 'payment', label: "To'lov usullari", icon: CreditCard },
  { id: 'shipping', label: 'Yetkazib berish', icon: Truck },
  { id: 'exchange', label: 'Valyuta kursi', icon: TrendingUp },
  { id: 'order', label: 'Buyurtma sozlamalari', icon: ShoppingCart },
]

export function SettingsPage() {
  const [tab, setTab] = useState('payment')

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <div className="px-1 sm:px-0">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Sozlamalar</h1>
        <p className="text-sm text-muted-foreground mt-1">Tizim sozlamalarini boshqaring</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-full">
        {/* Tab navigation */}
        <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible w-full max-w-full lg:w-60 shrink-0 pb-1 lg:pb-0 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border-[0.5px]',
                'text-left w-auto lg:w-full snap-start shrink-0',
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

        {/* Tab content — consistent width */}
        <div className="flex-1 min-w-0 max-w-2xl">
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
    placeholderData: (prev) => prev,
  })

  const updateMutation = useMutation({
    mutationFn: ({ method, payload }: any) => settingsApi.updatePaymentMethod(method, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.PAYMENT_METHODS })
      toast.success('Saqlandi')
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const PAYMENT_CONFIG: Record<string, any> = {
    BANK_CARD_KOR: {
      label: 'Bank kartasi',
      flag: '🇰🇷',
      region: 'KOR',
      icon: '💳',
      cardTypes: null,
    },
    BANK_CARD_UZB: {
      label: 'Bank kartasi',
      flag: '🇺🇿',
      region: 'UZB',
      icon: '💳',
      cardTypes: ['Humo', 'Uzcard'],
    },
    E9PAY: {
      label: 'E9Pay',
      flag: '🇺🇿',
      region: 'UZB',
      icon: '📱',
      cardTypes: null,
    },
  }

  if (isLoading)
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-48 bg-white rounded-2xl border-[0.5px] border-border animate-pulse"
          />
        ))}
      </div>
    )

  return (
    <div className="space-y-4">
      {Object.entries(PAYMENT_CONFIG).map(([key, cfg]) => {
        const method = methods.find((m: any) => m.method === key)
        const isConfigured = !!method

        return (
          <div
            key={key}
            className={cn(
              'bg-white rounded-2xl border-[0.5px] border-border p-5 space-y-4 shadow-sm transition-all',
              !isConfigured && 'opacity-80 bg-gray-50/50'
            )}
          >
            {/* Header row */}
            <div className="flex flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <span className="text-2xl mt-1 sm:mt-0 shrink-0">{cfg.icon}</span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{cfg.label}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-gray-100 text-gray-600 font-bold border-[0.5px] whitespace-nowrap">
                      {cfg.flag} {cfg.region}
                    </span>
                    {!isConfigured && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-amber-50 text-amber-600 font-bold border-[0.5px] border-amber-200 whitespace-nowrap">
                        Sozlanmagan
                      </span>
                    )}
                  </div>
                  {cfg.cardTypes && (
                    <p className="text-[11px] text-muted-foreground font-medium mt-1">
                      {cfg.cardTypes.join(' / ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Toggle */}
              <div className="shrink-0 mt-1 sm:mt-0">
                <ToggleSwitch
                  checked={method?.isEnabled ?? false}
                  disabled={updateMutation.isPending}
                  onChange={(v) =>
                    updateMutation.mutate({
                      method: key,
                      payload: { isEnabled: v, region: cfg.region },
                    })
                  }
                />
              </div>
            </div>

            {/* Details (always visible) */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Bank nomi
                  </Label>
                  <Input
                    key={`${key}-bank-${method?.bankName}`}
                    defaultValue={method?.bankName ?? ''}
                    placeholder={
                      cfg.region === 'KOR'
                        ? 'Kookmin Bank, Shinhan...'
                        : 'Kapitalbank, Hamkorbank...'
                    }
                    className="h-9 text-sm rounded-xl border-[0.5px]"
                    onBlur={(e) => {
                      if (e.target.value !== (method?.bankName ?? '')) {
                        updateMutation.mutate({
                          method: key,
                          payload: { bankName: e.target.value, region: cfg.region },
                        })
                      }
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {key === 'E9PAY' ? 'E9Pay ID / Telefon' : 'Karta / Hisob raqami'}
                  </Label>
                  <Input
                    key={`${key}-account-${method?.accountNumber}`}
                    defaultValue={method?.accountNumber ?? ''}
                    placeholder={
                      key === 'E9PAY'
                        ? '+82 10-xxxx-xxxx'
                        : cfg.region === 'KOR'
                          ? '1234-5678-9012-3456'
                          : '8600 xxxx xxxx xxxx'
                    }
                    className="h-9 text-sm rounded-xl border-[0.5px]"
                    onBlur={(e) => {
                      if (e.target.value !== (method?.accountNumber ?? '')) {
                        updateMutation.mutate({
                          method: key,
                          payload: { accountNumber: e.target.value, region: cfg.region },
                        })
                      }
                    }}
                  />
                </div>
              </div>

              {key !== 'E9PAY' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Karta egasi (to'liq ism)
                  </Label>
                  <Input
                    key={`${key}-holder-${method?.holderName}`}
                    defaultValue={method?.holderName ?? ''}
                    placeholder="HONG GIL DONG"
                    className="h-9 text-sm rounded-xl border-[0.5px]"
                    onBlur={(e) => {
                      if (e.target.value !== (method?.holderName ?? '')) {
                        updateMutation.mutate({
                          method: key,
                          payload: { holderName: e.target.value, region: cfg.region },
                        })
                      }
                    }}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  To'lov ko'rsatmalari (mijozga ko'rsatiladi)
                </Label>
                <textarea
                  key={`${key}-inst-${method?.instructions}`}
                  rows={2}
                  defaultValue={method?.instructions ?? ''}
                  placeholder="To'lovni amalga oshirgandan so'ng chekni yuboring..."
                  className="w-full rounded-xl border-[0.5px] border-border p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  onBlur={(e) => {
                    if (e.target.value !== (method?.instructions ?? '')) {
                      updateMutation.mutate({
                        method: key,
                        payload: { instructions: e.target.value, region: cfg.region },
                      })
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ShippingTiersTab() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [newTier, setNewTier] = useState({ maxOrderKrw: '', cargoFeeKrw: '' })

  const { data: tiers = [], isLoading } = useQuery({
    queryKey: QK.SHIPPING_TIERS,
    queryFn: settingsApi.getShippingTiers,
    placeholderData: (prev) => prev,
  })

  const addMutation = useMutation({
    mutationFn: () =>
      settingsApi.createShippingTier({
        maxOrderKrw: newTier.maxOrderKrw === '' ? null : parseInt(newTier.maxOrderKrw),
        cargoFeeKrw: parseInt(newTier.cargoFeeKrw),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.SHIPPING_TIERS })
      toast.success("Tier qo'shildi")
      setNewTier({ maxOrderKrw: '', cargoFeeKrw: '' })
      setAdding(false)
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsApi.deleteShippingTier(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.SHIPPING_TIERS })
      toast.success("Tier o'chirildi")
    },
  })

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border-[0.5px] border-border overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 bg-gray-50/30">
          <div>
            <p className="text-base font-bold text-gray-900">Korea yetkazib berish narxlari</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Buyurtma summasiga qarab narxlarni belgilang
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

        <div className="px-6 py-3 bg-blue-50/50 border-b border-blue-100/50">
          <p className="text-[11px] text-blue-700 font-medium flex items-center gap-2">
            <span className="text-base">ℹ️</span>
            Buyurtma maksimal summasi (shundan past) → yetkazib berish narxi. Bo'sh qoldirilsa =
            cheksiz. 0 KRW = bepul
          </p>
        </div>

        {adding && (
          <div className="p-4 bg-primary/5 border-b border-border/50">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end p-4 rounded-xl bg-blue-50/50 border-[0.5px] border-blue-100">
              <div className="w-full sm:flex-1 space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-blue-700">
                  Maksimal summa (₩)
                </Label>
                <Input
                  value={newTier.maxOrderKrw}
                  onChange={(e) => setNewTier((p) => ({ ...p, maxOrderKrw: e.target.value }))}
                  type="number"
                  placeholder="Bo'sh qoldirilsa: Cheksiz"
                  className="h-10 text-sm rounded-xl border-blue-200 focus:ring-blue-200 bg-white"
                  autoFocus
                />
              </div>
              <div className="w-full sm:flex-1 space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-blue-700">
                  Yetkazib berish (₩)
                </Label>
                <Input
                  value={newTier.cargoFeeKrw}
                  onChange={(e) => setNewTier((p) => ({ ...p, cargoFeeKrw: e.target.value }))}
                  type="number"
                  placeholder="0 = bepul"
                  className="h-10 text-sm rounded-xl border-blue-200 focus:ring-blue-200 bg-white"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <Button
                  size="sm"
                  onClick={() => addMutation.mutate()}
                  disabled={!newTier.cargoFeeKrw || addMutation.isPending}
                  className="h-10 rounded-xl px-5 font-bold flex-1 sm:flex-none"
                >
                  {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Saqlash'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAdding(false)}
                  className="h-10 w-10 p-0 rounded-xl text-muted-foreground shrink-0 bg-white/50 hover:bg-white/80 border-[0.5px] border-blue-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Maksimal buyurtma summasi (shu summagacha)
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
              ) : tiers.length === 0 && !adding ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-12 text-center text-sm text-muted-foreground font-medium"
                  >
                    Yetkazib berish qoidalari mavjud emas.
                  </td>
                </tr>
              ) : (
                [...tiers]
                  .sort(
                    (a: any, b: any) =>
                      (a.maxOrderKrw === null ? Infinity : Number(a.maxOrderKrw)) -
                      (b.maxOrderKrw === null ? Infinity : Number(b.maxOrderKrw))
                  )
                  .map((tier: any) => (
                    <tr key={tier.id} className="hover:bg-gray-50/50 group transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-900">
                          {tier.maxOrderKrw === null
                            ? 'Cheksiz (undan yuqori)'
                            : `${formatKRW(Number(tier.maxOrderKrw))} gacha`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {Number(tier.cargoFeeKrw) === 0 ? (
                          <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                            Bepul 🎉
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-gray-900">
                            {formatKRW(Number(tier.cargoFeeKrw))}
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
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden flex flex-col divide-y divide-border/30">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="p-4 space-y-3">
                <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3" />
              </div>
            ))
          ) : tiers.length === 0 && !adding ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground font-medium">
              Yetkazib berish qoidalari mavjud emas.
            </div>
          ) : (
            [...tiers]
              .sort(
                (a: any, b: any) =>
                  (a.maxOrderKrw === null ? Infinity : Number(a.maxOrderKrw)) -
                  (b.maxOrderKrw === null ? Infinity : Number(b.maxOrderKrw))
              )
              .map((tier: any) => (
                <div
                  key={tier.id}
                  className="p-4 bg-white hover:bg-gray-50/50 transition-colors flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Maksimal summa</p>
                    <p className="text-sm font-bold text-gray-900">
                      {tier.maxOrderKrw === null
                        ? 'Cheksiz'
                        : `${formatKRW(Number(tier.maxOrderKrw))} gacha`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-3 mb-1">Yetkazib berish narxi</p>
                    {Number(tier.cargoFeeKrw) === 0 ? (
                      <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                        Bepul 🎉
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-gray-900">
                        {formatKRW(Number(tier.cargoFeeKrw))}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(tier.id)}
                    disabled={deleteMutation.isPending}
                    className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-red-50 text-red-500 transition-all active:scale-95"
                  >
                    <Trash2 className="h-5 w-5" strokeWidth={2} />
                  </button>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  )
}

function ExchangeRateTab() {
  const qc = useQueryClient()
  const [newRate, setNewRate] = useState('')
  const [fetching, setFetching] = useState(false)
  const [liveRate, setLiveRate] = useState<number | null>(null)

  const { data: rates = [], isLoading } = useQuery({
    queryKey: QK.EXCHANGE_RATES,
    queryFn: () => settingsApi.getExchangeRates(7),
    placeholderData: (prev) => prev,
  })

  const currentRate = rates[0]

  const updateMutation = useMutation({
    mutationFn: () => settingsApi.updateExchangeRate(parseFloat(newRate)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.EXCHANGE_RATES })
      toast.success('Valyuta kursi yangilandi')
      setNewRate('')
      setLiveRate(null)
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const handleFetchLive = async () => {
    setFetching(true)
    try {
      const res = await settingsApi.fetchLiveRate()
      setLiveRate(res.rate)
      setNewRate(res.rate.toString())
      toast.success(`Joriy kurs olindi: 1 ₩ = ${res.rate.toLocaleString()} so'm`)
    } catch (err: any) {
      toast.error('Kursni olishda xatolik. Internet bor?')
    } finally {
      setFetching(false)
    }
  }

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

      <div className="bg-white rounded-2xl border-[0.5px] border-border p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
          Kursni yangilash
        </p>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 w-full">
              <Label className="text-xs font-bold mb-2 block">Yangi kurs (1 ₩ = ? so'm)</Label>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  type="number"
                  placeholder={currentRate ? Number(currentRate.krwToUzs).toString() : '12'}
                  className="h-11 text-base font-bold rounded-xl border-[0.5px] focus:ring-primary/20 w-full sm:flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFetchLive}
                  disabled={fetching}
                  className="h-11 w-full sm:w-auto rounded-xl gap-2 shrink-0 border-[0.5px] text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50 px-4"
                >
                  {fetching ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Kursni olish
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 font-medium">
                "Kursni olish" — open.er-api.com dan joriy kursni avtomatik yuklaydi
              </p>
            </div>

            {newRate && !isNaN(parseFloat(newRate)) && (
              <div className="pb-2 px-2 hidden sm:block">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">₩15,000 ≈</p>
                <p className="text-lg font-bold text-gray-700">
                  {formatUZS(Math.round(15000 * parseFloat(newRate)))}
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

          {liveRate && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border-[0.5px] border-blue-100 animate-in fade-in slide-in-from-top-1">
              <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
              <p className="text-xs text-blue-700 font-bold">
                API kurs: 1 ₩ = {liveRate.toLocaleString()} so'm · Saqlash tugmasini bosing
              </p>
            </div>
          )}
        </div>
      </div>

      {rates.length > 0 && (
        <div className="bg-white rounded-2xl border-[0.5px] border-border overflow-hidden shadow-sm">
          <p className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 bg-gray-50/30">
            Oxirgi 7 kun tarixi
          </p>
          <div className="divide-y divide-border/30">
            {rates.map((r: any, i: number) => (
              <div
                key={r.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors gap-2"
              >
                <div className="flex items-center gap-3">
                  {i === 0 && <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />}
                  <p className="text-sm font-bold text-gray-900">
                    1 ₩ = {Number(r.krwToUzs).toLocaleString()} so'm
                  </p>
                </div>
                <p className="text-xs text-muted-foreground font-medium sm:text-right">
                  {formatDateTime(r.createdAt)}
                </p>
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
    minOrderKorKrw: z.coerce.number().int().min(0),
    minOrderUzbUzs: z.coerce.number().int().min(0),
    usdToKrw: z.coerce.number().min(0),
    uzbCargoUsdPerKg: z.coerce.number().min(0),
    cargoTransitDaysMin: z.coerce.number().int().min(1),
    cargoTransitDaysMax: z.coerce.number().int().min(1),
    lowStockThreshold: z.coerce.number().int().min(1).max(1000).optional(),
  })

  const { data, isLoading } = useQuery({
    queryKey: QK.ORDER_SETTINGS,
    queryFn: settingsApi.getOrderSettings,
    placeholderData: (prev) => prev,
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
      qc.invalidateQueries({ queryKey: QK.ORDER_SETTINGS })
      toast.success('Sozlamalar saqlandi')
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
        <div className="space-y-2">
          <Label className="text-sm font-bold text-gray-900">To'lov muddati (daqiqa)</Label>
          <Input
            {...register('paymentTimeoutMinutes')}
            type="number"
            min="5"
            max="1440"
            className="h-11 rounded-xl border-[0.5px] focus:ring-primary/20 w-full sm:max-w-[240px]"
          />
          <p className="text-[11px] text-muted-foreground font-medium">
            To'lov qilinmasa, buyurtma avtomatik bekor qilinadi. Default: 30 daqiqa
          </p>
          {errors.paymentTimeoutMinutes && (
            <p className="text-xs text-red-500 font-bold">
              5-1440 daqiqa oralig'ida bo'lishi kerak
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-900">USD → KRW kursi</Label>
            <Input
              {...register('usdToKrw')}
              type="number"
              step="1"
              min="0"
              placeholder="1350"
              className="h-11 rounded-xl border-[0.5px] focus:ring-primary/20"
            />
            <p className="text-[11px] text-muted-foreground font-medium">
              1 USD necha KRW ga teng (cargo hisoblash uchun)
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-900">🇺🇿 UZB Kargo tarixi (USD/kg)</Label>
            <Input
              {...register('uzbCargoUsdPerKg')}
              type="number"
              step="0.1"
              min="0"
              placeholder="3"
              className="h-11 rounded-xl border-[0.5px] focus:ring-primary/20"
            />
            <p className="text-[11px] text-muted-foreground font-medium">
              1 kg yuk uchun USD narxi (Koreadan O'zbekistonga)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-900">Kargo min kun</Label>
            <Input
              {...register('cargoTransitDaysMin')}
              type="number"
              min="1"
              placeholder="7"
              className="h-11 rounded-xl border-[0.5px] focus:ring-primary/20"
            />
            <p className="text-[11px] text-muted-foreground font-medium">
              Yetkazib berish minimal vaqti (kun)
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-900">Kargo max kun</Label>
            <Input
              {...register('cargoTransitDaysMax')}
              type="number"
              min="1"
              placeholder="10"
              className="h-11 rounded-xl border-[0.5px] focus:ring-primary/20"
            />
            <p className="text-[11px] text-muted-foreground font-medium">
              Yetkazib berish maksimal vaqti (kun)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-900">🇰🇷 KOR minimal buyurtma (KRW)</Label>
            <Input
              {...register('minOrderKorKrw')}
              type="number"
              min="0"
              placeholder="10000"
              className="h-11 rounded-xl border-[0.5px] focus:ring-primary/20"
            />
            <p className="text-[11px] text-muted-foreground font-medium">0 = cheklov yo'q</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-900">🇺🇿 UZB minimal buyurtma (UZS)</Label>
            <Input
              {...register('minOrderUzbUzs')}
              type="number"
              min="0"
              placeholder="120000"
              className="h-11 rounded-xl border-[0.5px] focus:ring-primary/20"
            />
            <p className="text-[11px] text-muted-foreground font-medium">0 = cheklov yo'q</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold text-gray-900">
            Kam qoldiq chegarasi
          </Label>
          <Input
            type="number"
            min={1}
            max={1000}
            {...register('lowStockThreshold', { valueAsNumber: true })}
            placeholder="10"
            className="h-11 rounded-xl border-[0.5px] focus:ring-primary/20 w-full sm:max-w-[240px]"
          />
          <p className="text-[11px] text-muted-foreground font-medium">
            Mahsulot qoldig'i shu miqdordan kam bo'lganda ogohlantirish yuboriladi
          </p>
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            disabled={!isDirty || saveMutation.isPending}
            className="rounded-xl px-10 h-11 gap-2 font-bold"
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
