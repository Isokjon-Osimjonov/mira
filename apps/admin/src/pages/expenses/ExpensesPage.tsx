import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryClient } from '../../lib/query-client'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Trash2, Tag, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { expensesApi } from '../../api/expenses.api'
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const LIMIT = 20

const CATEGORY_LABELS: Record<string, string> = {
  cargo: 'Yuk tashish',
  packaging: 'Qadoqlash',
  customs: 'Bojxona',
  marketing: 'Marketing',
  tax: 'Soliq',
  'inventory-loss': 'Inventar zarari',
  other: 'Boshqa',
  salary: 'Maosh',
  rent: 'Ijara',
}

const DATE_FILTERS = [
  { value: 'month', label: 'Bu oy' },
  { value: 'last_month', label: "O'tgan oy" },
  { value: 'all', label: 'Barchasi' },
]

const expenseSchema = z.object({
  amountKrw: z.coerce.number().int().min(1, "Summa 0 dan katta bo'lishi kerak"),
  category: z.string().min(1, 'Kategoriya tanlang'),
  description: z.string().min(1, 'Tavsif kiriting'),
  date: z.string().min(1, 'Sana tanlang'),
  note: z.string().optional(),
})

export function ExpensesPage() {
  const qc = useQueryClient()

  const [pageTab, setPageTab] = useState<'expenses' | 'categories'>('expenses')
  const [sheet, setSheet] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [debSearch, setDebSearch] = useState('')
  const [category, setCategory] = useState('_all')
  const [dateFilter, setDateFilter] = useState<'month' | 'last_month' | 'all'>('month')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => setDebSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [category, dateFilter, debSearch])

  const now = new Date()
  const getDateParams = () => {
    if (dateFilter === 'month')
      return {
        dateFrom: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        dateTo: now.toISOString().split('T')[0],
      }
    if (dateFilter === 'last_month') {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return {
        dateFrom: lm.toISOString().split('T')[0],
        dateTo: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0],
      }
    }
    return {}
  }

  const dateParams = getDateParams()
  const queryParams = {
    page,
    limit: LIMIT,
    search: debSearch || undefined,
    category: category === '_all' ? undefined : category,
    ...dateParams,
  }

  const { data, isLoading } = useQuery({
    queryKey: QK.EXPENSES(queryParams),
    queryFn: () => expensesApi.list(queryParams),
  })

  const { data: categories = [] } = useQuery({
    queryKey: QK.EXPENSE_CATEGORIES,
    queryFn: expensesApi.getCategories,
    staleTime: Infinity,
  })

  const { data: summary } = useQuery({
    queryKey: QK.EXPENSES_SUMMARY(dateParams),
    queryFn: () => expensesApi.getSummary(dateParams),
  })

  const periodLabel = DATE_FILTERS.find((f) => f.value === dateFilter)?.label ?? 'Barchasi'

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: now.toISOString().split('T')[0],
      amountKrw: 0,
      category: '',
      description: '',
      note: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      expensesApi.create({
        amountKrw: data.amountKrw,
        categoryId: data.category,
        description: data.description,
        date: data.date,
        note: data.note,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries()
      queryClient.refetchQueries({ type: 'active' })
      toast.success('Xarajat saqlandi')
      reset({
        date: now.toISOString().split('T')[0],
        amountKrw: 0,
        category: '',
        description: '',
        note: '',
      })
      setSheet(false)
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries()
      queryClient.refetchQueries({ type: 'active' })
      toast.success('Xarajat saqlandi')
      setDeleteTarget(null)
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const expenses = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Xarajatlar</h1>
          <p className="text-sm text-muted-foreground">
            {pageTab === 'expenses'
              ? summary?.totalKrw
                ? `Bu oy: ${formatKRW(summary.totalKrw)}`
                : "Xarajatlar ro'yxati"
              : 'Kategoriyalarni boshqarish'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
            <button
              onClick={() => setPageTab('expenses')}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                pageTab === 'expenses'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-muted-foreground'
              )}
            >
              Xarajatlar
            </button>
            <button
              onClick={() => setPageTab('categories')}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                pageTab === 'categories'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-muted-foreground'
              )}
            >
              Kategoriyalar
            </button>
          </div>

          {pageTab === 'expenses' && (
            <Button size="sm" className="rounded-lg gap-2 h-9" onClick={() => setSheet(true)}>
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              <span className="hidden sm:inline">Xarajat qo'shish</span>
            </Button>
          )}
        </div>
      </div>

      {pageTab === 'expenses' ? (
        <>
          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border-[0.5px] border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">{periodLabel} jami</p>
                <p className="text-lg font-bold text-red-600">
                  -{formatKRW(summary.totalAmountKrw ?? 0)}
                </p>
              </div>
              {(summary.byCategory ?? []).slice(0, 3).map((cat: any) => (
                <div
                  key={cat.categoryId}
                  className="bg-white rounded-xl border-[0.5px] border-border p-4"
                >
                  <p className="text-xs text-muted-foreground mb-1 truncate">{cat.categoryName}</p>
                  <p className="text-lg font-bold text-orange-600">
                    -{formatKRW(cat.totalAmountKrw ?? 0)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Date filter */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {DATE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setDateFilter(f.value as any)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    dateFilter === f.value
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-muted-foreground'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Category filter */}
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 text-xs rounded-lg border-[0.5px] w-44">
                <SelectValue placeholder="Kategoriya" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="_all">Barcha kategoriyalar</SelectItem>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground"
                strokeWidth={1.5}
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tavsif qidirish..."
                className="pl-8 h-8 text-xs rounded-lg border-[0.5px]"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border-[0.5px] border-border overflow-hidden">
            {isLoading ? (
              <SkeletonTable cols={5} rows={8} />
            ) : expenses.length === 0 ? (
              <EmptyState
                message="Xarajatlar yo'q"
                description="Yangi xarajat qo'shing"
                action={
                  <Button size="sm" onClick={() => setSheet(true)} className="rounded-lg gap-2">
                    <Plus className="h-4 w-4" />
                    Qo'shish
                  </Button>
                }
              />
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-gray-50/80">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-28">
                        Sana
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-36">
                        Kategoriya
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Tavsif
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground w-32">
                        Summa
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground w-24 hidden md:table-cell">
                        Manba
                      </th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {expenses.map((e: any) => (
                      <tr key={e.id} className="hover:bg-gray-50/60 transition-colors group">
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-700">
                            {formatDate(e.expenseDate ?? e.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: (e.category?.color || '#6366f1') + '15',
                              color: e.category?.color || '#6366f1',
                            }}
                          >
                            {e.category?.name ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900 line-clamp-1">{e.description}</p>
                          {e.note && <p className="text-[11px] text-muted-foreground">{e.note}</p>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-red-600">
                            -{formatKRW(Number(e.amountKrw))}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          {e.referenceType ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                              {e.referenceType === 'WRITE_OFF'
                                ? '🔴 Chiqim'
                                : e.referenceType === 'ORDER'
                                  ? '📦 Buyurtma'
                                  : e.referenceType}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">✏️ Qo'lda</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {!e.referenceType && (
                            <button
                              onClick={() => setDeleteTarget(e)}
                              className="w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-500 transition-all"
                            >
                              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                            </button>
                          )}
                        </td>
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

          {/* Create sheet */}
          <Sheet open={sheet} onOpenChange={setSheet}>
            <SheetContent
              side="right"
              className="w-[90vw] sm:w-[440px] sm:max-w-[440px] overflow-y-auto"
            >
              <SheetHeader className="pb-4 border-b border-border/50">
                <SheetTitle>Yangi xarajat</SheetTitle>
              </SheetHeader>

              <form
                onSubmit={handleSubmit((data) => createMutation.mutate(data))}
                className="space-y-4 py-4"
              >
                <div>
                  <Label className="text-xs mb-1.5 block">Kategoriya *</Label>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-9 text-sm rounded-lg border-[0.5px]">
                          <SelectValue placeholder="Tanlang" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {categories.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: c.color || '#6366f1' }}
                                />
                                {c.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.category && (
                    <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>
                  )}
                </div>
                {/* ... rest of form ... */}
                <div>
                  <Label className="text-xs mb-1.5 block">Tavsif *</Label>
                  <Input
                    {...register('description')}
                    placeholder="Xarajat tavsifi..."
                    className="h-9 text-sm rounded-lg border-[0.5px]"
                  />
                  {errors.description && (
                    <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs mb-1.5 block">Summa (KRW) *</Label>
                  <Input
                    {...register('amountKrw')}
                    type="number"
                    min="1"
                    placeholder="50000"
                    className="h-9 text-sm rounded-lg border-[0.5px]"
                  />
                  {errors.amountKrw && (
                    <p className="text-xs text-red-500 mt-1">{errors.amountKrw.message}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs mb-1.5 block">Sana *</Label>
                  <Input
                    {...register('date')}
                    type="date"
                    className="h-9 text-sm rounded-lg border-[0.5px]"
                  />
                  {errors.date && (
                    <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs mb-1.5 block">Izoh (ixtiyoriy)</Label>
                  <Input
                    {...register('note')}
                    placeholder="Qo'shimcha ma'lumot..."
                    className="h-9 text-sm rounded-lg border-[0.5px]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSheet(false)}
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
                    {createMutation.isPending ? 'Saqlanmoqda...' : "Qo'shish"}
                  </Button>
                </div>
              </form>
            </SheetContent>
          </Sheet>

          <ConfirmDialog
            open={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            title="Xarajatni o'chirish"
            description={`${formatKRW(deleteTarget?.amountKrw ?? 0)} miqdoridagi xarajat o'chiriladi.`}
            variant="destructive"
            loading={deleteMutation.isPending}
            onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          />
        </>
      ) : (
        <ExpenseCategoriesManager />
      )}
    </div>
  )
}

function ExpenseCategoriesManager() {
  const qc = useQueryClient()
  const [editTarget, setEditTarget] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  const COLOR_OPTIONS = [
    '#f97316',
    '#8b5cf6',
    '#3b82f6',
    '#f59e0b',
    '#10b981',
    '#6366f1',
    '#ec4899',
    '#64748b',
    '#ef4444',
    '#14b8a6',
  ]

  const catSchema = z.object({
    name: z.string().min(1, 'Nom talab qilinadi'),
    description: z.string().optional(),
    color: z.string().default('#6366f1'),
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(catSchema),
    defaultValues: { color: '#6366f1', name: '', description: '' },
  })

  const watchColor = watch('color')

  const { data: categories = [], isLoading } = useQuery({
    queryKey: QK.EXPENSE_CATEGORIES,
    queryFn: expensesApi.getCategories,
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editTarget
        ? expensesApi.updateCategory(editTarget.id, data)
        : expensesApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries()
      queryClient.refetchQueries({ type: 'active' })
      toast.success('Xarajat saqlandi')
      resetForm()
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries()
      queryClient.refetchQueries({ type: 'active' })
      toast.success('Xarajat saqlandi')
      setDeleteTarget(null)
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const resetForm = () => {
    reset({ color: '#6366f1', name: '', description: '' })
    setEditTarget(null)
    setShowForm(false)
  }

  const handleEdit = (cat: any) => {
    setEditTarget(cat)
    reset({
      name: cat.name,
      description: cat.description ?? '',
      color: cat.color ?? '#6366f1',
    })
    setShowForm(true)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white rounded-xl border-[0.5px] border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <h2 className="text-sm font-semibold text-gray-900">Xarajat kategoriyalari</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            className="rounded-lg gap-1.5 h-8 border-[0.5px] text-xs"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            Yangi
          </Button>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Kategoriyalar yo'q</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {categories.map((cat: any) => (
              <div
                key={cat.id}
                className="flex items-center gap-3 px-5 py-3 group hover:bg-gray-50/60 transition-colors"
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color ?? '#6366f1' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                  {cat.description && (
                    <p className="text-[11px] text-muted-foreground truncate">{cat.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(cat)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-50 text-blue-600 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(cat)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-red-500 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm ? (
        <div className="bg-white rounded-xl border-[0.5px] border-border p-5 sticky top-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              {editTarget ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}
            </h2>
            <button
              onClick={resetForm}
              className="text-muted-foreground hover:text-gray-700 text-lg"
            >
              ×
            </button>
          </div>
          <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
            <div>
              <Label className="text-xs mb-1.5 block">Nomi *</Label>
              <Input
                {...register('name')}
                placeholder="Marketing, Ijara..."
                className="h-9 text-sm rounded-lg border-[0.5px]"
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name.message as string}</p>
              )}
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Tavsif</Label>
              <Input
                {...register('description')}
                placeholder="Qisqacha izoh..."
                className="h-9 text-sm rounded-lg border-[0.5px]"
              />
            </div>
            <div>
              <Label className="text-xs mb-2 block">Rang</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setValue('color', color)}
                    className={cn(
                      'w-7 h-7 rounded-full transition-all border-2',
                      watchColor === color ? 'border-gray-900 scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetForm}
                className="flex-1 rounded-lg border-[0.5px]"
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
        </div>
      ) : (
        <div className="hidden lg:flex bg-gray-50 rounded-xl border-[0.5px] border-border border-dashed items-center justify-center p-8 text-center sticky top-20 h-[300px]">
          <div>
            <Tag className="h-8 w-8 text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">Kategoriya tanlang yoki yangi yarating</p>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Kategoriyani o'chirish"
        description={`"${deleteTarget?.name}" kategoriyasini o'chirishni tasdiqlaysizmi?`}
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
