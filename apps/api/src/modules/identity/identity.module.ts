import type { Config } from '@kizunu/api/api.config'
import { WorkspaceModule } from '@kizunu/api/modules/workspace/workspace.module'
import { ConfigService } from '@kizunu/config-module/config.service'
import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'

import { ConsoleMailSender } from './core/mail/console-mail-sender'
import { MailSender } from './core/mail/mail-sender'
import { SmtpMailSender } from './core/mail/smtp-mail-sender'
import { GithubOAuthProvider } from './core/oauth/github-oauth-provider'
import type { OAuthProvider } from './core/oauth/oauth-provider'
import { OAUTH_PROVIDERS, OAuthProviderRegistry } from './core/oauth/oauth-provider-registry'
import { SessionIssuer } from './core/services/session-issuer'
import { UserProvisioningService } from './core/services/user-provisioning.service'
import { AuthenticateUseCase } from './core/use-cases/authenticate.use-case'
import { ConfirmEmailVerificationUseCase } from './core/use-cases/confirm-email-verification.use-case'
import { GetMeUseCase } from './core/use-cases/get-me.use-case'
import { HandleOAuthCallbackUseCase } from './core/use-cases/handle-oauth-callback.use-case'
import { ListSessionsUseCase } from './core/use-cases/list-sessions.use-case'
import { LogoutUseCase } from './core/use-cases/logout.use-case'
import { RegisterUserUseCase } from './core/use-cases/register-user.use-case'
import { RequestEmailVerificationUseCase } from './core/use-cases/request-email-verification.use-case'
import { RequestPasswordResetUseCase } from './core/use-cases/request-password-reset.use-case'
import { ResetPasswordUseCase } from './core/use-cases/reset-password.use-case'
import { RevokeOtherSessionsUseCase } from './core/use-cases/revoke-other-sessions.use-case'
import { RevokeSessionUseCase } from './core/use-cases/revoke-session.use-case'
import { SwitchActiveWorkspaceUseCase } from './core/use-cases/switch-active-workspace.use-case'
import { AuthController } from './http/controllers/auth.controller'
import { EmailVerificationController } from './http/controllers/email-verification.controller'
import { OAuthController } from './http/controllers/oauth.controller'
import { PasswordResetController } from './http/controllers/password-reset.controller'
import { SessionController } from './http/controllers/session.controller'
import { AuthGuard } from './http/guards/auth.guard'
import { IdentityRepository } from './persistence/identity.repository'
import { MembershipRepository } from './persistence/membership.repository'
import { SessionRepository } from './persistence/session.repository'
import { UserRepository } from './persistence/user.repository'

// Only providers with both an id and a secret configured are wired, so the
// registry exposes exactly the providers the operator enabled.
function buildOAuthProviders(config: ConfigService<Config>): OAuthProvider[] {
  const providers: OAuthProvider[] = []
  if (config.get('oauth.github.clientId') && config.get('oauth.github.clientSecret')) {
    providers.push(new GithubOAuthProvider(config))
  }
  return providers
}

// Empty host preserves the v0.1 ConsoleMailSender fallback; never throws at boot.
function buildMailSender(config: ConfigService<Config>): MailSender {
  if (config.get('mail.smtpHost')) {
    return new SmtpMailSender(config)
  }
  return new ConsoleMailSender()
}

@Module({
  imports: [WorkspaceModule],
  controllers: [
    AuthController,
    PasswordResetController,
    EmailVerificationController,
    SessionController,
    OAuthController,
  ],
  providers: [
    UserRepository,
    SessionRepository,
    MembershipRepository,
    IdentityRepository,
    SessionIssuer,
    UserProvisioningService,
    RegisterUserUseCase,
    AuthenticateUseCase,
    LogoutUseCase,
    SwitchActiveWorkspaceUseCase,
    GetMeUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    RequestEmailVerificationUseCase,
    ConfirmEmailVerificationUseCase,
    ListSessionsUseCase,
    RevokeSessionUseCase,
    RevokeOtherSessionsUseCase,
    HandleOAuthCallbackUseCase,
    OAuthProviderRegistry,
    { provide: OAUTH_PROVIDERS, inject: [ConfigService], useFactory: buildOAuthProviders },
    { provide: MailSender, inject: [ConfigService], useFactory: buildMailSender },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class IdentityModule {}
