import type { Config } from '@kizunu/api/api.config'
import { ConfigService } from '@kizunu/config-module/config.service'
import { Injectable } from '@nestjs/common'

import { UserRepository } from '../../persistence/user.repository'
import { hashPassword } from '../crypto/password.helper'
import {
  EmailAlreadyTakenException,
  RegistrationDisabledException,
} from '../errors/identity.errors'
import { SessionIssuer } from '../services/session-issuer'
import { UserProvisioningService } from '../services/user-provisioning.service'
import { RequestEmailVerificationUseCase } from './request-email-verification.use-case'

export interface RegisterUserInput {
  email: string
  password: string
  name: string
  userAgent?: string | null
  ipAddress?: string | null
}

export interface RegisterUserOutput {
  user: { id: string; email: string; name: string }
  workspace: { id: string; name: string; slug: string }
  sessionToken: string
  expiresAt: Date
}

@Injectable()
export class RegisterUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly config: ConfigService<Config>,
    private readonly provisioning: UserProvisioningService,
    private readonly sessionIssuer: SessionIssuer,
    private readonly requestEmailVerification: RequestEmailVerificationUseCase,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    if (this.config.get('auth.registrationDisabled')) {
      throw new RegistrationDisabledException()
    }

    const existing = await this.users.findByEmail(input.email)
    if (existing) throw new EmailAlreadyTakenException(input.email)

    const passwordHash = await hashPassword(input.password)
    const { user, workspace } = await this.provisioning.provision({
      email: input.email,
      name: input.name,
      passwordHash,
    })

    const { sessionToken, expiresAt } = await this.sessionIssuer.issue({
      userId: user.id,
      activeWorkspaceId: workspace.id,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    })

    await this.requestEmailVerification.execute(user.id)

    return { user, workspace, sessionToken, expiresAt }
  }
}
