import { ConfigService } from '@kizunu/config-module/config.service'
import { Injectable } from '@nestjs/common'

import type { Config } from '../../../../api.config'
import { generateOpaqueToken, hashOpaqueToken } from '../../../../shared/crypto/opaque-token.helper'
import { MembershipRepository } from '../../persistence/membership.repository'
import { SessionRepository } from '../../persistence/session.repository'
import { UserRepository } from '../../persistence/user.repository'
import { hashPassword, verifyPassword } from '../crypto/password.helper'
import { AccountLockedException, InvalidCredentialsException } from '../errors/identity.errors'

const MAX_FAILED_ATTEMPTS = 5
const LOCK_DURATION_MS = 15 * 60 * 1000

export interface AuthenticateInput {
  email: string
  password: string
  userAgent?: string | null
  ipAddress?: string | null
}

export interface AuthenticateOutput {
  user: { id: string; email: string; name: string }
  activeWorkspaceId: string | null
  sessionToken: string
  expiresAt: Date
}

@Injectable()
export class AuthenticateUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly memberships: MembershipRepository,
    private readonly config: ConfigService<Config>,
  ) {}

  async execute(input: AuthenticateInput): Promise<AuthenticateOutput> {
    const user = await this.users.findByEmail(input.email)
    if (!user) {
      // Hash a throwaway value to keep timing roughly constant against
      // unknown-email vs known-email probing.
      await hashPassword(input.password)
      throw new InvalidCredentialsException()
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AccountLockedException(user.lockedUntil)
    }

    const valid = await verifyPassword(input.password, user.passwordHash)
    if (!valid) {
      const attempts = await this.users.incrementFailedAttempts(user.id)
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        await this.users.lockUntil(user.id, new Date(Date.now() + LOCK_DURATION_MS))
      }
      throw new InvalidCredentialsException()
    }

    await this.users.resetFailedAttemptsAndTouchLastLogin(user.id)

    const userMemberships = await this.memberships.listForUser(user.id)
    const active = userMemberships.find((m) => m.status === 'active')
    const activeWorkspaceId = active?.workspaceId ?? null

    const ttlDays = this.config.get('session.ttlDays')
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)
    const sessionToken = generateOpaqueToken()
    const tokenHash = hashOpaqueToken(sessionToken)

    await this.sessions.create({
      userId: user.id,
      tokenHash,
      activeWorkspaceId,
      expiresAt,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    })

    return {
      user: { id: user.id, email: user.email, name: user.name },
      activeWorkspaceId,
      sessionToken,
      expiresAt,
    }
  }
}
