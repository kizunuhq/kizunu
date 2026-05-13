import { Injectable } from '@nestjs/common'

import { hashOpaqueToken } from '../../../../shared/crypto/opaque-token.helper'
import { VerificationTokenRepository } from '../../persistence/verification-token.repository'
import { WorkspaceMemberRepository } from '../../persistence/workspace-member.repository'
import { WorkspaceRepository } from '../../persistence/workspace.repository'
import {
  AlreadyMemberException,
  InvitationEmailMismatchException,
  InvitationTokenInvalidException,
  WorkspaceNotFoundException,
} from '../errors/workspace.errors'

export interface AcceptInvitationInput {
  token: string
  currentUser: { id: string; email: string }
}

export interface AcceptInvitationOutput {
  workspaceId: string
  workspaceName: string
  workspaceSlug: string
  role: 'admin' | 'member'
}

@Injectable()
export class AcceptInvitationUseCase {
  constructor(
    private readonly verificationTokens: VerificationTokenRepository,
    private readonly members: WorkspaceMemberRepository,
    private readonly workspaces: WorkspaceRepository,
  ) {}

  async execute(input: AcceptInvitationInput): Promise<AcceptInvitationOutput> {
    const hashedToken = hashOpaqueToken(input.token)
    const record = await this.verificationTokens.findActiveByHashedToken('invitation', hashedToken)
    if (!record || !record.workspaceId) {
      throw new InvitationTokenInvalidException()
    }

    if (record.email && record.email.toLowerCase() !== input.currentUser.email.toLowerCase()) {
      throw new InvitationEmailMismatchException()
    }

    const existing = await this.members.findExistingMembership(
      input.currentUser.id,
      record.workspaceId,
    )
    if (existing && existing.status === 'active') {
      throw new AlreadyMemberException(record.workspaceId)
    }

    if (existing) {
      await this.members.reactivate(existing.id)
    } else {
      await this.members.create({
        workspaceId: record.workspaceId,
        userId: input.currentUser.id,
        role: 'member',
      })
    }

    await this.verificationTokens.markConsumed(record.id)

    const workspace = await this.workspaces.findById(record.workspaceId)
    if (!workspace) throw new WorkspaceNotFoundException(record.workspaceId)

    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
      role: 'member',
    }
  }
}
