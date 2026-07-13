import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Truck, Plus, Pencil, Trash2, Phone, Mail, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { suppliersApi } from '../../api/suppliers.api'
import { QK } from '../../constants/query-keys'
import { formatDate } from '../../utils/date'
import { getErrorMessage } from '../../lib/errors'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { EmptyState } from '../../components/shared/EmptyState'
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
import { usePermission } from '../../hooks/usePermission'

const COUNTRIES = [
  { value: 'KR', label: '🇰🇷 Janubiy Koreya' },
  { value: 'UZ', label: "🇺🇿 O'zbekiston" },
  { value: 'CN', label: '🇨🇳 Xitoy' },
  { value: 'JP', label: '🇯🇵 Yaponiya' },
  { value: 'OTHER', label: '🌍 Boshqa' },
]

const supplierSchema = z.object({
  name: z.string().min(1, 'Nom talab qilinadi'),
  contactName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Noto'g'ri email").optional().nullable().or(z.literal('')),
  country: z.string().default('KR'),
  address: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})
type SupplierForm = z.infer<typeof supplierSchema>

export function YetkazuvchilarPage() {
  const qc = useQueryClient()
  const { hasPermission } = usePermission()

  if (!hasPermission('suppliers', 'read')) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Bu sahifaga kirish ruxsati yo'q</p>
      </div>
    )
  }

  const [editTarget, setEditTarget] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: suppliersData, isLoading } = useQuery({
    queryKey: QK.SUPPLIERS(),
    queryFn: suppliersApi.list,
  })
  const suppliers = (suppliersData as any[]) ?? []

  const { data: supplierBatches = [] } = useQuery({
    queryKey: ['supplier-batches', expanded],
    queryFn: () => suppliersApi.getBatches(expanded!),
    enabled: !!expanded,
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { country: 'KR' },
  })

  const saveMutation = useMutation({
    mutationFn: (data: SupplierForm) =>
      editTarget ? suppliersApi.update(editTarget.id, data) : suppliersApi.create(data),
    onSuccess: () => {
      qc.removeQueries()
      toast.success(editTarget ? 'Yetkazuvchi yangilandi' : "Yetkazuvchi qo'shildi")
      resetForm()
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => suppliersApi.delete(id),
    onSuccess: () => {
      qc.removeQueries()
      toast.success("Yetkazuvchi o'chirildi")
      setDeleteTarget(null)
    },
  })

  const resetForm = () => {
    reset({
      country: 'KR',
      name: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',
      paymentTerms: '',
      notes: '',
    })
    setEditTarget(null)
    setShowForm(false)
  }

  const handleEdit = (s: any) => {
    setEditTarget(s)
    reset({
      name: s.name,
      contactName: s.contactName ?? '',
      phone: s.phone ?? '',
      email: s.email ?? '',
      country: s.country ?? 'KR',
      address: s.address ?? '',
      paymentTerms: s.paymentTerms ?? '',
      notes: s.notes ?? '',
    })
    setShowForm(true)
  }

  const getCountryLabel = (code: string) => COUNTRIES.find((c) => c.value === code)?.label ?? code

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Yetkazuvchilar</h1>
          <p className="text-sm text-muted-foreground">{suppliers.length} ta yetkazuvchi</p>
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
          <span className="hidden sm:inline">Yangi yetkazuvchi</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: Suppliers list */}
        <div className="lg:col-span-2 bg-white rounded-xl border-[0.5px] border-border overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : suppliers.length === 0 ? (
            <EmptyState
              message="Yetkazuvchilar yo'q"
              description="Birinchi yetkazuvchini qo'shing"
              action={
                <Button size="sm" onClick={() => setShowForm(true)} className="rounded-lg gap-2">
                  <Plus className="h-4 w-4" />
                  Qo'shish
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-border/30">
              {suppliers.map((s: any) => (
                <div key={s.id}>
                  <div className="flex items-center gap-3 px-5 py-4 group hover:bg-gray-50/60 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <Truck className="h-5 w-5 text-blue-600" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          {getCountryLabel(s.country ?? 'KR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {s.contactName && (
                          <span className="text-[11px] text-muted-foreground">{s.contactName}</span>
                        )}
                        {s.phone && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5" />
                            {s.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                        title="Tarix ko'rish"
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors"
                      >
                        <ChevronDown
                          className={cn(
                            'h-3.5 w-3.5 transition-transform',
                            expanded === s.id && 'rotate-180'
                          )}
                          strokeWidth={1.5}
                        />
                      </button>
                      <button
                        onClick={() => handleEdit(s)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-50 text-blue-600 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                  {expanded === s.id && (
                    <div className="px-5 pb-4 bg-gray-50/50 border-t border-border/30">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide pt-3 mb-2">
                        Ta'minot tarixi
                      </p>
                      {supplierBatches.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">Hali ta'minot yo'q</p>
                      ) : (
                        <div className="space-y-1.5">
                          {supplierBatches.slice(0, 5).map((b: any) => (
                            <div key={b.id} className="flex justify-between text-xs text-gray-700">
                              <span>
                                {b.productName} — {b.quantity} ta
                              </span>
                              <span className="text-muted-foreground">
                                {formatDate(b.createdAt)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Form */}
        <div className="lg:col-span-1">
          {showForm ? (
            <div className="bg-white rounded-xl border-[0.5px] border-border p-5 sticky top-20 max-h-[calc(100vh-100px)] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">
                  {editTarget ? 'Yetkazuvchini tahrirlash' : 'Yangi yetkazuvchi'}
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
                  <Label className="text-xs mb-1.5 block">Kompaniya nomi *</Label>
                  <Input
                    {...register('name')}
                    placeholder="COSRX Co., Ltd."
                    className="h-9 text-sm rounded-lg border-[0.5px]"
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 mt-1">{errors.name.message as string}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Davlat</Label>
                  <Controller
                    name="country"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-9 text-sm rounded-lg border-[0.5px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Mas'ul shaxs</Label>
                  <Input
                    {...register('contactName')}
                    placeholder="Kim Minji"
                    className="h-9 text-sm rounded-lg border-[0.5px]"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label className="text-xs mb-1.5 block">Telefon</Label>
                    <Input
                      {...register('phone')}
                      placeholder="+82 10-xxxx-xxxx"
                      className="h-9 text-sm rounded-lg border-[0.5px]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Email</Label>
                    <Input
                      {...register('email')}
                      type="email"
                      placeholder="supplier@cosrx.com"
                      className="h-9 text-sm rounded-lg border-[0.5px]"
                    />
                    {errors.email && (
                      <p className="text-xs text-red-500 mt-1">{errors.email.message as string}</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">To'lov shartlari</Label>
                  <Input
                    {...register('paymentTerms')}
                    placeholder="Net 30, 100% prepayment..."
                    className="h-9 text-sm rounded-lg border-[0.5px]"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Izoh</Label>
                  <textarea
                    {...register('notes')}
                    rows={2}
                    placeholder="Qo'shimcha ma'lumot..."
                    className="w-full rounded-lg border-[0.5px] border-border p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
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
                <Truck className="h-8 w-8 text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">
                  Yetkazuvchi tanlang yoki yangi qo'shing
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Yetkazuvchini o'chirish"
        description={`"${deleteTarget?.name}" o'chiriladi.`}
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
