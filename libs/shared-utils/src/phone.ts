import type { Region } from '../../shared-types/src/common'

export const getRegionFromPhone = (phone: string): Region => {
  const p = phone.replace(/\s/g, '')
  if (p.startsWith('+998') || p.startsWith('998')) return 'UZB'
  if (p.startsWith('+82') || p.startsWith('82')) return 'KOR'
  return 'UZB'
}

export const normalizePhone = (phone: string): string =>
  phone.startsWith('+') ? phone : `+${phone}`
