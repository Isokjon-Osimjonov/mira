// API Response Envelope — used by ALL endpoints
// Server MUST always return one of these two shapes

export interface ApiMeta {
  page: number
  limit: number
  total: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ApiSuccess<T> {
  data: T
  error: null
  meta?: ApiMeta
}

export interface ApiErrorShape {
  data: null
  error: {
    message: string
    code?: string // 'UNAUTHORIZED' | 'NOT_FOUND' | 'RATE_LIMITED' | ...
    field?: string // for form field errors
    details?: Record<string, string[]>
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorShape

export interface PaginatedData<T> {
  items: T[]
  meta: ApiMeta
}

// Type guards
export function isApiError<T>(res: ApiResponse<T>): res is ApiErrorShape {
  return res.error !== null
}

export function isApiSuccess<T>(res: ApiResponse<T>): res is ApiSuccess<T> {
  return res.error === null && res.data !== null
}

// Standard error codes
export const API_ERRORS = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL_ERROR',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
} as const

export type ApiErrorCode = (typeof API_ERRORS)[keyof typeof API_ERRORS]
