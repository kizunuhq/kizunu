import { CreateEntryTriggerRequestSchema } from '@kizunu/api-contracts/engine'
import { WorkspaceAdminGuard } from '@kizunu/api/modules/workspace/http/guards/workspace-admin.guard'
import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'

import { CreateEntryTriggerUseCase } from '../../core/use-cases/create-entry-trigger.use-case'
import { DeleteEntryTriggerUseCase } from '../../core/use-cases/delete-entry-trigger.use-case'
import { ListEntryTriggersUseCase } from '../../core/use-cases/list-entry-triggers.use-case'

class CreateEntryTriggerDto extends createZodDto(CreateEntryTriggerRequestSchema) {}

@UseGuards(WorkspaceAdminGuard)
@ApiTags('entry-triggers')
@Controller('workspaces')
export class EntryTriggerController {
  constructor(
    private readonly createUseCase: CreateEntryTriggerUseCase,
    private readonly listUseCase: ListEntryTriggersUseCase,
    private readonly deleteUseCase: DeleteEntryTriggerUseCase,
  ) {}

  @Post(':id/entry-triggers')
  async create(@Param('id') workspaceId: string, @Body() body: CreateEntryTriggerDto) {
    return await this.createUseCase.execute({
      workspaceId,
      connectorAccountId: body.connectorAccountId,
      pipelineId: body.pipelineId,
      stageId: body.stageId,
      cadenceId: body.cadenceId,
    })
  }

  @Get(':id/entry-triggers')
  async list(@Param('id') workspaceId: string) {
    const entryTriggers = await this.listUseCase.execute(workspaceId)
    return { entryTriggers }
  }

  @Delete(':id/entry-triggers/:triggerId')
  @HttpCode(204)
  async remove(
    @Param('id') workspaceId: string,
    @Param('triggerId') triggerId: string,
  ): Promise<void> {
    await this.deleteUseCase.execute(triggerId, workspaceId)
  }
}
