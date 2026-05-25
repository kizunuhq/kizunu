import { ListLeadJourneysQuerySchema } from '@kizunu/api-contracts/engine'
import { WorkspaceAdminGuard } from '@kizunu/api/modules/workspace/http/guards/workspace-admin.guard'
import { Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'

import {
  ControlJourneyUseCase,
  JourneyControlAction,
} from '../../core/use-cases/control-journey.use-case'
import { ListLeadJourneysUseCase } from '../../core/use-cases/list-lead-journeys.use-case'
import { WorkspacePauseAllUseCase } from '../../core/use-cases/workspace-pause-all.use-case'

class ListLeadJourneysQueryDto extends createZodDto(ListLeadJourneysQuerySchema) {}

@ApiTags('lead-journeys')
@UseGuards(WorkspaceAdminGuard)
@Controller('workspaces')
export class LeadJourneyController {
  constructor(
    private readonly listUseCase: ListLeadJourneysUseCase,
    private readonly controlUseCase: ControlJourneyUseCase,
    private readonly pauseAllUseCase: WorkspacePauseAllUseCase,
  ) {}

  @Get(':id/lead-journeys')
  async list(@Param('id') workspaceId: string, @Query() query: ListLeadJourneysQueryDto) {
    const journeys = await this.listUseCase.execute(workspaceId, query.status)
    return {
      journeys: journeys.map((journey) => ({
        id: journey.id,
        leadName: journey.leadName,
        cadenceId: journey.cadenceId,
        status: journey.status,
        currentStepOrder: journey.currentStepOrder,
        nextTouchAt: journey.nextTouchAt?.toISOString() ?? null,
        errorReason: journey.errorReason,
      })),
    }
  }

  @Post(':id/lead-journeys/:journeyId/pause')
  async pause(@Param('id') workspaceId: string, @Param('journeyId') journeyId: string) {
    return await this.controlUseCase.execute({
      workspaceId,
      journeyId,
      action: JourneyControlAction.Pause,
    })
  }

  @Post(':id/lead-journeys/:journeyId/resume')
  async resume(@Param('id') workspaceId: string, @Param('journeyId') journeyId: string) {
    return await this.controlUseCase.execute({
      workspaceId,
      journeyId,
      action: JourneyControlAction.Resume,
    })
  }

  @Post(':id/lead-journeys/:journeyId/stop')
  async stop(@Param('id') workspaceId: string, @Param('journeyId') journeyId: string) {
    return await this.controlUseCase.execute({
      workspaceId,
      journeyId,
      action: JourneyControlAction.Stop,
    })
  }

  @Post(':id/lead-journeys/pause-all')
  @HttpCode(204)
  async pauseAll(@Param('id') workspaceId: string): Promise<void> {
    await this.pauseAllUseCase.execute(workspaceId)
  }
}
