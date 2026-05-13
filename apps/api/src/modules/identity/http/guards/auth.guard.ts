import { ConfigService } from '@kizunu/config-module/config.service'
import { IS_PUBLIC_KEY } from '@kizunu/nestjs-shared/lib/decorators/public.decorator'
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'

import type { Config } from '../../../../api.config'
import { hashOpaqueToken } from '../../../../shared/crypto/opaque-token.helper'
import { SessionRepository } from '../../persistence/session.repository'
import { UserRepository } from '../../persistence/user.repository'

type CookieJar = Record<string, string | undefined>

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionRepository,
    private readonly users: UserRepository,
    private readonly config: ConfigService<Config>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<Request>()
    const cookieName = this.config.get('session.cookieName')
    const cookies = (request.cookies ?? {}) as CookieJar
    const token = cookies[cookieName]
    if (!token) throw new UnauthorizedException()

    const tokenHash = hashOpaqueToken(token)
    const session = await this.sessions.findActiveByTokenHash(tokenHash)
    if (!session) throw new UnauthorizedException()

    const user = await this.users.findById(session.userId)
    if (!user) throw new UnauthorizedException()

    Object.assign(request, {
      user: {
        id: user.id,
        email: user.email,
        activeWorkspaceId: session.activeWorkspaceId,
      },
      session: {
        id: session.id,
        userId: session.userId,
        activeWorkspaceId: session.activeWorkspaceId,
        expiresAt: session.expiresAt,
      },
    })
    return true
  }
}
