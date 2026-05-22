import { Module } from '@nestjs/common'

import { CadenceModule } from '../cadence/cadence.module'
import { CrmModule } from '../crm/crm.module'
import { WorkspaceModule } from '../workspace/workspace.module'
import { Clock } from './core/clock'
import { CreateEntryTriggerUseCase } from './core/use-cases/create-entry-trigger.use-case'
import { DeleteEntryTriggerUseCase } from './core/use-cases/delete-entry-trigger.use-case'
import { ListEntryTriggersUseCase } from './core/use-cases/list-entry-triggers.use-case'
import { StartJourneyUseCase } from './core/use-cases/start-journey.use-case'
import { CrmWebhookController } from './http/controllers/crm-webhook.controller'
import { EntryTriggerController } from './http/controllers/entry-trigger.controller'
import { EntryTriggerRepository } from './persistence/entry-trigger.repository'
import { LeadJourneyRepository } from './persistence/lead-journey.repository'
import { LeadRepository } from './persistence/lead.repository'

@Module({
  imports: [WorkspaceModule, CrmModule, CadenceModule],
  controllers: [EntryTriggerController, CrmWebhookController],
  providers: [
    Clock,
    EntryTriggerRepository,
    LeadRepository,
    LeadJourneyRepository,
    CreateEntryTriggerUseCase,
    ListEntryTriggersUseCase,
    DeleteEntryTriggerUseCase,
    StartJourneyUseCase,
  ],
  exports: [EntryTriggerRepository, LeadRepository, LeadJourneyRepository],
})
export class EngineModule {}
