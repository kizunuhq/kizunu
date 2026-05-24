import {
  ConnectMetaCoexRequestSchema,
  CreateChannelAccountRequestSchema,
  GetChannelDirectoryRequestSchema,
  GrantChannelAccessRequestSchema,
} from '@kizunu/api-contracts/channel'
import { WorkspaceAdminGuard } from '@kizunu/api/modules/workspace/http/guards/workspace-admin.guard'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'

import { ConnectMetaCoexUseCase } from '../../core/use-cases/connect-meta-coex.use-case'
import { CreateChannelAccountUseCase } from '../../core/use-cases/create-channel-account.use-case'
import { GetChannelDirectoryUseCase } from '../../core/use-cases/get-channel-directory.use-case'
import { GrantChannelAccessUseCase } from '../../core/use-cases/grant-channel-access.use-case'
import { ListWorkspaceChannelAccountsUseCase } from '../../core/use-cases/list-workspace-channel-accounts.use-case'
import { RevokeChannelAccessUseCase } from '../../core/use-cases/revoke-channel-access.use-case'

class CreateChannelAccountDto extends createZodDto(CreateChannelAccountRequestSchema) {}
class GrantChannelAccessDto extends createZodDto(GrantChannelAccessRequestSchema) {}
class ConnectMetaCoexDto extends createZodDto(ConnectMetaCoexRequestSchema) {}
class GetChannelDirectoryQueryDto extends createZodDto(GetChannelDirectoryRequestSchema) {}

@UseGuards(WorkspaceAdminGuard)
@ApiTags('channels')
@Controller('workspaces')
export class ChannelAccountController {
  constructor(
    private readonly createUseCase: CreateChannelAccountUseCase,
    private readonly listUseCase: ListWorkspaceChannelAccountsUseCase,
    private readonly grantUseCase: GrantChannelAccessUseCase,
    private readonly revokeUseCase: RevokeChannelAccessUseCase,
    private readonly connectMetaCoex: ConnectMetaCoexUseCase,
    private readonly directoryUseCase: GetChannelDirectoryUseCase,
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

  /** Embedded Signup endpoint. Exchanges the OAuth code and creates a coexistence
   * ChannelAccount. */
  @Post(':id/channel-accounts/meta-whatsapp/connect')
  async connectMetaWhatsappCoex(
    @Param('id') workspaceId: string,
    @Body() body: ConnectMetaCoexDto,
  ) {
    return await this.connectMetaCoex.execute({
      workspaceId,
      code: body.code,
      businessId: body.businessId,
      wabaId: body.wabaId,
      phoneNumberId: body.phoneNumberId,
      name: body.name,
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

  @Get(':id/channel-accounts/:accountId/directory/:resource')
  async getDirectory(
    @Param('id') workspaceId: string,
    @Param('accountId') accountId: string,
    @Param('resource') resource: string,
    @Query() query: GetChannelDirectoryQueryDto,
  ) {
    return await this.directoryUseCase.execute({
      workspaceId,
      accountId,
      resource,
      params: toStringRecord(query),
    })
  }
}

function toStringRecord(query: object): Readonly<Record<string, string>> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
    if (typeof value === 'string' && value.length > 0) result[key] = value
  }
  return result
}
