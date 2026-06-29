const getApiUrl = () => {
  if (!import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL
  }
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl
  }
  const currentHost = window.location.hostname
  return `http://${currentHost}:4000/api/v1`
}

const getSocketUrl = () => {
  if (!import.meta.env.DEV) {
    return import.meta.env.VITE_SOCKET_URL
  }
  const envUrl = import.meta.env.VITE_SOCKET_URL
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl
  }
  const currentHost = window.location.hostname
  return `http://${currentHost}:4000`
}

export const env = {
  apiUrl:    getApiUrl()    as string ?? 'http://localhost:4000/api/v1',
  socketUrl: getSocketUrl() as string ?? 'http://localhost:4000',
  appName:   import.meta.env.VITE_APP_NAME  as string ?? 'Mira Admin',
} as const

// Sanity check (dev only)
if (import.meta.env.DEV) {
  console.log('[env] apiUrl:', env.apiUrl)
  console.log('[env] socketUrl:', env.socketUrl)
}
