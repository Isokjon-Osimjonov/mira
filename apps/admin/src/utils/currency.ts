// KRW formatting
export function formatKRW(amount: number | bigint): string {
  const num = typeof amount === 'bigint' ? Number(amount) : amount
  return `₩${Math.round(num).toLocaleString('ko-KR')}`
}

// UZS formatting
export function formatUZS(amount: number | bigint): string {
  const num = typeof amount === 'bigint' ? Number(amount) : amount
  return `${num.toLocaleString('uz-UZ')} so'm`
}

// Auto-format by region
export function formatPrice(amountKrw: number, region: 'UZB' | 'KOR', krwToUzs?: number): string {
  if (region === 'UZB' && krwToUzs) {
    const uzs = Math.round(amountKrw * krwToUzs)
    return formatUZS(uzs)
  }
  return formatKRW(amountKrw)
}

// Dual display (both currencies)
export function formatDualPrice(
  amountKrw: number,
  krwToUzs?: number
): { krw: string; uzs: string | null } {
  return {
    krw: formatKRW(amountKrw),
    uzs: krwToUzs ? formatUZS(Math.round(amountKrw * krwToUzs)) : null,
  }
}

// Compact large numbers
export function formatCompact(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`
  return amount.toLocaleString()
}
