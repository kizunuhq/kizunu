import { Injectable } from '@nestjs/common'

import { SessionRepository } from '../../persistence/session.repository'

@Injectable()
export class RevokeOtherSessionsUseCase {
  constructor(private readonly sessions: SessionRepository) {}

  /**
   * "Log out everywhere": revokes all of the user's active sessions except the
   * one making the request, so the caller stays signed in.
   */
  async execute(userId: string, currentSessionId: string): Promise<void> {
    await this.sessions.revokeOthersForUser(userId, currentSessionId)
  }
}
