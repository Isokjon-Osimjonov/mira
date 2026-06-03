import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload, X, Loader2, Sparkles, Link as LinkIcon } from 'lucide-react'
import { productsApi } from '../../api/products.api'
import { getErrorMessage } from '../../lib/errors'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

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
  skinTypes: z.string().optional(),
  benefits: z.string().optional(),
  weightGrams: z.coerce.number().min(0).default(0),
  volumeMl: z.coerce.number().min(0).optional(),
  isActive: z.boolean().default(true),
  imageUrls: z.array(z.string()).default([]),
  // Regional configs (flattened in form)
  korRetailPrice: z.coerce.number().min(0).optional(),
  korWholesalePrice: z.coerce.number().min(0).optional(),
  minOrderQty: z.coerce.number().min(1).default(1),
  minWholesaleQty: z.coerce.number().min(5).default(5),
})

type ProductForm = z.infer<typeof productSchema>

interface Props {
  open: boolean
  onClose: () => void
  product?: any // null = create, object = edit
  categories: any[]
  brands: any[]
  onSuccess: () => void
}

export function ProductSheet({ open, onClose, product, categories, brands, onSuccess }: Props) {
  const isEdit = !!product
  const [uploadingImg, setUploadingImg] = useState(false)
  const [aiFilling, setAiFilling] = useState(false)
  const [imgMode, setImgMode] = useState<'upload' | 'url'>('upload')
  const [urlInput, setUrlInput] = useState('')

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
      imageUrls: [],
      minOrderQty: 1,
      minWholesaleQty: 5,
    },
  })

  const imageUrls = watch('imageUrls')

  // Populate form when editing
  useEffect(() => {
    if (product) {
      reset({
        name: product.name ?? '',
        barcode: product.barcode ?? '',
        sku: product.sku ?? '',
        brandName: product.brandName ?? '',
        categoryId: product.categoryId ?? '',
        descriptionUz: product.descriptionUz ?? '',
        howToUseUz: product.howToUseUz ?? '',
        ingredients: Array.isArray(product.ingredients) ? product.ingredients.join(', ') : '',
        skinTypes: Array.isArray(product.skinTypes) ? product.skinTypes.join(', ') : '',
        benefits: Array.isArray(product.benefits) ? product.benefits.join(', ') : '',
        weightGrams: product.weightGrams ?? 0,
        volumeMl: product.volumeMl ?? undefined,
        isActive: product.isActive ?? true,
        imageUrls: product.imageUrls ?? [],
        korRetailPrice: product.regionalConfig?.retailPriceKrw ?? undefined,
        korWholesalePrice: product.regionalConfig?.wholesalePriceKrw ?? undefined,
        minOrderQty: product.regionalConfig?.minOrderQty ?? 1,
        minWholesaleQty: product.regionalConfig?.minWholesaleQty ?? 5,
      })
    } else {
      reset({
        name: '',
        barcode: '',
        sku: '',
        brandName: '',
        isActive: true,
        imageUrls: [],
        minOrderQty: 1,
        minWholesaleQty: 5,
      })
    }
  }, [product, reset])

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: (data: ProductForm) => {
      const apiPayload = {
        ...data,
        ingredients: data.ingredients
          ? data.ingredients.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        skinTypes: data.skinTypes
          ? data.skinTypes.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        benefits: data.benefits
          ? data.benefits.split(',').map((s) => s.trim()).filter(Boolean)
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
        setValue('skinTypes', filled.skinTypes.join(', '))
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

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploadingImg(true)
    try {
      const urls = await Promise.all(files.map((f) => productsApi.uploadImage(f)))
      const current = watch('imageUrls') || []
      setValue('imageUrls', [...current, ...urls], {
        shouldDirty: true,
        shouldValidate: true,
      })
      toast.success(`${urls.length} ta rasm yuklandi`)
    } catch (err) {
      console.error('Upload error:', err)
      toast.error('Rasm yuklashda xatolik')
    } finally {
      setUploadingImg(false)
      e.target.value = ''
    }
  }

  const removeImage = (url: string) => {
    setValue(
      'imageUrls',
      (imageUrls || []).filter((u) => u !== url),
      { shouldDirty: true, shouldValidate: true }
    )
  }

  const onSubmit = handleSubmit((data: ProductForm) => saveMutation.mutate(data))

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto flex flex-col"
      >
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
                <Controller
                  name="brandName"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9 text-sm rounded-lg border-[0.5px]">
                        <SelectValue placeholder="Brend tanlang" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl max-h-56">
                        {brands.map((b: string) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
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
                            {c.nameUz ?? c.name}
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

              <div className="sm:col-span-2">
                <Label className="text-xs mb-1.5 block">Teri turlari (vergul bilan)</Label>
                <textarea
                  {...register('skinTypes')}
                  rows={1}
                  placeholder="oily, dry, combination..."
                  className="w-full rounded-lg border-[0.5px] border-border p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
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

          {/* SECTION 4: Rasmlar */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Rasmlar
            </p>

            {/* Image previews */}
            {imageUrls && imageUrls.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {imageUrls.map((url, i) => (
                  <div key={`${url}-${i}`} className="relative group">
                    <img
                      src={url}
                      alt={`img-${i}`}
                      className="w-16 h-16 rounded-lg object-cover border-[0.5px] border-border"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src =
                          'https://placehold.co/64?text=Error'
                      }}
                    />
                    {i === 0 && (
                      <span className="absolute bottom-0 left-0 right-0 text-[9px] text-center bg-primary/80 text-white rounded-b-lg py-0.5">
                        Asosiy
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tab switcher */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setImgMode('upload')}
                className={cn(
                  'flex-1 text-[11px] py-1 rounded-md transition-all font-medium',
                  imgMode === 'upload' ? 'bg-white shadow-sm text-gray-900' : 'text-muted-foreground'
                )}
              >
                <Upload className="h-3 w-3 inline mr-1" />
                Yuklash
              </button>
              <button
                type="button"
                onClick={() => setImgMode('url')}
                className={cn(
                  'flex-1 text-[11px] py-1 rounded-md transition-all font-medium',
                  imgMode === 'url' ? 'bg-white shadow-sm text-gray-900' : 'text-muted-foreground'
                )}
              >
                <LinkIcon className="h-3 w-3 inline mr-1" />
                URL orqali
              </button>
            </div>

            {imgMode === 'upload' ? (
              <label
                className={cn(
                  'flex items-center gap-2 px-4 py-3 rounded-lg border-[0.5px] border-dashed border-border text-sm text-muted-foreground cursor-pointer hover:border-primary hover:text-primary transition-colors',
                  uploadingImg && 'opacity-50 pointer-events-none'
                )}
              >
                {uploadingImg ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" strokeWidth={1.5} />
                )}
                {uploadingImg ? 'Yuklanmoqda...' : "Rasmlarni yuklash (ko'p tanlash mumkin)"}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImg}
                />
              </label>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="h-9 text-sm rounded-lg border-[0.5px] flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (!urlInput.trim()) return
                    const current = watch('imageUrls') || []
                    setValue('imageUrls', [...current, urlInput.trim()], {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                    setUrlInput('')
                    toast.success("Rasm qo'shildi")
                  }}
                  className="h-9 rounded-lg px-3 text-xs"
                >
                  Qo'shish
                </Button>
              </div>
            )}
          </div>

          {/* SECTION 5: Sozlamalar */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Sozlamalar
            </p>
            <div className="flex items-center justify-between p-3 rounded-lg border-[0.5px] border-border bg-gray-50/30">
              <div>
                <p className="text-sm font-medium text-gray-900">Aktiv mahsulot</p>
                <p className="text-xs text-muted-foreground">Mijozlar ushbu mahsulotni ko'ra oladilar</p>
              </div>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
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
            disabled={saveMutation.isPending || uploadingImg}
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
