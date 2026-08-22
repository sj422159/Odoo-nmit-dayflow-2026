import type { TokenPair } from './types'

const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
const ACCESS_KEY = 'dayflow.access'
const REFRESH_KEY = 'dayflow.refresh'

/** Error shape the forms understand: a headline plus per-field messages. */
export class ApiError extends Error {
  status: number
  fields: Record<string, string>

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

export const tokens = {
  access: () => localStorage.getItem(ACCESS_KEY),
  refresh: () => localStorage.getItem(REFRESH_KEY),
  save(pair: TokenPair) {
    localStorage.setItem(ACCESS_KEY, pair.access_token)
    localStorage.setItem(REFRESH_KEY, pair.refresh_token)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

let refreshing: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  const token = tokens.refresh()
  if (!token) return false
  if (!refreshing) {
    refreshing = fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: token }),
    })
      .then(async (res) => {
        if (!res.ok) return false
        tokens.save(await res.json())
        return true
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

async function toError(res: Response): Promise<ApiError> {
  let detail = 'Something went wrong. Try again.'
  let fields: Record<string, string> = {}
  try {
    const body = await res.json()
    if (typeof body.detail === 'string') {
      detail = body.detail
    } else if (Array.isArray(body.detail)) {
      detail = body.detail.map((e: any) => `${e.loc ? e.loc.join('.') : 'error'}: ${e.msg}`).join('; ')
    }
    if (body.fields && typeof body.fields === 'object') fields = body.fields
  } catch {
    if (res.status === 0) detail = 'Cannot reach the server. Check that the API is running.'
  }
  return new ApiError(res.status, detail, fields)
}

interface RequestOptions {
  method?: string
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
  auth?: boolean
  retry?: boolean
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, retry = true } = options

  const url = new URL(`${BASE}${path}`, window.location.origin)
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }

  const isFormData = body instanceof FormData
  const headers: Record<string, string> = {}
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = tokens.access()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(url.toString().replace(window.location.origin, ''), {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check that the API is running.')
  }

  if (res.status === 401 && auth && retry && (await tryRefresh())) {
    return request<T>(path, { ...options, retry: false })
  }
  if (res.status === 401 && auth) {
    tokens.clear()
    window.dispatchEvent(new CustomEvent('dayflow:signed-out'))
  }
  if (!res.ok) throw await toError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}


export const api = {
  get: <T,>(path: string, query?: RequestOptions['query']) => request<T>(path, { query }),
  post: <T,>(path: string, body?: unknown, query?: RequestOptions['query']) =>
    request<T>(path, { method: 'POST', body, query }),
  put: <T,>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T,>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T,>(path: string) => request<T>(path, { method: 'DELETE' }),
  public: {
    post: <T,>(path: string, body?: unknown) =>
      request<T>(path, { method: 'POST', body, auth: false }),
  },
}

export function socketUrl(): string | null {
  const token = tokens.access()
  if (!token) return null
  const explicit = import.meta.env.VITE_WS_URL
  if (explicit) return `${explicit}?token=${encodeURIComponent(token)}`
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${BASE}/ws?token=${encodeURIComponent(token)}`
}
