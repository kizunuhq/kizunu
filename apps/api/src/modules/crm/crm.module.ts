import { Module } from '@nestjs/common'

import { WorkspaceModule } from '../workspace/workspace.module'
import { CRM_CONNECTORS, CrmConnectorRegistry } from './core/connector/crm-connector-registry'
import { CreateConnectorAccountUseCase } from './core/use-cases/create-connector-account.use-case'
import { ListWorkspaceConnectorAccountsUseCase } from './core/use-cases/list-workspace-connector-accounts.use-case'
import { ConnectorAccountController } from './http/controllers/connector-account.controller'
import { ConnectorAccountRepository } from './persistence/connector-account.repository'
import { PipedriveConnector } from './plugins/pipedrive/pipedrive.connector'

@Module({
  imports: [WorkspaceModule],
  controllers: [ConnectorAccountController],
  providers: [
    { provide: CRM_CONNECTORS, useValue: [new PipedriveConnector()] },
    CrmConnectorRegistry,
    ConnectorAccountRepository,
    CreateConnectorAccountUseCase,
    ListWorkspaceConnectorAccountsUseCase,
  ],
  exports: [CrmConnectorRegistry, ConnectorAccountRepository],
})
export class CrmModule {}
