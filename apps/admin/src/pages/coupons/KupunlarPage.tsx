import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, X, Copy, Check, Tag, RefreshCw, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { couponsApi, CouponCreatePayload } from '../../api/coupons.api'
import { productsApi } from '../../api/products.api'
import { categoriesApi } from '../../api/categories.api'
import { customersApi } from '../../api/customers.api'
import { QK } from '../../constants/query-keys'
import { formatKRW } from '../../utils/currency'
import { formatDate } from '../../utils/date'
import { getErrorMessage } from '../../lib/errors'
import { SkeletonTable } from '../../components/shared/SkeletonTable'
import { EmptyState } from '../../components/shared/EmptyState'
import { Pagination } from '../../components/shared/Pagination'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleSwitch } from '../../components/ui/ToggleSwitch'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const LIMIT = 20

const couponSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(50)
    .toUpperCase()
    .regex(/^[A-Z0-9_-]+$/, 'Faqat A-Z, 0-9, _ -'),
  name: z.string().min(1, 'Nom kiriting'),
  type: z.enum(['PERCENTAGE', 'FIXED', 'FREE_SHIPPING']),
  value: z.coerce.number().min(0).default(0),
  scope: z.enum(['ALL', 'PRODUCT', 'CATEGORY', 'CUSTOMER']),
  productId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  regionCode: z.string().optional().nullable(),
  minOrderAmount: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : Number(val)),
    z.number().min(0).nullable().optional()
  ),
  maxUsesTotal: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : Number(val)),
    z.number().min(0).nullable().optional()
  ),
  maxUsesPerCustomer: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? 1 : Number(val)),
    z.number().min(1).default(1)
  ),
  startsAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  onePerCustomer: z.boolean().default(false),
  firstOrderOnly: z.boolean().default(false),
  maxDiscountCap: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : Number(val)),
    z.number().min(0).nullable().optional()
  ),
  excludeWholesale: z.boolean().default(false),
  isPromotional: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

