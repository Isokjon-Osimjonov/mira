import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  Truck,
  Package,
  CreditCard,
  CheckCircle,
  X,
  Search,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { purchaseOrdersApi } from '../../api/purchase-orders.api'
import { suppliersApi } from '../../api/suppliers.api'
import { productsApi } from '../../api/products.api'
import { QK } from '../../constants/query-keys'
import { formatKRW } from '../../utils/currency'
import { formatDate } from '../../utils/date'
import { getErrorMessage } from '../../lib/errors'
import { SkeletonTable } from '../../components/shared/SkeletonTable'
import { EmptyState } from '../../components/shared/EmptyState'
import { Pagination } from '../../components/shared/Pagination'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePermission } from '../../hooks/usePermission'

const LIMIT = 20

const PO_STATUS: Record<string, any> = {
  DRAFT: { label: 'Qoralama', color: 'bg-gray-100 text-gray-600' },
  ORDERED: { label: 'Buyurtma berildi', color: 'bg-blue-50 text-blue-700' },
  PARTIAL: { label: 'Qisman qabul', color: 'bg-amber-50 text-amber-700' },
  RECEIVED: { label: 'Qabul qilindi', color: 'bg-green-50 text-green-700' },
  CANCELLED: { label: 'Bekor', color: 'bg-red-50 text-red-600' },
}

const PAYMENT_STATUS: Record<string, any> = {
  UNPAID: { label: "To'lanmagan", color: 'text-red-600' },
  PARTIAL: { label: "Qisman to'langan", color: 'text-amber-600' },
  PAID: { label: "To'langan", color: 'text-green-600' },
}

const itemSchema = z.object({
  productId: z.string().uuid('Mahsulot tanlang'),
  productName: z.string().min(1, 'Nom talab qilinadi'),
  orderedQty: z.coerce.number().int().min(1, 'Kamida 1 ta'),
  unitCostKrw: z.coerce.number().int().min(0, "Narx manfiy bo'lmaydi"),
})

const poSchema = z.object({
  supplierId: z.string().uuid('Yetkazuvchi tanlang'),
  orderDate: z.string().min(1, 'Sana talab qilinadi'),
  expectedDeliveryDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1, "Kamida 1 ta mahsulot qo'shing"),
})

interface POFormItem {
  productId: string
  productName: string
  orderedQty: number
  unitCostKrw: number
}

interface POForm {
  supplierId: string
  orderDate: string
  expectedDeliveryDate?: string | null
  notes?: string | null
  items: POFormItem[]
}

