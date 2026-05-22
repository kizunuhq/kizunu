import { Injectable } from '@nestjs/common'

import { SessionRepository } from '../../persistence/session.repository'
import { SessionNotFoundException } from '../errors/identity.errors'

@Injectable()
export class RevokeSessionUseCase {
  constructor(private readonly sessions: SessionRepository) {}

  /**
   * Revokes one of the user's own sessions. Ownership is enforced by the scoped
   * update: a session the user does not own affects zero rows and is reported as
   * not found, so we never reveal another user's session ids.
   */
  async execute(userId: string, sessionId: string): Promise<void> {
    const revoked = await this.sessions.revokeForUser(userId, sessionId)
    if (revoked === 0) throw new SessionNotFoundException()
  }
}
