import { CreateConnectorAccountRequestSchema } from '@kizunu/api-contracts/crm'
import { WorkspaceAdminGuard } from '@kizunu/api/modules/workspace/http/guards/workspace-admin.guard'
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { createZodDto } from 'nestjs-zod'

import { CreateConnectorAccountUseCase } from '../../core/use-cases/create-connector-account.use-case'
import { ListWorkspaceConnectorAccountsUseCase } from '../../core/use-cases/list-workspace-connector-accounts.use-case'

class CreateConnectorAccountDto extends createZodDto(CreateConnectorAccountRequestSchema) {}

@UseGuards(WorkspaceAdminGuard)
@Controller('workspaces')
export class ConnectorAccountController {
  constructor(
    private readonly createUseCase: CreateConnectorAccountUseCase,
    private readonly listUseCase: ListWorkspaceConnectorAccountsUseCase,
  ) {}

  @Post(':id/connector-accounts')
  async create(@Param('id') workspaceId: string, @Body() body: CreateConnectorAccountDto) {
    return await this.createUseCase.execute({
      workspaceId,
      connectorId: body.connectorId,
      name: body.name,
      credentials: body.credentials,
    })
  }

  @Get(':id/connector-accounts')
  async list(@Param('id') workspaceId: string) {
    const accounts = await this.listUseCase.execute(workspaceId)
    return {
      accounts: accounts.map((account) => ({
        id: account.id,
        connectorId: account.connectorId,
        name: account.name,
        createdAt: account.createdAt.toISOString(),
      })),
    }
  }
}
