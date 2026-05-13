import { Injectable } from '@nestjs/common'

import { generateOpaqueToken, hashOpaqueToken } from '../../../../shared/crypto/opaque-token.helper'
import { VerificationTokenRepository } from '../../persistence/verification-token.repository'
import { WorkspaceRepository } from '../../persistence/workspace.repository'
import { WorkspaceNotFoundException } from '../errors/workspace.errors'

const DEFAULT_INVITATION_DAYS = 7

export interface InviteMemberInput {
  workspaceId: string
  email: string
  expiresInDays?: number
}

export interface InviteMemberOutput {
  invitationToken: string
  expiresAt: Date
}

@Injectable()
export class InviteMemberUseCase {
  constructor(
    private readonly workspaces: WorkspaceRepository,
    private readonly verificationTokens: VerificationTokenRepository,
  ) {}

  async execute(input: InviteMemberInput): Promise<InviteMemberOutput> {
    const workspace = await this.workspaces.findById(input.workspaceId)
    if (!workspace) throw new WorkspaceNotFoundException(input.workspaceId)

    const days = input.expiresInDays ?? DEFAULT_INVITATION_DAYS
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    const invitationToken = generateOpaqueToken()
    const hashedToken = hashOpaqueToken(invitationToken)

    await this.verificationTokens.create({
      type: 'invitation',
      email: input.email.toLowerCase(),
      workspaceId: input.workspaceId,
      hashedToken,
      expiresAt,
    })

    return { invitationToken, expiresAt }
  }
}
