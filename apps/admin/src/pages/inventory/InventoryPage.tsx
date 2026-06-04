import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  Clock,
  X,
  Trash2,
  History,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { inventoryApi } from '../../api/inventory.api'
import { QK } from '../../constants/query-keys'
import { formatKRW } from '../../utils/currency'
import { formatDate, formatRelative } from '../../utils/date'
import { getErrorMessage } from '../../lib/errors'
import { SkeletonTable } from '../../components/shared/SkeletonTable'
import { EmptyState } from '../../components/shared/EmptyState'
import { Pagination } from '../../components/shared/Pagination'
import { useAuthStore } from '../../stores/auth.store'
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

// ── Filter tabs ────────────────────────────────────────────
const FILTER_TABS = [
  { value: 'all', label: 'Barchasi', icon: null },
  {
    value: 'low',
    label: 'Kam qolgan',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  { value: 'out', label: 'Tugagan', icon: <X className="h-3 w-3" /> },
  {
    value: 'expiring',
    label: 'Muddati yaqin',
    icon: <Clock className="h-3 w-3" />,
  },
]

// ── Write-off reason labels ────────────────────────────────
const REASON_LABELS: Record<string, string> = {
  DAMAGED: 'Shikastlangan',
  EXPIRED: "Muddati o'tgan",
  GIFT: "Sovg'a",
  SAMPLE: 'Namuna',
  LOST: "Yo'qolgan",
  ADJUSTMENT: 'Tuzatish',
}

// ── Add batch schema ───────────────────────────────────────
const batchSchema = z.object({
  quantity: z.coerce.number().int().min(1, "Miqdor 1 dan katta bo'lishi kerak"),
  costPrice: z.coerce.number().min(0).optional(),
  expiryDate: z.string().optional().nullable(),
  note: z.string().optional(),
})

// ── Write-off schema ───────────────────────────────────────
const writeOffSchema = z.object({
  batchId: z.string().uuid('Partiya tanlang'),
  quantity: z.coerce.number().int().min(1, "Miqdor 1 dan katta bo'lishi kerak"),
  type: z.string().min(1, 'Turini tanlang'),
  reason: z.string().optional(),
  createExpense: z.boolean().default(true),
})

// ── Stock status badge ─────────────────────────────────────
function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return (
      <span
        className="text-xs font-bold px-2 py-0.5
                     rounded-full bg-red-50 text-red-600"
      >
        0 — Tugagan
      </span>
    )
  if (stock <= 10)
    return (
      <span
        className="text-xs font-bold px-2 py-0.5
                     rounded-full bg-amber-50 text-amber-600"
      >
        {stock} — Kam
      </span>
    )
  return (
    <span
      className="text-xs font-bold px-2 py-0.5
                     rounded-full bg-green-50 text-green-700"
    >
      {stock}
    </span>
  )
}

