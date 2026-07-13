import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Shield,
  Plus,
  Pencil,
  ChevronDown,
  Check,
  X,
  Users,
  Trash2,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { rolesApi, type Permission, type Role } from '../../api/roles.api'
import { QK } from '../../constants/query-keys'
import { getErrorMessage } from '../../lib/errors'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

const PERMISSION_MODULES = [
  { module: 'orders', label: 'Buyurtmalar', icon: '📦' },
  { module: 'products', label: 'Mahsulotlar', icon: '🛍' },
  { module: 'customers', label: 'Mijozlar', icon: '👥' },
  { module: 'inventory', label: 'Inventar', icon: '🏪' },
  { module: 'coupons', label: 'Kuponlar', icon: '🏷' },
  { module: 'expenses', label: 'Xarajatlar', icon: '💸' },
  { module: 'analytics', label: 'Analitika', icon: '📊' },
  { module: 'telegram', label: 'Telegram', icon: '✈️' },
  { module: 'settings', label: 'Sozlamalar', icon: '⚙️' },
  { module: 'admin-users', label: 'Adminlar', icon: '👤', resource: 'users' },
  { module: 'roles', label: 'Rollar', icon: '🔐' },
  { module: 'suppliers', label: "Ta'minotchilar", icon: '🚚' },
  { module: 'purchase_orders', label: 'Xarid buyurtmalari', icon: '🛒' },
]

const roleSchema = z.object({
  name: z.string().min(2, 'Nom talab qilinadi'),
  description: z.string().optional().nullable(),
})

type RoleForm = z.infer<typeof roleSchema>