type CouponForm = z.infer<typeof couponSchema>

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Nusxa olindi')
  }
  return (
    <button
      onClick={copy}
      className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-gray-200 text-gray-500 transition-colors shrink-0"
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

function UsageBar({ used, max }: { used: number; max?: number | null }) {
  if (!max) return <span className="text-xs text-gray-700 font-medium">{used} ta</span>
  const pct = Math.min(100, Math.round((used / max) * 100))
  return (
    <div className="flex flex-col items-end gap-1 w-20">
      <span className="text-xs text-gray-700 font-medium">
        {used}/{max}
      </span>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-primary'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function KupunlarPage() {
  const qc = useQueryClient()

  const [tab, setTab] = useState<'all' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'>('all')
  const [search, setSearch] = useState('')
  const [debSearch, setDebSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sheet, setSheet] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null)
  const [viewTarget, setViewTarget] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [generatingCode, setGeneratingCode] = useState(false)

  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState<any[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<any[]>([])

  const { data: categoriesRes } = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => categoriesApi.getFlat(),
  })
  const categories = categoriesRes ?? []

  const searchProducts = async (q: string) => {
    if (q.length < 2) {
      setProductResults([])
      return
    }
    try {
      const res = await productsApi.list({ q, limit: 10 })
      setProductResults(res.data ?? [])
    } catch {
      toast.error('Mahsulotlarni qidirishda xatolik')
    }
  }

  const searchCustomers = async (q: string) => {
    if (q.length < 2) {
      setCustomerResults([])
      return
    }
    try {
      const res = await customersApi.list({ search: q, limit: 10 })
      setCustomerResults(res.data ?? [])
    } catch {
      toast.error('Mijozlarni qidirishda xatolik')
    }
  }

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
    status: tab === 'all' ? undefined : tab,
  }

  const { data, isLoading } = useQuery({
    queryKey: QK.COUPONS(queryParams),
    queryFn: () => couponsApi.list(queryParams),
    staleTime: 30_000,
  })

  const { data: usagesRes, isLoading: usagesLoading } = useQuery({
    queryKey: ['coupon-usages', viewTarget?.id],
    queryFn: () => couponsApi.getUsages(viewTarget!.id),
    enabled: !!viewTarget?.id,
  })
  const usages = usagesRes?.data ?? []

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      type: 'PERCENTAGE',
      scope: 'ALL',
      regionCode: null,
      isActive: true,
      maxUsesPerCustomer: 1,
      minOrderAmount: 0,
      productId: null,
      categoryId: null,
      customerId: null,
      onePerCustomer: false,
      firstOrderOnly: false,
      maxDiscountCap: null,
      excludeWholesale: false,
    },
  })

  const watchType = watch('type')
  const watchScope = watch('scope')
  const watchProductId = watch('productId')
  const watchCustomerId = watch('customerId')

  const saveMutation = useMutation({
    mutationFn: (data: CouponForm) => {
      const payload: CouponCreatePayload = {
        ...data,
        code: data.code.toUpperCase(),
        startsAt: data.startsAt ? new Date(data.startsAt).toISOString() : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
        regionCode: data.regionCode || null,
      } as any
      return editTarget ? couponsApi.update(editTarget.id, payload) : couponsApi.create(payload)
    },
    onSuccess: () => {
      qc.removeQueries()
      toast.success(editTarget ? 'Kupon yangilandi' : 'Kupon yaratildi')
      resetForm()
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: any) => couponsApi.updateStatus(id, status),
    onSuccess: () => {
      qc.removeQueries()
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => couponsApi.delete(id),
    onSuccess: () => {
      qc.removeQueries()
      toast.success("Kupon o'chirildi")
      setDeleteTarget(null)
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const handleGenerateCode = async () => {
    setGeneratingCode(true)
    try {
      const code = await couponsApi.generateCode()
      setValue('code', code)
    } catch {
      toast.error('Kod yaratishda xatolik')
    } finally {
      setGeneratingCode(false)
    }
  }

  const resetForm = () => {
    reset({
      type: 'PERCENTAGE',
      scope: 'ALL',
      regionCode: null,
      isActive: true,
      maxUsesPerCustomer: 1,
      minOrderAmount: 0,
      code: '',
      name: '',
      value: 0,
      startsAt: null,
      expiresAt: null,
      description: null,
      productId: null,
      categoryId: null,
      customerId: null,
      onePerCustomer: false,
      firstOrderOnly: false,
      maxDiscountCap: null,
      excludeWholesale: false,
    })
    setProductSearch('')
    setCustomerSearch('')
    setEditTarget(null)
    setSheet(false)
  }

  const handleEdit = async (coupon: any) => {
    if (!coupon.id) {
      toast.error('Kupon ID topilmadi')
      return
    }
    
    setEditLoadingId(coupon.id)
    try {
      const response = await couponsApi.getById(coupon.id)
      const full = response.data ? response.data : response
      
      setEditTarget(full)
      reset({
        code: full.code,
        name: full.name,
        type: full.type,
        value: full.value,
        scope: full.scope,
        productId: full.productId,
        categoryId: full.categoryId,
        customerId: full.customerId,
        regionCode: full.regionCode,
        minOrderAmount: full.minOrderAmount,
        maxUsesTotal: full.maxUsesTotal,
        maxUsesPerCustomer: full.maxUsesPerCustomer ?? 1,
        startsAt: full.startsAt ? new Date(full.startsAt).toISOString().split('T')[0] : null,
        expiresAt: full.expiresAt ? new Date(full.expiresAt).toISOString().split('T')[0] : null,
        description: full.description,
        isActive: full.status === 'ACTIVE',
        onePerCustomer: full.onePerCustomer ?? false,
        firstOrderOnly: full.firstOrderOnly ?? false,
        maxDiscountCap: full.maxDiscountCap ?? null,
        excludeWholesale: full.excludeWholesale ?? false,
        isPromotional: full.isPromotional ?? false,
      })
      setProductSearch(full.productName || coupon.productName || '')
      setCustomerSearch(full.customerName || coupon.customerName || '')
      setSheet(true)
    } catch (err) {
      toast.error("Kupon ma'lumotlari yuklanmadi")
    } finally {
      setEditLoadingId(null)
    }
  }

  const coupons = data?.data ?? []
  const meta = data?.meta

  const now = new Date()
  const isExpired = (c: any) => c.expiresAt && new Date(c.expiresAt) < now

  const STATUS_TABS = [
    { value: 'all', label: 'Barchasi' },
    { value: 'ACTIVE', label: 'Faol' },
    { value: 'PAUSED', label: "To'xtatilgan" },
    { value: 'ARCHIVED', label: 'Arxivlangan' },
  ]

  const TYPE_LABELS: Record<string, any> = {
    PERCENTAGE: { label: 'Foiz', color: 'bg-blue-50 text-blue-700' },
    FIXED: { label: 'Summa', color: 'bg-green-50 text-green-700' },
    FREE_SHIPPING: { label: 'Yetkazish', color: 'bg-purple-50 text-purple-700' },
  }

  const SCOPE_LABELS: Record<string, any> = {
    ALL: { label: '🌐 Barchasi', color: 'bg-gray-100 text-gray-700' },
    PRODUCT: { label: '📦 Mahsulot', color: 'bg-indigo-50 text-indigo-700' },
    CATEGORY: { label: '🏷 Kategoriya', color: 'bg-amber-50 text-amber-700' },
    CUSTOMER: { label: '👤 Mijoz', color: 'bg-green-50 text-green-700' },
  }

  const formatValue = (c: any) => {
    if (c.type === 'PERCENTAGE') return `${c.value}%`
    if (c.type === 'FIXED') return formatKRW(c.value)
    if (c.type === 'FREE_SHIPPING') return 'Bepul'
    return `${c.value}`
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Kuponlar</h1>
          <p className="text-sm text-muted-foreground">
            {meta?.total ? `${meta.total} ta kupon` : 'Chegirma kuponlari'}
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-lg gap-2 h-9"
          onClick={() => {
            resetForm()
            setSheet(true)
          }}
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          <span className="hidden sm:inline">Yangi kupon</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value as any)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border-[0.5px]',
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
          placeholder="Kupon kodi yoki nomi..."
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

      {/* Table */}
      <div className="bg-white rounded-xl border-[0.5px] border-border overflow-hidden">
        {isLoading ? (
          <SkeletonTable cols={7} rows={8} />
        ) : coupons.length === 0 ? (
          <EmptyState
            message="Kuponlar yo'q"
            description={
              tab === 'all'
                ? 'Birinchi kupon yarating'
                : `${STATUS_TABS.find((t) => t.value === tab)?.label} kuponlar yo'q`
            }
            action={
              tab === 'all' ? (
                <Button size="sm" onClick={() => setSheet(true)} className="rounded-lg gap-2">
                  <Plus className="h-4 w-4" />
                  Kupon yaratish
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-gray-50/80">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Kupon
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-28">
                      Tur
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-28">
                      Doira
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground w-24">
                      Chegirma
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground hidden md:table-cell w-28">
                      Foydalanish
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground hidden lg:table-cell w-24">
                      Hudud
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground hidden lg:table-cell w-28">
                      Muddat
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground w-20">
                      Holat
                    </th>
                    <th className="px-4 py-3 w-28" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {coupons.map((c: any) => {
                    const expired = isExpired(c)
                    const typeInfo = TYPE_LABELS[c.type]
                    return (
                      <tr
                        key={c.id}
                        className={cn(
                          'transition-colors group',
                          expired ? 'bg-gray-50/30 opacity-60' : 'hover:bg-gray-50/60'
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                              {c.code}
                            </code>
                            <CopyButton text={c.code} />
                          </div>
                          <p className="text-[11px] text-gray-900 font-medium mt-0.5">{c.name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'text-[11px] font-medium px-2 py-0.5 rounded-full',
                              typeInfo?.color ?? 'bg-gray-100 text-gray-600'
                            )}
                          >
                            {typeInfo?.label ?? c.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap',
                              SCOPE_LABELS[c.scope]?.color ?? 'bg-gray-100 text-gray-600'
                            )}
                          >
                            {SCOPE_LABELS[c.scope]?.label ?? c.scope}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-bold text-gray-900">{formatValue(c)}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex justify-center">
                            <UsageBar used={c.usageCount ?? 0} max={c.maxUsesTotal} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell">
                          <span className="text-[11px] text-muted-foreground">
                            {!c.regionCode || c.regionCode === 'all' ? '🌍 Barchasi' : c.regionCode === 'KOR' ? '🇰🇷 Koreya' : c.regionCode === 'UZB' ? "🇺🇿 O'zbekiston" : c.regionCode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell">
                          {c.expiresAt ? (
                            <span
                              className={cn(
                                'text-xs',
                                expired ? 'text-red-500' : 'text-muted-foreground'
                              )}
                            >
                              {expired ? '⌛ ' : '📅 '}
                              {formatDate(c.expiresAt)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Muddatsiz</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <ToggleSwitch
                            checked={c.status === 'ACTIVE'}
                            disabled={
                              expired || c.status === 'ARCHIVED' || statusMutation.isPending
                            }
                            onChange={() =>
                              statusMutation.mutate({
                                id: c.id,
                                status: c.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
                              })
                            }
                            size="sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setViewTarget(c)}
                              title="Foydalanishlar"
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-50 text-blue-600 transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                            <button
                              onClick={() => handleEdit(c)}
                              disabled={editLoadingId === c.id}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors"
                            >
                              {editLoadingId === c.id ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                              ) : (
                                <Tag className="h-3.5 w-3.5" strokeWidth={1.5} />
                              )}
                            </button>
                            <button
                              onClick={() => setDeleteTarget(c)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-red-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
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

      {/* Create/Edit Sheet */}
      <Sheet open={sheet} onOpenChange={(v) => !v && resetForm()}>
        <SheetContent
          side="right"
          className="w-[90vw] sm:w-[520px] sm:max-w-[520px] overflow-y-auto"
        >
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle>{editTarget ? 'Kuponni tahrirlash' : 'Yangi kupon yaratish'}</SheetTitle>
          </SheetHeader>
          <form
            onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
            className="space-y-5 py-4"
          >
            <div>
              <Label className="text-xs mb-1.5 block">Kupon kodi *</Label>
              <div className="flex gap-2">
                <Input
                  {...register('code')}
                  placeholder="MIRA2026"
                  className="h-9 text-sm rounded-lg border-[0.5px] flex-1 font-mono uppercase"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateCode}
                  disabled={generatingCode}
                  className="h-9 rounded-lg gap-1.5 border-[0.5px] text-xs shrink-0"
                >
                  <RefreshCw
                    className={cn('h-3.5 w-3.5', generatingCode && 'animate-spin')}
                    strokeWidth={1.5}
                  />
                  Auto
                </Button>
              </div>
              {errors.code && (
                <p className="text-xs text-red-500 mt-1">{errors.code.message as string}</p>
              )}
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Kupon nomi *</Label>
              <Input
                {...register('name')}
                placeholder="Yangi yil chegirmasi"
                className="h-9 text-sm rounded-lg border-[0.5px]"
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name.message as string}</p>
              )}
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Chegirma turi *</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { v: 'PERCENTAGE', l: 'Foiz' },
                      { v: 'FIXED', l: 'Summa' },
                      { v: 'FREE_SHIPPING', l: 'Yetkazish' },
                    ].map((t) => (
                      <button
                        key={t.v}
                        type="button"
                        onClick={() => field.onChange(t.v)}
                        className={cn(
                          'text-xs py-2 px-3 rounded-lg border-[0.5px] transition-all font-medium',
                          field.value === t.v
                            ? 'bg-primary/10 border-primary/40 text-primary'
                            : 'bg-white border-border text-gray-700'
                        )}
                      >
                        {t.l}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Scope */}
            <div>
              <Label className="text-xs mb-1.5 block">Qo'llanish doirasi *</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'ALL', label: '🌐 Barchasi', desc: 'Barcha mahsulotlar' },
                  { value: 'PRODUCT', label: '📦 Mahsulot', desc: 'Bitta mahsulot' },
                  { value: 'CATEGORY', label: '🏷 Kategoriya', desc: 'Kategoriya' },
                  { value: 'CUSTOMER', label: '👤 Mijoz', desc: 'Bitta mijoz' },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => {
                      setValue('scope', s.value)
                      setValue('productId', null)
                      setValue('categoryId', null)
                      setValue('customerId', null)
                      setProductSearch('')
                      setCustomerSearch('')
                    }}
                    className={cn(
                      'p-2.5 rounded-xl border-[0.5px] text-left transition-all',
                      watchScope === s.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-white'
                    )}
                  >
                    <p className="text-xs font-semibold">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional scope target */}
            {watchScope === 'PRODUCT' && (
              <div className="space-y-2">
                <Label className="text-xs block">Mahsulot tanlang *</Label>
                <div className="relative">
                  <Input
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value)
                      searchProducts(e.target.value)
                    }}
                    placeholder="Mahsulot nomini yozing..."
                    className="h-9 text-sm rounded-lg border-[0.5px]"
                  />
                  {productResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border-[0.5px] border-border shadow-xl z-50 max-h-48 overflow-y-auto">
                      {productResults.map((p: any) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={() => {
                            setValue('productId', p.id)
                            setProductSearch(p.name)
                            setProductResults([])
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 text-sm border-b border-gray-100 last:border-0"
                        >
                          <span className="flex-1">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {watchProductId && (
                  <p className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                    <Check className="h-3 w-3" /> Mahsulot tanlandi
                  </p>
                )}
              </div>
            )}

            {watchScope === 'CATEGORY' && (
              <div className="space-y-2">
                <Label className="text-xs block">Kategoriya tanlang *</Label>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9 text-sm rounded-lg border-[0.5px]">
                        <SelectValue placeholder="Kategoriya tanlang" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {categories.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            {watchScope === 'CUSTOMER' && (
              <div className="space-y-2">
                <Label className="text-xs block">Mijoz tanlang *</Label>
                <div className="relative">
                  <Input
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value)
                      searchCustomers(e.target.value)
                    }}
                    placeholder="Ism yoki telefon..."
                    className="h-9 text-sm rounded-lg border-[0.5px]"
                  />
                  {customerResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border-[0.5px] border-border shadow-xl z-50 max-h-48 overflow-y-auto">
                      {customerResults.map((c: any) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={() => {
                            setValue('customerId', c.id)
                            setCustomerSearch(`${c.firstName} ${c.lastName || ''}`)
                            setCustomerResults([])
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 text-sm border-b border-gray-100 last:border-0"
                        >
                          <div>
                            <p className="font-medium">
                              {c.firstName} {c.lastName || ''}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{c.phone}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {watchCustomerId && (
                  <p className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                    <Check className="h-3 w-3" /> Mijoz tanlandi
                  </p>
                )}
              </div>
            )}

            {watchType !== 'FREE_SHIPPING' && (
              <div>
                <Label className="text-xs mb-1.5 block">
                  {watchType === 'PERCENTAGE' ? 'Chegirma foizi (%)' : 'Chegirma summasi (KRW)'}
                </Label>
                <Input
                  {...register('value')}
                  type="number"
                  min="0"
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
                {errors.value && (
                  <p className="text-xs text-red-500 mt-1">{errors.value.message as string}</p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs mb-1.5 block">Hudud</Label>
                <Controller
                  name="regionCode"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? 'ALL'}
                      onValueChange={(v) => field.onChange(v === 'ALL' ? null : v)}
                    >
                      <SelectTrigger className="h-9 text-sm rounded-lg border-[0.5px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="ALL">🌍 Barcha hududlar</SelectItem>
                        <SelectItem value="KOR">🇰🇷 Koreya</SelectItem>
                        <SelectItem value="UZB">🇺🇿 O'zbekiston</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Min. buyurtma (KRW)</Label>
                <Input
                  {...register('minOrderAmount')}
                  type="number"
                  min="0"
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
                {errors.minOrderAmount && (
                  <p className="text-xs text-red-500 mt-1">{errors.minOrderAmount.message as string}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs mb-1.5 block">Jami limit (ta)</Label>
                <Input
                  {...register('maxUsesTotal')}
                  type="number"
                  min="0"
                  placeholder="Cheksiz"
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
                {errors.maxUsesTotal && (
                  <p className="text-xs text-red-500 mt-1">{errors.maxUsesTotal.message as string}</p>
                )}
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Mijoz limiti (ta)</Label>
                <Input
                  {...register('maxUsesPerCustomer')}
                  type="number"
                  min="1"
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">1 = faqat bir marta ishlatish mumkin</p>
                {errors.maxUsesPerCustomer && (
                  <p className="text-xs text-red-500 mt-1">{errors.maxUsesPerCustomer.message as string}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs mb-1.5 block">Boshlanish sanasi</Label>
                <Input
                  {...register('startsAt')}
                  type="date"
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Tugash sanasi</Label>
                <Input
                  {...register('expiresAt')}
                  type="date"
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Tavsif</Label>
              <Input
                {...register('description')}
                placeholder="Qo'shimcha ma'lumot..."
                className="h-9 text-sm rounded-lg border-[0.5px]"
              />
            </div>

            <div className="pt-4 border-t border-border/50">
              <h3 className="text-sm font-medium mb-3">Qo'shimcha cheklovlar</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Ilovada ko'rsatish (ommaviy kupon)</Label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Yoqilganda, bu kupon mijozlar ilovasidagi 'Kuponlarim' bo'limida ko'rinadi</p>
                  </div>
                  <Controller
                    name="isPromotional"
                    control={control}
                    render={({ field }) => (
                      <ToggleSwitch checked={field.value} onChange={field.onChange} size="sm" />
                    )}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs">Faqat birinchi buyurtma uchun</Label>
                  <Controller
                    name="firstOrderOnly"
                    control={control}
                    render={({ field }) => (
                      <ToggleSwitch checked={field.value} onChange={field.onChange} size="sm" />
                    )}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs">Ulgurji narxdan istisno</Label>
                  <Controller
                    name="excludeWholesale"
                    control={control}
                    render={({ field }) => (
                      <ToggleSwitch checked={field.value} onChange={field.onChange} size="sm" />
                    )}
                  />
                </div>

                {watchType === 'PERCENTAGE' && (
                  <div>
                    <Label className="text-xs mb-1.5 block">Maksimal chegirma miqdori (KRW)</Label>
                    <Input
                      {...register('maxDiscountCap')}
                      type="number"
                      min="0"
                      placeholder="Cheklov yo'q"
                      className="h-9 text-sm rounded-lg border-[0.5px]"
                    />
                    {errors.maxDiscountCap && (
                      <p className="text-xs text-red-500 mt-1">{errors.maxDiscountCap.message as string}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetForm}
                className="flex-1 rounded-lg"
              >
                Bekor
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveMutation.isPending}
                className="flex-1 rounded-lg"
              >
                {saveMutation.isPending ? 'Saqlanmoqda...' : editTarget ? 'Saqlash' : 'Yaratish'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Usages Sheet */}
      <Sheet open={!!viewTarget} onOpenChange={(v) => !v && setViewTarget(null)}>
        <SheetContent
          side="right"
          className="w-[90vw] sm:w-[480px] sm:max-w-[480px] overflow-y-auto"
        >
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle className="font-mono">{viewTarget?.code}</SheetTitle>
            {viewTarget && (
              <p className="text-xs text-muted-foreground">
                {formatValue(viewTarget)} chegirma · {viewTarget.usageCount ?? 0} ta foydalanish
              </p>
            )}
          </SheetHeader>
          <div className="py-4 space-y-2">
            {usagesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : usages.length === 0 ? (
              <EmptyState message="Foydalanishlar yo'q" description="Bu kupon hali ishlatilmagan" />
            ) : (
              usages.map((u: any) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border-[0.5px] border-border/50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {u.customerFirstName} {u.customerLastName || ''}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Buyurtma #{u.orderNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-red-600">
                      -{formatKRW(u.discountAmount ?? 0)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(u.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Kuponni o'chirish"
        description={`"${deleteTarget?.code}" kuponi o'chiriladi (arxivlanadi).`}
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
