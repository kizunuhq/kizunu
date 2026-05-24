import { WorkspaceMemberRepository } from '@kizunu/api/modules/workspace/persistence/workspace-member.repository'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'

import { ConnectorAccountRepository } from '../../persistence/connector-account.repository'
import { MemberConnectorIdentityRepository } from '../../persistence/member-connector-identity.repository'
import { ConnectorAccountNotFoundException } from '../errors/crm.errors'
import {
  MemberConnectorIdentityNotFoundException,
  MembershipNotInWorkspaceException,
} from '../errors/member-connector-identity.errors'
import { LeadOwnerBackfillService } from '../services/lead-owner-backfill.service'

export interface UpdateMemberConnectorIdentityInput {
  workspaceId: string
  connectorAccountId: string
  id: string
  membershipId: string
}

@Injectable()
export class UpdateMemberConnectorIdentityUseCase {
  constructor(
    private readonly accounts: ConnectorAccountRepository,
    private readonly members: WorkspaceMemberRepository,
    private readonly identities: MemberConnectorIdentityRepository,
    private readonly backfill: LeadOwnerBackfillService,
    private readonly drizzle: DrizzleService,
  ) {}

  async execute(input: UpdateMemberConnectorIdentityInput): Promise<void> {
    await this.ensureScoped(input)
    await this.drizzle.db.transaction(async (tx) => {
      const update = await this.identities.updateMembership(tx, {
        id: input.id,
        workspaceId: input.workspaceId,
        membershipId: input.membershipId,
      })
      if (!update) throw new MemberConnectorIdentityNotFoundException(input.id)
      const userId = await this.resolveUserId(input.membershipId)
      if (userId) {
        await this.backfill.backfillFor(tx, {
          connectorAccountId: update.connectorAccountId,
          externalId: update.externalId,
          userId,
        })
      }
    })
  }

  private async ensureScoped(input: UpdateMemberConnectorIdentityInput): Promise<void> {
    const account = await this.accounts.findByIdInWorkspace(
      input.connectorAccountId,
      input.workspaceId,
    )
    if (!account) throw new ConnectorAccountNotFoundException(input.connectorAccountId)
    const belongs = await this.members.belongsToWorkspace(input.membershipId, input.workspaceId)
    if (!belongs) throw new MembershipNotInWorkspaceException(input.membershipId)
  }

  private async resolveUserId(membershipId: string): Promise<string | undefined> {
    const member = await this.members.findById(membershipId)
    return member?.userId
  }
}
