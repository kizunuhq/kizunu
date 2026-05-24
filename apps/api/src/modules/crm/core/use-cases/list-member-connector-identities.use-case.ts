import { Injectable } from '@nestjs/common'

import { ConnectorAccountRepository } from '../../persistence/connector-account.repository'
import {
  type MemberConnectorIdentityListRow,
  MemberConnectorIdentityRepository,
} from '../../persistence/member-connector-identity.repository'
import { ConnectorAccountNotFoundException } from '../errors/crm.errors'

export interface ListMemberConnectorIdentitiesInput {
  workspaceId: string
  connectorAccountId: string
}

@Injectable()
export class ListMemberConnectorIdentitiesUseCase {
  constructor(
    private readonly accounts: ConnectorAccountRepository,
    private readonly identities: MemberConnectorIdentityRepository,
  ) {}

  async execute(
    input: ListMemberConnectorIdentitiesInput,
  ): Promise<MemberConnectorIdentityListRow[]> {
    const account = await this.accounts.findByIdInWorkspace(
      input.connectorAccountId,
      input.workspaceId,
    )
    if (!account) throw new ConnectorAccountNotFoundException(input.connectorAccountId)
    return await this.identities.listByConnectorAccount(input.workspaceId, input.connectorAccountId)
  }
}
