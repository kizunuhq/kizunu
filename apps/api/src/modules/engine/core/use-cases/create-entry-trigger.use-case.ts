import { CadenceNotFoundException } from '@kizunu/api/modules/cadence/core/errors/cadence.errors'
import { CadenceRepository } from '@kizunu/api/modules/cadence/persistence/cadence.repository'
import { ConnectorAccountNotFoundException } from '@kizunu/api/modules/crm/core/errors/crm.errors'
import { ConnectorAccountRepository } from '@kizunu/api/modules/crm/persistence/connector-account.repository'
import { Injectable } from '@nestjs/common'

import { EntryTriggerRepository } from '../../persistence/entry-trigger.repository'
import { DuplicateEntryTriggerException } from '../errors/entry-trigger.errors'

export interface CreateEntryTriggerInput {
  workspaceId: string
  connectorAccountId: string
  pipelineId: string | null
  stageId: string
  cadenceId: string
}

@Injectable()
export class CreateEntryTriggerUseCase {
  constructor(
    private readonly connectors: ConnectorAccountRepository,
    private readonly cadences: CadenceRepository,
    private readonly triggers: EntryTriggerRepository,
  ) {}

  async execute(input: CreateEntryTriggerInput): Promise<{ id: string }> {
    const connector = await this.connectors.findByIdInWorkspace(
      input.connectorAccountId,
      input.workspaceId,
    )
    if (!connector) throw new ConnectorAccountNotFoundException(input.connectorAccountId)

    const cadence = await this.cadences.findByIdInWorkspace(input.cadenceId, input.workspaceId)
    if (!cadence) throw new CadenceNotFoundException(input.cadenceId)

    const duplicate = await this.triggers.findByAccountAndStage(
      input.connectorAccountId,
      input.stageId,
    )
    if (duplicate) throw new DuplicateEntryTriggerException(input.stageId)

    return await this.triggers.create(input)
  }
}
