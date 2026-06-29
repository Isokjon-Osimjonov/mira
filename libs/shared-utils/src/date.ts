export const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })

export const formatDateTime = (d: string | Date) => new Date(d).toLocaleString('uz-UZ')

// Note: This currently only skips weekends (Saturday/Sunday).
// It does not account for public holidays.
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dayOfWeek = result.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // skip Sun(0)/Sat(6)
      added++
    }
  }
  return result
}
