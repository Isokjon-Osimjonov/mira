import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { bannersApi } from '../../api/banners.api'
import { ImageUploadField } from '../../components/shared/ImageUploadField'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  title: z.string().nullable().optional(),
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
        title: banner.title || '',
        imageUrl: banner.imageUrl || '',
        linkType: banner.linkType || 'none',
        linkValue: banner.linkValue || '',
        regionCode: banner.regionCode || null,
      })
    } else {
      reset({
        title: '',
        imageUrl: '',
        linkType: 'none',
        isActive: true,
        sortOrder: 0,
        regionCode: null,
      })
    }
  }, [banner, reset, open])

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
      toast.error("Formada xatoliklar mavjud. Iltimos tekshiring.")
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
            <Label>Sarlavha</Label>
            <Input {...register('title')} placeholder="Banner sarlavhasi (ixtiyoriy)" />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Rasm <span className="text-red-500">*</span></Label>
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
            <p className="text-xs text-muted-foreground">Tavsiya etilgan o'lcham: 1200×525px (16:7), max 5MB, JPG/PNG/WebP</p>
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

          {linkType !== 'none' && (
            <div className="space-y-2">
              <Label>Havola qiymati</Label>
              <Input 
                {...register('linkValue')} 
                placeholder={
                  linkType === 'product' ? 'Mahsulot ID' :
                  linkType === 'category' ? 'Kategoriya ID' :
                  'https://...'
                }
              />
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
              {mutation.isPending ? 'Saqlanmoqda...' : (isEdit ? 'Saqlash' : 'Yaratish')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
