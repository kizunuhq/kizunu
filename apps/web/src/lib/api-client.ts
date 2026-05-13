const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export interface ApiErrorPayload {
  code: string
  message: string
  context?: Record<string, unknown>
}

export class ApiClientError extends Error {
  public readonly status: number
  public readonly code: string
  public readonly context?: Record<string, unknown>

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message)
    this.status = status
    this.code = payload.code
    this.context = payload.context
  }
}

interface ApiClientOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

export async function apiFetch<T>(path: string, options: ApiClientOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options
  const mergedHeaders = new Headers(headers)
  if (!mergedHeaders.has('Content-Type')) {
    mergedHeaders.set('Content-Type', 'application/json')
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: mergedHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    ...rest,
  })

  if (response.status === 204) return undefined as T

  const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload
  if (!response.ok) {
    throw new ApiClientError(response.status, payload)
  }

  return payload as T
}
