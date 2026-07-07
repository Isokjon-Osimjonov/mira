import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sparkles, Loader2 } from 'lucide-react'
import { productsApi } from '../../api/products.api'
import { categoriesApi } from '../../api/categories.api'
import { getErrorMessage } from '../../lib/errors'
import { ImageUploadField } from '../../components/shared/ImageUploadField'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleSwitch } from '../../components/ui/ToggleSwitch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const SKIN_TYPES = [
  { value: 'yog\'li', label: 'Yog\'li teri' },
  { value: 'quruq', label: 'Quruq teri' },
  { value: 'aralash', label: 'Aralash teri' },
  { value: 'sezgir', label: 'Sezgir teri' },
  { value: 'normal', label: 'Normal teri' },
  { value: 'barchasi', label: 'Barcha teri turlari' },
]

const SKIN_TYPE_MAP: Record<string, string> = {
  'oily': 'yog\'li',
  'dry': 'quruq',
  'combination': 'aralash',
  'sensitive': 'sezgir',
  'normal': 'normal',
  'all': 'barchasi',
  // Already Uzbek — pass through
  'yog\'li': 'yog\'li',
  'quruq': 'quruq',
  'aralash': 'aralash',
  'sezgir': 'sezgir',
  'barchasi': 'barchasi',
}

// Zod schema matching real DB fields
const productSchema = z.object({
  name: z.string().min(1, 'Mahsulot nomi talab qilinadi'),
  nameUz: z.string().optional(),
  barcode: z.string().min(1, 'Barcode talab qilinadi'),
  sku: z.string().min(1, 'SKU talab qilinadi'),
  brandName: z.string().min(1, 'Brend kiritish shart'),
  categoryId: z.string().uuid('Kategoriya tanlang'),
  descriptionUz: z.string().optional(),
  howToUseUz: z.string().optional(),
  ingredients: z.string().optional(),
  skinTypes: z.array(z.string()).default([]),
  benefits: z.string().optional(),
  weightGrams: z.coerce.number().min(0).default(0),
  volumeMl: z.coerce.number().min(0).optional(),
  isActive: z.boolean().default(true),
  isNew: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  imageUrls: z.array(z.string()).default([]),
  // Regional configs (flattened in form, all optional).
  // Only KOR pricing is now manually managed.
  korRetailPrice: z.coerce.number().min(0).optional(),
  korWholesalePrice: z.coerce.number().min(0).optional(),
  uzbRetailPrice: z.coerce.number().min(0).optional(),
  uzbWholesalePrice: z.coerce.number().min(0).optional(),
  minOrderQty: z.coerce.number().min(1).default(1),
  minWholesaleQty: z.coerce.number().min(1).default(5),
})

type ProductForm = z.infer<typeof productSchema>

interface Props {
  open: boolean
  onClose: () => void
  product?: any // null = create, object = edit
  categories: any[]
  onSuccess: () => void
}

