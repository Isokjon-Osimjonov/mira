export const env = {
  apiUrl:    import.meta.env.VITE_API_URL as string,
  socketUrl: import.meta.env.VITE_SOCKET_URL as string,
  appName:   import.meta.env.VITE_APP_NAME ?? 'Mira Admin',
} as const
