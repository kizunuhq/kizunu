import { ReassignLeadsRequestSchema } from '@kizunu/api-contracts/engine'
import { WorkspaceAdminGuard } from '@kizunu/api/modules/workspace/http/guards/workspace-admin.guard'
import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'

import { PauseOwnerJourneysUseCase } from '../../core/use-cases/pause-owner-journeys.use-case'
import { ReassignLeadsUseCase } from '../../core/use-cases/reassign-leads.use-case'

class ReassignLeadsDto extends createZodDto(ReassignLeadsRequestSchema) {}

@ApiTags('lead-ownership')
@UseGuards(WorkspaceAdminGuard)
@Controller('workspaces')
export class LeadOwnershipController {
  constructor(
    private readonly pauseUseCase: PauseOwnerJourneysUseCase,
    private readonly reassignUseCase: ReassignLeadsUseCase,
  ) {}

  @Post(':id/owners/:userId/pause-journeys')
  @HttpCode(204)
  async pause(@Param('id') workspaceId: string, @Param('userId') userId: string): Promise<void> {
    await this.pauseUseCase.execute(workspaceId, userId)
  }

  @Post(':id/lead-reassignments')
  @HttpCode(204)
  async reassign(@Param('id') workspaceId: string, @Body() body: ReassignLeadsDto): Promise<void> {
    await this.reassignUseCase.execute({
      workspaceId,
      fromUserId: body.fromUserId,
      toUserId: body.toUserId,
    })
  }
}
