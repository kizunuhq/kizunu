import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AuthenticateUseCase } from './core/use-cases/authenticate.use-case'
import { GetMeUseCase } from './core/use-cases/get-me.use-case'
import { LogoutUseCase } from './core/use-cases/logout.use-case'
import { RegisterUserUseCase } from './core/use-cases/register-user.use-case'
import { SwitchActiveWorkspaceUseCase } from './core/use-cases/switch-active-workspace.use-case'
import { AuthController } from './http/controllers/auth.controller'
import { AuthGuard } from './http/guards/auth.guard'
import { MembershipRepository } from './persistence/membership.repository'
import { SessionRepository } from './persistence/session.repository'
import { UserRepository } from './persistence/user.repository'

@Module({
  controllers: [AuthController],
  providers: [
    UserRepository,
    SessionRepository,
    MembershipRepository,
    RegisterUserUseCase,
    AuthenticateUseCase,
    LogoutUseCase,
    SwitchActiveWorkspaceUseCase,
    GetMeUseCase,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class IdentityModule {}
