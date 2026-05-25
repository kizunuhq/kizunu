import { ListLeadJourneysQuerySchema } from '@kizunu/api-contracts/engine'
import { WorkspaceAdminGuard } from '@kizunu/api/modules/workspace/http/guards/workspace-admin.guard'
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'

import { ListLeadJourneysUseCase } from '../../core/use-cases/list-lead-journeys.use-case'

class ListLeadJourneysQueryDto extends createZodDto(ListLeadJourneysQuerySchema) {}

@ApiTags('lead-journeys')
@UseGuards(WorkspaceAdminGuard)
@Controller('workspaces')
export class LeadJourneyController {
  constructor(private readonly listUseCase: ListLeadJourneysUseCase) {}

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
}
