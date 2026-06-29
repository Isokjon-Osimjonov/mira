const SORT_WHITELISTS: Record<string, string[]> = {
  products: ['name', 'price', 'createdAt', 'brandName'],
  orders: ['createdAt', 'totalAmount', 'orderNumber'],
  customers: ['createdAt', 'firstName', 'phone'],
  coupons: ['createdAt', 'code', 'usageCount'],
  expenses: ['expenseDate', 'amountKrw', 'createdAt'],
}

export function validateSort(domain: string, field: string): string {
  const allowed = SORT_WHITELISTS[domain]
  if (!allowed || !allowed.includes(field)) {
    return 'createdAt' // safe default
  }
  return field
}
