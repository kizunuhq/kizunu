import { forwardRef, Module } from '@nestjs/common'

import { EngineModule } from '../engine/engine.module'
import { IdentityModule } from '../identity/identity.module'
import { WorkspaceModule } from '../workspace/workspace.module'
import { CRM_CONNECTORS, CrmConnectorRegistry } from './core/connector/crm-connector-registry'
import { LeadOwnerBackfillService } from './core/services/lead-owner-backfill.service'
import { ResolveOwnerService } from './core/services/resolve-owner.service'
import { CreateConnectorAccountUseCase } from './core/use-cases/create-connector-account.use-case'
import { CreateMemberConnectorIdentityUseCase } from './core/use-cases/create-member-connector-identity.use-case'
import { DeleteMemberConnectorIdentityUseCase } from './core/use-cases/delete-member-connector-identity.use-case'
import { ListMemberConnectorIdentitiesUseCase } from './core/use-cases/list-member-connector-identities.use-case'
import { ListWorkspaceConnectorAccountsUseCase } from './core/use-cases/list-workspace-connector-accounts.use-case'
import { UpdateMemberConnectorIdentityUseCase } from './core/use-cases/update-member-connector-identity.use-case'
import { ConnectorAccountController } from './http/controllers/connector-account.controller'
import { MemberConnectorIdentityController } from './http/controllers/member-connector-identity.controller'
import { ConnectorAccountRepository } from './persistence/connector-account.repository'
import { MemberConnectorIdentityRepository } from './persistence/member-connector-identity.repository'
import { PipedriveConnector } from './plugins/pipedrive/pipedrive.connector'

@Module({
  imports: [WorkspaceModule, forwardRef(() => IdentityModule), forwardRef(() => EngineModule)],
  controllers: [ConnectorAccountController, MemberConnectorIdentityController],
  providers: [
    { provide: CRM_CONNECTORS, useValue: [new PipedriveConnector()] },
    CrmConnectorRegistry,
    ConnectorAccountRepository,
    MemberConnectorIdentityRepository,
    ResolveOwnerService,
    LeadOwnerBackfillService,
    CreateConnectorAccountUseCase,
    ListWorkspaceConnectorAccountsUseCase,
    CreateMemberConnectorIdentityUseCase,
    UpdateMemberConnectorIdentityUseCase,
    DeleteMemberConnectorIdentityUseCase,
    ListMemberConnectorIdentitiesUseCase,
  ],
  exports: [
    CrmConnectorRegistry,
    ConnectorAccountRepository,
    MemberConnectorIdentityRepository,
    ResolveOwnerService,
  ],
})
export class CrmModule {}
