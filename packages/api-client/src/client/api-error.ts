/**
 * Transport-level error raised by the api-client. Mirrors the API's error
 * envelope (`{ code, message, context }`) and adds the HTTP status plus
 * semantic getters so callers branch on intent (`isUnauthorized`) rather than
 * on raw status numbers. `status === 0` means the request never reached the
 * server.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly context: unknown

  constructor(status: number, code: string, message: string, context?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.context = context
  }

  get isNetworkError(): boolean {
    return this.status === 0
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isForbidden(): boolean {
    return this.status === 403
  }

  get isConflict(): boolean {
    return this.status === 409
  }

  get isValidation(): boolean {
    return this.status === 422
  }

  get isLocked(): boolean {
    return this.status === 423
  }
}
