import { MemberConnectorIdentityRepository } from '@kizunu/api/modules/crm/persistence/member-connector-identity.repository'
import { Inject, Injectable, forwardRef } from '@nestjs/common'

import { MembershipRepository } from '../../persistence/membership.repository'
import { UserRepository } from '../../persistence/user.repository'
import { SessionExpiredException } from '../errors/identity.errors'

export interface ConnectorIdentitySummary {
  connectorAccountId: string
  connectorId: string
  externalId: string
}

export interface GetMeOutput {
  user: {
    id: string
    email: string
    name: string
    emailVerifiedAt: Date | null
  }
  memberships: Array<{
    workspaceId: string
    workspaceName: string
    workspaceSlug: string
    role: 'admin' | 'member'
    status: 'active' | 'inactive'
  }>
  connectorIdentities: ConnectorIdentitySummary[]
  activeWorkspaceId: string | null
}

@Injectable()
export class GetMeUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly memberships: MembershipRepository,
    @Inject(forwardRef(() => MemberConnectorIdentityRepository))
    private readonly connectorIdentities: MemberConnectorIdentityRepository,
  ) {}

  async execute(userId: string, activeWorkspaceId: string | null): Promise<GetMeOutput> {
    const user = await this.users.findById(userId)
    if (!user) throw new SessionExpiredException()

    const userMemberships = await this.memberships.listForUser(user.id)
    const identities = await this.connectorIdentities.listForUser(user.id)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerifiedAt: user.emailVerifiedAt,
      },
      memberships: userMemberships,
      connectorIdentities: identities,
      activeWorkspaceId,
    }
  }
}
