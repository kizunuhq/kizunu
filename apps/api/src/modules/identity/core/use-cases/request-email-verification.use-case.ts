import type { Config } from '@kizunu/api/api.config'
import { VerificationTokenType } from '@kizunu/api/modules/workspace/core/domain/verification-token'
import { VerificationTokenRepository } from '@kizunu/api/modules/workspace/persistence/verification-token.repository'
import { generateOpaqueToken, hashOpaqueToken } from '@kizunu/api/shared/crypto/opaque-token.helper'
import { ConfigService } from '@kizunu/config-module/config.service'
import { Injectable } from '@nestjs/common'

import { UserRepository } from '../../persistence/user.repository'
import { MailSender } from '../mail/mail-sender'

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000

@Injectable()
export class RequestEmailVerificationUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly verificationTokens: VerificationTokenRepository,
    private readonly mail: MailSender,
    private readonly config: ConfigService<Config>,
  ) {}

  /**
   * Mints a single-use verification token for the user and mails the link
   * out-of-band; the raw token never leaves via an HTTP response. A no-op when
   * the user is missing or already verified, so register and resend share it.
   */
  async execute(userId: string): Promise<void> {
    const user = await this.users.findById(userId)
    if (!user || user.emailVerifiedAt) return

    const token = generateOpaqueToken()
    await this.verificationTokens.create({
      type: VerificationTokenType.EmailVerification,
      userId: user.id,
      email: user.email,
      hashedToken: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
    })

    const link = `${this.config.get('appUrl')}/verify-email?token=${token}`
    await this.mail.send({
      to: user.email,
      subject: 'Verify your Kizunu email',
      body: `Confirm your email address (valid for 24 hours):\n${link}`,
    })
  }
}