export function BuyurtmaBerish() {
  const qc = useQueryClient()
  const { hasPermission } = usePermission()

  if (!hasPermission('purchase_orders', 'read')) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Bu sahifaga kirish ruxsati yo'q</p>
      </div>
    )
  }

  const [tab, setTab] = useState<'all' | 'DRAFT' | 'ORDERED' | 'PARTIAL' | 'RECEIVED'>('all')
  const [page, setPage] = useState(1)
  const [createSheet, setCreateSheet] = useState(false)
  const [detailSheet, setDetailSheet] = useState(false)
  const [selectedPO, setSelectedPO] = useState<any>(null)
  const [receiveMode, setReceiveMode] = useState(false)
  const [paymentMode, setPaymentMode] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [receivedQtys, setReceivedQtys] = useState<Record<string, string>>({})
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState<any[]>([])

  const queryParams = {
    page,
    limit: LIMIT,
    status: tab === 'all' ? undefined : tab,
  }

  const { data, isLoading } = useQuery({
    queryKey: QK.PURCHASE_ORDERS(queryParams),
    queryFn: () => purchaseOrdersApi.list(queryParams),
  })

  const { data: suppliersData = [] } = useQuery({
    queryKey: QK.SUPPLIERS(),
    queryFn: suppliersApi.list,
    staleTime: 300_000,
  })
  const suppliers = (suppliersData as any) || []

  const { data: poDetail } = useQuery({
    queryKey: ['po-detail', selectedPO?.id],
    queryFn: () => purchaseOrdersApi.getById(selectedPO!.id),
    enabled: !!selectedPO?.id && detailSheet,
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<POForm>({
    resolver: zodResolver(poSchema) as any,
    defaultValues: {
      orderDate: new Date().toISOString().split('T')[0],
      items: [
        {
          productId: '',
          productName: '',
          orderedQty: 1,
          unitCostKrw: 0,
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  // Product search for PO items
  useEffect(() => {
    if (!productSearch || productSearch.length < 2) {
      setProductResults([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await productsApi.list({
          q: productSearch,
          limit: 5,
        })
        setProductResults(res.data ?? [])
      } catch {
        /* ignored */
      }
    }, 300)
    return () => clearTimeout(t)
  }, [productSearch])

  const createMutation = useMutation({
    mutationFn: (data: POForm) =>
      purchaseOrdersApi.create({
        ...data,
        items: data.items.map((i) => ({
          productId: i.productId,
          quantityOrdered: i.orderedQty,
          unitCostKrw: i.unitCostKrw,
        })),
        expectedDeliveryDate: data.expectedDeliveryDate || undefined,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      qc.removeQueries()
      toast.success('Buyurtma yaratildi')
      reset()
      setCreateSheet(false)
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: any) => purchaseOrdersApi.updateStatus(id, status),
    onSuccess: () => {
      qc.removeQueries()
      toast.success('Holat yangilandi')
    },
  })

  const receiveMutation = useMutation({
    mutationFn: (payload: any) => purchaseOrdersApi.receiveItems(selectedPO!.id, payload),
    onSuccess: () => {
      qc.removeQueries()
      toast.success('Mahsulotlar qabul qilindi! Inventar yangilandi ✅')
      setReceiveMode(false)
      setReceivedQtys({})
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const paymentMutation = useMutation({
    mutationFn: () => purchaseOrdersApi.recordPayment(selectedPO!.id, parseInt(payAmount)),
    onSuccess: () => {
      qc.removeQueries()
      toast.success("To'lov qayd etildi ✅")
      setPaymentMode(false)
      setPayAmount('')
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const pos = data?.data ?? []
  const meta = data?.meta

  const STATUS_TABS = [
    { value: 'all', label: 'Barchasi' },
    { value: 'DRAFT', label: 'Qoralama' },
    { value: 'ORDERED', label: 'Buyurtma berildi' },
    { value: 'PARTIAL', label: 'Qisman qabul' },
    { value: 'RECEIVED', label: 'Qabul qilindi' },
  ]

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Buyurtma berish</h1>
          <p className="text-sm text-muted-foreground">Yetkazuvchilarga buyurtmalar</p>
        </div>
        <Button
          size="sm"
          className="rounded-lg gap-2 h-9"
          onClick={() => {
            reset()
            setCreateSheet(true)
          }}
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          <span className="hidden sm:inline">Yangi buyurtma</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setTab(t.value as any)
              setPage(1)
            }}
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

      {/* Table */}
      <div className="bg-white rounded-xl border-[0.5px] border-border overflow-hidden">
        {isLoading ? (
          <SkeletonTable cols={6} rows={8} />
        ) : pos.length === 0 ? (
          <EmptyState
            message="Buyurtmalar yo'q"
            description="Birinchi buyurtmani yarating"
            action={
              <Button size="sm" onClick={() => setCreateSheet(true)} className="rounded-lg gap-2">
                <Plus className="h-4 w-4" />
                Yaratish
              </Button>
            }
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-gray-50/80">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    PO raqam
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">
                    Yetkazuvchi
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground w-32">
                    Holat
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground hidden lg:table-cell">
                    Summa
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground hidden lg:table-cell w-28">
                    To'lov
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground hidden md:table-cell w-28">
                    Kutilgan
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {pos.map((po: any) => {
                  const statusInfo = PO_STATUS[po.status] ?? PO_STATUS.DRAFT
                  const payInfo = PAYMENT_STATUS[po.paymentStatus] ?? PAYMENT_STATUS.UNPAID
                  const isOverdue =
                    po.expectedAt &&
                    new Date(po.expectedAt) < new Date() &&
                    po.status !== 'RECEIVED' &&
                    po.status !== 'CANCELLED'

                  return (
                    <tr
                      key={po.id}
                      onClick={() => {
                        setSelectedPO(po)
                        setReceiveMode(false)
                        setPaymentMode(false)
                        setDetailSheet(true)
                      }}
                      className="hover:bg-gray-50/60 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-mono font-semibold text-gray-900">
                          {po.orderNumber}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(po.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-sm text-gray-700">{po.supplierName ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            'text-[11px] font-medium px-2 py-0.5 rounded-full',
                            statusInfo.color
                          )}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        <p className="text-sm font-semibold">{formatKRW(po.totalCostKrw ?? 0)}</p>
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        <span className={cn('text-[11px] font-medium', payInfo.color)}>
                          {payInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        {po.expectedAt ? (
                          <span
                            className={cn(
                              'text-xs',
                              isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'
                            )}
                          >
                            {isOverdue && '⚠️ '}
                            {formatDate(po.expectedAt)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                      </td>
                    </tr>
                  )
                })}
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

      {/* ── CREATE PO SHEET ───────────────────────── */}
      <Sheet
        open={createSheet}
        onOpenChange={(v) => {
          if (!v) reset()
          setCreateSheet(v)
        }}
      >
        <SheetContent
          side="right"
          className="w-[90vw] sm:w-[580px] sm:max-w-[580px] overflow-y-auto"
        >
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle>Yangi buyurtma</SheetTitle>
          </SheetHeader>

          <form
            onSubmit={handleSubmit((data) => createMutation.mutate(data as POForm))}
            className="space-y-5 py-4"
          >
            {/* Supplier */}
            <div>
              <Label className="text-xs mb-1.5 block">Yetkazuvchi *</Label>
              <Controller
                name="supplierId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 text-sm rounded-lg border-[0.5px]">
                      <SelectValue placeholder="Yetkazuvchi tanlang" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {suppliers.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.supplierId && (
                <p className="text-xs text-red-500 mt-1">{errors.supplierId.message}</p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block">Sana *</Label>
                <Input
                  {...register('orderDate')}
                  type="date"
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
                {errors.orderDate && (
                  <p className="text-xs text-red-500 mt-1">{errors.orderDate.message}</p>
                )}
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Kutilgan sana</Label>
                <Input
                  {...register('expectedDeliveryDate')}
                  type="date"
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">Mahsulotlar *</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Mahsulot qidirish..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="h-7 pl-7 text-[11px] w-48 rounded-lg border-[0.5px]"
                  />
                  {productResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                      {productResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            append({
                              productId: p.id,
                              productName: p.name,
                              orderedQty: 1,
                              unitCostKrw: 0,
                            })
                            setProductSearch('')
                            setProductResults([])
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors border-b border-border/50 last:border-0"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {fields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="p-3 rounded-xl bg-gray-50/50 border-[0.5px] border-border space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <Input
                          {...register(`items.${idx}.productName`)}
                          readOnly
                          className="h-8 text-xs rounded-lg border-[0.5px] bg-gray-100"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        disabled={fields.length === 1}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-red-400 disabled:text-gray-200 transition-colors shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground mb-1 block">
                          Miqdor
                        </Label>
                        <Input
                          {...register(`items.${idx}.orderedQty`)}
                          type="number"
                          min="1"
                          className="h-8 text-xs rounded-lg border-[0.5px]"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground mb-1 block">
                          Narx (KRW)
                        </Label>
                        <Input
                          {...register(`items.${idx}.unitCostKrw`)}
                          type="number"
                          min="0"
                          placeholder="8000"
                          className="h-8 text-xs rounded-lg border-[0.5px]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {errors.items && <p className="text-xs text-red-500 mt-1">{errors.items.message}</p>}
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs mb-1.5 block">Izoh</Label>
              <Input
                {...register('notes')}
                placeholder="Yetkazuvchiga eslatma..."
                className="h-9 text-sm rounded-lg border-[0.5px]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  reset()
                  setCreateSheet(false)
                }}
                className="flex-1 rounded-lg border-[0.5px]"
              >
                Bekor
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending}
                className="flex-1 rounded-lg"
              >
                {createMutation.isPending ? 'Yaratilyapti...' : 'Buyurtma yaratish'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── DETAIL SHEET ──────────────────────────── */}
      <Sheet
        open={detailSheet}
        onOpenChange={(v) => {
          if (!v) {
            setReceiveMode(false)
            setPaymentMode(false)
          }
          setDetailSheet(v)
        }}
      >
        <SheetContent
          side="right"
          className="w-[90vw] sm:w-[560px] sm:max-w-[560px] overflow-y-auto"
        >
          {poDetail ? (
            <>
              <SheetHeader className="pb-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <SheetTitle className="font-mono">{poDetail.orderNumber}</SheetTitle>
                    <p className="text-xs text-muted-foreground">
                      {poDetail.supplier?.name} · {formatDate(poDetail.createdAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-[11px] font-medium px-2 py-0.5 rounded-full',
                      PO_STATUS[poDetail.status]?.color
                    )}
                  >
                    {PO_STATUS[poDetail.status]?.label}
                  </span>
                </div>
              </SheetHeader>

              <div className="py-4 space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-lg bg-gray-50 text-center">
                    <p className="text-xs text-muted-foreground">Jami summa</p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatKRW(poDetail.totalCostKrw ?? 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 text-center">
                    <p className="text-xs text-muted-foreground">To'langan</p>
                    <p
                      className={cn(
                        'text-sm font-bold',
                        PAYMENT_STATUS[poDetail.paymentStatus]?.color
                      )}
                    >
                      {formatKRW(poDetail.paidAmountKrw ?? 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 text-center">
                    <p className="text-xs text-muted-foreground">Qoldi</p>
                    <p className="text-sm font-bold text-red-600">
                      {formatKRW((poDetail.totalCostKrw ?? 0) - (poDetail.paidAmountKrw ?? 0))}
                    </p>
                  </div>
                </div>

                {/* Items table */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Mahsulotlar
                  </p>
                  <div className="space-y-2">
                    {(poDetail.items ?? []).map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border-[0.5px] border-border/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-muted-foreground">
                              {formatKRW(item.unitCostKrw)} × {item.quantityOrdered} ta
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold">
                            {item.quantityReceived}/{item.quantityOrdered}
                          </p>
                          <p className="text-[10px] text-muted-foreground">qabul qilindi</p>
                        </div>

                        {/* Receive input */}
                        {receiveMode && item.quantityReceived < item.quantityOrdered && (
                          <div className="shrink-0 flex flex-col gap-1">
                            <Input
                              type="number"
                              min="0"
                              max={item.quantityOrdered - item.quantityReceived}
                              placeholder="0"
                              value={receivedQtys[item.id] ?? ''}
                              onChange={(e) =>
                                setReceivedQtys((prev) => ({
                                  ...prev,
                                  [item.id]: e.target.value,
                                }))
                              }
                              className="h-8 w-16 text-xs rounded-lg border-[0.5px]"
                            />
                            <Input
                              type="date"
                              placeholder="Muddati"
                              onChange={(e) =>
                                setReceivedQtys((prev) => ({
                                  ...prev,
                                  [`${item.id}_expiry`]: e.target.value,
                                }))
                              }
                              className="h-7 w-24 text-[10px] rounded-md border-[0.5px]"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Receive mode */}
                {receiveMode ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReceiveMode(false)
                        setReceivedQtys({})
                      }}
                      className="flex-1 rounded-lg border-[0.5px]"
                    >
                      Bekor
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const items = Object.entries(receivedQtys)
                          .filter(([k, v]) => !k.endsWith('_expiry') && parseInt(v) > 0)
                          .map(([itemId, qty]) => ({
                            purchaseOrderItemId: itemId,
                            quantityReceived: parseInt(qty),
                            expiryDate: receivedQtys[`${itemId}_expiry`],
                          }))
                        if (items.length === 0) {
                          toast.error('Miqdor kiriting')
                          return
                        }
                        receiveMutation.mutate({
                          actualDeliveryDate: new Date().toISOString().split('T')[0],
                          items,
                        })
                      }}
                      disabled={receiveMutation.isPending}
                      className="flex-1 rounded-lg bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
                      {receiveMutation.isPending ? 'Saqlanmoqda...' : 'Qabul qilish'}
                    </Button>
                  </div>
                ) : paymentMode ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs mb-1.5 block">To'lov summasi (KRW)</Label>
                      <Input
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        type="number"
                        min="1"
                        placeholder={String(
                          (poDetail.totalCostKrw ?? 0) - (poDetail.paidAmountKrw ?? 0)
                        )}
                        className="h-9 text-sm rounded-lg border-[0.5px]"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPaymentMode(false)
                          setPayAmount('')
                        }}
                        className="flex-1 rounded-lg border-[0.5px]"
                      >
                        Bekor
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => paymentMutation.mutate()}
                        disabled={!payAmount || paymentMutation.isPending}
                        className="flex-1 rounded-lg"
                      >
                        {paymentMutation.isPending ? 'Saqlanmoqda...' : "To'lovni qayd etish"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Action buttons */
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                    {poDetail.status === 'DRAFT' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          statusMutation.mutate({
                            id: poDetail.id,
                            status: 'ORDERED',
                          })
                        }
                        className="rounded-lg gap-1.5 border-[0.5px] text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Truck className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Buyurtma berildi
                      </Button>
                    )}

                    {['ORDERED', 'PARTIAL'].includes(poDetail.status) && (
                      <Button
                        size="sm"
                        onClick={() => setReceiveMode(true)}
                        className="rounded-lg gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Package className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Qabul qilish
                      </Button>
                    )}

                    {poDetail.paymentStatus !== 'PAID' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPaymentMode(true)}
                        className="rounded-lg gap-1.5 border-[0.5px] text-xs text-primary border-primary/30 hover:bg-primary/5"
                      >
                        <CreditCard className="h-3.5 w-3.5" strokeWidth={1.5} />
                        To'lov qo'shish
                      </Button>
                    )}

                    {poDetail.status === 'DRAFT' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Ishonchingiz komilmi?')) {
                            purchaseOrdersApi.delete(poDetail.id).then(() => {
                              toast.success("O'chirildi")
                              qc.invalidateQueries({ queryKey: ['purchase-orders'] })
                              setDetailSheet(false)
                            })
                          }
                        }}
                        className="rounded-lg gap-1.5 border-[0.5px] text-xs text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        O'chirish
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
