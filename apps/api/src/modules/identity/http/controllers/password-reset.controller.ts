import {
  ConfirmPasswordResetSchema,
  RequestPasswordResetSchema,
} from '@kizunu/api-contracts/identity'
import { Public } from '@kizunu/nestjs-shared/lib/decorators/public.decorator'
import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { createZodDto } from 'nestjs-zod'

import { RequestPasswordResetUseCase } from '../../core/use-cases/request-password-reset.use-case'
import { ResetPasswordUseCase } from '../../core/use-cases/reset-password.use-case'
import { AUTH_THROTTLE } from '../auth-throttle'

class RequestPasswordResetDto extends createZodDto(RequestPasswordResetSchema) {}
class ConfirmPasswordResetDto extends createZodDto(ConfirmPasswordResetSchema) {}

@ApiTags('auth')
@Controller('auth')
export class PasswordResetController {
  constructor(
    private readonly requestReset: RequestPasswordResetUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('password-reset')
  @HttpCode(204)
  async request(@Body() body: RequestPasswordResetDto): Promise<void> {
    await this.requestReset.execute(body.email)
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('password-reset/confirm')
  @HttpCode(204)
  async confirm(@Body() body: ConfirmPasswordResetDto): Promise<void> {
    await this.resetPassword.execute({ token: body.token, password: body.password })
  }
}