export function RollarPage() {
  const qc = useQueryClient()

  const [expanded, setExpanded] = useState<string | null>(null)
  const [sheet, setSheet] = useState(false)
  const [editTarget, setEditTarget] = useState<Role | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)

  const { data: roles = [], isLoading } = useQuery({
    queryKey: QK.ROLES,
    queryFn: rolesApi.list,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleForm>({ resolver: zodResolver(roleSchema) })

  const [editPermissions, setEditPermissions] = useState<Permission[]>([])

  const togglePerm = (resource: string, action: 'read' | 'write') => {
    setEditPermissions((prev) => {
      const exists = prev.find((p) => p.resource === resource && p.action === action)
      if (exists) {
        return prev.filter((p) => !(p.resource === resource && p.action === action))
      }
      return [...prev, { resource, action }]
    })
  }

  const hasPerm = (resource: string, action: string) =>
    editPermissions.some((p) => p.resource === resource && p.action === action)

  const saveMutation = useMutation({
    mutationFn: (data: RoleForm) =>
      editTarget
        ? rolesApi.update(editTarget.id, {
            ...data,
            permissions: editPermissions,
          })
        : rolesApi.create({
            ...data,
            permissions: editPermissions,
          }),
    onSuccess: () => {
      qc.removeQueries()
      toast.success(editTarget ? 'Rol yangilandi' : 'Rol yaratildi')
      resetForm()
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const updateGranularMutation = useMutation({
    mutationFn: ({ id, resource, action, operation }: any) =>
      rolesApi.updateGranular(id, { resource, action, operation }),
    onSuccess: () => {
      qc.removeQueries()
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rolesApi.delete(id),
    onSuccess: () => {
      qc.removeQueries()
      toast.success("Rol o'chirildi")
      setDeleteTarget(null)
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const resetForm = () => {
    reset()
    setEditPermissions([])
    setEditTarget(null)
    setSheet(false)
  }

  const handleEdit = (role: Role) => {
    setEditTarget(role)
    reset({
      name: role.name,
      description: role.description ?? '',
    })
    setEditPermissions(role.permissions ?? [])
    setSheet(true)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Rollar</h1>
          <p className="text-sm text-muted-foreground">Admin ruxsatnomalarini boshqaring</p>
        </div>
        <Button
          size="sm"
          className="rounded-lg gap-2 h-9"
          onClick={() => {
            resetForm()
            setSheet(true)
          }}
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          <span className="hidden sm:inline">Yangi rol</span>
        </Button>
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 rounded-xl border-[0.5px] border-amber-200 px-4 py-3 flex gap-3">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 font-medium">
          Super Admin rolidagi adminlar barcha ruxsatnomalardan foydalanishi mumkin. Ularning
          ruxsatnomalarini o'zgartirib bo'lmaydi.
        </p>
      </div>

      {/* Roles list */}
      <div className="space-y-3">
        {isLoading
          ? [1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-white rounded-xl border-[0.5px] border-border animate-pulse"
              />
            ))
          : roles.map((role: Role) => {
              const isExpanded = expanded === role.id
              const isSuper = false
              const roleColor = 'border-gray-200 bg-white'

              return (
                <div
                  key={role.id}
                  className={cn('rounded-xl border-[0.5px] overflow-hidden', roleColor)}
                >
                  {/* Role header */}
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Shield
                        className={cn(
                          'h-5 w-5 shrink-0',
                          isSuper ? 'text-purple-600' : 'text-blue-500'
                        )}
                        strokeWidth={1.5}
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{role.name}</p>
                        {role.description && (
                          <p className="text-[11px] text-muted-foreground">{role.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Admin count */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {role.adminCount ?? 0} ta admin
                      </div>

                      {/* Edit button */}
                      {!isSuper && (
                        <button
                          onClick={() => handleEdit(role)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/80 text-gray-500 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      )}

                      {/* Delete button */}
                      {!isSuper && (role.adminCount ?? 0) === 0 && (
                        <button
                          onClick={() => setDeleteTarget(role)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      )}

                      {/* Expand */}
                      <button
                        onClick={() => setExpanded(isExpanded ? null : role.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/80 text-gray-500 transition-colors"
                      >
                        <ChevronDown
                          className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')}
                          strokeWidth={1.5}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Permission matrix */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-border/30 bg-white/50">
                      <div className="pt-4">
                        <div className="grid grid-cols-1 gap-2">
                          {/* Header */}
                          <div className="grid grid-cols-4 gap-2 mb-1">
                            <div className="col-span-2" />
                            <p className="text-[10px] text-center font-semibold text-muted-foreground uppercase tracking-wide">
                              Ko'rish
                            </p>
                            <p className="text-[10px] text-center font-semibold text-muted-foreground uppercase tracking-wide">
                              Tahrirlash
                            </p>
                          </div>

                          {/* Permission rows */}
                          {PERMISSION_MODULES.map((mod) => {
                            const resource = mod.resource || mod.module
                            const canRead =
                              isSuper ||
                              role.permissions.some(
                                (p) => p.resource === resource && p.action === 'read'
                              )
                            const canWrite =
                              isSuper ||
                              role.permissions.some(
                                (p) => p.resource === resource && p.action === 'write'
                              )

                            const analyticsOnly = mod.module === 'analytics'

                            return (
                              <div
                                key={mod.module}
                                className="grid grid-cols-4 gap-2 items-center py-1.5 border-b border-border/20 last:border-0"
                              >
                                <div className="col-span-2 flex items-center gap-2">
                                  <span className="text-sm">{mod.icon}</span>
                                  <span className="text-xs font-medium text-gray-700">
                                    {mod.label}
                                  </span>
                                </div>

                                {/* Read toggle */}
                                <div className="flex justify-center">
                                  <button
                                    type="button"
                                    disabled={isSuper}
                                    onClick={() =>
                                      updateGranularMutation.mutate({
                                        id: role.id,
                                        resource,
                                        action: 'read',
                                        operation: canRead ? 'remove' : 'add',
                                      })
                                    }
                                    className={cn(
                                      'w-6 h-6 rounded-md flex items-center justify-center border-[0.5px] transition-all',
                                      isSuper
                                        ? 'bg-green-100 border-green-300 cursor-default'
                                        : canRead
                                          ? 'bg-green-100 border-green-300 hover:bg-green-200'
                                          : 'bg-white border-gray-200 hover:bg-gray-100'
                                    )}
                                  >
                                    {canRead && (
                                      <Check className="h-3 w-3 text-green-700" strokeWidth={2.5} />
                                    )}
                                  </button>
                                </div>

                                {/* Write toggle */}
                                <div className="flex justify-center">
                                  {analyticsOnly ? (
                                    <span className="text-[10px] text-gray-300">—</span>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={isSuper}
                                      onClick={() =>
                                        updateGranularMutation.mutate({
                                          id: role.id,
                                          resource,
                                          action: 'write',
                                          operation: canWrite ? 'remove' : 'add',
                                        })
                                      }
                                      className={cn(
                                        'w-6 h-6 rounded-md flex items-center justify-center border-[0.5px] transition-all',
                                        isSuper
                                          ? 'bg-green-100 border-green-300 cursor-default'
                                          : canWrite
                                            ? 'bg-green-100 border-green-300 hover:bg-green-200'
                                            : 'bg-white border-gray-200 hover:bg-gray-100'
                                      )}
                                    >
                                      {canWrite && (
                                        <Check
                                          className="h-3 w-3 text-green-700"
                                          strokeWidth={2.5}
                                        />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
      </div>

      {/* Create/Edit sheet */}
      <Sheet
        open={sheet}
        onOpenChange={(v) => {
          if (!v) resetForm()
          setSheet(v)
        }}
      >
        <SheetContent
          side="right"
          className="w-[90vw] sm:w-[440px] sm:max-w-[440px] overflow-y-auto"
        >
          <SheetHeader className="pb-4 border-b border-border/50">
            <SheetTitle>{editTarget ? 'Rolni tahrirlash' : 'Yangi rol yaratish'}</SheetTitle>
          </SheetHeader>

          <form
            onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
            className="space-y-4 py-4"
          >
            <div>
              <Label className="text-xs mb-1.5 block">Rol nomi *</Label>
              <Input
                {...register('name')}
                placeholder="Manager, Viewer..."
                className="h-9 text-sm rounded-lg border-[0.5px]"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Tavsif</Label>
              <Input
                {...register('description')}
                placeholder="Bu rol nima qila oladi?"
                className="h-9 text-sm rounded-lg border-[0.5px]"
              />
            </div>

            {/* Permission select */}
            {!editTarget && (
              <div>
                <Label className="text-xs mb-2 block font-semibold">Ruxsatnomalar</Label>
                <div className="space-y-2">
                  {PERMISSION_MODULES.map((mod) => {
                    const resource = mod.resource || mod.module
                    return (
                      <div
                        key={mod.module}
                        className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0"
                      >
                        <span className="text-xs font-medium text-gray-700 flex items-center gap-2">
                          {mod.icon} {mod.label}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => togglePerm(resource, 'read')}
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded border-[0.5px] transition-all font-medium',
                              hasPerm(resource, 'read')
                                ? 'bg-green-100 border-green-300 text-green-700'
                                : 'bg-white border-gray-200 text-gray-400'
                            )}
                          >
                            Ko'rish
                          </button>
                          {mod.module !== 'analytics' && (
                            <button
                              type="button"
                              onClick={() => togglePerm(resource, 'write')}
                              className={cn(
                                'text-[10px] px-2 py-0.5 rounded border-[0.5px] transition-all font-medium',
                                hasPerm(resource, 'write')
                                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                                  : 'bg-white border-gray-200 text-gray-400'
                              )}
                            >
                              Tahrirlash
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

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
              <Button
                type="submit"
                size="sm"
                disabled={saveMutation.isPending}
                className="flex-1 rounded-lg"
              >
                {saveMutation.isPending ? 'Saqlanmoqda...' : editTarget ? 'Saqlash' : 'Yaratish'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Rolni o'chirish"
        description={`"${deleteTarget?.name}" roli o'chiriladi.`}
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id)
          }
        }}
      />
    </div>
  )
}
