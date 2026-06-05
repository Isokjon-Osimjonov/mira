import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  User, Mail, Shield, Clock,
  Key, Save, Eye, EyeOff, Check
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/auth.store'
import { formatDateTime } from '../../utils/date'
import { getErrorMessage } from '../../lib/errors'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const profileSchema = z.object({
  fullName: z.string().min(2, 'Ism kamida 2 ta belgi'),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Joriy parol talab qilinadi'),
  newPassword:     z.string().min(8, 'Kamida 8 ta belgi'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Parollar mos kelmaydi',
  path:    ['confirmPassword'],
})

export function ProfilePage() {
  const user    = useAuthStore(s => s.user)
  const setUser = useAuthStore(s => s.setUser)

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwSuccess,   setPwSuccess]   = useState(false)

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName ?? '',
    }
  })

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword:     '',
      confirmPassword: '',
    }
  })

  const profileMutation = useMutation({
    mutationFn: (data: any) => api.patch('/admin/auth/profile', data).then(r => r.data),
    onSuccess: (res) => {
      toast.success('Profil yangilandi')
      if (setUser && res.data) {
        setUser({ ...user, ...res.data } as any)
      }
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? ''))
  })

  const passwordMutation = useMutation({
    mutationFn: (data: any) => api.patch('/admin/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword:     data.newPassword,
      }).then(r => r.data),
    onSuccess: () => {
      toast.success('Parol muvaffaqiyatli o\'zgartirildi')
      passwordForm.reset()
      setPwSuccess(true)
      setTimeout(() => setPwSuccess(false), 3000)
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? ''))
  })

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? 'A'

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Profil</h1>
        <p className="text-sm text-muted-foreground">Shaxsiy ma'lumotlar va parol</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Profile info */}
        <div className="bg-white rounded-xl border-[0.5px] border-border p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Shaxsiy ma'lumotlar</h2>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
              {getInitials(user?.fullName ?? '')}
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">{user?.fullName}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border-[0.5px] border-purple-200 mt-1 inline-block">
                {user?.role?.name ?? 'Admin'}
              </span>
            </div>
          </div>

          {/* Info rows */}
          <div className="space-y-3 mb-5">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
              <span className="text-gray-600">Email:</span>
              <span className="font-medium text-gray-900">{user?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
              <span className="text-gray-600">Rol:</span>
              <span className="font-medium text-gray-900">{user?.role?.name ?? 'Admin'}</span>
            </div>
            {(user as any)?.lastLoginAt && (
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                <span className="text-gray-600">Oxirgi kirish:</span>
                <span className="font-medium text-gray-900">{formatDateTime((user as any).lastLoginAt)}</span>
              </div>
            )}
          </div>

          {/* Edit name form */}
          <form onSubmit={profileForm.handleSubmit(data => profileMutation.mutate(data))} className="space-y-3">
            <div>
              <Label className="text-xs mb-1.5 block">To'liq ism</Label>
              <Input {...profileForm.register('fullName')} className="h-9 text-sm rounded-lg border-[0.5px]" />
              {profileForm.formState.errors.fullName && (
                <p className="text-xs text-red-500 mt-1">{profileForm.formState.errors.fullName.message}</p>
              )}
            </div>
            <Button type="submit" size="sm" disabled={profileMutation.isPending} className="rounded-lg gap-1.5 w-full">
              <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
              {profileMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </form>
        </div>

        {/* RIGHT: Change password */}
        <div className="bg-white rounded-xl border-[0.5px] border-border p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Key className="h-4 w-4" strokeWidth={1.5} />
            Parolni o'zgartirish
          </h2>

          {pwSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border-[0.5px] border-green-200 mb-4">
              <Check className="h-4 w-4 text-green-600" strokeWidth={2} />
              <p className="text-xs text-green-700 font-medium">Parol muvaffaqiyatli o'zgartirildi!</p>
            </div>
          )}

          <form onSubmit={passwordForm.handleSubmit(data => passwordMutation.mutate(data))} className="space-y-4">
            {[
              { name: 'currentPassword' as const, label: 'Joriy parol', show: showCurrent, setShow: setShowCurrent },
              { name: 'newPassword' as const, label: 'Yangi parol', show: showNew, setShow: setShowNew },
              { name: 'confirmPassword' as const, label: 'Yangi parolni tasdiqlang', show: showConfirm, setShow: setShowConfirm },
            ].map(field => (
              <div key={field.name}>
                <Label className="text-xs mb-1.5 block">{field.label}</Label>
                <div className="relative">
                  <Input {...passwordForm.register(field.name)} type={field.show ? 'text' : 'password'} className="h-9 text-sm rounded-lg border-[0.5px] pr-10" />
                  <button type="button" onClick={() => field.setShow(!field.show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700">
                    {field.show ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                  </button>
                </div>
                {passwordForm.formState.errors[field.name] && (
                  <p className="text-xs text-red-500 mt-1">{passwordForm.formState.errors[field.name]?.message}</p>
                )}
              </div>
            ))}

            <Button type="submit" size="sm" disabled={passwordMutation.isPending} className="w-full rounded-lg gap-1.5">
              <Key className="h-3.5 w-3.5" strokeWidth={1.5} />
              {passwordMutation.isPending ? 'O\'zgartirilmoqda...' : 'Parolni o\'zgartirish'}
            </Button>
          </form>

          <div className="mt-4 p-3 rounded-lg bg-gray-50 border-[0.5px] border-border">
            <p className="text-[11px] text-muted-foreground">
              🔒 Parol kamida 8 ta belgi bo'lishi kerak. Katta harf, raqam yoki belgi qo'shish tavsiya qilinadi.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
