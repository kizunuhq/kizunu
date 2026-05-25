import {
  CreateConnectorAccountRequestSchema,
  DryRunDealRequestSchema,
  GetConnectorDirectoryRequestSchema,
} from '@kizunu/api-contracts/crm'
import { WorkspaceAdminGuard } from '@kizunu/api/modules/workspace/http/guards/workspace-admin.guard'
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'

import { CheckConnectorHealthUseCase } from '../../core/use-cases/check-connector-health.use-case'
import { CreateConnectorAccountUseCase } from '../../core/use-cases/create-connector-account.use-case'
import { DryRunDealUseCase } from '../../core/use-cases/dry-run-deal.use-case'
import { GetConnectorDirectoryUseCase } from '../../core/use-cases/get-connector-directory.use-case'
import { ListWorkspaceConnectorAccountsUseCase } from '../../core/use-cases/list-workspace-connector-accounts.use-case'

class CreateConnectorAccountDto extends createZodDto(CreateConnectorAccountRequestSchema) {}
class GetConnectorDirectoryQueryDto extends createZodDto(GetConnectorDirectoryRequestSchema) {}
class DryRunDealDto extends createZodDto(DryRunDealRequestSchema) {}

@UseGuards(WorkspaceAdminGuard)
@ApiTags('crm')
@Controller('workspaces')
export class ConnectorAccountController {
  constructor(
    private readonly createUseCase: CreateConnectorAccountUseCase,
    private readonly listUseCase: ListWorkspaceConnectorAccountsUseCase,
    private readonly directoryUseCase: GetConnectorDirectoryUseCase,
    private readonly healthUseCase: CheckConnectorHealthUseCase,
    private readonly dryRunUseCase: DryRunDealUseCase,
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

  @Get(':id/connector-accounts/:accountId/directory/:resource')
  async getDirectory(
    @Param('id') workspaceId: string,
    @Param('accountId') accountId: string,
    @Param('resource') resource: string,
    @Query() query: GetConnectorDirectoryQueryDto,
  ) {
    const params: Record<string, string> = {}
    if (query.pipelineId) params.pipelineId = query.pipelineId
    return await this.directoryUseCase.execute({ workspaceId, accountId, resource, params })
  }

  @Get(':id/connector-accounts/:accountId/health')
  async health(@Param('id') workspaceId: string, @Param('accountId') accountId: string) {
    return await this.healthUseCase.execute({ workspaceId, accountId })
  }

  @Post(':id/connector-accounts/:accountId/dry-run')
  async dryRun(
    @Param('id') workspaceId: string,
    @Param('accountId') accountId: string,
    @Body() body: DryRunDealDto,
  ) {
    return await this.dryRunUseCase.execute({
      workspaceId,
      connectorAccountId: accountId,
      externalDealId: body.externalDealId,
    })
  }
}
