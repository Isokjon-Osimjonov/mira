export const env = {
  apiUrl:    import.meta.env.VITE_API_URL    as string ?? 'http://localhost:4000',
  socketUrl: import.meta.env.VITE_SOCKET_URL as string ?? 'http://localhost:4000',
  appName:   import.meta.env.VITE_APP_NAME  as string ?? 'Mira Admin',
} as const

// Sanity check (dev only)
if (import.meta.env.DEV) {
  console.log('[env] apiUrl:', env.apiUrl)
  console.log('[env] socketUrl:', env.socketUrl)
}
