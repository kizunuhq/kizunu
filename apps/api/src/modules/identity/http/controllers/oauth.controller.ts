import type { Config } from '@kizunu/api/api.config'
import { generateOpaqueToken } from '@kizunu/api/shared/crypto/opaque-token.helper'
import { ConfigService } from '@kizunu/config-module/config.service'
import { Public } from '@kizunu/nestjs-shared/lib/decorators/public.decorator'
import { ApplicationException } from '@kizunu/nestjs-shared/lib/exceptions/application.exception'
import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request, Response } from 'express'

import { OAuthProviderRegistry } from '../../core/oauth/oauth-provider-registry'
import { HandleOAuthCallbackUseCase } from '../../core/use-cases/handle-oauth-callback.use-case'
import { setSessionCookie } from '../session-cookie'

const STATE_COOKIE = 'kizunu_oauth_state'
const STATE_TTL_MS = 10 * 60 * 1000

interface CallbackQuery {
  code?: string
  state?: string
}

@ApiTags('auth')
@Controller('auth/oauth')
export class OAuthController {
  constructor(
    private readonly registry: OAuthProviderRegistry,
    private readonly handleCallback: HandleOAuthCallbackUseCase,
    private readonly config: ConfigService<Config>,
  ) {}

  @Public()
  @Get(':provider')
  begin(@Param('provider') providerId: string, @Res() res: Response): void {
    const provider = this.registry.get(providerId)
    const state = generateOpaqueToken()
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      secure: this.config.get('session.cookieSecure'),
      sameSite: 'lax',
      maxAge: STATE_TTL_MS,
      path: '/',
    })
    res.redirect(provider.authorizationUrl({ state, redirectUri: this.callbackUri(providerId) }))
  }

  @Public()
  @Get(':provider/callback')
  async callback(
    @Param('provider') providerId: string,
    @Query() query: CallbackQuery,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const cookieState = (req.cookies as Record<string, string | undefined>)?.[STATE_COOKIE]
    res.clearCookie(STATE_COOKIE, { path: '/' })
    if (!query.state || !cookieState || query.state !== cookieState) {
      return res.redirect(this.loginError('oauth_state'))
    }
    await this.complete(providerId, query.code ?? '', req, res)
  }

  private async complete(
    providerId: string,
    code: string,
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const provider = this.registry.get(providerId)
      const profile = await provider.exchangeCode({
        code,
        redirectUri: this.callbackUri(providerId),
      })
      const issued = await this.handleCallback.execute({
        provider: providerId,
        profile,
        userAgent: req.headers['user-agent'] ?? null,
        ipAddress: req.ip ?? null,
      })
      setSessionCookie(res, {
        name: this.config.get('session.cookieName'),
        secure: this.config.get('session.cookieSecure'),
        token: issued.sessionToken,
        expiresAt: issued.expiresAt,
      })
      res.redirect(`${this.config.get('webUrl')}/workspace`)
    } catch (error) {
      if (error instanceof ApplicationException) return res.redirect(this.loginError(error.code))
      throw error
    }
  }

  private callbackUri(providerId: string): string {
    return `${this.config.get('appUrl')}/auth/oauth/${providerId}/callback`
  }

  private loginError(code: string): string {
    return `${this.config.get('webUrl')}/login?error=${code}`
  }
}
