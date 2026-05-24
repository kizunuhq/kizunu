import { WorkspaceMemberRepository } from '@kizunu/api/modules/workspace/persistence/workspace-member.repository'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'

import { ConnectorAccountRepository } from '../../persistence/connector-account.repository'
import { MemberConnectorIdentityRepository } from '../../persistence/member-connector-identity.repository'
import { ConnectorAccountNotFoundException } from '../errors/crm.errors'
import {
  MemberConnectorIdentityConflictException,
  MembershipNotInWorkspaceException,
} from '../errors/member-connector-identity.errors'
import { LeadOwnerBackfillService } from '../services/lead-owner-backfill.service'

export interface CreateMemberConnectorIdentityInput {
  workspaceId: string
  connectorAccountId: string
  membershipId: string
  externalId: string
  createdBy: string
}

@Injectable()
export class CreateMemberConnectorIdentityUseCase {
  constructor(
    private readonly accounts: ConnectorAccountRepository,
    private readonly members: WorkspaceMemberRepository,
    private readonly identities: MemberConnectorIdentityRepository,
    private readonly backfill: LeadOwnerBackfillService,
    private readonly drizzle: DrizzleService,
  ) {}

  async execute(input: CreateMemberConnectorIdentityInput): Promise<{ id: string }> {
    await this.ensureScoped(input)
    const conflict = await this.identities.findByExternal(
      input.connectorAccountId,
      input.externalId,
    )
    if (conflict) {
      throw new MemberConnectorIdentityConflictException({
        connectorAccountId: input.connectorAccountId,
        externalId: input.externalId,
      })
    }
    return await this.drizzle.db.transaction(async (tx) => {
      const { id } = await this.identities.insertStrict(tx, {
        workspaceId: input.workspaceId,
        membershipId: input.membershipId,
        connectorAccountId: input.connectorAccountId,
        externalId: input.externalId,
        createdBy: input.createdBy,
        sourceEmail: null,
      })
      const userId = await this.resolveUserId(input.membershipId)
      if (userId) {
        await this.backfill.backfillFor(tx, {
          connectorAccountId: input.connectorAccountId,
          externalId: input.externalId,
          userId,
        })
      }
      return { id }
    })
  }

  private async ensureScoped(input: CreateMemberConnectorIdentityInput): Promise<void> {
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
