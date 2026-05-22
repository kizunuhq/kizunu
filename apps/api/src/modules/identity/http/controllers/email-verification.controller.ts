import { ConfirmEmailVerificationSchema } from '@kizunu/api-contracts/identity'
import { CurrentUser } from '@kizunu/nestjs-shared/lib/decorators/current-user.decorator'
import type { AuthenticatedUser } from '@kizunu/nestjs-shared/lib/decorators/current-user.decorator'
import { Public } from '@kizunu/nestjs-shared/lib/decorators/public.decorator'
import { Body, Controller, HttpCode, Post, UnauthorizedException } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { createZodDto } from 'nestjs-zod'

import { ConfirmEmailVerificationUseCase } from '../../core/use-cases/confirm-email-verification.use-case'
import { RequestEmailVerificationUseCase } from '../../core/use-cases/request-email-verification.use-case'
import { AUTH_THROTTLE } from '../auth-throttle'

class ConfirmEmailVerificationDto extends createZodDto(ConfirmEmailVerificationSchema) {}

@ApiTags('auth')
@Controller('auth')
export class EmailVerificationController {
  constructor(
    private readonly requestVerification: RequestEmailVerificationUseCase,
    private readonly confirmVerification: ConfirmEmailVerificationUseCase,
  ) {}

  @Throttle(AUTH_THROTTLE)
  @Post('email-verification')
  @HttpCode(204)
  async resend(@CurrentUser() user: AuthenticatedUser | undefined): Promise<void> {
    if (!user) throw new UnauthorizedException()
    await this.requestVerification.execute(user.id)
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('email-verification/confirm')
  @HttpCode(204)
  async confirm(@Body() body: ConfirmEmailVerificationDto): Promise<void> {
    await this.confirmVerification.execute(body.token)
  }
}
