import {
  CreateMemberConnectorIdentityRequestSchema,
  UpdateMemberConnectorIdentityRequestSchema,
} from '@kizunu/api-contracts/crm'
import { WorkspaceAdminGuard } from '@kizunu/api/modules/workspace/http/guards/workspace-admin.guard'
import {
  type AuthenticatedUser,
  CurrentUser,
} from '@kizunu/nestjs-shared/lib/decorators/current-user.decorator'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'

import { CreateMemberConnectorIdentityUseCase } from '../../core/use-cases/create-member-connector-identity.use-case'
import { DeleteMemberConnectorIdentityUseCase } from '../../core/use-cases/delete-member-connector-identity.use-case'
import { ListMemberConnectorIdentitiesUseCase } from '../../core/use-cases/list-member-connector-identities.use-case'
import { UpdateMemberConnectorIdentityUseCase } from '../../core/use-cases/update-member-connector-identity.use-case'

class CreateMemberConnectorIdentityDto extends createZodDto(
  CreateMemberConnectorIdentityRequestSchema,
) {}

class UpdateMemberConnectorIdentityDto extends createZodDto(
  UpdateMemberConnectorIdentityRequestSchema,
) {}

@UseGuards(WorkspaceAdminGuard)
@ApiTags('crm')
@Controller('workspaces')
export class MemberConnectorIdentityController {
  constructor(
    private readonly listUseCase: ListMemberConnectorIdentitiesUseCase,
    private readonly createUseCase: CreateMemberConnectorIdentityUseCase,
    private readonly updateUseCase: UpdateMemberConnectorIdentityUseCase,
    private readonly deleteUseCase: DeleteMemberConnectorIdentityUseCase,
  ) {}

  @Get(':id/connector-accounts/:accountId/identities')
  async list(@Param('id') workspaceId: string, @Param('accountId') connectorAccountId: string) {
    const items = await this.listUseCase.execute({ workspaceId, connectorAccountId })
    return {
      items: items.map((item) => ({
        id: item.id,
        membershipId: item.membershipId,
        userId: item.userId,
        userEmail: item.userEmail,
        userName: item.userName,
        externalId: item.externalId,
        createdBy: item.createdBy,
        sourceEmail: item.sourceEmail,
        createdAt: item.createdAt.toISOString(),
      })),
    }
  }

  @Post(':id/connector-accounts/:accountId/identities')
  async create(
    @Param('id') workspaceId: string,
    @Param('accountId') connectorAccountId: string,
    @Body() body: CreateMemberConnectorIdentityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return await this.createUseCase.execute({
      workspaceId,
      connectorAccountId,
      membershipId: body.membershipId,
      externalId: body.externalId,
      createdBy: `admin:${user.id}`,
    })
  }

  @Patch(':id/connector-accounts/:accountId/identities/:identityId')
  @HttpCode(204)
  async update(
    @Param('id') workspaceId: string,
    @Param('accountId') connectorAccountId: string,
    @Param('identityId') id: string,
    @Body() body: UpdateMemberConnectorIdentityDto,
  ): Promise<void> {
    await this.updateUseCase.execute({
      workspaceId,
      connectorAccountId,
      id,
      membershipId: body.membershipId,
    })
  }

  @Delete(':id/connector-accounts/:accountId/identities/:identityId')
  @HttpCode(204)
  async remove(
    @Param('id') workspaceId: string,
    @Param('accountId') connectorAccountId: string,
    @Param('identityId') id: string,
  ): Promise<void> {
    await this.deleteUseCase.execute({ workspaceId, connectorAccountId, id })
  }
}
