import { useState, useRef, useEffect, useCallback } from 'react'
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
  ScanBarcode,
  Camera,
  X,
  Tag,
} from 'lucide-react'
import { BrowserMultiFormatReader } from '@zxing/browser'
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
import { Input } from '@/components/ui/input'

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

  const [barcodeInput, setBarcodeInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const [showCamera, setShowCamera] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)

  const [estimateDialog, setEstimateDialog] = useState(false)
  const [estStart, setEstStart] = useState('')
  const [estEnd, setEstEnd] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: QK.ORDER(id),
    queryFn: () => ordersApi.getById(id),
    enabled: !!id,
  })

  const order = data?.data

  const scanMutation = useMutation({
    mutationFn: (barcode: string) => ordersApi.scanOrderItem(id, barcode),
    onSuccess: (res) => {
      if (res.data.alreadyScanned) {
        toast.info(`${res.data.productName || 'Mahsulot'} allaqachon skanerlangan`)
      } else {
        toast.success(`${res.data.productName || 'Mahsulot'} ✓ skanerlandi`)
        if (res.data.allScanned) {
          toast.success('🎉 Barcha mahsulotlar skanerlandi! Qadoqlashni boshlashingiz mumkin.', {
            duration: 5000,
          })
        }
      }
      setBarcodeInput('')
      qc.invalidateQueries({ queryKey: QK.ORDER(id) })
      if (!showCamera) {
        inputRef.current?.focus()
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || 'Skanerlashda xatolik'
      toast.error(msg)
      setBarcodeInput('')
      if (!showCamera) {
        inputRef.current?.focus()
      }
    },
  })

  const handleScan = useCallback((overrideBarcode?: string) => {
    const code = overrideBarcode ?? inputRef.current?.value.trim() ?? barcodeInput.trim()
    if (!code || scanMutation.isPending) return
    
    scanMutation.mutate(code)
    setBarcodeInput('')
    if (inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.focus()
    }
  }, [barcodeInput, scanMutation])

  const handleCameraOpen = async () => {
    setShowCamera(true)
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader
    try {
      // Need to wait for the videoRef to be available in the DOM
      setTimeout(async () => {
        if (!videoRef.current) return
        await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          if (result) {
            const code = result.getText()
            stopCamera()
            setBarcodeInput(code)
            // Auto-scan after small delay to let UI update
            setTimeout(() => handleScan(code), 300)
          }
        })
      }, 100)
    } catch (err) {
      console.error('Camera error:', err)
      toast.error('Kamerani yoqishda xatolik')
      setShowCamera(false)
    }
  }

  const stopCamera = () => {
    setShowCamera(false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // clean up logic if needed
    }
  }, [])

  useEffect(() => {
    if (order?.estimatedDeliveryStart) setEstStart(order.estimatedDeliveryStart)
    if (order?.estimatedDeliveryEnd) setEstEnd(order.estimatedDeliveryEnd)
  }, [order])

  // Auto-focus input when component mounts or status changes to Packing/Confirmed
  useEffect(() => {
    if ((order?.status === 'PAYMENT_CONFIRMED' || order?.status === 'PACKING') && !showCamera) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300)
      return () => clearTimeout(timer)
    }
  }, [order?.status, showCamera])

  const [invoiceLoading, setInvoiceLoading] = useState(false)

  const handleInvoiceDownload = () => {
    const token = useAuthStore.getState().accessToken
    const base = (import.meta.env.VITE_API_URL || '').replace('/api/v1', '')
    window.open(`${base}/api/v1/admin/orders/${id}/invoice?token=${token}`, '_blank')
  }

  // ── Status update mutation ─────────────────────────────
  const statusMutation = useMutation({
    mutationFn: (newStatus: string) =>
      ordersApi.updateStatus(id, {
        status: newStatus,
        note: note || undefined,
      }),
    onSuccess: () => {
      qc.removeQueries()
      toast.success('Holat yangilandi')
      setConfirmAction(null)
      setNote('')
    },
    onError: (_err: any) => {
      toast.error(_err.response?.data?.error?.message || 'Xatolik yuz berdi')
    },
  })

  // ── Payment mutation ───────────────────────────────────
  const paymentMutation = useMutation({
    mutationFn: (confirmed: boolean) => ordersApi.confirmPayment(id, confirmed, note || undefined),
    onSuccess: (_, confirmed) => {
      qc.removeQueries()
      toast.success(confirmed ? "To'lov tasdiqlandi" : "To'lov rad etildi")
      setConfirmAction(null)
      setNote('')
    },
    onError: (_err: any) => {
      toast.error(_err.response?.data?.error?.message || 'Xatolik yuz berdi')
    },
  })

  // ── Delivery Estimate mutation ─────────────────────────
  const estimateMut = useMutation({
    mutationFn: () => ordersApi.updateDeliveryEstimate(id, estStart, estEnd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.ORDER(id) })
      toast.success('Yetkazib berish muddati yangilandi')
      setEstimateDialog(false)
    },
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-8 w-48 bg-gray-100 rounded-lg" />
        <div className="h-48 bg-white rounded-xl border-[0.5px] border-border" />
        <div className="h-64 bg-white rounded-xl border-[0.5px] border-border" />
      </div>
    )
  }

  if (!order) {
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
  }

  const orderItems = order?.items ?? []
  const scannedCount = orderItems.filter((item: any) => item.isScanned).length
  const totalCount = orderItems.length
  const allScanned = totalCount > 0 && orderItems.every((item: any) => item.isScanned)

  const nextStatuses = VALID_TRANSITIONS[order.status] ?? []
  const isUZB = order.deliveryRegion === 'UZB'

  return (
    <>
      {lightboxUrl && <ReceiptLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

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
            <span className="sm:hidden">{invoiceLoading ? '...' : 'Invoice'}</span>
          </Button>
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* LEFT: Products & Scanning */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Scanning section (only for Confirmed or Packing) */}
            {(order.status === 'PAYMENT_CONFIRMED' || order.status === 'PACKING') && (
              <div className="bg-white rounded-xl border-[0.5px] border-border overflow-hidden p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ScanBarcode className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                      Mahsulotlarni skanerlash
                    </p>
                    <span
                      className={cn(
                        'text-[11px] font-bold ml-2',
                        allScanned ? 'text-[#16A34A]' : 'text-[#D97706]'
                      )}
                    >
                      {scannedCount} / {totalCount} ta skanerlandi
                    </span>
                  </div>
                  {allScanned && (
                    <span className="text-[11px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Hammasi tayyor
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  {(order.items ?? []).map((item: any) => (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg border-[0.5px] transition-colors',
                        item.isScanned
                          ? 'bg-[#F0FDF4] border-green-200'
                          : 'bg-gray-50/30 border-border/50'
                      )}
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="w-10 h-10 rounded-md object-cover border-[0.5px] border-border bg-white"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.productName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.barcode} · {item.quantity} ta
                        </p>
                      </div>
                      {item.isScanned ? (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-green-600 bg-white px-2 py-1 rounded-md border border-green-100 shadow-sm">
                          <CheckCircle className="h-3 w-3" />✓ Skanerlandi
                        </div>
                      ) : (
                        <div className="text-[11px] font-medium text-muted-foreground bg-white px-2 py-1 rounded-md border border-border shadow-sm">
                          Kutilmoqda
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      ref={inputRef}
                      placeholder="Barkodni skanerlang yoki kiriting"
                      value={barcodeInput}
                      onChange={(e) => {
                        const val = e.target.value
                        setBarcodeInput(val)

                        const isExactMatch = orderItems?.some(
                          (item: any) => item.barcode === val.trim() || item.product?.barcode === val.trim()
                        )

                        if (isExactMatch && val.trim()) {
                          setTimeout(() => {
                            scanMutation.mutate(val.trim())
                            setBarcodeInput('')
                            if (inputRef.current) {
                              inputRef.current.value = ''
                              inputRef.current.focus()
                            }
                          }, 50)
                        }
                      }}
                      onPaste={(e) => {
                        const pasted = e.clipboardData.getData('text').trim()
                        if (!pasted) return

                        setBarcodeInput(pasted)

                        const isExactMatch = orderItems?.some(
                          (item: any) => item.barcode === pasted || item.product?.barcode === pasted
                        )

                        if (isExactMatch) {
                          e.preventDefault()
                          setTimeout(() => {
                            scanMutation.mutate(pasted)
                            setBarcodeInput('')
                            if (inputRef.current) {
                              inputRef.current.value = ''
                              inputRef.current.focus()
                            }
                          }, 0)
                        }
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                      className="h-9 text-sm pr-10 rounded-lg border-border/50 focus:ring-primary"
                      disabled={scanMutation.isPending}
                    />
                    <ScanBarcode className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleScan()}
                    disabled={!barcodeInput || scanMutation.isPending}
                    className="rounded-lg h-9 px-4"
                  >
                    {scanMutation.isPending ? '...' : 'Skanerlash'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'rounded-lg h-9 px-3 border-border/50',
                      showCamera &&
                        'bg-primary text-white border-primary hover:bg-primary/90 hover:text-white'
                    )}
                    onClick={showCamera ? stopCamera : handleCameraOpen}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>

                {showCamera && (
                  <div className="mt-4 relative rounded-xl overflow-hidden bg-black aspect-video">
                    <video ref={videoRef} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-white/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
                      <div className="absolute top-1/2 left-0 right-0 h-[0.5px] bg-red-500/50 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    </div>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/40 text-white hover:bg-black/60 border-none"
                      onClick={stopCamera}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="absolute bottom-2 left-0 right-0 text-center">
                      <p className="text-[10px] text-white/80 font-medium">
                        Skanerlash uchun barkodni kvadratga joylashtiring
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-xl border-[0.5px] border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                  Mahsulotlar
                </p>
                <span className="text-xs text-muted-foreground">{order.items?.length ?? 0} ta</span>
              </div>

              {/* Products table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-gray-50/50">
                      <th className="w-12 px-4 py-2.5" />
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                        Mahsulot
                      </th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground w-16">
                        Miqdor
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground w-24">
                        Narx
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground w-24">
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
                              className="w-10 h-10 min-w-[2.5rem] shrink-0 rounded-lg object-cover border-[0.5px] border-border"
                            />
                          ) : (
                            <div className="w-10 h-10 min-w-[2.5rem] shrink-0 rounded-lg bg-gray-100 flex items-center justify-center">
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
              <div className="px-4 py-3 border-t border-border/50 bg-gray-50/50 space-y-1.5">
                {/* PLACE 1 — Kupon near top of totals if no payment info card exists, or just inside totals */}
                {order.couponCode && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Tag size={14} />
                      Kupon
                    </span>
                    <span className="text-sm font-mono bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200">
                      {order.couponCode}
                    </span>
                  </div>
                )}
                
                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mahsulotlar jami</span>
                  <span>{formatKRW(order.subtotal)}</span>
                </div>

                {/* Coupon discount — show only if applied */}
                {order.couponCode && Number(order.discountAmount) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Tag size={12} />
                      Kupon chegirmasi ({order.couponCode})
                    </span>
                    <span>−{formatKRW(order.discountAmount)}</span>
                  </div>
                )}

                {/* Cargo fee */}
                {Number(order.cargoFee) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Yetkazib berish</span>
                    <span>{formatKRW(order.cargoFee)}</span>
                  </div>
                )}

                {/* Box cost */}
                {Number(order.boxCostKrw) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quti narxi</span>
                    <span>{formatKRW(order.boxCostKrw)}</span>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between font-semibold text-base border-t pt-2 mt-1">
                  <span>Jami to'lov</span>
                  <div className="text-right">
                    <span>{formatKRW(order.totalAmount)}</span>
                    {isUZB && order.krwToUzsRate && (
                      <p className="text-[11px] font-normal text-muted-foreground mt-0.5">
                        ≈ {formatUZS(Math.round(order.totalAmount * order.krwToUzsRate))}
                      </p>
                    )}
                  </div>
                </div>

                {/* Savings summary */}
                {Number(order.discountAmount) > 0 && (
                  <div className="flex justify-between text-xs text-green-600 mt-1">
                    <span>✨ Tejaldi</span>
                    <span>{formatKRW(order.discountAmount)}</span>
                  </div>
                )}

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
          </div>

          {/* RIGHT: Summary cards */}
          <div className="flex flex-col gap-3">
            {/* Mijoz Card */}
            <div className="bg-white rounded-xl border-[0.5px] border-border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Mijoz
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
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
                    'ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded border-[0.5px] shrink-0',
                    order.deliveryRegion === 'KOR'
                      ? 'bg-blue-50 text-blue-600 border-blue-200'
                      : 'bg-green-50 text-green-600 border-green-200'
                  )}
                >
                  {order.deliveryRegion}
                </span>
              </div>
            </div>

            {/* Address Card */}
            <div className="bg-white rounded-xl border-[0.5px] border-border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
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

            {/* Delivery Estimate Card */}
            {isUZB && (
              <div className="bg-white rounded-xl border-[0.5px] border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Yetkazib berish muddati
                  </p>
                  {canWrite('orders') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2 text-primary"
                      onClick={() => setEstimateDialog(true)}
                    >
                      Tahrirlash
                    </Button>
                  )}
                </div>
                {order.estimatedDeliveryStart && order.estimatedDeliveryEnd ? (
                  <p className="text-sm font-medium text-gray-900">
                    {formatDateTime(order.estimatedDeliveryStart).split(' ')[0]} —{' '}
                    {formatDateTime(order.estimatedDeliveryEnd).split(' ')[0]}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Belgilanmagan</p>
                )}
              </div>
            )}

            {/* Receipt Card */}
            {order.receiptUrl && (
              <div className="bg-white rounded-xl border-[0.5px] border-border p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Kvitansiya
                </p>
                <div
                  onClick={() => setLightboxUrl(order.receiptUrl)}
                  className="cursor-pointer group relative rounded-xl overflow-hidden border-[0.5px] border-border"
                >
                  <img
                    src={order.receiptUrl}
                    alt="Kvitansiya"
                    className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-center pb-2">
                    <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                      Kattalashtirish uchun bosing
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setLightboxUrl(order.receiptUrl)}
                  className="flex items-center gap-1.5 mt-2 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                  Chekni ochish
                </button>

                {order.status === 'PAYMENT_SUBMITTED' && canWrite('orders') && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                    <Button
                      size="sm"
                      className="flex-1 rounded-lg gap-1.5 h-8 text-xs bg-green-600 hover:bg-green-700"
                      onClick={() =>
                        setConfirmAction({ type: 'CONFIRM_PAYMENT', label: "To'lovni tasdiqlash" })
                      }
                    >
                      <CheckCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Tasdiqlash
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-lg gap-1.5 h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() =>
                        setConfirmAction({ type: 'REJECT_PAYMENT', label: "To'lovni rad etish" })
                      }
                    >
                      <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Rad etish
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Actions Card */}
            {nextStatuses.length > 0 && canWrite('orders') && (
              <div className="bg-white rounded-xl border-[0.5px] border-border p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Harakatlar
                </p>
                <div className="flex flex-col gap-2">
                  {nextStatuses
                    .filter((s) => s !== 'PAYMENT_CONFIRMED' && s !== 'PAYMENT_REJECTED')
                    .map((nextStatus) => {
                      const isPacking = nextStatus === 'PACKING'
                      const packingDisabled = isPacking && !allScanned

                      return (
                        <div key={nextStatus} className="space-y-1">
                          <Button
                            size="sm"
                            variant={TRANSITION_VARIANTS[nextStatus]}
                            className={cn(
                              'rounded-lg w-full h-8 text-xs',
                              nextStatus === 'SHIPPED' &&
                                allScanned &&
                                'ring-2 ring-primary ring-offset-2 bg-primary hover:bg-primary/90 text-white font-bold',
                              isPacking && allScanned && 'bg-primary hover:bg-primary/90 text-white'
                            )}
                            disabled={packingDisabled || statusMutation.isPending}
                            onClick={() =>
                              setConfirmAction({
                                type: nextStatus,
                                label: TRANSITION_LABELS[nextStatus],
                              })
                            }
                          >
                            {isPacking && allScanned
                              ? '✓ Barcha skanerlandi — Qadoqlashni boshlash'
                              : TRANSITION_LABELS[nextStatus]}
                          </Button>
                          {isPacking && !allScanned && order.status === 'PAYMENT_CONFIRMED' && (
                            <p className="text-[10px] text-[#D97706] text-center font-medium">
                              Barcha mahsulotlarni skanerlang
                            </p>
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.label ?? ''}
        description={
          confirmAction?.type === 'REJECT_PAYMENT'
            ? "To'lov rad etiladi. Mijozga xabar yuboriladi."
            : confirmAction?.type === 'CANCELED'
              ? "Buyurtma bekor qilinadi. Bu amalni qaytarib bo'lmaydi."
              : `Buyurtma holati "${ORDER_STATUS_LABELS[confirmAction?.type ?? '']}" ga o'zgaradi.`
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

      <ConfirmDialog
        open={estimateDialog}
        onClose={() => setEstimateDialog(false)}
        title="Yetkazib berish muddatini tahrirlash"
        description="Mijozga ko'rinadigan taxminiy yetkazib berish vaqtini o'zgartiring"
        loading={estimateMut.isPending}
        onConfirm={() => estimateMut.mutate()}
        customBody={
          <div className="flex flex-col gap-3 py-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Boshlanish sanasi</label>
              <Input type="date" value={estStart} onChange={(e) => setEstStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Tugash sanasi</label>
              <Input type="date" value={estEnd} onChange={(e) => setEstEnd(e.target.value)} />
            </div>
          </div>
        }
      />
    </>
  )
}
