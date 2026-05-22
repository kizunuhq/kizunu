import { ApiError } from './api-error'

export const API_URL =
  (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? 'http://localhost:3001'

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

const NO_CONTENT = 204

interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  signal?: AbortSignal
}

interface ErrorEnvelope {
  code?: string
  message?: string
  context?: unknown
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options

  let response: Response
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch {
    throw new ApiError(
      0,
      'network.unreachable',
      'Unable to connect to the server. Check your connection.',
    )
  }

  if (response.status === NO_CONTENT) return {} as T

  const data = (await response.json().catch(() => ({}))) as ErrorEnvelope

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.code ?? 'unknown',
      data.message ?? 'An unexpected error occurred.',
      data.context,
    )
  }

  return data as T
}

type QueryParams = Record<string, string | number | boolean | undefined>

function buildQuery(endpoint: string, params: QueryParams): string {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) searchParams.set(key, String(value))
  }
  const qs = searchParams.toString()
  return qs ? `${endpoint}?${qs}` : endpoint
}

export const get = <T>(endpoint: string, params?: QueryParams, signal?: AbortSignal): Promise<T> =>
  request<T>(params ? buildQuery(endpoint, params) : endpoint, { signal })

export const post = <T>(endpoint: string, body?: unknown): Promise<T> =>
  request<T>(endpoint, { method: 'POST', body })

export const patch = <T>(endpoint: string, body?: unknown): Promise<T> =>
  request<T>(endpoint, { method: 'PATCH', body })

export const del = <T>(endpoint: string): Promise<T> => request<T>(endpoint, { method: 'DELETE' })
