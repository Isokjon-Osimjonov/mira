import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Phone,
  MapPin,
  Shield,
  ShieldOff,
  MessageCircle,
  Clock,
  ShoppingBag,
  Wallet,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { customersApi } from '../../api/customers.api'
import { QK } from '../../constants/query-keys'
import { formatKRW, formatUZS } from '../../utils/currency'
import { formatDateTime, formatRelative } from '../../utils/date'
import { StatusBadge } from '../../components/ui/status-badge'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { getErrorMessage } from '../../lib/errors'
import { useExchangeRate } from '../../hooks/useExchangeRate'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function CustomerDetailPage({ id }: { id: string }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { rate } = useExchangeRate()

  const [blockDialog, setBlockDialog] = useState(false)
  const [unblockDialog, setUnblockDialog] = useState(false)
  const [noteInput, setNoteInput] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: QK.CUSTOMER(id),
    queryFn: () => customersApi.getById(id),
  })

  const { data: ordersData } = useQuery({
    queryKey: QK.CUSTOMER_ORDERS(id),
    queryFn: () => customersApi.getOrders(id, { limit: 10 }),
    enabled: !!id,
  })

  const customer = data?.data?.profile
  const stats = data?.data?.stats
  const addresses = data?.data?.addresses || []
  const recentOrders = data?.data?.recentOrders || []
  const orders = ordersData?.data || []

  const blockMutation = useMutation({
    mutationFn: (reason?: string) => customersApi.block(id, reason),
    onSuccess: () => {
      qc.removeQueries()
      toast.success('Mijoz bloklandi')
      setBlockDialog(false)
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const unblockMutation = useMutation({
    mutationFn: () => customersApi.unblock(id),
    onSuccess: () => {
      qc.removeQueries()
      toast.success('Mijoz blokdan chiqarildi')
      setUnblockDialog(false)
    },
    onError: (err: any) => toast.error(getErrorMessage(err?.errorCode ?? '')),
  })

  const addNoteMutation = useMutation({
    mutationFn: () => customersApi.addNote(id, noteInput),
    onSuccess: () => {
      qc.removeQueries()
      toast.success("Izoh qo'shildi")
      setNoteInput('')
    },
  })

  if (isLoading || !customer) {
    return (
      <div className="flex flex-col gap-4 animate-pulse max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-gray-100 rounded-lg" />
        <div className="h-48 bg-white rounded-xl border border-border" />
      </div>
    )
  }

  const isUZB = customer.phoneRegion === 'UZB'

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/customers' } as any)}
          className="rounded-lg h-8 w-8 p-0 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        <div className="flex-1 flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center',
              'justify-center text-sm font-bold shrink-0',
              !customer.isActive ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
            )}
          >
            {customer.firstName?.[0]?.toUpperCase()}
            {customer.lastName?.[0]?.toUpperCase() ?? ''}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 leading-tight">
              {customer.firstName} {customer.lastName ?? ''}
            </h1>
            <p className="text-xs text-muted-foreground">
              Ro'yxatdan o'tgan: {formatDateTime(customer.createdAt)}
            </p>
          </div>
        </div>

        {/* Block/Unblock button */}
        {!customer.deletedAt &&
          (!customer.isActive ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setUnblockDialog(true)}
              className="rounded-lg gap-1.5 h-8 border-green-200 text-green-600 hover:bg-green-50"
            >
              <Shield className="h-3.5 w-3.5" strokeWidth={1.5} />
              Blokni olib tashlash
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBlockDialog(true)}
              className="rounded-lg gap-1.5 h-8 border-red-200 text-red-600 hover:bg-red-50"
            >
              <ShieldOff className="h-3.5 w-3.5" strokeWidth={1.5} />
              Bloklash
            </Button>
          ))}
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: Customer info */}
        <div className="flex flex-col gap-3">
          {/* Contact card */}
          <div className="bg-white rounded-xl border-[0.5px] border-border p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Kontakt
            </p>

            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
              <p className="text-sm text-gray-900 font-medium">{customer.phone}</p>
              <a
                href={`tel:${customer.phone}`}
                className="ml-auto text-xs text-primary font-medium hover:underline"
              >
                Qo'ng'iroq
              </a>
            </div>

            {customer.tgUsername && (
              <div className="flex items-center gap-2">
                <MessageCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" strokeWidth={1.5} />
                <p className="text-sm text-blue-500 font-medium">@{customer.tgUsername}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-[11px] font-semibold',
                  'px-2 py-0.5 rounded border-[0.5px]',
                  customer.phoneRegion === 'KOR'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-green-50 text-green-700 border-green-200'
                )}
              >
                <span>{customer.phoneRegion === 'KOR' ? '🇰🇷' : '🇺🇿'}</span>
                <span>{customer.phoneRegion}</span>
              </span>
              {!customer.isActive && !customer.deletedAt && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded border-[0.5px] bg-red-50 text-red-600 border-red-200">
                  🚫 Bloklangan
                </span>
              )}
              {customer.deletedAt && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded border-[0.5px] bg-gray-100 text-gray-600 border-gray-300">
                  O'chirilgan
                </span>
              )}
            </div>
          </div>

          {/* Stats card */}
          <div className="bg-white rounded-xl border-[0.5px] border-border p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Statistika
            </p>
            <div className="space-y-2.5">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <ShoppingBag className="h-3 w-3" strokeWidth={1.5} />
                  Buyurtmalar
                </span>
                <span className="text-xs font-semibold">{stats?.totalOrders ?? 0} ta</span>
              </div>
              <div className="flex justify-between">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Wallet className="h-3 w-3" strokeWidth={1.5} />
                    Jami xarid
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 pl-[18px] mt-0.5 leading-tight">
                    Faqat yetkazib berilgan buyurtmalar
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold">{formatKRW(stats?.totalSpent ?? 0)}</p>
                  {isUZB && rate && (
                    <p className="text-[10px] text-muted-foreground font-medium">
                      ≈ {formatUZS(Math.round((stats?.totalSpent ?? 0) * rate))}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3" strokeWidth={1.5} />
                  Oxirgi buyurtma
                </span>
                <span className="text-xs font-medium">
                  {stats?.lastOrderAt ? formatRelative(stats.lastOrderAt) : 'Hech qachon'}
                </span>
              </div>
            </div>
          </div>

          {/* Addresses */}
          {addresses.length > 0 && (
            <div className="bg-white rounded-xl border-[0.5px] border-border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Manzillar
              </p>
              <div className="space-y-2">
                {addresses.map((addr: any) => (
                  <div
                    key={addr.id}
                    className="flex gap-2 p-2.5 rounded-lg bg-gray-50 border-[0.5px] border-border/50"
                  >
                    <MapPin
                      className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5"
                      strokeWidth={1.5}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-900 font-medium">
                        {addr.label} {addr.isDefault && '(Asosiy)'}
                      </p>
                      <p className="text-[11px] text-gray-600 mt-0.5">
                        {addr.addressLine1}
                        {addr.city ? `, ${addr.city}` : ''}
                        {addr.province ? `, ${addr.province}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin notes */}
          <div className="bg-white rounded-xl border-[0.5px] border-border p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Admin izohlari
            </p>

            {customer.notes && (
              <div className="p-2.5 rounded-lg bg-amber-50/50 border-[0.5px] border-amber-100 mb-3">
                <p className="text-xs text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Izoh qo'shish..."
                className="h-8 text-xs rounded-lg border-[0.5px] flex-1"
              />
              <Button
                size="sm"
                disabled={!noteInput.trim() || addNoteMutation.isPending}
                onClick={() => addNoteMutation.mutate()}
                className="h-8 rounded-lg text-xs px-3"
              >
                {addNoteMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Qo'shish"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT: Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border-[0.5px] border-border overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <h2 className="text-sm font-semibold text-gray-900">Buyurtmalar tarixi</h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                navigate({
                  to: '/orders',
                  search: { customerId: id },
                } as any)
              }
              className="h-7 text-xs rounded-lg text-primary font-medium"
            >
              Barchasini ko'rish →
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {recentOrders.length === 0 ? (
              <div className="p-12 text-center">
                <ShoppingBag className="h-8 w-8 text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground font-medium">Buyurtmalar yo'q</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {recentOrders.map((order: any) => (
                  <div
                    key={order.id}
                    onClick={() =>
                      navigate({
                        to: '/orders/$id',
                        params: { id: order.id },
                      } as any)
                    }
                    className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/60 cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 font-mono">
                        #{order.orderNumber}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={order.status} type="order" />
                    <p className="text-sm font-bold text-gray-900 shrink-0">
                      {formatKRW(order.totalAmount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={blockDialog}
        onClose={() => setBlockDialog(false)}
        title="Mijozni bloklash"
        description={`${customer.firstName} ${
          customer.lastName ?? ''
        } bloklanadi. Buyurtma bera olmaydi.`}
        variant="destructive"
        loading={blockMutation.isPending}
        onConfirm={() => blockMutation.mutate(undefined)}
      />

      <ConfirmDialog
        open={unblockDialog}
        onClose={() => setUnblockDialog(false)}
        title="Blokni olib tashlash"
        description="Mijoz yana buyurtma bera oladi."
        loading={unblockMutation.isPending}
        onConfirm={() => unblockMutation.mutate()}
      />
    </div>
  )
}
