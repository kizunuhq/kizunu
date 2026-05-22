import { CurrentUser } from '@kizunu/nestjs-shared/lib/decorators/current-user.decorator'
import type { AuthenticatedUser } from '@kizunu/nestjs-shared/lib/decorators/current-user.decorator'
import { Controller, Delete, Get, HttpCode, Param, UnauthorizedException } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

import type { ActiveSession } from '../../core/models/authenticated-user'
import { ListSessionsUseCase } from '../../core/use-cases/list-sessions.use-case'
import { RevokeOtherSessionsUseCase } from '../../core/use-cases/revoke-other-sessions.use-case'
import { RevokeSessionUseCase } from '../../core/use-cases/revoke-session.use-case'
import { CurrentSession } from '../decorators/current-session.decorator'

@ApiTags('auth')
@Controller('auth/sessions')
export class SessionController {
  constructor(
    private readonly listSessions: ListSessionsUseCase,
    private readonly revokeSession: RevokeSessionUseCase,
    private readonly revokeOtherSessions: RevokeOtherSessionsUseCase,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentSession() session: ActiveSession | undefined,
  ) {
    if (!user || !session) throw new UnauthorizedException()
    return { sessions: await this.listSessions.execute(user.id, session.id) }
  }

  @Delete(':sessionId')
  @HttpCode(204)
  async revoke(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('sessionId') sessionId: string,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException()
    await this.revokeSession.execute(user.id, sessionId)
  }

  @Delete()
  @HttpCode(204)
  async revokeOthers(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentSession() session: ActiveSession | undefined,
  ): Promise<void> {
    if (!user || !session) throw new UnauthorizedException()
    await this.revokeOtherSessions.execute(user.id, session.id)
  }
}
