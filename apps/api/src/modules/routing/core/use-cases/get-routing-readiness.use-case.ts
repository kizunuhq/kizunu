import type { RoutingReadinessResponse } from '@kizunu/api-contracts/workspace'
import { ChannelAccessRepository } from '@kizunu/api/modules/channel/persistence/channel-access.repository'
import { ConnectorAccountRepository } from '@kizunu/api/modules/crm/persistence/connector-account.repository'
import { MemberConnectorIdentityRepository } from '@kizunu/api/modules/crm/persistence/member-connector-identity.repository'
import { WorkspaceMemberRepository } from '@kizunu/api/modules/workspace/persistence/workspace-member.repository'
import { Injectable } from '@nestjs/common'

const META_PLUGIN_IDS: ReadonlySet<string> = new Set(['meta-whatsapp', 'meta-whatsapp-coex'])

@Injectable()
export class GetRoutingReadinessUseCase {
  constructor(
    private readonly members: WorkspaceMemberRepository,
    private readonly channelAccesses: ChannelAccessRepository,
    private readonly connectorAccounts: ConnectorAccountRepository,
    private readonly identities: MemberConnectorIdentityRepository,
  ) {}

  async execute(workspaceId: string): Promise<RoutingReadinessResponse> {
    const memberRows = await this.members.listByWorkspace(workspaceId)
    const connectorAccounts = await this.connectorAccounts.listByWorkspace(workspaceId)
    const connectorAccountIds = new Set(connectorAccounts.map((account) => account.id))

    const members = await Promise.all(
      memberRows.map(async (member) => {
        const accesses = await this.channelAccesses.listByUser(member.userId)
        const whatsappAccesses = accesses.filter((access) => META_PLUGIN_IDS.has(access.pluginId))
        const memberIdentities = await this.identities.listForUser(member.userId)
        const mappedConnectorAccountIds = memberIdentities
          .filter((identity) => connectorAccountIds.has(identity.connectorAccountId))
          .map((identity) => identity.connectorAccountId)

        return {
          membershipId: member.membershipId,
          userId: member.userId,
          name: member.userName,
          email: member.userEmail,
          status: member.status,
          hasWhatsappAccess: whatsappAccesses.length > 0,
          hasPrimaryWhatsappChannel: whatsappAccesses.some((access) => access.isPrimary),
          mappedConnectorAccountIds,
        }
      }),
    )

    return { members }
  }
}
