import {
  CreateChannelAccountRequestSchema,
  GrantChannelAccessRequestSchema,
} from '@kizunu/api-contracts/channel'
import { WorkspaceAdminGuard } from '@kizunu/api/modules/workspace/http/guards/workspace-admin.guard'
import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import { createZodDto } from 'nestjs-zod'

import { CreateChannelAccountUseCase } from '../../core/use-cases/create-channel-account.use-case'
import { GrantChannelAccessUseCase } from '../../core/use-cases/grant-channel-access.use-case'
import { ListWorkspaceChannelAccountsUseCase } from '../../core/use-cases/list-workspace-channel-accounts.use-case'
import { RevokeChannelAccessUseCase } from '../../core/use-cases/revoke-channel-access.use-case'

class CreateChannelAccountDto extends createZodDto(CreateChannelAccountRequestSchema) {}
class GrantChannelAccessDto extends createZodDto(GrantChannelAccessRequestSchema) {}

@UseGuards(WorkspaceAdminGuard)
@Controller('workspaces')
export class ChannelAccountController {
  constructor(
    private readonly createUseCase: CreateChannelAccountUseCase,
    private readonly listUseCase: ListWorkspaceChannelAccountsUseCase,
    private readonly grantUseCase: GrantChannelAccessUseCase,
    private readonly revokeUseCase: RevokeChannelAccessUseCase,
  ) {}

  @Post(':id/channel-accounts')
  async create(@Param('id') workspaceId: string, @Body() body: CreateChannelAccountDto) {
    return await this.createUseCase.execute({
      workspaceId,
      pluginId: body.pluginId,
      name: body.name,
      credentials: body.credentials,
    })
  }

  @Get(':id/channel-accounts')
  async list(@Param('id') workspaceId: string) {
    const accounts = await this.listUseCase.execute(workspaceId)
    return {
      accounts: accounts.map((account) => ({
        id: account.id,
        pluginId: account.pluginId,
        name: account.name,
        createdAt: account.createdAt.toISOString(),
      })),
    }
  }

  @Post(':id/channel-accounts/:accountId/access')
  @HttpCode(204)
  async grant(
    @Param('id') workspaceId: string,
    @Param('accountId') accountId: string,
    @Body() body: GrantChannelAccessDto,
  ): Promise<void> {
    await this.grantUseCase.execute({
      workspaceId,
      channelAccountId: accountId,
      userId: body.userId,
    })
  }

  @Delete(':id/channel-accounts/:accountId/access/:userId')
  @HttpCode(204)
  async revoke(
    @Param('id') workspaceId: string,
    @Param('accountId') accountId: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.revokeUseCase.execute({ workspaceId, channelAccountId: accountId, userId })
  }
}
