import { Injectable } from '@nestjs/common'

import { EntryTriggerRepository } from '../../persistence/entry-trigger.repository'
import { EntryTriggerNotFoundException } from '../errors/entry-trigger.errors'

@Injectable()
export class DeleteEntryTriggerUseCase {
  constructor(private readonly triggers: EntryTriggerRepository) {}

  async execute(entryTriggerId: string, workspaceId: string): Promise<void> {
    const existing = await this.triggers.findByIdInWorkspace(entryTriggerId, workspaceId)
    if (!existing) throw new EntryTriggerNotFoundException(entryTriggerId)
    await this.triggers.delete(entryTriggerId)
  }
}
