import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Download,
  Phone,
  MapPin,
  Package,
  CheckCircle,
  XCircle,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { ordersApi } from '../../api/orders.api'
import { QK } from '../../constants/query-keys'
import {
  VALID_TRANSITIONS,
  TRANSITION_LABELS,
  TRANSITION_VARIANTS,
  ORDER_STATUS_LABELS,
} from '../../constants/order-transitions'
import { StatusBadge } from '../../components/ui/status-badge'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { EmptyState } from '../../components/shared/EmptyState'
import { formatKRW, formatUZS } from '../../utils/currency'
import { formatDateTime } from '../../utils/date'
import { useAuthStore } from '../../stores/auth.store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// ── Receipt image lightbox ─────────────────────────────────

function ReceiptLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center
                 justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white
                     text-sm font-medium"
        >
          ✕ Yopish
        </button>
        <img
          src={url}
          alt="To'lov cheki"
          className="w-full rounded-xl object-contain
                     max-h-[80vh]"
        />

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2
                     mt-3 text-white text-sm"
        >
          <ExternalLink className="h-4 w-4" />
          To'liq o'lchamda ochish
        </a>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────

interface Props {
  id: string
}

export function OrderDetailPage({ id }: Props) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const canWrite = useAuthStore((s) => s.canWrite)

  const [confirmAction, setConfirmAction] = useState<{ type: string; label: string } | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: QK.ORDER(id),
    queryFn: () => ordersApi.getById(id),
    enabled: !!id,
  })

  const order = data?.data

  const [invoiceLoading, setInvoiceLoading] = useState(false)

  const handleInvoiceDownload = async () => {
    setInvoiceLoading(true)
    try {
      await ordersApi.downloadInvoice(id)
      toast.success('Invoice yuklab olindi')
    } catch {
      toast.error('Invoice yuklab olinmadi')
    } finally {
      setInvoiceLoading(false)
    }
  }

  // ── Status update mutation ─────────────────────────────
  const statusMutation = useMutation({
    mutationFn: (newStatus: string) =>
      ordersApi.updateStatus(id, {
        status: newStatus,
        note: note || undefined,
      }),
    onSuccess: () => {
      toast.success('Holat yangilandi')
      qc.invalidateQueries({ queryKey: QK.ORDER(id) })
      qc.invalidateQueries({ queryKey: ['orders'] })
      setConfirmAction(null)
      setNote('')
    },
    onError: (_err: any) => {
      toast.error('Xatolik yuz berdi')
    },
  })

  // ── Payment mutation ───────────────────────────────────
  const paymentMutation = useMutation({
    mutationFn: (confirmed: boolean) => ordersApi.confirmPayment(id, confirmed, note || undefined),
    onSuccess: (_, confirmed) => {
      toast.success(confirmed ? "To'lov tasdiqlandi" : "To'lov rad etildi")
      qc.invalidateQueries({ queryKey: QK.ORDER(id) })
      qc.invalidateQueries({ queryKey: ['orders'] })
      setConfirmAction(null)
      setNote('')
    },
    onError: (_err: any) => {
      toast.error('Xatolik yuz berdi')
    },
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-8 w-48 bg-gray-100 rounded-lg" />
        <div
          className="h-48 bg-white rounded-xl
                        border-[0.5px] border-border"
        />
        <div
          className="h-64 bg-white rounded-xl
                        border-[0.5px] border-border"
        />
      </div>
    )
  }

  if (!order)
    return (
      <EmptyState
        message="Buyurtma topilmadi"
        action={
          <Button size="sm" variant="outline" onClick={() => navigate({ to: '/orders' })}>
            Orqaga
          </Button>
        }
      />
    )

  const nextStatuses = VALID_TRANSITIONS[order.status] ?? []
  const isUZB = order.deliveryRegion === 'UZB'

  return (
    <>
      {lightboxUrl && (
        <ReceiptLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}

      <div className="flex flex-col gap-4 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: '/orders' })}
              className="rounded-lg h-8 w-8 p-0 text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold text-gray-900">#{order.orderNumber}</h1>
                <StatusBadge status={order.status} type="order" />
              </div>
              <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={invoiceLoading}
            onClick={handleInvoiceDownload}
            className="rounded-lg gap-1.5 h-8 border-[0.5px] text-xs shrink-0"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">
              {invoiceLoading ? 'Yuklanmoqda...' : 'Faktura yuklab olish'}
            </span>
            <span className="sm:hidden">
              {invoiceLoading ? '...' : 'Invoice'}
            </span>
          </Button>
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* LEFT: Products */}
          <div
            className="lg:col-span-2 bg-white rounded-xl
                          border-[0.5px] border-border overflow-hidden"
          >
            <div
              className="flex items-center justify-between
                            px-4 py-3 border-b border-border/50"
            >
              <p
                className="text-xs font-semibold text-gray-900
                            uppercase tracking-wide"
              >
                Mahsulotlar
              </p>
              <span className="text-xs text-muted-foreground">
                {order.items?.length ?? 0} ta
              </span>
            </div>

            {/* Products table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-gray-50/50">
                    <th className="w-12 px-4 py-2.5" />
                    <th
                      className="px-4 py-2.5 text-left text-xs
                                   font-medium text-muted-foreground"
                    >
                      Mahsulot
                    </th>
                    <th
                      className="px-4 py-2.5 text-center text-xs
                                   font-medium text-muted-foreground
                                   w-16"
                    >
                      Miqdor
                    </th>
                    <th
                      className="px-4 py-2.5 text-right text-xs
                                   font-medium text-muted-foreground
                                   w-24"
                    >
                      Narx
                    </th>
                    <th
                      className="px-4 py-2.5 text-right text-xs
                                   font-medium text-muted-foreground
                                   w-24"
                    >
                      Jami
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {(order.items ?? []).map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-10 h-10 rounded-lg
                                       object-cover border-[0.5px]
                                       border-border"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-lg
                                          bg-gray-100 flex items-center
                                          justify-center"
                          >
                            <Package className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.brandName} · {item.barcode}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-gray-900">{item.quantity}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-muted-foreground">
                          {formatKRW(item.unitPrice)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatKRW(item.subtotal)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals row */}
            <div
              className="px-4 py-3 border-t border-border/50
                            bg-gray-50/50 space-y-1.5"
            >
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Mahsulotlar jami</span>
                <span>{formatKRW(order.subtotal)}</span>
              </div>
              {(order.discountAmount ?? 0) > 0 && (
                <div className="flex justify-between text-xs text-green-600">
                  <span>Kupon {order.couponCode ? `(${order.couponCode})` : ''}</span>
                  <span>-{formatKRW(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Kargo</span>
                <span>{(order.cargoFee ?? 0) > 0 ? formatKRW(order.cargoFee) : '0 ₩'}</span>
              </div>
              <div
                className="flex justify-between font-bold
                              text-sm text-gray-900 pt-1.5
                              border-t border-border/50"
              >
                <span>JAMI</span>
                <div className="text-right">
                  <p>{formatKRW(order.totalAmount)}</p>
                  {isUZB && order.krwToUzsRate && (
                    <p className="text-[11px] font-normal text-muted-foreground">
                      ≈ {formatUZS(Math.round(order.totalAmount * order.krwToUzsRate))}
                    </p>
                  )}
                </div>
              </div>
              
              {isUZB && order.krwToUzsRate && (
                <div className="flex justify-between text-[11px] text-muted-foreground pt-1 border-t border-dashed border-border/50">
                  <span>Valyuta kursi (to'lov kuni)</span>
                  <span>1 ₩ = {order.krwToUzsRate.toLocaleString()} so'm</span>
                </div>
              )}

              {order.paymentConfirmedAt && (
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>To'lov tasdiqlangan</span>
                  <span>{formatDateTime(order.paymentConfirmedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Summary cards */}
          <div className="flex flex-col gap-3">
            {/* Card 1: Customer */}
            <div className="bg-white rounded-xl border-[0.5px] border-border p-4">
              <p
                className="text-xs font-semibold text-muted-foreground
                            uppercase tracking-wide mb-3"
              >
                Mijoz
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full bg-primary/10
                                flex items-center justify-center
                                text-sm font-bold text-primary shrink-0"
                >
                  {order.customerName?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" strokeWidth={1.5} />
                    {order.customerPhone}
                  </p>
                </div>
                <span
                  className={cn(
                    'ml-auto text-[10px] font-medium px-1.5 py-0.5',
                    'rounded border-[0.5px] shrink-0',
                    order.deliveryRegion === 'KOR'
                      ? 'bg-blue-50 text-blue-600 border-blue-200'
                      : 'bg-green-50 text-green-600 border-green-200'
                  )}
                >
                  {order.deliveryRegion}
                </span>
              </div>
            </div>

            {/* Card 2: Delivery address */}
            <div className="bg-white rounded-xl border-[0.5px] border-border p-4">
              <p
                className="text-xs font-semibold text-muted-foreground
                            uppercase tracking-wide mb-3"
              >
                Yetkazib berish manzili
              </p>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">{order.deliveryFullName}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" strokeWidth={1.5} />
                  {order.deliveryPhone}
                </p>
                <p className="text-xs text-muted-foreground flex items-start gap-1 pt-1">
                  <MapPin className="h-3 w-3 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span>
                    {order.deliveryAddressLine1}
                    {order.deliveryCity ? `, ${order.deliveryCity}` : ''}
                    {order.deliveryProvince ? `, ${order.deliveryProvince}` : ''}
                    {order.deliveryPostalCode ? ` ${order.deliveryPostalCode}` : ''}
                  </span>
                </p>
              </div>
            </div>

            {/* Card 3: Receipt (if exists) */}
            {order.receiptUrl && (
              <div className="bg-white rounded-xl border-[0.5px] border-border p-4">
                <p
                  className="text-xs font-semibold text-muted-foreground
                              uppercase tracking-wide mb-3"
                >
                  Kvitansiya
                </p>
                <div
                  onClick={() => setLightboxUrl(order.receiptUrl)}
                  className="cursor-pointer group relative
                             rounded-xl overflow-hidden
                             border-[0.5px] border-border"
                >
                  <img
                    src={order.receiptUrl}
                    alt="Kvitansiya"
                    className="w-full h-36 object-cover
                               group-hover:scale-105
                               transition-transform duration-200"
                  />
                  <div
                    className="absolute inset-0 bg-black/0
                                  group-hover:bg-black/10
                                  transition-colors flex items-end
                                  justify-center pb-2"
                  >
                    <span
                      className="text-white text-xs opacity-0
                                     group-hover:opacity-100
                                     transition-opacity font-medium"
                    >
                      Kattalashtirish uchun bosing
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setLightboxUrl(order.receiptUrl)}
                  className="flex items-center gap-1.5 mt-2
                             text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                  Chekni ochish
                </button>

                {/* Payment action buttons */}
                {order.status === 'PAYMENT_SUBMITTED' && canWrite('orders') && (
                  <div
                    className="flex gap-2 mt-3 pt-3
                                  border-t border-border/50"
                  >
                    <Button
                      size="sm"
                      className="flex-1 rounded-lg gap-1.5 h-8
                                 text-xs bg-green-600
                                 hover:bg-green-700"
                      onClick={() =>
                        setConfirmAction({
                          type: 'CONFIRM_PAYMENT',
                          label: "To'lovni tasdiqlash",
                        })
                      }
                    >
                      <CheckCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Tasdiqlash
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-lg gap-1.5 h-8
                                 text-xs border-red-200 text-red-600
                                 hover:bg-red-50"
                      onClick={() =>
                        setConfirmAction({
                          type: 'REJECT_PAYMENT',
                          label: "To'lovni rad etish",
                        })
                      }
                    >
                      <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Rad etish
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Card 4: Status actions */}
            {nextStatuses.length > 0 && canWrite('orders') && (
              <div className="bg-white rounded-xl border-[0.5px] border-border p-4">
                <p
                  className="text-xs font-semibold text-muted-foreground
                              uppercase tracking-wide mb-3"
                >
                  Harakatlar
                </p>
                <div className="flex flex-col gap-2">
                  {nextStatuses
                    .filter((s) => s !== 'PAYMENT_CONFIRMED' && s !== 'PAYMENT_REJECTED')
                    .map((nextStatus) => (
                      <Button
                        key={nextStatus}
                        size="sm"
                        variant={TRANSITION_VARIANTS[nextStatus]}
                        className="rounded-lg w-full h-8 text-xs"
                        onClick={() =>
                          setConfirmAction({
                            type: nextStatus,
                            label: TRANSITION_LABELS[nextStatus],
                          })
                        }
                      >
                        {TRANSITION_LABELS[nextStatus]}
                      </Button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.label ?? ''}
        description={
          confirmAction?.type === 'REJECT_PAYMENT'
            ? "To'lov rad etiladi. Mijozga xabar yuboriladi."
            : confirmAction?.type === 'CANCELED'
            ? "Buyurtma bekor qilinadi. Bu amalni qaytarib bo'lmaydi."
            : `Buyurtma holati "${
                ORDER_STATUS_LABELS[confirmAction?.type ?? '']
              }" ga o'zgaradi.`
        }
        loading={statusMutation.isPending || paymentMutation.isPending}
        variant={
          confirmAction?.type === 'CANCELED' || confirmAction?.type === 'REJECT_PAYMENT'
            ? 'destructive'
            : 'default'
        }
        onConfirm={() => {
          if (!confirmAction) return
          if (confirmAction.type === 'CONFIRM_PAYMENT') {
            paymentMutation.mutate(true)
          } else if (confirmAction.type === 'REJECT_PAYMENT') {
            paymentMutation.mutate(false)
          } else {
            statusMutation.mutate(confirmAction.type)
          }
        }}
      />
    </>
  )
}
