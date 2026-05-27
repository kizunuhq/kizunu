import { type ArgumentsHost, Catch } from '@nestjs/common'
import { BaseExceptionFilter } from '@nestjs/core'
import { useLogger } from 'evlog/nestjs'

@Catch()
export class UnhandledExceptionFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    // Wrapped: requests that never traversed evlog middleware (theoretical, but
    // possible for boot-time or test harnesses) have no logger in storage and
    // useLogger() throws — swallow so super.catch still renders the response.
    try {
      const error = exception instanceof Error ? exception : new Error(String(exception))
      useLogger().error(error)
    } catch {}
    super.catch(exception, host)
  }
}
