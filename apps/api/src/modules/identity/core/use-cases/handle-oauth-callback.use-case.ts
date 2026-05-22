import type { Config } from '@kizunu/api/api.config'
import { ConfigService } from '@kizunu/config-module/config.service'
import { Injectable } from '@nestjs/common'

import { IdentityRepository } from '../../persistence/identity.repository'
import { MembershipRepository } from '../../persistence/membership.repository'
import { UserRepository } from '../../persistence/user.repository'
import {
  OAuthEmailUnverifiedException,
  RegistrationDisabledException,
} from '../errors/identity.errors'
import type { OAuthProfile } from '../oauth/oauth-profile'
import { type IssuedSession, SessionIssuer } from '../services/session-issuer'
import { UserProvisioningService } from '../services/user-provisioning.service'

export interface HandleOAuthCallbackInput {
  provider: string
  profile: OAuthProfile
  userAgent?: string | null
  ipAddress?: string | null
}

@Injectable()
export class HandleOAuthCallbackUseCase {
  constructor(
    private readonly identities: IdentityRepository,
    private readonly users: UserRepository,
    private readonly memberships: MembershipRepository,
    private readonly provisioning: UserProvisioningService,
    private readonly sessionIssuer: SessionIssuer,
    private readonly config: ConfigService<Config>,
  ) {}

  /**
   * Turns a verified provider profile into a session: an existing identity signs
   * in directly; otherwise a verified email links to (or, when open, creates) an
   * account. Unverified provider emails never link or create.
   */
  async execute(input: HandleOAuthCallbackInput): Promise<IssuedSession> {
    const { provider, profile } = input

    const identity = await this.identities.findByProviderAccount(
      provider,
      profile.providerAccountId,
    )
    if (identity) return await this.signIn(identity.userId, input)

    if (!profile.emailVerified || !profile.email) throw new OAuthEmailUnverifiedException()

    const existing = await this.users.findByEmail(profile.email.toLowerCase())
    if (existing) {
      await this.link(existing.id, input)
      return await this.signIn(existing.id, input)
    }

    if (this.config.get('auth.registrationDisabled')) throw new RegistrationDisabledException()
    return await this.createAndSignIn(input)
  }

  private async link(userId: string, input: HandleOAuthCallbackInput): Promise<void> {
    await this.identities.create({
      userId,
      provider: input.provider,
      providerAccountId: input.profile.providerAccountId,
    })
  }

  private async createAndSignIn(input: HandleOAuthCallbackInput): Promise<IssuedSession> {
    const { user, workspace } = await this.provisioning.provision({
      email: input.profile.email.toLowerCase(),
      name: input.profile.name,
      passwordHash: null,
      emailVerifiedAt: new Date(),
    })
    await this.link(user.id, input)
    return await this.sessionIssuer.issue({
      userId: user.id,
      activeWorkspaceId: workspace.id,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    })
  }

  private async signIn(userId: string, input: HandleOAuthCallbackInput): Promise<IssuedSession> {
    const userMemberships = await this.memberships.listForUser(userId)
    const active = userMemberships.find((membership) => membership.status === 'active')
    return await this.sessionIssuer.issue({
      userId,
      activeWorkspaceId: active?.workspaceId ?? null,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    })
  }
}
