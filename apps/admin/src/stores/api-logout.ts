// Separate file to avoid circular import in store
import { api } from '../lib/api'
export async function apiLogout(): Promise<void> {
  await api.post('/admin/auth/logout').catch(() => {})
}
