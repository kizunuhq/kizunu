import { VerificationTokenType } from '@kizunu/api/modules/workspace/core/domain/verification-token'
import { VerificationTokenRepository } from '@kizunu/api/modules/workspace/persistence/verification-token.repository'
import { hashOpaqueToken } from '@kizunu/api/shared/crypto/opaque-token.helper'
import { Injectable } from '@nestjs/common'

import { SessionRepository } from '../../persistence/session.repository'
import { UserRepository } from '../../persistence/user.repository'
import { hashPassword } from '../crypto/password.helper'
import { InvalidResetTokenException } from '../errors/identity.errors'

export interface ResetPasswordInput {
  token: string
  password: string
}

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly verificationTokens: VerificationTokenRepository,
  ) {}

  /**
   * Consumes a single-use reset token, replaces the password hash, and revokes
   * every session for the user so a reset logs them out everywhere.
   */
  async execute(input: ResetPasswordInput): Promise<void> {
    const record = await this.verificationTokens.findActiveByHashedToken(
      VerificationTokenType.PasswordReset,
      hashOpaqueToken(input.token),
    )
    if (!record?.userId) throw new InvalidResetTokenException()

    await this.users.setPasswordHash(record.userId, await hashPassword(input.password))
    await this.verificationTokens.markConsumed(record.id)
    await this.sessions.revokeAllForUser(record.userId)
  }
}
