import { CadenceRequestSchema } from '@kizunu/api-contracts/cadence'
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

import { CreateCadenceUseCase } from '../../core/use-cases/create-cadence.use-case'
import { DeleteCadenceUseCase } from '../../core/use-cases/delete-cadence.use-case'
import { GetCadenceUseCase } from '../../core/use-cases/get-cadence.use-case'
import { ListCadencesUseCase } from '../../core/use-cases/list-cadences.use-case'
import { UpdateCadenceUseCase } from '../../core/use-cases/update-cadence.use-case'

class CadenceDto extends createZodDto(CadenceRequestSchema) {}

@UseGuards(WorkspaceAdminGuard)
@ApiTags('cadences')
@Controller('workspaces')
export class CadenceController {
  constructor(
    private readonly createUseCase: CreateCadenceUseCase,
    private readonly listUseCase: ListCadencesUseCase,
    private readonly getUseCase: GetCadenceUseCase,
    private readonly updateUseCase: UpdateCadenceUseCase,
    private readonly deleteUseCase: DeleteCadenceUseCase,
  ) {}

  @Post(':id/cadences')
  async create(@Param('id') workspaceId: string, @Body() body: CadenceDto) {
    return await this.createUseCase.execute({ workspaceId, ...this.fields(body) })
  }

  @Get(':id/cadences')
  async list(@Param('id') workspaceId: string) {
    const cadences = await this.listUseCase.execute(workspaceId)
    return { cadences }
  }

  @Get(':id/cadences/:cadenceId')
  async get(@Param('id') workspaceId: string, @Param('cadenceId') cadenceId: string) {
    return await this.getUseCase.execute(cadenceId, workspaceId)
  }

  @Patch(':id/cadences/:cadenceId')
  @HttpCode(204)
  async update(
    @Param('id') workspaceId: string,
    @Param('cadenceId') cadenceId: string,
    @Body() body: CadenceDto,
  ): Promise<void> {
    await this.updateUseCase.execute({ workspaceId, cadenceId, ...this.fields(body) })
  }

  @Delete(':id/cadences/:cadenceId')
  @HttpCode(204)
  async remove(
    @Param('id') workspaceId: string,
    @Param('cadenceId') cadenceId: string,
  ): Promise<void> {
    await this.deleteUseCase.execute(cadenceId, workspaceId)
  }

  private fields(body: CadenceDto) {
    return {
      name: body.name,
      status: body.status,
      stopOnReply: body.stopOnReply,
      steps: body.steps,
      onReply: body.onReply,
      onExhausted: body.onExhausted,
      onComplete: body.onComplete,
      sendingWindow: body.sendingWindow,
    }
  }
}
