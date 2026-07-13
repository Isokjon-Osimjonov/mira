import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { customersApi } from '../../api/customers.api'
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

const walkInSchema = z.object({
  firstName: z.string().min(1, 'Ism kiritish majburiy').max(100),
  lastName: z.string().max(100).optional(),
  phone: z.string().optional(),
  region: z.enum(['UZB', 'KOR']),
  note: z.string().max(500).optional(),
})

type WalkInForm = z.infer<typeof walkInSchema>

export function WalkInPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<WalkInForm>({
    resolver: zodResolver(walkInSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      region: 'UZB',
      note: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: WalkInForm) => customersApi.createWalkIn(data),
    onSuccess: (res) => {
      qc.removeQueries()
      toast.success('Mijoz yaratildi')
      navigate({
        to: '/customers/$id',
        params: { id: res.data.id },
      } as any)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Xatolik yuz berdi')
    },
  })

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/customers' } as any)}
          className="rounded-lg h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold text-gray-900">Yangi mijoz qo'shish</h1>
      </div>

      <form
        onSubmit={handleSubmit((data) => {
          const payload = {
            ...data,
            lastName: data.lastName?.trim() || undefined,
            phone: data.phone?.trim() || undefined,
            note: data.note?.trim() || undefined,
          }
          mutation.mutate(payload as any)
        })}
        className="bg-white rounded-xl border-[0.5px] border-border p-6 shadow-sm space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Ism *</Label>
            <Input {...register('firstName')} placeholder="Masalan: Bekzod" className="h-9" />
            {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Familiya (ixtiyoriy)</Label>
            <Input {...register('lastName')} placeholder="Masalan: Toshmatov" className="h-9" />
            {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Telefon raqam (ixtiyoriy)</Label>
            <Input {...register('phone')} placeholder="+998901234567" className="h-9" />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Hudud *</Label>
            <Controller
              name="region"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Hududni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UZB">🇺🇿 O'zbekiston (UZB)</SelectItem>
                    <SelectItem value="KOR">🇰🇷 Koreya (KOR)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Izoh (ixtiyoriy)</Label>
          <textarea
            {...register('note')}
            className="w-full min-h-[100px] rounded-lg border-[0.5px] border-border p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Mijoz haqida qo'shimcha ma'lumot..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-lg h-10"
            onClick={() => navigate({ to: '/customers' } as any)}
          >
            Bekor qilish
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 rounded-lg h-10 gap-2"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Yaratish
          </Button>
        </div>
      </form>
    </div>
  )
}
