import { type ArgumentsHost, Catch, type ExceptionFilter } from '@nestjs/common'
import { useLogger } from 'evlog/nestjs'
import type { Response } from 'express'

import { ApplicationException } from '../exceptions/application.exception'

@Catch(ApplicationException)
export class ApplicationExceptionFilter implements ExceptionFilter {
  catch(exception: ApplicationException, host: ArgumentsHost): void {
    // Wrapped: a filter constructed outside the evlog middleware (e.g. tests)
    // has no logger in storage and useLogger() throws — swallow so the wire
    // response below still renders.
    try {
      useLogger().error(exception)
    } catch {}
    const response = host.switchToHttp().getResponse<Response>()
    response.status(exception.suggestedHttpStatusCode).json({
      code: exception.code,
      message: exception.message,
      context: exception.context,
    })
  }
}
