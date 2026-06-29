import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
// @ts-ignore
import createAuthRefreshInterceptor from 'axios-auth-refresh'

export interface CreateClientOptions {
  baseURL: string
  timeout?: number
  getAccessToken: () => string | null
  onRefresh: (failedRequest: any) => Promise<void>
  withCredentials?: boolean
}

export function createApiClient(opts: CreateClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL: opts.baseURL,
    timeout: opts.timeout ?? 15_000,
    withCredentials: opts.withCredentials ?? false,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  })

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = opts.getAccessToken()
    if (token && config.headers) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  client.interceptors.response.use(
    (r) => r,
    (error) => {
      if (!error.response) {
        return Promise.reject({
          response: {
            data: { data: null, error: { message: 'Tarmoq xatosi.', code: 'NETWORK_ERROR' } },
            status: 0,
          },
        })
      }
      return Promise.reject(error)
    }
  )

  // @ts-ignore
  createAuthRefreshInterceptor(client, opts.onRefresh, {
    statusCodes: [401],
    retryInstance: client,
  })

  return client
}
