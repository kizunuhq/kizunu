import { Module } from '@nestjs/common'

import { CadenceModule } from '../cadence/cadence.module'
import { ChannelModule } from '../channel/channel.module'
import { CrmModule } from '../crm/crm.module'
import { WorkspaceModule } from '../workspace/workspace.module'
import { Clock } from './core/clock'
import { Jitter } from './core/domain/jitter'
import { JourneyPoller } from './core/poller/journey-poller'
import { CadenceActionExecutor } from './core/services/cadence-action-executor'
import { JourneyDispatcher } from './core/services/journey-dispatcher'
import { CreateEntryTriggerUseCase } from './core/use-cases/create-entry-trigger.use-case'
import { DeleteEntryTriggerUseCase } from './core/use-cases/delete-entry-trigger.use-case'
import { ListEntryTriggersUseCase } from './core/use-cases/list-entry-triggers.use-case'
import { ListLeadJourneysUseCase } from './core/use-cases/list-lead-journeys.use-case'
import { MarkReplyUseCase } from './core/use-cases/mark-reply.use-case'
import { PauseOwnerJourneysUseCase } from './core/use-cases/pause-owner-journeys.use-case'
import { ReassignLeadsUseCase } from './core/use-cases/reassign-leads.use-case'
import { StartJourneyUseCase } from './core/use-cases/start-journey.use-case'
import { CrmWebhookController } from './http/controllers/crm-webhook.controller'
import { EntryTriggerController } from './http/controllers/entry-trigger.controller'
import { LeadJourneyController } from './http/controllers/lead-journey.controller'
import { LeadOwnershipController } from './http/controllers/lead-ownership.controller'
import { MetaWebhookController } from './http/controllers/meta-webhook.controller'
import { EntryTriggerRepository } from './persistence/entry-trigger.repository'
import { LeadJourneyRepository } from './persistence/lead-journey.repository'
import { LeadRepository } from './persistence/lead.repository'
import { TouchAttemptRepository } from './persistence/touch-attempt.repository'

@Module({
  imports: [WorkspaceModule, CrmModule, CadenceModule, ChannelModule],
  controllers: [
    EntryTriggerController,
    CrmWebhookController,
    MetaWebhookController,
    LeadJourneyController,
    LeadOwnershipController,
  ],
  providers: [
    Clock,
    Jitter,
    EntryTriggerRepository,
    LeadRepository,
    LeadJourneyRepository,
    TouchAttemptRepository,
    CadenceActionExecutor,
    JourneyDispatcher,
    JourneyPoller,
    CreateEntryTriggerUseCase,
    ListEntryTriggersUseCase,
    DeleteEntryTriggerUseCase,
    StartJourneyUseCase,
    MarkReplyUseCase,
    ListLeadJourneysUseCase,
    PauseOwnerJourneysUseCase,
    ReassignLeadsUseCase,
  ],
  exports: [EntryTriggerRepository, LeadRepository, LeadJourneyRepository],
})
export class EngineModule {}
