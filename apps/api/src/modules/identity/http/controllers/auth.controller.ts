import {
  LoginRequestSchema,
  RegisterRequestSchema,
  SwitchWorkspaceRequestSchema,
} from '@kizunu/api-contracts/identity'
import type { Config } from '@kizunu/api/api.config'
import { ConfigService } from '@kizunu/config-module/config.service'
import { CurrentUser } from '@kizunu/nestjs-shared/lib/decorators/current-user.decorator'
import type { AuthenticatedUser } from '@kizunu/nestjs-shared/lib/decorators/current-user.decorator'
import { Public } from '@kizunu/nestjs-shared/lib/decorators/public.decorator'
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { createZodDto } from 'nestjs-zod'

import type { ActiveSession } from '../../core/models/authenticated-user'
import { AuthenticateUseCase } from '../../core/use-cases/authenticate.use-case'
import { GetMeUseCase } from '../../core/use-cases/get-me.use-case'
import { LogoutUseCase } from '../../core/use-cases/logout.use-case'
import { RegisterUserUseCase } from '../../core/use-cases/register-user.use-case'
import { SwitchActiveWorkspaceUseCase } from '../../core/use-cases/switch-active-workspace.use-case'
import { CurrentSession } from '../decorators/current-session.decorator'

class RegisterDto extends createZodDto(RegisterRequestSchema) {}
class LoginDto extends createZodDto(LoginRequestSchema) {}
class SwitchWorkspaceDto extends createZodDto(SwitchWorkspaceRequestSchema) {}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUserUseCase,
    private readonly authenticateUseCase: AuthenticateUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly switchUseCase: SwitchActiveWorkspaceUseCase,
    private readonly getMeUseCase: GetMeUseCase,
    private readonly config: ConfigService<Config>,
  ) {}

  private setSessionCookie(res: Response, token: string, expiresAt: Date): void {
    res.cookie(this.config.get('session.cookieName'), token, {
      httpOnly: true,
      secure: this.config.get('session.cookieSecure'),
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    })
  }

  private clearSessionCookie(res: Response): void {
    res.clearCookie(this.config.get('session.cookieName'), { path: '/' })
  }

  @Public()
  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.registerUseCase.execute({
      email: body.email,
      password: body.password,
      name: body.name,
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    })
    this.setSessionCookie(res, result.sessionToken, result.expiresAt)
    return { user: result.user, workspace: result.workspace }
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authenticateUseCase.execute({
      email: body.email,
      password: body.password,
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    })
    this.setSessionCookie(res, result.sessionToken, result.expiresAt)
    return { user: result.user, activeWorkspaceId: result.activeWorkspaceId }
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @CurrentSession() session: ActiveSession | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    if (!session) throw new UnauthorizedException()
    await this.logoutUseCase.execute(session.id)
    this.clearSessionCookie(res)
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser | undefined) {
    if (!user) throw new UnauthorizedException()
    return await this.getMeUseCase.execute(user.id, user.activeWorkspaceId ?? null)
  }

  @Post('switch-workspace')
  @HttpCode(200)
  async switchWorkspace(
    @Body() body: SwitchWorkspaceDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @CurrentSession() session: ActiveSession | undefined,
  ) {
    if (!user || !session) throw new UnauthorizedException()
    return await this.switchUseCase.execute({
      sessionId: session.id,
      userId: user.id,
      workspaceId: body.workspaceId,
    })
  }
}
