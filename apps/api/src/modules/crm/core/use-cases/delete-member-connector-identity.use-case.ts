import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'

import { ConnectorAccountRepository } from '../../persistence/connector-account.repository'
import { MemberConnectorIdentityRepository } from '../../persistence/member-connector-identity.repository'
import { ConnectorAccountNotFoundException } from '../errors/crm.errors'
import { MemberConnectorIdentityNotFoundException } from '../errors/member-connector-identity.errors'

export interface DeleteMemberConnectorIdentityInput {
  workspaceId: string
  connectorAccountId: string
  id: string
}

@Injectable()
export class DeleteMemberConnectorIdentityUseCase {
  constructor(
    private readonly accounts: ConnectorAccountRepository,
    private readonly identities: MemberConnectorIdentityRepository,
    private readonly drizzle: DrizzleService,
  ) {}

  async execute(input: DeleteMemberConnectorIdentityInput): Promise<void> {
    const account = await this.accounts.findByIdInWorkspace(
      input.connectorAccountId,
      input.workspaceId,
    )
    if (!account) throw new ConnectorAccountNotFoundException(input.connectorAccountId)
    const result = await this.drizzle.db.transaction(async (tx) => {
      return await this.identities.delete(tx, { id: input.id, workspaceId: input.workspaceId })
    })
    if (!result.deleted) throw new MemberConnectorIdentityNotFoundException(input.id)
  }
}
