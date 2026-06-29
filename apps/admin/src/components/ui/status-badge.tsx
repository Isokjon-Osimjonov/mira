import { cn } from '@/lib/utils'

const ORDER_STATUS_CONFIG = {
  PENDING_PAYMENT: {
    label: "To'lov kutilmoqda",
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  PAYMENT_SUBMITTED: {
    label: "To'lov yuborildi",
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  PAYMENT_CONFIRMED: {
    label: "To'lov tasdiqlandi",
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  PAYMENT_REJECTED: {
    label: "To'lov rad etildi",
    classes: 'bg-red-50 text-red-700 border-red-200',
  },
  PACKING: {
    label: 'Tayyorlanmoqda',
    classes: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  SHIPPED: {
    label: "Jo'natildi",
    classes: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  DELIVERED: {
    label: 'Yetkazildi',
    classes: 'bg-green-50 text-green-700 border-green-200',
  },
  CANCELED: {
    label: 'Bekor qilindi',
    classes: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  REFUNDED: {
    label: 'Qaytarildi',
    classes: 'bg-orange-50 text-orange-700 border-orange-200',
  },
} as const

const STOCK_STATUS_CONFIG = {
  ok: { label: 'Normal', classes: 'bg-green-50 text-green-700 border-green-200' },
  low: { label: 'Kam', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  out: { label: 'Tugagan', classes: 'bg-red-50 text-red-700 border-red-200' },
  dead: { label: 'Harakatsiz', classes: 'bg-gray-100 text-gray-600 border-gray-200' },
  expiring_soon: {
    label: 'Muddati yaqin',
    classes: 'bg-orange-50 text-orange-700 border-orange-200',
  },
} as const

interface StatusBadgeProps {
  status: string
  type?: 'order' | 'stock' | 'generic'
  size?: 'sm' | 'md'
  dot?: boolean
}

export function StatusBadge({ status, type = 'order', size = 'sm', dot = true }: StatusBadgeProps) {
  const config =
    type === 'order'
      ? ORDER_STATUS_CONFIG[status as keyof typeof ORDER_STATUS_CONFIG]
      : type === 'stock'
        ? STOCK_STATUS_CONFIG[status as keyof typeof STOCK_STATUS_CONFIG]
        : null

  if (!config) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md
                        text-xs font-medium bg-gray-100 text-gray-600
                        border-[0.5px] border-gray-200"
      >
        {status}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-md',
        'border-[0.5px] tracking-wide',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        config.classes
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {config.label}
    </span>
  )
}