// ── Main component ─────────────────────────────────────────
export function InventoryPage() {
  const qc = useQueryClient()
  const canWrite = useAuthStore((s) => s.canWrite)

  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debSearch, setDebSearch] = useState('')
  const [page, setPage] = useState(1)

  // Sheet states
  const [batchSheet, setBatchSheet] = useState(false)
  const [writeOffSheet, setWriteOffSheet] = useState(false)
  const [historySheet, setHistorySheet] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [filter, debSearch])

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: QK.INVENTORY({
      filter,
      search: debSearch,
      page,
      limit: 20,
    }),
    queryFn: () =>
      inventoryApi.getOverview({
        filter: filter === 'all' ? undefined : (filter as any),
        search: debSearch || undefined,
        page,
        limit: 20,
      }),
    staleTime: 30_000,
  })

  const { data: writeOffReasons = [] } = useQuery({
    queryKey: ['inventory', 'write-off-reasons'],
    queryFn: inventoryApi.getWriteOffReasons,
    staleTime: Infinity,
  })

  const { data: productBatches = [], isLoading: isLoadingBatches } = useQuery({
    queryKey: ['inventory', 'batches', selectedProduct?.productId],
    queryFn: () => inventoryApi.getProductBatches(selectedProduct!.productId),
    enabled: !!selectedProduct?.productId && (batchSheet || writeOffSheet),
    staleTime: 0,
  })

  const { data: movements = [] } = useQuery({
    queryKey: ['inventory', 'movements', selectedProduct?.productId],
    queryFn: () => inventoryApi.getMovements(selectedProduct!.productId),
    enabled: !!selectedProduct?.productId && historySheet,
    staleTime: 0,
  })

  // Add batch form
  const batchForm = useForm({
    resolver: zodResolver(batchSchema),
    defaultValues: { quantity: 1, costPrice: 0, expiryDate: null, note: '' },
  })

  // Write-off form
  const writeOffForm = useForm({
    resolver: zodResolver(writeOffSchema),
    defaultValues: { batchId: '', quantity: 1, type: '', reason: '', createExpense: true },
  })

  // Add batch mutation
  const addBatchMutation = useMutation({
    mutationFn: (data: any) =>
      inventoryApi.addBatch(selectedProduct!.productId, {
        ...data,
        costPrice: data.costPrice || undefined,
        expiryDate: data.expiryDate || undefined,
      }),
    onSuccess: () => {
      toast.success("Partiya qo'shildi")
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: QK.INVENTORY_STOCK })
      batchForm.reset()
      setBatchSheet(false)
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  // Write-off mutation
  const writeOffMutation = useMutation({
    mutationFn: (data: any) =>
      inventoryApi.writeOff({
        productId: selectedProduct!.productId,
        batchId: data.batchId,
        quantity: data.quantity,
        type: data.type,
        reason: data.reason,
        createExpense: data.createExpense,
      }),
    onSuccess: (res) => {
      const msg = res?.data?.expense
        ? 'Hisobdan chiqarildi va xarajat yaratildi'
        : 'Hisobdan chiqarildi'
      toast.success(msg)
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['expenses'] })
      writeOffForm.reset()
      setWriteOffSheet(false)
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const items = data?.data ?? []
  const meta = data?.meta

  const openBatch = (product: any) => {
    setSelectedProduct(product)
    batchForm.reset()
    setBatchSheet(true)
  }

  const openWriteOff = (product: any) => {
    setSelectedProduct(product)
    writeOffForm.reset()
    setWriteOffSheet(true)
  }

  const openHistory = (product: any) => {
    setSelectedProduct(product)
    setHistorySheet(true)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Inventar</h1>
          <p className="text-sm text-muted-foreground">
            {meta?.total ? `Jami ${meta.total} ta mahsulot` : 'Ombor holati'}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div
        className="flex gap-1 overflow-x-auto pb-1
                      scrollbar-none"
      >
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5',
              'rounded-lg text-xs font-medium whitespace-nowrap',
              'transition-all border-[0.5px]',
              filter === tab.value
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-muted-foreground border-border'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2
                           -translate-y-1/2 h-3.5 w-3.5
                           text-muted-foreground"
          strokeWidth={1.5}
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mahsulot nomi yoki barcode..."
          className="pl-9 h-9 text-sm rounded-lg border-[0.5px]"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Table */}
      <div
        className="bg-white rounded-xl border-[0.5px]
                      border-border overflow-hidden"
      >
        {isLoading ? (
          <SkeletonTable cols={6} rows={8} />
        ) : items.length === 0 ? (
          <EmptyState
            message="Mahsulotlar topilmadi"
            description={filter !== 'all' ? "Bu kategoriyada mahsulot yo'q" : "Inventar bo'sh"}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b border-border/50
                                 bg-gray-50/80"
                  >
                    <th className="w-12 px-4 py-3" />
                    <th
                      className="px-4 py-3 text-left text-xs
                                   font-medium text-muted-foreground"
                    >
                      Mahsulot
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs
                                   font-medium text-muted-foreground
                                   hidden md:table-cell"
                    >
                      Mavjud
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs
                                   font-medium text-muted-foreground
                                   hidden lg:table-cell"
                    >
                      Band
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs
                                   font-medium text-muted-foreground
                                   hidden md:table-cell"
                    >
                      Eng yaqin muddat
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs
                                   font-medium text-muted-foreground"
                    >
                      Holat
                    </th>
                    <th className="px-4 py-3 w-32" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {items.map((item: any) => (
                    <tr
                      key={item.productId}
                      className="hover:bg-gray-50/60
                                   transition-colors group"
                    >
                      {/* Image */}
                      <td className="px-4 py-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-10 h-10 rounded-lg
                                       object-cover
                                       border-[0.5px] border-border"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-lg
                                          bg-gray-100 flex items-center
                                          justify-center"
                          >
                            <Package className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
                          </div>
                        )}
                      </td>

                      {/* Product */}
                      <td className="px-4 py-3">
                        <p
                          className="text-sm font-medium
                                      text-gray-900 leading-tight"
                        >
                          {item.productName}
                        </p>
                        <p
                          className="text-[11px] text-muted-foreground
                                      font-mono"
                        >
                          {item.barcode}
                        </p>
                      </td>

                      {/* Available */}
                      <td
                        className="px-4 py-3 text-center
                                     hidden md:table-cell"
                      >
                        <StockBadge stock={item.availableStock ?? 0} />
                      </td>

                      {/* Reserved */}
                      <td
                        className="px-4 py-3 text-center
                                     hidden lg:table-cell"
                      >
                        {(item.reservedStock ?? 0) > 0 ? (
                          <span
                            className="text-xs text-blue-600
                                           font-medium"
                          >
                            {item.reservedStock} band
                          </span>
                        ) : (
                          <span
                            className="text-xs
                                           text-muted-foreground"
                          >
                            —
                          </span>
                        )}
                      </td>

                      {/* Nearest expiry */}
                      <td
                        className="px-4 py-3 text-center
                                     hidden md:table-cell"
                      >
                        {item.nearestExpiry ? (
                          <span
                            className={cn(
                              'text-xs font-medium',
                              new Date(item.nearestExpiry) <
                                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                ? 'text-red-500'
                                : 'text-muted-foreground'
                            )}
                          >
                            {formatDate(item.nearestExpiry)}
                          </span>
                        ) : (
                          <span
                            className="text-xs
                                           text-muted-foreground"
                          >
                            —
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <StockBadge stock={item.availableStock ?? 0} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center
                                        justify-end gap-1
                                        opacity-0
                                        group-hover:opacity-100
                                        transition-opacity"
                        >
                          {canWrite('inventory') && (
                            <>
                              {/* Add batch */}
                              <button
                                onClick={() => openBatch(item)}
                                title="Partiya qo'shish"
                                className="w-7 h-7 rounded-lg flex
                                           items-center justify-center
                                           hover:bg-green-50
                                           text-green-600
                                           transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                              </button>

                              {/* Write-off */}
                              <button
                                onClick={() => openWriteOff(item)}
                                title="Hisobdan chiqarish"
                                className="w-7 h-7 rounded-lg flex
                                           items-center justify-center
                                           hover:bg-red-50 text-red-500
                                           transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                              </button>
                            </>
                          )}

                          {/* History */}
                          <button
                            onClick={() => openHistory(item)}
                            title="Harakat tarixi"
                            className="w-7 h-7 rounded-lg flex
                                       items-center justify-center
                                       hover:bg-blue-50 text-blue-600
                                       transition-colors"
                          >
                            <History className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta && (
              <Pagination
                page={page}
                total={meta.total}
                limit={20}
                hasNext={meta.hasNext}
                hasPrev={meta.hasPrev}
                onPage={setPage}
              />
            )}
          </>
        )}
      </div>

      {/* ── ADD BATCH SHEET ──────────────────────────────── */}
      <Sheet open={batchSheet} onOpenChange={setBatchSheet}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle className="text-base">Partiya qo'shish</SheetTitle>
            {selectedProduct && (
              <p className="text-sm text-muted-foreground">{selectedProduct.productName}</p>
            )}
          </SheetHeader>

          {/* Existing batches */}
          {productBatches.length > 0 && (
            <div className="mt-4 mb-2">
              <p
                className="text-xs font-semibold
                            text-muted-foreground
                            uppercase tracking-wide mb-2"
              >
                Mavjud partiyalar
              </p>
              <div className="space-y-1.5">
                {productBatches.map((b: any) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between
                                  p-2.5 rounded-lg bg-gray-50
                                  border-[0.5px] border-border/50"
                  >
                    <div>
                      <p className="text-xs font-medium">{b.currentQty} ta mavjud</p>
                      {b.expiryDate && (
                        <p
                          className="text-[11px]
                                      text-muted-foreground"
                        >
                          Muddat: {formatDate(b.expiryDate)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">
                        Tannarx: {formatKRW(Number(b.costPrice))}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(b.receivedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={batchForm.handleSubmit((data) => addBatchMutation.mutate(data))}
            className="space-y-4 py-4"
          >
            <div>
              <Label className="text-xs mb-1.5 block">Miqdor (dona) *</Label>
              <Input
                {...batchForm.register('quantity')}
                type="number"
                min="1"
                placeholder="50"
                className="h-9 text-sm rounded-lg border-[0.5px]"
              />
              {batchForm.formState.errors.quantity && (
                <p className="text-xs text-red-500 mt-1">
                  {batchForm.formState.errors.quantity.message as string}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Tannarx (KRW)</Label>
              <Input
                {...batchForm.register('costPrice')}
                type="number"
                min="0"
                placeholder="8000"
                className="h-9 text-sm rounded-lg border-[0.5px]"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                P&L hisobi va write-off xarajati uchun
              </p>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Yaroqlilik muddati</Label>
              <Input
                {...batchForm.register('expiryDate')}
                type="date"
                className="h-9 text-sm rounded-lg border-[0.5px]"
              />
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Izoh</Label>
              <Input
                {...batchForm.register('note')}
                placeholder="Yetkazuvchi: ..."
                className="h-9 text-sm rounded-lg border-[0.5px]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBatchSheet(false)}
                className="flex-1 rounded-lg border-[0.5px]"
              >
                Bekor
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={addBatchMutation.isPending}
                className="flex-1 rounded-lg bg-green-600
                           hover:bg-green-700"
              >
                {addBatchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {addBatchMutation.isPending ? "Qo'shilmoqda..." : "Partiya qo'shish"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── WRITE-OFF SHEET ──────────────────────────────── */}
      <Sheet open={writeOffSheet} onOpenChange={setWriteOffSheet}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle className="text-base text-red-600">Hisobdan chiqarish</SheetTitle>
            {selectedProduct && (
              <p className="text-sm text-muted-foreground">
                {selectedProduct.productName}
                {' · '}
                <span className="font-medium">{selectedProduct.availableStock ?? 0} ta mavjud</span>
              </p>
            )}
          </SheetHeader>

          {/* Auto-expense notice */}
          <div
            className="mt-4 p-3 rounded-lg bg-amber-50
                          border-[0.5px] border-amber-200"
          >
            <p className="text-xs text-amber-700 font-medium">⚠️ Avtomatik xarajat yaratiladi</p>
            <p className="text-[11px] text-amber-600 mt-0.5">
              Tannarx × miqdor = xarajat summasi (Moliya → Xarajatlar ga yoziladi)
            </p>
          </div>

          <form
            onSubmit={writeOffForm.handleSubmit((data) => writeOffMutation.mutate(data))}
            className="space-y-4 py-4"
          >
            <div>
              <Label className="text-xs mb-1.5 block">Partiya tanlang *</Label>
              <Controller
                name="batchId"
                control={writeOffForm.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 text-sm rounded-lg border-[0.5px]">
                      <SelectValue placeholder="Partiya tanlang" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {productBatches.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.currentQty} ta — {b.expiryDate ? formatDate(b.expiryDate) : 'Muddatiz'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {writeOffForm.formState.errors.batchId && (
                <p className="text-xs text-red-500 mt-1">
                  {writeOffForm.formState.errors.batchId.message as string}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Hisobdan chiqarish turi *</Label>
              <Controller
                name="type"
                control={writeOffForm.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      className="h-9 text-sm
                                              rounded-lg
                                              border-[0.5px]"
                    >
                      <SelectValue placeholder="Turini tanlang" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {writeOffReasons.map((r: string) => (
                        <SelectItem key={r} value={r}>
                          {REASON_LABELS[r] ?? r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {writeOffForm.formState.errors.type && (
                <p className="text-xs text-red-500 mt-1">
                  {writeOffForm.formState.errors.type.message as string}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Miqdor (dona) *</Label>
              <Input
                {...writeOffForm.register('quantity')}
                type="number"
                min="1"
                placeholder="5"
                className="h-9 text-sm rounded-lg border-[0.5px]"
              />
              {writeOffForm.formState.errors.quantity && (
                <p className="text-xs text-red-500 mt-1">
                  {writeOffForm.formState.errors.quantity.message as string}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Izoh / Sabab</Label>
              <Input
                {...writeOffForm.register('reason')}
                placeholder="Qo'shimcha ma'lumot..."
                className="h-9 text-sm rounded-lg border-[0.5px]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWriteOffSheet(false)}
                className="flex-1 rounded-lg border-[0.5px]"
              >
                Bekor
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={writeOffMutation.isPending}
                className="flex-1 rounded-lg bg-red-600
                           hover:bg-red-700"
              >
                {writeOffMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {writeOffMutation.isPending ? 'Chiqarilmoqda...' : 'Hisobdan chiqarish'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── HISTORY SHEET ────────────────────────────────── */}
      <Sheet open={historySheet} onOpenChange={setHistorySheet}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle className="text-base">Harakat tarixi</SheetTitle>
            {selectedProduct && (
              <p className="text-sm text-muted-foreground">{selectedProduct.productName}</p>
            )}
          </SheetHeader>

          <div className="py-4 space-y-2">
            {movements.length === 0 ? (
              <EmptyState message="Harakat tarixi yo'q" />
            ) : (
              movements.map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3
                                rounded-lg bg-gray-50
                                border-[0.5px] border-border/50"
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center',
                      'justify-center text-xs font-bold shrink-0',
                      m.quantityDelta > 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-600'
                    )}
                  >
                    {m.quantityDelta > 0 ? '+' : ''}
                    {m.quantityDelta}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900">
                      {m.type === 'STOCK_IN'
                        ? 'Kirim (Yangi partiya)'
                        : m.type === 'RESERVED'
                        ? 'Band qilindi (Buyurtma)'
                        : m.type === 'DEDUCTED'
                        ? 'Sotildi'
                        : REASON_LABELS[m.type]
                        ? `Hisobdan chiqarish — ${REASON_LABELS[m.type]}`
                        : m.type}
                    </p>
                    {m.reason && (
                      <p className="text-[11px] text-muted-foreground truncate">{m.reason}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      Admin: {m.admin?.fullName || 'Tizim'}
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground shrink-0">
                    {formatRelative(m.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
