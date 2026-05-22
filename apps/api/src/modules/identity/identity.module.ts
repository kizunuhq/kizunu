import { WorkspaceModule } from '@kizunu/api/modules/workspace/workspace.module'
import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'

import { ConsoleMailSender } from './core/mail/console-mail-sender'
import { MailSender } from './core/mail/mail-sender'
import { AuthenticateUseCase } from './core/use-cases/authenticate.use-case'
import { GetMeUseCase } from './core/use-cases/get-me.use-case'
import { LogoutUseCase } from './core/use-cases/logout.use-case'
import { RegisterUserUseCase } from './core/use-cases/register-user.use-case'
import { RequestPasswordResetUseCase } from './core/use-cases/request-password-reset.use-case'
import { ResetPasswordUseCase } from './core/use-cases/reset-password.use-case'
import { SwitchActiveWorkspaceUseCase } from './core/use-cases/switch-active-workspace.use-case'
import { AuthController } from './http/controllers/auth.controller'
import { PasswordResetController } from './http/controllers/password-reset.controller'
import { AuthGuard } from './http/guards/auth.guard'
import { MembershipRepository } from './persistence/membership.repository'
import { SessionRepository } from './persistence/session.repository'
import { UserRepository } from './persistence/user.repository'

@Module({
  imports: [WorkspaceModule],
  controllers: [AuthController, PasswordResetController],
  providers: [
    UserRepository,
    SessionRepository,
    MembershipRepository,
    RegisterUserUseCase,
    AuthenticateUseCase,
    LogoutUseCase,
    SwitchActiveWorkspaceUseCase,
    GetMeUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    { provide: MailSender, useClass: ConsoleMailSender },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class IdentityModule {}
