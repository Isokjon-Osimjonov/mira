import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Shield, Mail, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { adminsApi } from '../../api/admins.api'
import { QK } from '../../constants/query-keys'
import { formatRelative } from '../../utils/date'
import { getErrorMessage } from '../../lib/errors'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { useAuthStore } from '../../stores/auth.store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const inviteSchema = z.object({
  fullName: z.string().min(2, 'Ism kiriting'),
  email: z.string().email("Email noto'g'ri"),
  password: z.string().min(8, 'Kamida 8 belgi').optional().or(z.literal('')),
  roleId: z.string().min(1, 'Rol tanlang'),
})

export function AdminsPage() {
  const qc = useQueryClient()
  const currentAdmin = useAuthStore((s) => s.user)

  const [inviteSheet, setInviteSheet] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<any>(null)
  const [tempPasswordModal, setTempPasswordModal] = useState<string | null>(null)

  const { data: admins = [], isLoading: adminsLoading } = useQuery({
    queryKey: QK.ADMINS,
    queryFn: adminsApi.list,
  })

  const { data: roles = [] } = useQuery({
    queryKey: QK.ROLES,
    queryFn: adminsApi.getRoles,
    staleTime: Infinity,
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      roleId: '',
    },
  })

  const inviteMutation = useMutation({
    mutationFn: adminsApi.invite,
    onSuccess: (res: any) => {
      qc.removeQueries()
      const tempPassword = res.data?.tempPassword
      if (tempPassword) {
        setTempPasswordModal(tempPassword)
      } else {
        toast.success('Admin yaratildi.')
      }
      reset()
      setInviteSheet(false)
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => adminsApi.deactivate(id),
    onSuccess: () => {
      qc.removeQueries()
      toast.success('Admin deaktivlashtirildi')
      setDeactivateTarget(null)
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => adminsApi.reactivate(id),
    onSuccess: () => {
      qc.removeQueries()
      toast.success('Admin aktivlashtirildi')
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, roleId }: any) => adminsApi.updateRole(id, roleId),
    onSuccess: () => {
      qc.removeQueries()
      toast.success('Rol yangilandi')
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const getInitials = (name: string) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'A'

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Adminlar</h1>
          <p className="text-sm text-muted-foreground">{admins.length} ta admin</p>
        </div>
        <Button size="sm" className="rounded-lg gap-2 h-9" onClick={() => setInviteSheet(true)}>
          <UserPlus className="h-4 w-4" strokeWidth={1.5} />
          <span className="hidden sm:inline">Admin qo'shish</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: Admins table */}
        <div className="lg:col-span-2 bg-white rounded-xl border-[0.5px] border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <h2 className="text-sm font-semibold text-gray-900">Jamoa a'zolari</h2>
          </div>

          {adminsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {admins.map((admin: any) => {
                const isSelf = admin.id === currentAdmin?.id
                const isSuperAdmin = admin.isSuperAdmin

                return (
                  <div key={admin.id} className="flex items-center gap-4 px-5 py-3 group">
                    {/* Avatar */}
                    <div
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                        !admin.isActive ? 'bg-gray-100 text-gray-400' : 'bg-primary/10 text-primary'
                      )}
                    >
                      {getInitials(admin.fullName)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            'text-sm font-medium',
                            !admin.isActive ? 'text-gray-400' : 'text-gray-900'
                          )}
                        >
                          {admin.fullName}
                          {isSelf && <span className="text-[10px] text-primary ml-1">(siz)</span>}
                        </p>
                        <span
                          className={cn(
                            'text-[10px] font-medium px-1.5 py-0.5 rounded border-[0.5px]',
                            admin.isSuperAdmin
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          )}
                        >
                          {admin.isSuperAdmin ? 'Super Admin' : (admin.role?.name ?? 'Admin')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] text-muted-foreground">{admin.email}</p>
                        {admin.lastLoginAt && (
                          <p className="text-[10px] text-muted-foreground">
                            · {formatRelative(admin.lastLoginAt)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Role select */}
                    {!isSelf && !isSuperAdmin && (
                      <Select
                        value={admin.roleId ?? ''}
                        onValueChange={(roleId) =>
                          updateRoleMutation.mutate({ id: admin.id, roleId })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs rounded-lg border-[0.5px] w-28 opacity-0 group-hover:opacity-100 transition-opacity">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {roles.map((r: any) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Activate/Deactivate */}
                    {!isSelf &&
                      !isSuperAdmin &&
                      (admin.isActive ? (
                        <button
                          onClick={() => setDeactivateTarget(admin)}
                          title="Deaktivlashtirish"
                          className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-500 transition-all"
                        >
                          <XCircle className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivateMutation.mutate(admin.id)}
                          title="Aktivlashtirish"
                          className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-green-50 text-green-600 transition-all"
                        >
                          <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Roles */}
        <div className="bg-white rounded-xl border-[0.5px] border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Rollar</h2>
              <Shield className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </div>
          </div>
          <div className="divide-y divide-border/30">
            {roles.map((role: any) => {
              const adminCount = admins.filter((a: any) => a.roleId === role.id).length
              return (
                <div key={role.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900">{role.name}</p>
                    <span className="text-[11px] text-muted-foreground">{adminCount} ta admin</span>
                  </div>
                  {role.description && (
                    <p className="text-[11px] text-muted-foreground">{role.description}</p>
                  )}
                  {role.permissions?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {role.permissions.slice(0, 4).map((p: any) => (
                        <span
                          key={typeof p === 'string' ? p : p.id}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
                        >
                          {typeof p === 'string' ? p : `${p.resource}:${p.action}`}
                        </span>
                      ))}
                      {role.permissions.length > 4 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                          +{role.permissions.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Invite sheet */}
      <Sheet open={inviteSheet} onOpenChange={setInviteSheet}>
        <SheetContent
          side="right"
          className="w-[90vw] sm:w-[400px] sm:max-w-[400px] overflow-y-auto"
        >
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle>Admin taklif qilish</SheetTitle>
          </SheetHeader>

          <form
            onSubmit={handleSubmit((data) => {
              const payload = {
                fullName: data.fullName,
                email: data.email,
                roleId: data.roleId,
                ...(data.password ? { password: data.password } : {})
              }
              inviteMutation.mutate(payload as any)
            })}
            className="space-y-4 py-4"
          >
            <div>
              <Label className="text-xs mb-1.5 block">To'liq ism *</Label>
              <Input
                {...register('fullName')}
                placeholder="Kim Minji"
                className="h-9 text-sm rounded-lg border-[0.5px]"
              />
              {errors.fullName && (
                <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Email *</Label>
              <Input
                {...register('email')}
                type="email"
                placeholder="admin@miracosmetics.uz"
                className="h-9 text-sm rounded-lg border-[0.5px]"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium">
                Parol (ixtiyoriy)
              </Label>
              <Input
                type="password"
                placeholder="Bo'sh qoldirilsa avtomatik yaratiladi"
                className="h-9 text-sm rounded-lg border-[0.5px]"
                {...register('password')}
              />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              <p className="text-[11px] text-muted-foreground mt-1">
                Bo'sh qoldirsangiz, xavfsiz parol
                avtomatik yaratiladi
              </p>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Rol *</Label>
              <Controller
                name="roleId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 text-sm rounded-lg border-[0.5px]">
                      <SelectValue placeholder="Rol tanlang" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {roles.map((r: any) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.roleId && (
                <p className="text-xs text-red-500 mt-1">{errors.roleId.message}</p>
              )}
            </div>

            <div className="pt-2 p-3 rounded-lg bg-blue-50 border-[0.5px] border-blue-100">
              <div className="flex items-start gap-2">
                <Mail className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" strokeWidth={1.5} />
                <p className="text-[11px] text-blue-700">
                  Adminga parol o'rnatish uchun email yuboriladi
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInviteSheet(false)}
                className="flex-1 rounded-lg border-[0.5px]"
              >
                Bekor
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={inviteMutation.isPending}
                className="flex-1 rounded-lg gap-1.5"
              >
                <UserPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
                {inviteMutation.isPending ? 'Yuklanmoqda...' : 'Taklif yuborish'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        title="Adminni deaktivlashtirish"
        description={`${deactivateTarget?.fullName} tizimga kira olmaydi.`}
        variant="destructive"
        loading={deactivateMutation.isPending}
        onConfirm={() => deactivateMutation.mutate(deactivateTarget.id)}
      />

      {tempPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">
              Admin yaratildi
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Vaqtinchalik parol — uni saqlang, qayta ko'rsatilmaydi:
            </p>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm break-all mb-4 select-all border border-gray-200">
              {tempPasswordModal}
            </div>
            <p className="text-xs text-amber-600 mb-4">
              Bu parolni yangi adminга yuboring. U tizimga kirib parolni o'zgartirishi kerak.
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(tempPasswordModal)
                setTempPasswordModal(null)
              }}
              className="w-full bg-violet-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-violet-700"
            >
              Nusxalash va yopish
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
