import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Sparkles, Pencil, Trash2, X, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { productsApi } from '../../api/products.api'
import { categoriesApi } from '../../api/categories.api'
import { QK } from '../../constants/query-keys'
import { formatKRW, formatUZS } from '../../utils/currency'
import { useExchangeRate } from '../../hooks/useExchangeRate'
import { useAuthStore } from '../../stores/auth.store'
import { getErrorMessage } from '../../lib/errors'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { SkeletonTable } from '../../components/shared/SkeletonTable'
import { EmptyState } from '../../components/shared/EmptyState'
import { Pagination } from '../../components/shared/Pagination'
import { ProductSheet } from './ProductSheet'
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
import { Package } from 'lucide-react'

const LIMIT = 20

export function ProductsPage() {
  const qc = useQueryClient()
  const { rate } = useExchangeRate()
  const canWrite = useAuthStore((s) => s.canWrite)

  // Filters
  const [activeTab, setActiveTab] = useState<'active' | 'inactive' | 'deleted'>('active')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)
  const [debSearch, setDebSearch] = useState('')

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debSearch, categoryId, activeTab])

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: QK.PRODUCTS({
      page,
      limit: LIMIT,
      q: debSearch || undefined,
      category: categoryId === '_all' || !categoryId ? undefined : categoryId,
      isActive: activeTab === 'active' ? true : activeTab === 'inactive' ? false : undefined,
      showDeleted: activeTab === 'deleted',
      region: 'KOR',
    } as any),
    queryFn: () =>
      productsApi.list({
        page,
        limit: LIMIT,
        q: debSearch || undefined,
        category: categoryId === '_all' || !categoryId ? undefined : categoryId,
        isActive: activeTab === 'active' ? true : activeTab === 'inactive' ? false : undefined,
        showDeleted: activeTab === 'deleted',
        region: 'KOR',
      } as any),
  })

  const { data: categories } = useQuery({
    queryKey: QK.CATEGORIES,
    queryFn: categoriesApi.getTree,
    staleTime: Infinity,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      qc.removeQueries()
      toast.success("Mahsulot o'chirildi")
      setDeleteTarget(null)
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err?.errorCode ?? ''))
    },
  })

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: (id: string) => productsApi.restore(id),
    onSuccess: () => {
      qc.removeQueries()
      toast.success('Mahsulot tiklandi')
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err?.errorCode ?? ''))
    },
  })

  // AI fill mutation
  const aiFillMutation = useMutation({
    mutationFn: (id: string) => {
      setAiLoadingId(id)
      return productsApi.aiFill({ productId: id })
    },
    onSuccess: () => {
      qc.removeQueries()
      toast.success("AI ma'lumotlarni to'ldirdi ✨")
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err?.errorCode ?? ''))
    },
    onSettled: () => setAiLoadingId(null),
  })

  const handleEdit = async (p: any) => {
    try {
      const res = await productsApi.getById(p.id)
      setEditProduct(res.data)
      setSheetOpen(true)
    } catch {
      setEditProduct(p)
      setSheetOpen(true)
    }
  }

  const products = data?.data ?? []
  const meta = data?.meta

  // Flatten categories for select
  const flatCategories: any[] = []
  const flatten = (cats: any[], depth = 0) => {
    for (const cat of cats ?? []) {
      flatCategories.push({ ...cat, depth })
      if (cat.children) flatten(cat.children, depth + 1)
    }
  }
  flatten(categories ?? [])

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mahsulotlar</h1>
          <p className="text-sm text-muted-foreground">
            {meta?.total ? `Jami ${meta.total} ta mahsulot` : 'Katalogni boshqaring'}
          </p>
        </div>
        {canWrite('products') && (
          <Button
            size="sm"
            className="rounded-lg gap-2 h-9"
            onClick={() => {
              setEditProduct(null)
              setSheetOpen(true)
            }}
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">Yangi mahsulot</span>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
        {[
          { value: 'active', label: 'Aktiv' },
          { value: 'inactive', label: 'Nofaol' },
          { value: 'deleted', label: "O'chirilgan" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value as any)}
            className={cn(
              'text-xs py-1.5 px-4 rounded-md transition-all font-medium',
              activeTab === tab.value ? 'bg-white shadow-sm text-gray-900' : 'text-muted-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-3 top-1/2
                             -translate-y-1/2 h-3.5 w-3.5
                             text-muted-foreground"
            strokeWidth={1.5}
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, barcode yoki brend..."
            className="pl-9 h-9 text-sm rounded-lg
                       border-[0.5px]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2
                         -translate-y-1/2 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select
          value={categoryId || '_all'}
          onValueChange={(v) => setCategoryId(v === '_all' ? '' : v)}
        >
          <SelectTrigger
            className="w-[150px] h-9 text-sm
                                    rounded-lg border-[0.5px]"
          >
            <SelectValue placeholder="Kategoriya" />
          </SelectTrigger>
          <SelectContent className="rounded-xl max-h-64">
            <SelectItem value="_all">Barchasi</SelectItem>
            {flatCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {'  '.repeat(cat.depth)}
                {cat.name ?? cat.nameKo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search || categoryId || activeTab !== 'active') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch('')
              setCategoryId('')
              setActiveTab('active')
            }}
            className="h-9 rounded-lg text-xs gap-1
                       border-[0.5px]"
          >
            <X className="h-3.5 w-3.5" />
            Tozalash
          </Button>
        )}
      </div>

      {/* Table */}
      <div
        className="bg-white rounded-xl border-[0.5px]
                      border-border overflow-hidden"
      >
        {isLoading ? (
          <SkeletonTable cols={7} rows={8} />
        ) : products.length === 0 ? (
          <EmptyState
            message="Mahsulotlar topilmadi"
            description={
              search || categoryId
                ? "Filtrlarni o'zgartirib ko'ring"
                : "Birinchi mahsulotni qo'shing"
            }
            action={
              canWrite('products') ? (
                <Button size="sm" onClick={() => setSheetOpen(true)} className="rounded-lg gap-2">
                  <Plus className="h-4 w-4" />
                  Mahsulot qo'shish
                </Button>
              ) : undefined
            }
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
                      className="px-4 py-3 text-left text-xs
                                   font-medium text-muted-foreground
                                   hidden md:table-cell"
                    >
                      Brend
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs
                                   font-medium text-muted-foreground"
                    >
                      KOR narx
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs
                                   font-medium text-muted-foreground
                                   hidden lg:table-cell"
                    >
                      UZS ekvivalent
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs
                                   font-medium text-muted-foreground
                                   hidden md:table-cell"
                    >
                      Stok
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs
                                   font-medium text-muted-foreground"
                    >
                      Holat
                    </th>
                    <th className="px-4 py-3 w-28" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {products.map((p: any) => (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50/60
                                   transition-colors group"
                    >
                      {/* Image */}
                      <td className="px-4 py-3">
                        {(() => {
                          const imgSrc = Array.isArray(p.imageUrls)
                            ? p.imageUrls[0]
                            : typeof p.imageUrls === 'string'
                              ? p.imageUrls
                              : (p.imageUrl ?? null)

                          return imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={p.name}
                              className="w-10 h-10 min-w-[2.5rem] shrink-0 rounded-lg object-cover border-[0.5px] border-border"
                            />
                          ) : (
                            <div className="w-10 h-10 min-w-[2.5rem] shrink-0 rounded-lg bg-gray-100 flex items-center justify-center">
                              <span className="text-gray-400 text-xs">📷</span>
                            </div>
                          )
                        })()}
                      </td>

                      {/* Name + barcode */}
                      <td className="px-4 py-3">
                        <p
                          className="text-sm font-medium
                                      text-gray-900 leading-tight"
                        >
                          {p.name}
                        </p>
                        {p.nameUz && (
                          <p
                            className="text-[11px] text-gray-500
                                        leading-tight mt-0.5"
                          >
                            {p.nameUz}
                          </p>
                        )}
                        <p
                          className="text-[11px] text-muted-foreground
                                      font-mono mt-0.5"
                        >
                          {p.barcode}
                        </p>
                      </td>

                      {/* Brand */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{p.brandName}</span>
                      </td>

                      {/* KOR price */}
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {p.retailPrice ? formatKRW(p.retailPrice) : '—'}
                        </p>
                      </td>

                      {/* UZS equivalent */}
                      <td
                        className="px-4 py-3 text-right
                                     hidden lg:table-cell"
                      >
                        <p className="text-sm text-muted-foreground">
                          {p.retailPrice && rate
                            ? formatUZS(Math.round(Number(p.retailPrice) * rate))
                            : '—'}
                        </p>
                      </td>

                      {/* Stock */}
                      <td
                        className="px-4 py-3 text-center
                                     hidden md:table-cell"
                      >
                        <span
                          className={cn(
                            'text-xs font-semibold px-2 py-0.5',
                            'rounded-full',
                            Number(p.totalStock || 0) === 0
                              ? 'bg-red-50 text-red-600'
                              : Number(p.totalStock || 0) <= 10
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-green-50 text-green-700'
                          )}
                        >
                          {p.totalStock ?? 0}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            'text-[11px] font-medium px-2 py-0.5',
                            'rounded-md border-[0.5px]',
                            p.isActive
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          )}
                        >
                          {p.isActive ? 'Aktiv' : 'Nofaol'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center
                                        justify-end gap-1
                                        opacity-0 group-hover:opacity-100
                                        transition-opacity"
                        >
                          {activeTab === 'deleted' && canWrite('products') && (
                            <button
                              onClick={() => restoreMutation.mutate(p.id)}
                              title="Tiklash"
                              className="w-7 h-7 rounded-lg flex items-center
                                         justify-center hover:bg-green-50
                                         text-green-600 transition-colors"
                            >
                              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                          )}

                          {/* AI fill */}
                          {activeTab !== 'deleted' && canWrite('products') && (
                            <button
                              onClick={() => aiFillMutation.mutate(p.id)}
                              disabled={aiLoadingId === p.id}
                              title="AI bilan to'ldirish"
                              className={cn(
                                'w-7 h-7 rounded-lg flex items-center',
                                'justify-center transition-colors',
                                'hover:bg-violet-50 text-violet-600',
                                aiLoadingId === p.id ? 'animate-pulse' : ''
                              )}
                            >
                              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                          )}

                          {/* Edit */}
                          {activeTab !== 'deleted' && canWrite('products') && (
                            <button
                              onClick={() => handleEdit(p)}
                              title="Tahrirlash"
                              className="w-7 h-7 rounded-lg flex
                                         items-center justify-center
                                         hover:bg-blue-50 text-blue-600
                                         transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                          )}

                          {/* Delete */}
                          {canWrite('products') && (
                            <button
                              onClick={() => setDeleteTarget(p)}
                              title="O'chirish"
                              className="w-7 h-7 rounded-lg flex
                                         items-center justify-center
                                         hover:bg-red-50 text-red-500
                                         transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                          )}
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
                limit={LIMIT}
                hasNext={meta.hasNext}
                hasPrev={meta.hasPrev}
                onPage={setPage}
              />
            )}
          </>
        )}
      </div>

      {/* Product Sheet (create/edit) */}
      <ProductSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false)
          setEditProduct(null)
        }}
        product={editProduct}
        categories={flatCategories}
        onSuccess={() => {
          qc.removeQueries()
          setSheetOpen(false)
          setEditProduct(null)
        }}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Mahsulotni o'chirish"
        description={`"${deleteTarget?.name}" mahsulotini 
          o'chirishni tasdiqlaysizmi? Bu amalni qaytarib bo'lmaydi.`}
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
