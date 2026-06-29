import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns'
import { uz } from 'date-fns/locale'

// DD.MM.YYYY
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd.MM.yyyy')
}

// DD.MM.YYYY HH:mm
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd.MM.yyyy HH:mm')
}

// Relative: "2 soat oldin", "kecha"
export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return formatDistanceToNow(d, { addSuffix: true, locale: uz })
  if (isYesterday(d)) return `Kecha ${format(d, 'HH:mm')}`
  return formatDateTime(d)
}

// Payment deadline countdown
export function formatDeadline(deadline: string | Date): {
  text: string
  urgent: boolean
  expired: boolean
} {
  const d = typeof deadline === 'string' ? parseISO(deadline) : deadline
  const diff = d.getTime() - Date.now()
  if (diff <= 0) return { text: "Muddati o'tgan", urgent: true, expired: true }
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  if (mins <= 10) return { text: `${mins} daqiqa`, urgent: true, expired: false }
  if (mins <= 60) return { text: `${mins} daqiqa`, urgent: false, expired: false }
  if (hours <= 24) return { text: `${hours} soat`, urgent: false, expired: false }
  return { text: formatDateTime(d), urgent: false, expired: false }
}
