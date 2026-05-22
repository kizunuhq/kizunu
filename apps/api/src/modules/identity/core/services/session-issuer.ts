import type { Config } from '@kizunu/api/api.config'
import { generateOpaqueToken, hashOpaqueToken } from '@kizunu/api/shared/crypto/opaque-token.helper'
import { ConfigService } from '@kizunu/config-module/config.service'
import { Injectable } from '@nestjs/common'

import { SessionRepository } from '../../persistence/session.repository'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface IssueSessionInput {
  userId: string
  activeWorkspaceId: string | null
  userAgent?: string | null
  ipAddress?: string | null
}

export interface IssuedSession {
  sessionToken: string
  expiresAt: Date
}

/**
 * Mints an opaque session token, persists its hash, and returns the raw token for
 * the cookie. Shared by register, login, and OAuth so session creation lives in
 * one place rather than being copied per entry point.
 */
@Injectable()
export class SessionIssuer {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly config: ConfigService<Config>,
  ) {}

  async issue(input: IssueSessionInput): Promise<IssuedSession> {
    const expiresAt = new Date(Date.now() + this.config.get('session.ttlDays') * MS_PER_DAY)
    const sessionToken = generateOpaqueToken()
    await this.sessions.create({
      userId: input.userId,
      tokenHash: hashOpaqueToken(sessionToken),
      activeWorkspaceId: input.activeWorkspaceId,
      expiresAt,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    })
    return { sessionToken, expiresAt }
  }
}
