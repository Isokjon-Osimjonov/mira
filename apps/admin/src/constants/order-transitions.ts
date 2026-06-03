export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "To'lov kutilmoqda",
  PAYMENT_SUBMITTED: "To'lov yuborildi",
  PAYMENT_CONFIRMED: "To'lov tasdiqlandi",
  PAYMENT_REJECTED: "To'lov rad etildi",
  PACKING: 'Tayyorlanmoqda',
  SHIPPED: "Jo'natildi",
  DELIVERED: 'Yetkazildi',
  CANCELED: 'Bekor qilindi',
  REFUNDED: 'Qaytarildi',
}

// Valid transitions (only these buttons shown)
export const VALID_TRANSITIONS: Record<string, string[]> = {
  PAYMENT_CONFIRMED: ['PACKING'],
  PACKING: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  PAYMENT_SUBMITTED: ['PAYMENT_CONFIRMED', 'PAYMENT_REJECTED'],
  PENDING_PAYMENT: ['CANCELED'],
  PAYMENT_REJECTED: ['CANCELED'],
}

export const TRANSITION_LABELS: Record<string, string> = {
  PACKING: 'Qadoqlashga',
  SHIPPED: "Jo'natildi",
  DELIVERED: 'Yetkazildi',
  REFUNDED: 'Qaytarildi',
  PAYMENT_CONFIRMED: "To'lovni tasdiqlash",
  PAYMENT_REJECTED: "To'lovni rad etish",
  CANCELED: 'Bekor qilish',
}

export const TRANSITION_VARIANTS: Record<string, 'default' | 'destructive' | 'outline'> = {
  PACKING: 'default',
  SHIPPED: 'default',
  DELIVERED: 'default',
  REFUNDED: 'outline',
  PAYMENT_CONFIRMED: 'default',
  PAYMENT_REJECTED: 'destructive',
  CANCELED: 'destructive',
}
