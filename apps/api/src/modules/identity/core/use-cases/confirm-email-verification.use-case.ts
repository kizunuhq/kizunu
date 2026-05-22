import { VerificationTokenType } from '@kizunu/api/modules/workspace/core/domain/verification-token'
import { VerificationTokenRepository } from '@kizunu/api/modules/workspace/persistence/verification-token.repository'
import { hashOpaqueToken } from '@kizunu/api/shared/crypto/opaque-token.helper'
import { Injectable } from '@nestjs/common'

import { UserRepository } from '../../persistence/user.repository'
import { InvalidVerificationTokenException } from '../errors/identity.errors'

@Injectable()
export class ConfirmEmailVerificationUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly verificationTokens: VerificationTokenRepository,
  ) {}

  /**
   * Consumes a single-use verification token and marks the user's email
   * verified. The token type pins this to email verification, so a reset token
   * cannot confirm an email and vice versa.
   */
  async execute(token: string): Promise<void> {
    const record = await this.verificationTokens.findActiveByHashedToken(
      VerificationTokenType.EmailVerification,
      hashOpaqueToken(token),
    )
    if (!record?.userId) throw new InvalidVerificationTokenException()

    await this.users.markEmailVerified(record.userId, new Date())
    await this.verificationTokens.markConsumed(record.id)
  }
}
