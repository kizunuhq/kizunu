import { Injectable } from '@nestjs/common'

import { MembershipRepository } from '../../persistence/membership.repository'
import { SessionRepository } from '../../persistence/session.repository'
import { WorkspaceMembershipRequiredException } from '../errors/identity.errors'

export interface SwitchActiveWorkspaceInput {
  sessionId: string
  userId: string
  workspaceId: string
}

@Injectable()
export class SwitchActiveWorkspaceUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly memberships: MembershipRepository,
  ) {}

  async execute(input: SwitchActiveWorkspaceInput): Promise<{ activeWorkspaceId: string }> {
    const membership = await this.memberships.findActiveByUserAndWorkspace(
      input.userId,
      input.workspaceId,
    )
    if (!membership) {
      throw new WorkspaceMembershipRequiredException(input.workspaceId)
    }

    await this.sessions.updateActiveWorkspace(input.sessionId, input.workspaceId)
    return { activeWorkspaceId: input.workspaceId }
  }
}
