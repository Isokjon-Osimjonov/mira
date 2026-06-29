import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Package, Plus, Pencil, Trash2, PackagePlus, PackageMinus } from 'lucide-react'
import { toast } from 'sonner'
import { boxesApi } from '../../api/boxes.api'
import { QK } from '../../constants/query-keys'
import { formatKRW } from '../../utils/currency'
import { getErrorMessage } from '../../lib/errors'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { EmptyState } from '../../components/shared/EmptyState'
import { ImageUploadField } from '../../components/shared/ImageUploadField'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const boxSchema = z.object({
  name: z.string().min(1, 'Nom talab qilinadi'),
  sizeLabel: z.string().optional().nullable(),
  lengthCm: z.coerce.number().min(0).optional().nullable(),
  widthCm: z.coerce.number().min(0).optional().nullable(),
  heightCm: z.coerce.number().min(0).optional().nullable(),
  maxWeightKg: z.coerce.number().min(0).default(0),
  boxWeightKg: z.coerce.number().min(0).default(0),
  costKrw: z.coerce.number().int().min(0).default(0),
  stockCount: z.coerce.number().int().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(10),
  imageUrls: z.array(z.string()).default([]),
})
type BoxForm = z.infer<typeof boxSchema>

function StockBadge({ stock, min }: { stock: number; min: number }) {
  if (stock === 0)
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
        Tugagan
      </span>
    )
  if (stock < min)
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
        {stock} — Kam
      </span>
    )
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
      {stock} ta
    </span>
  )
}

