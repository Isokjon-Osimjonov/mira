export const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })

export const formatDateTime = (d: string | Date) =>
  new Date(d).toLocaleString('uz-UZ')
