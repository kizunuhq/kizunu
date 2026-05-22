import { Injectable } from '@nestjs/common'

import {
  type EntryTriggerRow,
  EntryTriggerRepository,
} from '../../persistence/entry-trigger.repository'

@Injectable()
export class ListEntryTriggersUseCase {
  constructor(private readonly triggers: EntryTriggerRepository) {}

  async execute(workspaceId: string): Promise<EntryTriggerRow[]> {
    return await this.triggers.listByWorkspace(workspaceId)
  }
}
