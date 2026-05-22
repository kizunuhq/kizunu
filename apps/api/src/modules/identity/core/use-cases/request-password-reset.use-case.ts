import type { Config } from '@kizunu/api/api.config'
import { VerificationTokenType } from '@kizunu/api/modules/workspace/core/domain/verification-token'
import { VerificationTokenRepository } from '@kizunu/api/modules/workspace/persistence/verification-token.repository'
import { generateOpaqueToken, hashOpaqueToken } from '@kizunu/api/shared/crypto/opaque-token.helper'
import { ConfigService } from '@kizunu/config-module/config.service'
import { Injectable } from '@nestjs/common'

import { UserRepository } from '../../persistence/user.repository'
import { MailSender } from '../mail/mail-sender'

const RESET_TTL_MS = 60 * 60 * 1000

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly verificationTokens: VerificationTokenRepository,
    private readonly mail: MailSender,
    private readonly config: ConfigService<Config>,
  ) {}

  /**
   * Always resolves without revealing whether the email exists (no account
   * enumeration). When it does, mints a single-use reset token and mails the
   * link out-of-band; the raw token never leaves via the HTTP response.
   */
  async execute(email: string): Promise<void> {
    const user = await this.users.findByEmail(email.toLowerCase())
    if (!user) return

    const token = generateOpaqueToken()
    await this.verificationTokens.create({
      type: VerificationTokenType.PasswordReset,
      userId: user.id,
      email: user.email,
      hashedToken: hashOpaqueToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    })

    const link = `${this.config.get('webUrl')}/auth/reset-password?token=${token}`
    await this.mail.send({
      to: user.email,
      subject: 'Reset your Kizunu password',
      body: `Open this link to set a new password (valid for 1 hour):\n${link}`,
    })
  }
}
