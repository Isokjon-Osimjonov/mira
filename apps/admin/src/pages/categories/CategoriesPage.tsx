import React, { useState, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, FolderOpen } from 'lucide-react'
import { toast } from 'sonner'
import { categoriesApi } from '../../api/categories.api'
import { QK } from '../../constants/query-keys'
import { getErrorMessage } from '../../lib/errors'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { EmptyState } from '../../components/shared/EmptyState'
import { useAuthStore } from '../../stores/auth.store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const categorySchema = z.object({
  nameKo: z.string().min(1, 'Kategoriya nomi talab qilinadi'),
  nameUz: z.string().optional(),
  parentId: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
})
type CategoryForm = z.infer<typeof categorySchema>

export function CategoriesPage() {
  const qc = useQueryClient()
  const canWrite = useAuthStore((s) => s.canWrite)

  const [editTarget, setEditTarget] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema) as any,
    defaultValues: { nameKo: '', nameUz: '', sortOrder: 0 },
  })

  const { data: categories = [], isLoading } = useQuery({
    queryKey: QK.CATEGORIES,
    queryFn: categoriesApi.getFlat,
    staleTime: 60_000,
  })

  const saveMutation = useMutation({
    mutationFn: (data: CategoryForm) => {
      const payload = {
        ...data,
        parentId: data.parentId === '_none' || !data.parentId ? undefined : data.parentId,
      }
      return editTarget
        ? categoriesApi.update(editTarget.id, payload)
        : categoriesApi.create(payload)
    },
    onSuccess: () => {
      toast.success(editTarget ? 'Kategoriya yangilandi' : 'Kategoriya yaratildi')
      qc.invalidateQueries({ queryKey: QK.CATEGORIES })
      qc.invalidateQueries({ queryKey: ['products'] })
      resetForm()
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err?.errorCode ?? ''))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      toast.success("Kategoriya o'chirildi")
      qc.invalidateQueries({ queryKey: QK.CATEGORIES })
      setDeleteTarget(null)
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err?.errorCode ?? ''))
    },
  })

  const resetForm = () => {
    reset({ nameKo: '', nameUz: '', sortOrder: 0, parentId: '_none' })
    setEditTarget(null)
    setShowForm(false)
  }

  const handleEdit = (cat: any) => {
    setEditTarget(cat)
    reset({
      nameKo: cat.nameKo ?? '',
      nameUz: cat.nameUz ?? '',
      parentId: cat.parentId ?? '_none',
      sortOrder: cat.sortOrder ?? 0,
    })
    setShowForm(true)
  }

  // Build tree for display
  const roots = categories.filter((c) => !c.parentId)
  const children = categories.filter((c) => !!c.parentId)
  const getChildren = (parentId: string) => children.filter((c) => c.parentId === parentId)

  const renderRow = (cat: any, depth = 0) => (
    <Fragment key={cat.id}>
      <tr
        className="border-b border-border/30
                     hover:bg-gray-50/60 transition-colors group"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
            {depth > 0 && <span className="text-muted-foreground text-xs">→</span>}
            <FolderOpen
              className={cn(
                'h-4 w-4 shrink-0',
                depth === 0 ? 'text-primary' : 'text-muted-foreground'
              )}
              strokeWidth={1.5}
            />
            <div>
              <p
                className={cn(
                  'text-sm',
                  depth === 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                )}
              >
                {cat.nameKo}
              </p>
              {cat.nameUz && <p className="text-[11px] text-muted-foreground">{cat.nameUz}</p>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              (cat.productCount ?? 0) > 0 ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
            )}
          >
            {cat.productCount ?? 0} ta
          </span>
        </td>
        <td className="px-4 py-3">
          <div
            className="flex items-center justify-end gap-1
                          opacity-0 group-hover:opacity-100
                          transition-opacity"
          >
            {canWrite('products') && (
              <>
                <button
                  onClick={() => handleEdit(cat)}
                  className="w-7 h-7 rounded-lg flex items-center
                             justify-center hover:bg-blue-50
                             text-blue-600 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => setDeleteTarget(cat)}
                  disabled={(cat.productCount ?? 0) > 0}
                  title={
                    (cat.productCount ?? 0) > 0
                      ? "Mahsulotlar bor, o'chirish bo'lmaydi"
                      : "O'chirish"
                  }
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center',
                    'justify-center transition-colors',
                    (cat.productCount ?? 0) > 0
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'hover:bg-red-50 text-red-500'
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
      {getChildren(cat.id).map((child) => renderRow(child, depth + 1))}
    </Fragment>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Kategoriyalar</h1>
          <p className="text-sm text-muted-foreground">
            {categories.length > 0
              ? `Jami ${categories.length} ta kategoriya`
              : 'Mahsulot kategoriyalarini boshqaring'}
          </p>
        </div>
        {canWrite('products') && (
          <Button
            size="sm"
            className="rounded-lg gap-2 h-9"
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">Yangi kategoriya</span>
          </Button>
        )}
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: Tree table */}
        <div
          className="lg:col-span-2 bg-white rounded-xl
                        border-[0.5px] border-border
                        overflow-hidden"
        >
          {isLoading ? (
            <div className="p-8 text-center">
              <div
                className="w-5 h-5 border-2 border-primary
                              border-t-transparent rounded-full
                              animate-spin mx-auto"
              />
            </div>
          ) : categories.length === 0 ? (
            <EmptyState
              message="Kategoriyalar yo'q"
              description="Birinchi kategoriyani qo'shing"
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
                <tr
                  className="border-b border-border/50
                               bg-gray-50/80"
                >
                  <th
                    className="px-4 py-3 text-left text-xs
                                 font-medium text-muted-foreground"
                  >
                    Kategoriya
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs
                                 font-medium text-muted-foreground
                                 w-24"
                  >
                    Mahsulotlar
                  </th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>{roots.map((cat) => renderRow(cat, 0))}</tbody>
            </table>
          )}
        </div>

        {/* RIGHT: Form card */}
        {showForm && (
          <div
            className="bg-white rounded-xl border-[0.5px]
                          border-border p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                {editTarget ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}
              </h2>
              <button
                onClick={resetForm}
                className="text-muted-foreground
                           hover:text-gray-700 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit((data: CategoryForm) => saveMutation.mutate(data))} className="space-y-3">
              <div>
                <Label className="text-xs mb-1.5 block">Nomi (Korean) *</Label>
                <Input
                  {...register('nameKo')}
                  placeholder="Toner, Moisturizer..."
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
                {errors.nameKo && <p className="text-xs text-red-500 mt-1">{errors.nameKo.message}</p>}
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Nomi (O'zbek)</Label>
                <Input
                  {...register('nameUz')}
                  placeholder="Tonik, Namlovchi..."
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Asosiy kategoriya</Label>
                <Controller
                  name="parentId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || '_none'}
                      onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                    >
                      <SelectTrigger
                        className="h-9 text-sm
                                                rounded-lg
                                                border-[0.5px]"
                      >
                        <SelectValue placeholder="Asosiy (root)" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="_none">Asosiy kategoriya (root)</SelectItem>
                        {roots
                          .filter((c) => c.id !== editTarget?.id)
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nameKo}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Tartib raqami</Label>
                <Input
                  {...register('sortOrder')}
                  type="number"
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Kichik raqam = yuqorida ko'rinadi
                </p>
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
                <Button type="submit" size="sm" disabled={saveMutation.isPending} className="flex-1 rounded-lg">
                  {saveMutation.isPending
                    ? 'Saqlanmoqda...'
                    : editTarget
                    ? 'Saqlash'
                    : 'Yaratish'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Show hint when form closed */}
        {!showForm && (
          <div
            className="hidden lg:flex bg-gray-50
                          rounded-xl border-[0.5px] border-border
                          border-dashed items-center justify-center
                          p-8 text-center"
          >
            <div>
              <FolderOpen className="h-8 w-8 text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">Kategoriya tanlang yoki yangi yarating</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Kategoriyani o'chirish"
        description={`"${deleteTarget?.nameKo}" kategoriyasini 
        o'chirishni tasdiqlaysizmi?`}
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
