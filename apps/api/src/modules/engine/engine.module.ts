import { Module } from '@nestjs/common'

import { CadenceModule } from '../cadence/cadence.module'
import { CrmModule } from '../crm/crm.module'
import { WorkspaceModule } from '../workspace/workspace.module'
import { CreateEntryTriggerUseCase } from './core/use-cases/create-entry-trigger.use-case'
import { DeleteEntryTriggerUseCase } from './core/use-cases/delete-entry-trigger.use-case'
import { ListEntryTriggersUseCase } from './core/use-cases/list-entry-triggers.use-case'
import { EntryTriggerController } from './http/controllers/entry-trigger.controller'
import { EntryTriggerRepository } from './persistence/entry-trigger.repository'

@Module({
  imports: [WorkspaceModule, CrmModule, CadenceModule],
  controllers: [EntryTriggerController],
  providers: [
    EntryTriggerRepository,
    CreateEntryTriggerUseCase,
    ListEntryTriggersUseCase,
    DeleteEntryTriggerUseCase,
  ],
  exports: [EntryTriggerRepository],
})
export class EngineModule {}
