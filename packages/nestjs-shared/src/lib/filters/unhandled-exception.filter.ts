import { Catch, type ExceptionFilter } from '@nestjs/common'
import { useLogger } from 'evlog/nestjs'

@Catch()
export class UnhandledExceptionFilter implements ExceptionFilter {
  catch(exception: unknown): void {
    // Wrapped: requests that never traversed evlog middleware (theoretical, but
    // possible for boot-time or test harnesses) have no logger in storage and
    // useLogger() throws — swallow so the original exception still propagates.
    try {
      const error = exception instanceof Error ? exception : new Error(String(exception))
      useLogger().error(error)
    } catch {}
    throw exception
  }
}
