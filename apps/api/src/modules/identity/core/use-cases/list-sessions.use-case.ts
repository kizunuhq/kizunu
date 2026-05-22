import type { SessionView } from '@kizunu/api-contracts/identity'
import { Injectable } from '@nestjs/common'

import { SessionRepository } from '../../persistence/session.repository'

@Injectable()
export class ListSessionsUseCase {
  constructor(private readonly sessions: SessionRepository) {}

  /**
   * Projects the user's active sessions to the public view, flagging the one
   * the request is authenticated with so the UI can mark "this device".
   */
  async execute(userId: string, currentSessionId: string): Promise<SessionView[]> {
    const rows = await this.sessions.listActiveForUser(userId)
    return rows.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt.toISOString(),
      lastSeenAt: session.lastSeenAt?.toISOString() ?? null,
      expiresAt: session.expiresAt.toISOString(),
      isCurrent: session.id === currentSessionId,
    }))
  }
}