export function ProductSheet({ open, onClose, product, categories, onSuccess }: Props) {
  const isEdit = !!product
  const [aiFilling, setAiFilling] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: '',
      barcode: '',
      brandName: '',
      isActive: true,
      isNew: false,
      isFeatured: false,
      imageUrls: [],
      skinTypes: [],
      minOrderQty: 1,
      minWholesaleQty: 5,
    },
  })

  const imageUrls = watch('imageUrls')

  // Populate form when editing
  useEffect(() => {
    if (product) {
      const kor =
        product.korRegionalConfig ??
        product.regionalConfigs?.find?.((c: any) => c.regionCode === 'KOR') ??
        (product.regionalConfig?.regionCode === 'KOR' ? product.regionalConfig : null) ??
        product.regionalConfig ??
        null

      const uzb =
        product.uzbRegionalConfig ??
        product.regionalConfigs?.find?.((c: any) => c.regionCode === 'UZB') ??
        (product.regionalConfig?.regionCode === 'UZB' ? product.regionalConfig : null) ??
        null

      reset({
        name: product.name ?? '',
        nameUz: product.nameUz ?? '',
        barcode: product.barcode ?? '',
        sku: product.sku ?? '',
        brandName: product.brandName ?? '',
        categoryId: product.categoryId ?? '',
        descriptionUz: product.descriptionUz ?? '',
        howToUseUz: product.howToUseUz ?? '',
        ingredients: Array.isArray(product.ingredients) ? product.ingredients.join(', ') : '',
        skinTypes: Array.isArray(product.skinTypes)
          ? product.skinTypes
              .map((t: string) => SKIN_TYPE_MAP[t.toLowerCase().trim()] || t)
              .filter(Boolean)
          : [],
        benefits: Array.isArray(product.benefits) ? product.benefits.join(', ') : '',
        weightGrams: product.weightGrams ?? 0,
        volumeMl: product.volumeMl ?? undefined,
        isActive: product.isActive ?? true,
        isNew: product.isNew ?? false,
        isFeatured: product.isFeatured ?? false,
        imageUrls: product.imageUrls ?? [],
        korRetailPrice: kor?.retailPriceKrw ?? kor?.retailPrice ?? undefined,
        korWholesalePrice: kor?.wholesalePriceKrw ?? kor?.wholesalePrice ?? undefined,
        uzbRetailPrice: uzb?.retailPriceKrw ?? uzb?.retailPrice ?? undefined,
        uzbWholesalePrice: uzb?.wholesalePriceKrw ?? uzb?.wholesalePrice ?? undefined,
        minOrderQty: kor?.minOrderQty ?? uzb?.minOrderQty ?? 1,
        minWholesaleQty: kor?.minWholesaleQty ?? uzb?.minWholesaleQty ?? 5,
      })
    } else {
      reset({
        name: '',
        barcode: '',
        sku: '',
        brandName: '',
        isActive: true,
        isNew: false,
        isFeatured: false,
        imageUrls: [],
        skinTypes: [],
        minOrderQty: 1,
        minWholesaleQty: 5,
      })
    }
  }, [product, reset])

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: (data: ProductForm) => {
      const cleanPrice = (v: number | undefined) => (typeof v === 'number' && v > 0 ? v : undefined)

      const apiPayload = {
        ...data,
        korRetailPrice: cleanPrice(data.korRetailPrice),
        korWholesalePrice: cleanPrice(data.korWholesalePrice),
        uzbRetailPrice: cleanPrice(data.uzbRetailPrice),
        uzbWholesalePrice: cleanPrice(data.uzbWholesalePrice),
        ingredients: data.ingredients
          ? data.ingredients
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        skinTypes: data.skinTypes || [],
        benefits: data.benefits
          ? data.benefits
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      }
      return isEdit ? productsApi.update(product.id, apiPayload) : productsApi.create(apiPayload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Mahsulot yangilandi' : 'Mahsulot yaratildi')
      onSuccess()
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err?.errorCode ?? ''))
    },
  })

  // AI Fill handler
  const handleAiFill = async () => {
    const formValues = watch()
    const productName = formValues.name?.trim()
    const barcode = formValues.barcode?.trim()
    const imageUrl = formValues.imageUrls?.[0]

    if (!productName && !barcode && !imageUrl) {
      toast.error('AI uchun mahsulot nomi, barcode yoki rasm kiriting')
      return
    }

    setAiFilling(true)
    try {
      const res = await productsApi.aiFill({
        productId: product?.id,
        productName,
        barcode,
        imageUrl,
      })
      const filled = res.data
      if (!filled) {
        toast.error("AI ma'lumot topa olmadi")
        return
      }

      // Map AI response to form fields
      if (filled.name && !formValues.name) setValue('name', filled.name)
      if (filled.brandName && !formValues.brandName) setValue('brandName', filled.brandName)
      if (filled.descriptionUz) setValue('descriptionUz', filled.descriptionUz)
      if (filled.howToUseUz) setValue('howToUseUz', filled.howToUseUz)

      if (Array.isArray(filled.ingredients)) {
        setValue('ingredients', filled.ingredients.join(', '))
      }
      if (Array.isArray(filled.skinTypes)) {
        const mapped = filled.skinTypes
          .map((t: string) => SKIN_TYPE_MAP[t.toLowerCase().trim()])
          .filter(Boolean)
          .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i) // dedupe
        setValue('skinTypes', mapped)
      }
      if (Array.isArray(filled.benefits)) {
        setValue('benefits', filled.benefits.join(', '))
      }

      if (filled.weightGrams) setValue('weightGrams', filled.weightGrams)
      if (filled.volumeMl) setValue('volumeMl', filled.volumeMl)

      toast.success("AI ma'lumotlarni to'ldirdi ✨")
    } catch (err: any) {
      const code = err?.errorCode ?? ''
      toast.error(
        code === 'AI_GENERATION_FAILED'
          ? 'AI kontent yarata olmadi. Qayta urining'
          : 'AI xatolik yuz berdi'
      )
    } finally {
      setAiFilling(false)
    }
  }

  const onSubmit = handleSubmit((data: ProductForm) => saveMutation.mutate(data))

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto flex flex-col">
        <SheetHeader className="pb-4 border-b border-border/50 flex flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-base font-semibold">
            {isEdit ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
          </SheetTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={aiFilling}
            onClick={handleAiFill}
            className="rounded-lg gap-1.5 h-8 border-[0.5px] text-xs"
          >
            {aiFilling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-violet-600" />
            )}
            {aiFilling ? "To'ldirilmoqda..." : "AI bilan to'ldirish"}
          </Button>
        </SheetHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-6 flex-1 py-4">
          {/* SECTION 1: Asosiy ma'lumotlar */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Asosiy ma'lumotlar
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs mb-1.5 block">Mahsulot nomi (Korean/Asosiy) *</Label>
                <Input
                  {...register('name')}
                  placeholder="COSRX AHA/BHA Clarifying Toner"
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs mb-1.5 block">Mahsulot nomi (O'zbekcha)</Label>
                <Input
                  {...register('nameUz')}
                  placeholder="COSRX tozalovchi toner"
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Barcode *</Label>
                <Input
                  {...register('barcode')}
                  placeholder="8806185782754"
                  className="h-9 text-sm rounded-lg border-[0.5px] font-mono"
                />
                {errors.barcode && (
                  <p className="text-xs text-red-500 mt-1">{errors.barcode.message}</p>
                )}
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">SKU *</Label>
                <Input
                  {...register('sku')}
                  placeholder="COSRX-001"
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
                {errors.sku && <p className="text-xs text-red-500 mt-1">{errors.sku.message}</p>}
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Brend *</Label>
                <Input
                  {...register('brandName')}
                  placeholder="COSRX, Laneige..."
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
                {errors.brandName && (
                  <p className="text-xs text-red-500 mt-1">{errors.brandName.message}</p>
                )}
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Kategoriya *</Label>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || '_none'}
                      onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                    >
                      <SelectTrigger className="h-9 text-sm rounded-lg border-[0.5px]">
                        <SelectValue placeholder="Kategoriya tanlang" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl max-h-56">
                        <SelectItem value="_none">Tanlanmagan</SelectItem>
                        {categories.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {'  '.repeat(c.depth)}
                            {c.name ?? c.nameKo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.categoryId && (
                  <p className="text-xs text-red-500 mt-1">{errors.categoryId.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: Tavsif va tafsilotlar */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Tavsif va tafsilotlar
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs mb-1.5 block">Tavsif (O'zbekcha)</Label>
                <textarea
                  {...register('descriptionUz')}
                  rows={3}
                  placeholder="Mahsulot haqida qisqacha ma'lumot..."
                  className="w-full rounded-lg border-[0.5px] border-border p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs mb-1.5 block">Qo'llash usuli (O'zbekcha)</Label>
                <textarea
                  {...register('howToUseUz')}
                  rows={2}
                  placeholder="Paxta bilan yuzga surting..."
                  className="w-full rounded-lg border-[0.5px] border-border p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Og'irligi (gramm)</Label>
                <Input
                  {...register('weightGrams')}
                  type="number"
                  placeholder="150"
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Hajmi (ml)</Label>
                <Input
                  {...register('volumeMl')}
                  type="number"
                  placeholder="100"
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs mb-1.5 block">Tarkibi (inglizcha, vergul bilan)</Label>
                <textarea
                  {...register('ingredients')}
                  rows={2}
                  placeholder="Water, Glycerin, Niacinamide..."
                  className="w-full rounded-lg border-[0.5px] border-border p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <Label className="text-xs mb-1.5 block">Teri turlari</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SKIN_TYPES.map(type => {
                    const current = watch('skinTypes') ?? []
                    const isSelected = current.includes(type.value)
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setValue('skinTypes',
                              current.filter((v: string) => v !== type.value),
                              { shouldValidate: true, shouldDirty: true })
                          } else {
                            setValue('skinTypes',
                              [...current, type.value],
                              { shouldValidate: true, shouldDirty: true })
                          }
                        }}
                        className={cn(
                          "flex items-center gap-2",
                          "px-3 py-2 rounded-lg border",
                          "text-sm text-left",
                          "transition-all duration-150",
                          isSelected
                            ? "border-violet-500 bg-violet-50 text-violet-700 font-medium"
                            : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                        )}>
                        <div className={cn(
                          "w-4 h-4 rounded border-2",
                          "flex items-center justify-center",
                          "flex-shrink-0 transition-colors",
                          isSelected
                            ? "border-violet-500 bg-violet-500"
                            : "border-gray-300"
                        )}>
                          {isSelected && (
                            <svg
                              width="10" height="10"
                              viewBox="0 0 10 10"
                              fill="none">
                              <path
                                d="M2 5l2.5 2.5L8 3"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        {type.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs mb-1.5 block">Foydali xususiyatlari (vergul bilan)</Label>
                <textarea
                  {...register('benefits')}
                  rows={2}
                  placeholder="Namlaydi, Yoshartiradi..."
                  className="w-full rounded-lg border-[0.5px] border-border p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Narxlar va Miqdorlar */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Narxlar va Miqdorlar (KRW)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block">KOR Retail narx (₩) *</Label>
                <Input
                  {...register('korRetailPrice')}
                  type="number"
                  placeholder="15000"
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">KOR Wholesale narx (₩) *</Label>
                <Input
                  {...register('korWholesalePrice')}
                  type="number"
                  placeholder="12000"
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Minimal order (Retail)</Label>
                <Input
                  {...register('minOrderQty')}
                  type="number"
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Wholesale min miqdor</Label>
                <Input
                  {...register('minWholesaleQty')}
                  type="number"
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3.5: Narxlar va Miqdorlar (UZB) */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              Narxlar va Miqdorlar (UZB) 🇺🇿
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block">UZB Retail narx (₩) *</Label>
                <Input
                  {...register('uzbRetailPrice')}
                  type="number"
                  placeholder="12000"
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">UZB Wholesale narx (₩) *</Label>
                <Input
                  {...register('uzbWholesalePrice')}
                  type="number"
                  placeholder="10000"
                  className="h-9 text-sm rounded-lg border-[0.5px]"
                />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">
                UZB narx = KRW × valyuta kursi (har kuni yangilanadi)
              </p>
              <p className="text-[11px] text-muted-foreground">
                Bo'sh qoldirsangiz mahsulot UZB uchun mavjud bo'lmaydi
              </p>
            </div>
          </div>

          {/* SECTION 4: Rasmlar */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Rasmlar
            </p>

            <ImageUploadField
              mode="multi"
              value={watch('imageUrls') || []}
              onChange={(urls) =>
                setValue('imageUrls', urls as string[], {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              uploadFn={productsApi.uploadImage}
              disabled={saveMutation.isPending}
            />
          </div>

          {/* SECTION 5: Sozlamalar */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Sozlamalar
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border-[0.5px] border-border bg-gray-50/30">
                <div>
                  <p className="text-sm font-medium text-gray-900">Aktiv mahsulot</p>
                  <p className="text-xs text-muted-foreground">
                    Mijozlar ushbu mahsulotni ko'ra oladilar
                  </p>
                </div>
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <ToggleSwitch checked={field.value} onChange={field.onChange} />
                  )}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border-[0.5px] border-border bg-gray-50/30">
                <div>
                  <p className="text-sm font-medium text-gray-900">Yangi mahsulot</p>
                  <p className="text-xs text-muted-foreground">
                    "Yangi" belgisi bilan ko'rsatiladi
                  </p>
                </div>
                <Controller
                  name="isNew"
                  control={control}
                  render={({ field }) => (
                    <ToggleSwitch checked={field.value} onChange={field.onChange} />
                  )}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border-[0.5px] border-border bg-gray-50/30">
                <div>
                  <p className="text-sm font-medium text-gray-900">Featured (Bosh sahifa)</p>
                  <p className="text-xs text-muted-foreground">Bosh sahifada ko'rsatiladi</p>
                </div>
                <Controller
                  name="isFeatured"
                  control={control}
                  render={({ field }) => (
                    <ToggleSwitch checked={field.value} onChange={field.onChange} />
                  )}
                />
              </div>
            </div>
          </div>
        </form>

        <SheetFooter className="pt-4 border-t border-border/50 gap-2 flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-lg border-[0.5px]"
          >
            Bekor qilish
          </Button>
          <Button
            onClick={onSubmit}
            disabled={saveMutation.isPending}
            className="flex-1 rounded-lg"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saqlanmoqda...
              </>
            ) : isEdit ? (
              'Saqlash'
            ) : (
              'Yaratish'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
