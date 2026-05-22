import {
  CreateTemplateRequestSchema,
  UpdateTemplateRequestSchema,
} from '@kizunu/api-contracts/cadence'
import { WorkspaceAdminGuard } from '@kizunu/api/modules/workspace/http/guards/workspace-admin.guard'
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

import { CreateTemplateUseCase } from '../../core/use-cases/create-template.use-case'
import { DeleteTemplateUseCase } from '../../core/use-cases/delete-template.use-case'
import { ListWorkspaceTemplatesUseCase } from '../../core/use-cases/list-workspace-templates.use-case'
import { UpdateTemplateUseCase } from '../../core/use-cases/update-template.use-case'

class CreateTemplateDto extends createZodDto(CreateTemplateRequestSchema) {}
class UpdateTemplateDto extends createZodDto(UpdateTemplateRequestSchema) {}

@UseGuards(WorkspaceAdminGuard)
@ApiTags('templates')
@Controller('workspaces')
export class TemplateController {
  constructor(
    private readonly createUseCase: CreateTemplateUseCase,
    private readonly listUseCase: ListWorkspaceTemplatesUseCase,
    private readonly updateUseCase: UpdateTemplateUseCase,
    private readonly deleteUseCase: DeleteTemplateUseCase,
  ) {}

  @Post(':id/templates')
  async create(@Param('id') workspaceId: string, @Body() body: CreateTemplateDto) {
    return await this.createUseCase.execute({
      workspaceId,
      name: body.name,
      channelPluginId: body.channelPluginId,
      providerTemplateName: body.providerTemplateName,
      language: body.language,
      variables: body.variables,
    })
  }

  @Get(':id/templates')
  async list(@Param('id') workspaceId: string) {
    const templates = await this.listUseCase.execute(workspaceId)
    return { templates }
  }

  @Patch(':id/templates/:templateId')
  @HttpCode(204)
  async update(
    @Param('id') workspaceId: string,
    @Param('templateId') templateId: string,
    @Body() body: UpdateTemplateDto,
  ): Promise<void> {
    await this.updateUseCase.execute({ workspaceId, templateId, patch: body })
  }

  @Delete(':id/templates/:templateId')
  @HttpCode(204)
  async remove(
    @Param('id') workspaceId: string,
    @Param('templateId') templateId: string,
  ): Promise<void> {
    await this.deleteUseCase.execute({ workspaceId, templateId })
  }
}
