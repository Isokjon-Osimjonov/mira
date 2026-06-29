export const formatKRW = (amount: number): string => {
  return `₩${Math.round(amount).toLocaleString('ko-KR')}`
}

export const formatUZS = (amount: number): string => {
  return `${Math.round(amount).toLocaleString('uz-UZ')} so'm`
}

export const krwToUzs = (krw: number, rate: number): number => {
  return Math.round(krw * rate)
}

export const formatCountdown = (deadline: string | null): string => {
  if (!deadline) return ''
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff <= 0) return 'Muddat tugadi'
  const totalSec = Math.floor(diff / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr)
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
