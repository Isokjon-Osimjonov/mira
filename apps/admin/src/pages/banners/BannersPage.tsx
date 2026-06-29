import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { bannersApi } from '../../api/banners.api'
import { useAuthStore } from '../../stores/auth.store'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { SkeletonTable } from '../../components/shared/SkeletonTable'
import { EmptyState } from '../../components/shared/EmptyState'
import { BannerSheet } from './BannerSheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function BannersPage() {
  const qc = useQueryClient()
  const canWrite = useAuthStore((s) => s.canWrite)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editBanner, setEditBanner] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: () => bannersApi.list(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bannersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banners'] })
      toast.success("Banner o'chirildi")
      setDeleteTarget(null)
    },
    onError: (err: any) => {
      toast.error(err.message || "O'chirishda xatolik")
    },
  })

  const banners = data?.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Bannerlar</h1>
          <p className="text-sm text-muted-foreground">
            Mobil ilovadagi asosiy bannerlarni boshqaring
          </p>
        </div>
        {canWrite('settings') && (
          <Button
            size="sm"
            className="rounded-lg gap-2 h-9"
            onClick={() => {
              setEditBanner(null)
              setSheetOpen(true)
            }}
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Yangi banner
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border-[0.5px] border-border overflow-hidden">
        {isLoading ? (
          <SkeletonTable cols={7} rows={5} />
        ) : banners.length === 0 ? (
          <EmptyState
            message="Bannerlar topilmadi"
            description="Hozircha hech qanday banner yaratilmagan"
            action={
              canWrite('settings') && (
                <Button size="sm" onClick={() => setSheetOpen(true)} className="rounded-lg gap-2">
                  <Plus className="h-4 w-4" />
                  Banner qo'shish
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-gray-50/80">
                  <th className="w-16 px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Rasm
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Tur
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Hudud
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">
                    Holat
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">
                    Tartib
                  </th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {banners.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-4 py-3">
                      {b.imageUrl ? (
                        <img
                          src={b.imageUrl}
                          alt=""
                          className="w-10 h-10 min-w-[2.5rem] shrink-0 rounded-lg object-cover border-[0.5px] border-border"
                        />
                      ) : (
                        <div className="w-10 h-10 min-w-[2.5rem] shrink-0 rounded-lg bg-gray-100 flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-600">{b.linkType}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {b.regionCode || 'Hammasi'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          'text-[11px] font-medium px-2 py-0.5 rounded-md border-[0.5px]',
                          b.isActive
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        )}
                      >
                        {b.isActive ? 'Aktiv' : 'Nofaol'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{b.sortOrder}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canWrite('settings') && (
                          <>
                            <button
                              onClick={() => {
                                setEditBanner(b)
                                setSheetOpen(true)
                              }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-50 text-blue-600 transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(b)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-red-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BannerSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false)
          setEditBanner(null)
        }}
        banner={editBanner}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['banners'] })
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Bannerni o'chirish"
        description="Ushbu bannerni o'chirishni tasdiqlaysizmi?"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