export function QutularPage() {
  const qc = useQueryClient()

  const [editTarget, setEditTarget] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [adjustTarget, setAdjustTarget] = useState<any>(null)
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustType, setAdjustType] = useState<'add' | 'use'>('add')

  const { data: boxes = [], isLoading } = useQuery({
    queryKey: QK.BOXES,
    queryFn: boxesApi.list,
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(boxSchema),
    defaultValues: { costKrw: 0, stockCount: 0, minStock: 10, imageUrls: [] },
  })

  const saveMutation = useMutation({
    mutationFn: (data: BoxForm) =>
      editTarget ? boxesApi.update(editTarget.id, data) : boxesApi.create(data),
    onSuccess: () => {
      qc.removeQueries()
      toast.success(editTarget ? 'Quti yangilandi' : "Quti qo'shildi")
      resetForm()
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => boxesApi.delete(id),
    onSuccess: () => {
      qc.removeQueries()
      toast.success("Quti o'chirildi")
      setDeleteTarget(null)
    },
  })

  const adjustMutation = useMutation({
    mutationFn: () => boxesApi.adjustStock(adjustTarget!.id, parseInt(adjustQty), adjustType),
    onSuccess: () => {
      qc.removeQueries()
      toast.success(adjustType === 'add' ? "Stok qo'shildi" : 'Stok ishlatildi')
      setAdjustTarget(null)
      setAdjustQty('')
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const resetForm = () => {
    reset({
      costKrw: 0,
      stockCount: 0,
      minStock: 10,
      name: '',
      sizeLabel: '',
      lengthCm: null,
      widthCm: null,
      heightCm: null,
      maxWeightKg: 0,
      boxWeightKg: 0,
      imageUrls: [],
    })
    setEditTarget(null)
    setShowForm(false)
  }

  const handleEdit = (box: any) => {
    setEditTarget(box)
    reset({
      name: box.name,
      sizeLabel: box.sizeLabel ?? '',
      lengthCm: box.lengthCm ?? null,
      widthCm: box.widthCm ?? null,
      heightCm: box.heightCm ?? null,
      maxWeightKg: box.maxWeightKg ?? 0,
      boxWeightKg: box.boxWeightKg ?? 0,
      costKrw: box.costKrw ?? 0,
      stockCount: box.stockCount ?? 0,
      minStock: box.minStock ?? 10,
      imageUrls: box.imageUrls ?? [],
    })
    setShowForm(true)
  }

  const lowStockCount = boxes.filter((b: any) => b.stockCount < b.minStock).length

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Qutular</h1>
          <p className="text-sm text-muted-foreground">
            {boxes.length} ta quti turi
            {lowStockCount > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                · {lowStockCount} ta kam qolgan
              </span>
            )}
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-lg gap-2 h-9"
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          <span className="hidden sm:inline">Yangi quti</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: Boxes table */}
        <div className="lg:col-span-2 bg-white rounded-xl border-[0.5px] border-border overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : boxes.length === 0 ? (
            <EmptyState
              message="Qutular yo'q"
              description="Birinchi qutuni qo'shing"
              action={
                <Button size="sm" onClick={() => setShowForm(true)} className="rounded-lg gap-2">
                  <Plus className="h-4 w-4" />
                  Qo'shish
                </Button>
              }
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-gray-50/80">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Quti
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground hidden md:table-cell">
                    O'lcham
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">
                    Stok
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground hidden lg:table-cell">
                    Narx
                  </th>
                  <th className="px-4 py-3 w-32" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {boxes.map((box: any) => (
                  <tr key={box.id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {box.imageUrls?.[0] ? (
                          <img
                            src={box.imageUrls[0]}
                            alt={box.name}
                            className="w-10 h-10 min-w-[2.5rem] shrink-0 rounded-lg object-cover border-[0.5px] border-border"
                          />
                        ) : (
                          <div className="w-10 h-10 min-w-[2.5rem] shrink-0 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Package className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{box.name}</p>
                          {box.sizeLabel && (
                            <p className="text-[11px] text-muted-foreground">{box.sizeLabel}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      {box.lengthCm && box.widthCm && box.heightCm ? (
                        <span className="text-xs text-muted-foreground">
                          {box.lengthCm}×{box.widthCm}×{box.heightCm} sm
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StockBadge stock={box.stockCount} min={box.minStock} />
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      <span className="text-xs text-gray-700">
                        {box.costKrw > 0 ? formatKRW(box.costKrw) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setAdjustTarget(box)
                            setAdjustType('add')
                            setAdjustQty('')
                          }}
                          title="Stok qo'shish"
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-green-50 text-green-600 transition-colors"
                        >
                          <PackagePlus className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => {
                            setAdjustTarget(box)
                            setAdjustType('use')
                            setAdjustQty('')
                          }}
                          title="Stok ishlatish"
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-amber-50 text-amber-600 transition-colors"
                        >
                          <PackageMinus className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => handleEdit(box)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-50 text-blue-600 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(box)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* RIGHT: Form OR stock adjust */}
        <div className="lg:col-span-1">
          {adjustTarget ? (
            <div className="bg-white rounded-xl border-[0.5px] border-border p-5 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">
                  {adjustType === 'add' ? "Stok qo'shish" : 'Stok ishlatish'}
                </h2>
                <button
                  onClick={() => setAdjustTarget(null)}
                  className="text-muted-foreground hover:text-gray-700 text-lg"
                >
                  ×
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {adjustTarget.name} · Mavjud: {adjustTarget.stockCount} ta
              </p>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs mb-1.5 block">Miqdor *</Label>
                  <Input
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    type="number"
                    min="1"
                    placeholder="10"
                    className="h-9 text-sm rounded-lg border-[0.5px]"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAdjustTarget(null)}
                    className="flex-1 rounded-lg border-[0.5px]"
                  >
                    Bekor
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => adjustMutation.mutate()}
                    disabled={!adjustQty || adjustMutation.isPending}
                    className={cn(
                      'flex-1 rounded-lg',
                      adjustType === 'add'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-amber-600 hover:bg-amber-700'
                    )}
                  >
                    {adjustMutation.isPending
                      ? 'Yuklanmoqda...'
                      : adjustType === 'add'
                        ? "Qo'shish"
                        : 'Ishlatish'}
                  </Button>
                </div>
              </div>
            </div>
          ) : showForm ? (
            <div className="bg-white rounded-xl border-[0.5px] border-border p-5 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">
                  {editTarget ? 'Qutini tahrirlash' : 'Yangi quti'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-muted-foreground hover:text-gray-700 text-lg"
                >
                  ×
                </button>
              </div>
              <form
                onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
                className="space-y-3"
              >
                <div>
                  <Label className="text-xs mb-1.5 block">Nomi *</Label>
                  <Input
                    {...register('name')}
                    placeholder="Kichik quti, A4 quti..."
                    className="h-9 text-sm rounded-lg border-[0.5px]"
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 mt-1">{errors.name.message as string}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Rasmlar (ixtiyoriy, max 3)</Label>
                  <ImageUploadField
                    mode="multi"
                    value={watch('imageUrls') ?? []}
                    onChange={(urls) => {
                      const limited = (urls as string[]).slice(0, 3)
                      setValue('imageUrls', limited, { shouldDirty: true })
                    }}
                    uploadFn={boxesApi.uploadBoxImage}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Quti ko'rinishi, o'lchami uchun rasm
                  </p>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Hajm belgisi</Label>
                  <Input
                    {...register('sizeLabel')}
                    placeholder="S / M / L / XL"
                    className="h-9 text-sm rounded-lg border-[0.5px]"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">O'lchamlar (sm) — L × W × H</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      {...register('lengthCm')}
                      type="number"
                      placeholder="L"
                      className="h-9 text-sm rounded-lg border-[0.5px]"
                    />
                    <Input
                      {...register('widthCm')}
                      type="number"
                      placeholder="W"
                      className="h-9 text-sm rounded-lg border-[0.5px]"
                    />
                    <Input
                      {...register('heightCm')}
                      type="number"
                      placeholder="H"
                      className="h-9 text-sm rounded-lg border-[0.5px]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1.5 block">Maksimal og'irlik (kg)</Label>
                    <Input
                      {...register('maxWeightKg')}
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="10.0"
                      className="h-9 text-sm rounded-lg border-[0.5px]"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Bu qutiga sig'adigan maksimal tovar og'irligi
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Quti o'z og'irligi (kg)</Label>
                    <Input
                      {...register('boxWeightKg')}
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0.5"
                      className="h-9 text-sm rounded-lg border-[0.5px]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1.5 block">Narx (KRW)</Label>
                    <Input
                      {...register('costKrw')}
                      type="number"
                      min="0"
                      placeholder="500"
                      className="h-9 text-sm rounded-lg border-[0.5px]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Mavjud (dona)</Label>
                    <Input
                      {...register('stockCount')}
                      type="number"
                      min="0"
                      className="h-9 text-sm rounded-lg border-[0.5px]"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Min stok (ogohlantirish)</Label>
                  <Input
                    {...register('minStock')}
                    type="number"
                    min="0"
                    className="h-9 text-sm rounded-lg border-[0.5px]"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Bu miqdordan kam bo'lsa → sariq ogohlantirish
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
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
                    {saveMutation.isPending
                      ? 'Saqlanmoqda...'
                      : editTarget
                        ? 'Saqlash'
                        : 'Yaratish'}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="hidden lg:flex bg-gray-50 rounded-xl border-[0.5px] border-border border-dashed items-center justify-center p-8 text-center sticky top-20 h-[300px]">
              <div>
                <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">Quti tanlang yoki yangi yarating</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Qutini o'chirish"
        description={`"${deleteTarget?.name}" o'chiriladi.`}
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
