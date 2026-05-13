import { type ArgumentsHost, Catch, type ExceptionFilter } from '@nestjs/common'
import type { Response } from 'express'

import { ApplicationException } from '../exceptions/application.exception'

@Catch(ApplicationException)
export class ApplicationExceptionFilter implements ExceptionFilter {
  catch(exception: ApplicationException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    response.status(exception.suggestedHttpStatusCode).json({
      code: exception.code,
      message: exception.message,
      context: exception.context,
    })
  }
}
