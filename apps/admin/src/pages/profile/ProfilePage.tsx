import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Mail, Shield, Clock, Key, Save, Eye, EyeOff, Check, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/auth.store'
import { formatDateTime, formatRelative } from '../../utils/date'
import { getErrorMessage } from '../../lib/errors'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const profileSchema = z.object({
  fullName: z.string().min(2, 'Ism kamida 2 ta belgi'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Joriy parol talab qilinadi'),
    newPassword: z.string().min(8, 'Kamida 8 ta belgi'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Parollar mos kelmaydi',
    path: ['confirmPassword'],
  })

export function ProfilePage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName ?? '',
    },
  })

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const profileMutation = useMutation({
    mutationFn: (data: any) => api.patch('/admin/auth/profile', data).then((r) => r.data),
    onSuccess: (res) => {
      qc.removeQueries()
      toast.success('Profil yangilandi')
      if (setUser && res.data) {
        setUser({ ...user, ...res.data } as any)
      }
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const passwordMutation = useMutation({
    mutationFn: (data: any) =>
      api
        .patch('/admin/auth/change-password', {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        })
        .then((r) => r.data),
    onSuccess: () => {
      qc.removeQueries()
      toast.success("Parol muvaffaqiyatli o'zgartirildi")
      passwordForm.reset()
      setPwSuccess(true)
      setTimeout(() => setPwSuccess(false), 3000)
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const getInitials = (name: string) => {
    if (!name) return 'A'
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Hero section */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl p-6 border-[0.5px] border-primary/20 flex items-center gap-5">
        {/* Big avatar */}
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
          {getInitials(user?.fullName ?? '')}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">{user?.fullName}</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 border-[0.5px] border-purple-200">
              {user?.isSuperAdmin ? 'Super Admin' : 'Admin'}
            </span>
            {(user as any)?.lastLoginAt && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Oxirgi kirish:{' '}
                {formatRelative((user as any).lastLoginAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Edit name */}
        <div className="bg-white rounded-xl border-[0.5px] border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-gray-900">Shaxsiy ma'lumotlar</h3>
          </div>

          {/* Static info rows */}
          <div className="space-y-3 mb-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium text-gray-900">{user?.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Rol</span>
              <span className="font-medium text-gray-900">
                {user?.isSuperAdmin ? 'Super Admin' : 'Admin'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Admin ID</span>
              <span className="font-mono text-xs text-muted-foreground">
                {user?.id?.slice(0, 8)}...
              </span>
            </div>
          </div>

          {/* Edit name */}
          <form
            onSubmit={profileForm.handleSubmit((data) => profileMutation.mutate(data))}
            className="space-y-4"
          >
            <div>
              <Label className="text-xs mb-1.5 block">To'liq ism</Label>
              <Input
                {...profileForm.register('fullName')}
                className="h-9 text-sm rounded-lg border-[0.5px]"
              />
              {profileForm.formState.errors.fullName && (
                <p className="text-xs text-red-500 mt-1">
                  {profileForm.formState.errors.fullName.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={profileMutation.isPending}
              className="w-full rounded-lg gap-1.5 h-10"
            >
              {profileMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" strokeWidth={1.5} />
              )}
              {profileMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </form>
        </div>

        {/* Right: Change password */}
        <div className="bg-white rounded-xl border-[0.5px] border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-gray-900">Parolni o'zgartirish</h3>
          </div>

          {pwSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border-[0.5px] border-green-200 mb-4 animate-in fade-in zoom-in duration-300">
              <Check className="h-4 w-4 text-green-600" strokeWidth={2} />
              <p className="text-xs text-green-700 font-medium">
                Parol muvaffaqiyatli o'zgartirildi!
              </p>
            </div>
          )}

          <form
            onSubmit={passwordForm.handleSubmit((data) => passwordMutation.mutate(data))}
            className="space-y-4"
          >
            {[
              {
                name: 'currentPassword' as const,
                label: 'Joriy parol',
                show: showCurrent,
                toggle: setShowCurrent,
              },
              {
                name: 'newPassword' as const,
                label: 'Yangi parol',
                show: showNew,
                toggle: setShowNew,
              },
              {
                name: 'confirmPassword' as const,
                label: 'Tasdiqlang',
                show: showConfirm,
                toggle: setShowConfirm,
              },
            ].map((f) => (
              <div key={f.name}>
                <Label className="text-xs mb-1 block">{f.label}</Label>
                <div className="relative">
                  <Input
                    {...passwordForm.register(f.name)}
                    type={f.show ? 'text' : 'password'}
                    className="h-9 text-sm rounded-lg border-[0.5px] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => f.toggle(!f.show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700 transition-colors"
                  >
                    {f.show ? (
                      <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
                {passwordForm.formState.errors[f.name] && (
                  <p className="text-xs text-red-500 mt-1">
                    {passwordForm.formState.errors[f.name]?.message}
                  </p>
                )}
              </div>
            ))}

            <Button
              type="submit"
              size="sm"
              disabled={passwordMutation.isPending}
              className="w-full rounded-lg gap-1.5 h-10"
            >
              {passwordMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Key className="h-4 w-4" strokeWidth={1.5} />
              )}
              {passwordMutation.isPending ? "O'zgartirilmoqda..." : "Parolni o'zgartirish"}
            </Button>
          </form>

          <p className="text-[10px] text-muted-foreground mt-4 text-center">
            🔒 Kamida 8 ta belgi · Katta harf va raqam qo'shish tavsiya qilinadi
          </p>
        </div>
      </div>
    </div>
  )
}
