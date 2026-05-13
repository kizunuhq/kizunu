export type ApplicationExceptionContext = Record<string, unknown>

/**
 * Base for nominated domain errors thrown by use cases. Each subclass carries
 * a dot-namespaced `code` (e.g. `identity.invalid-credentials`), a suggested
 * HTTP status, and an optional structured context. The global filter maps
 * these to JSON HTTP responses without leaking stack traces.
 */
export class ApplicationException extends Error {
  public readonly code: string
  public readonly suggestedHttpStatusCode: number
  public readonly context?: ApplicationExceptionContext

  constructor(
    code: string,
    message: string,
    suggestedHttpStatusCode: number,
    context?: ApplicationExceptionContext,
  ) {
    super(message)
    this.name = 'ApplicationException'
    this.code = code
    this.suggestedHttpStatusCode = suggestedHttpStatusCode
    this.context = context
  }
}
