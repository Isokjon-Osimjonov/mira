import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search } from 'lucide-react'
import { bannersApi } from '../../api/banners.api'
import { productsApi } from '../../api/products.api'
import { categoriesApi } from '../../api/categories.api'
import { ImageUploadField } from '../../components/shared/ImageUploadField'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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

const bannerSchema = z.object({
  imageUrl: z.string().min(1, 'Rasm talab qilinadi'),
  linkType: z.enum(['none', 'product', 'category', 'external', 'wholesale']).default('none'),
  linkValue: z.string().nullable().optional(),
  regionCode: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().default(0),
})

type BannerForm = z.infer<typeof bannerSchema>

interface Props {
  open: boolean
  onClose: () => void
  banner?: any
  onSuccess: () => void
}

export function BannerSheet({ open, onClose, banner, onSuccess }: Props) {
  const qc = useQueryClient()
  const isEdit = !!banner

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BannerForm>({
    resolver: zodResolver(bannerSchema) as any,
    defaultValues: {
      imageUrl: '',
      linkType: 'none',
      isActive: true,
      sortOrder: 0,
      regionCode: null,
    },
  })

  useEffect(() => {
    if (banner) {
      reset({
        ...banner,
        imageUrl: banner.imageUrl || '',
        linkType: banner.linkType || 'none',
        linkValue: banner.linkValue || '',
        regionCode: banner.regionCode || null,
      })
    } else {
      reset({
        imageUrl: '',
        linkType: 'none',
        linkValue: '',
        isActive: true,
        sortOrder: 0,
        regionCode: null,
      })
    }
  }, [banner, reset, open])

  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState<any[]>([])

  useEffect(() => {
    if (banner?.linkType === 'product' && banner.linkValue) {
      productsApi
        .getById(banner.linkValue)
        .then((res) => {
          setProductSearch(res.data?.name || res.data?.nameKo || banner.linkValue)
        })
        .catch(() => {
          setProductSearch(banner.linkValue)
        })
    } else {
      setProductSearch('')
    }
  }, [banner, open])

  useEffect(() => {
    if (!productSearch || productSearch.length < 2) {
      setProductResults([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await productsApi.list({ q: productSearch, limit: 5 })
        setProductResults(res.data ?? [])
      } catch {
        /* ignore */
      }
    }, 300)
    return () => clearTimeout(t)
  }, [productSearch])

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getFlat,
  })

  const mutation = useMutation({
    mutationFn: (data: BannerForm) =>
      isEdit ? bannersApi.update(banner.id, data) : bannersApi.create(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Banner yangilandi' : 'Banner yaratildi')
      onSuccess()
      onClose()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Xatolik yuz berdi')
    },
  })

  const linkType = watch('linkType')

  const onSubmit = (data: BannerForm) => mutation.mutate(data)

  const onInvalid = (formErrors: any) => {
    const errorMessages = Object.values(formErrors)
      .map((err: any) => err.message)
      .filter(Boolean)
    if (errorMessages.length > 0) {
      toast.error(`Xatolik: ${errorMessages.join(', ')}`)
    } else {
      toast.error('Formada xatoliklar mavjud. Iltimos tekshiring.')
    }
    console.error('Form validation errors:', formErrors)
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Bannerni tahrirlash' : 'Yangi banner'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>
              Rasm <span className="text-red-500">*</span>
            </Label>
            <Controller
              control={control}
              name="imageUrl"
              render={({ field }) => (
                <ImageUploadField
                  mode="single"
                  value={field.value || ''}
                  onChange={(url) => field.onChange(url as string)}
                  uploadFn={bannersApi.uploadImage}
                />
              )}
            />
            {errors.imageUrl && <p className="text-xs text-red-500">{errors.imageUrl.message}</p>}
            <p className="text-xs text-muted-foreground">
              Tavsiya etilgan o'lcham: 1200×525px (16:7), max 5MB, JPG/PNG/WebP
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Havola turi</Label>
              <Controller
                control={control}
                name="linkType"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Yo'q</SelectItem>
                      <SelectItem value="product">Mahsulot</SelectItem>
                      <SelectItem value="category">Kategoriya</SelectItem>
                      <SelectItem value="external">Tashqi havola</SelectItem>
                      <SelectItem value="wholesale">Ulgurji (Bot)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Hudud</Label>
              <Controller
                control={control}
                name="regionCode"
                render={({ field }) => (
                  <Select
                    onValueChange={(v) => field.onChange(v === 'all' ? null : v)}
                    value={field.value || 'all'}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Hammasi</SelectItem>
                      <SelectItem value="KOR">Korea</SelectItem>
                      <SelectItem value="UZB">O'zbekiston</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {linkType === 'product' && (
            <div className="space-y-2">
              <Label>Mahsulot</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value)
                    if (!e.target.value) setValue('linkValue', '')
                  }}
                  placeholder="Mahsulot nomi bilan qidiring..."
                  className="pl-9 h-9"
                />
                {productResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {productResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-0"
                        onClick={() => {
                          setValue('linkValue', p.id)
                          setProductSearch(p.name || p.nameKo || 'Nomsiz')
                          setProductResults([])
                        }}
                      >
                        <div className="font-medium">{p.name || p.nameKo}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {linkType === 'category' && (
            <div className="space-y-2">
              <Label>Kategoriya</Label>
              <Controller
                control={control}
                name="linkValue"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategoriyani tanlang" />
                    </SelectTrigger>
                    <SelectContent>
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

          {linkType === 'external' && (
            <div className="space-y-2">
              <Label>Tashqi havola</Label>
              <Input {...register('linkValue')} placeholder="https://..." />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tartib</Label>
              <Input type="number" {...register('sortOrder')} />
            </div>
            <div className="flex flex-col justify-center gap-2">
              <Label>Aktiv</Label>
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <ToggleSwitch checked={field.value} onChange={field.onChange} />
                )}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending || isSubmitting}>
              {mutation.isPending ? 'Saqlanmoqda...' : isEdit ? 'Saqlash' : 'Yaratish'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
